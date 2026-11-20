import type { Schemas } from '@carbon-glint/api-spec';
import { BusinessRuleError, ConflictError, NotFoundError } from '../errors/domain-errors.js';
import { hashToken, randomToken } from '../lib/crypto.js';
import { invitationEmail } from '../lib/email-templates.js';
import { hashPassword, isStrongPassword } from '../lib/password.js';
import { emailDomain, normalizeEmail } from '../lib/work-email.js';
import type { InvitationModel } from '../models/index.js';
import type { SignedIn } from './auth.service.js';
import type { ServiceDeps } from './index.js';
import { invitationStatus, toInvitationDto, toTenantDto, toUserDto } from './mappers.js';
import { startSession } from './session.js';
import { requireTenantId } from './tenant.service.js';
import type { Actor } from './types.js';

export const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;

export interface TeamService {
  listUsers(actor: Actor): Promise<Schemas['User'][]>;
  updateUserStatus(actor: Actor, userId: string, status: 'active' | 'disabled'): Promise<Schemas['User']>;
  listInvitations(actor: Actor): Promise<Schemas['Invitation'][]>;
  invite(actor: Actor, email: string): Promise<Schemas['Invitation']>;
  revokeInvitation(actor: Actor, invitationId: string): Promise<void>;
  resendInvitation(actor: Actor, invitationId: string): Promise<Schemas['Invitation']>;
  lookupInvitation(token: string): Promise<Schemas['InvitationPreview']>;
  acceptInvitation(input: Schemas['AcceptInvitationRequest']): Promise<SignedIn>;
}

export const createTeamService = ({ repositories: repos, jobs, config }: ServiceDeps): TeamService => {
  const sendInvite = async (actor: Actor, invitation: InvitationModel, token: string) => {
    const [tenant, inviter] = await Promise.all([
      repos.tenants.findById(invitation.tenantId),
      repos.users.findById(actor.userId),
    ]);
    const link = `${config.APP_URL}/invite?token=${encodeURIComponent(token)}`;
    await jobs.enqueue(
      'email.send',
      invitationEmail(invitation.email, tenant!.tenant.name, inviter?.name ?? 'A colleague', link),
    );
  };

  const findOpenInvitation = async (token: string) => {
    const found = await repos.invitations.findOpenByTokenHash(hashToken(token, config.SESSION_SECRET));
    if (!found || invitationStatus(found.invitation) !== 'pending') {
      throw new NotFoundError('This invitation is invalid or has expired. Ask your admin to send a new one.', {
        code: 'INVITATION_INVALID',
      });
    }
    return found;
  };

  return {
    async listUsers(actor) {
      return (await repos.users.listByTenant(requireTenantId(actor))).map(toUserDto);
    },

    async updateUserStatus(actor, userId, status) {
      const tenantId = requireTenantId(actor);
      const user = await repos.users.findById(userId);
      if (!user || user.tenantId !== tenantId) throw new NotFoundError('User not found.');
      if (user.id === actor.userId) {
        throw new BusinessRuleError("You can't change your own status.", { code: 'CANNOT_CHANGE_SELF' });
      }
      if (user.status === 'pending') {
        throw new BusinessRuleError('This user has not verified their email yet.', { code: 'USER_PENDING' });
      }
      const updated = await repos.users.update(user.id, { status });
      if (status === 'disabled') await repos.sessions.destroyAllForUser(user.id);
      return toUserDto(updated!);
    },

    async listInvitations(actor) {
      return (await repos.invitations.listByTenant(requireTenantId(actor))).map(toInvitationDto);
    },

    async invite(actor, rawEmail) {
      const tenantId = requireTenantId(actor);
      const email = normalizeEmail(rawEmail);
      const tenant = (await repos.tenants.findById(tenantId))!.tenant;
      if (emailDomain(email) !== tenant.emailDomain) {
        throw new BusinessRuleError(`You can only invite colleagues with an @${tenant.emailDomain} email.`, {
          code: 'INVITE_DOMAIN_MISMATCH',
        });
      }
      if (await repos.users.findByEmail(email)) {
        throw new ConflictError('This person already has an account.', { code: 'USER_EXISTS' });
      }

      const token = randomToken();
      const invitation = await repos.transaction(async (tx) => {
        const previous = await tx.invitations.findOpenByEmail(tenantId, email);
        if (previous) await tx.invitations.update(previous.id, { revokedAt: new Date() });
        return tx.invitations.create({
          tenantId,
          email,
          tokenHash: hashToken(token, config.SESSION_SECRET),
          invitedBy: actor.userId,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        });
      });
      await sendInvite(actor, invitation, token);
      return toInvitationDto(invitation);
    },

    async revokeInvitation(actor, invitationId) {
      const invitation = await repos.invitations.findById(requireTenantId(actor), invitationId);
      if (!invitation || invitationStatus(invitation) === 'accepted') throw new NotFoundError('Invitation not found.');
      await repos.invitations.update(invitation.id, { revokedAt: new Date() });
    },

    async resendInvitation(actor, invitationId) {
      const invitation = await repos.invitations.findById(requireTenantId(actor), invitationId);
      if (!invitation || invitation.acceptedAt || invitation.revokedAt) {
        throw new NotFoundError('Invitation not found.');
      }
      const token = randomToken();
      const updated = await repos.invitations.update(invitation.id, {
        tokenHash: hashToken(token, config.SESSION_SECRET),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      });
      await sendInvite(actor, updated!, token);
      return toInvitationDto(updated!);
    },

    async lookupInvitation(token) {
      const { invitation, tenant } = await findOpenInvitation(token);
      return { email: invitation.email, tenantName: tenant.name };
    },

    async acceptInvitation(input) {
      if (!isStrongPassword(input.password)) {
        throw new BusinessRuleError('Password needs at least 10 characters, including a letter and a number.', {
          code: 'WEAK_PASSWORD',
        });
      }
      const { invitation } = await findOpenInvitation(input.token);
      const passwordHash = await hashPassword(input.password);

      const user = await repos.transaction(async (tx) => {
        if (await tx.users.findByEmail(invitation.email)) {
          throw new ConflictError('An account with this email already exists. Sign in instead.', {
            code: 'USER_EXISTS',
          });
        }
        await tx.invitations.update(invitation.id, { acceptedAt: new Date() });
        return tx.users.create({
          tenantId: invitation.tenantId,
          email: invitation.email,
          name: input.name.trim(),
          passwordHash,
          role: 'admin',
          status: 'active',
          emailVerifiedAt: new Date(), // the invite link proves the address
          lastLoginAt: new Date(),
        });
      });
      const t = await repos.tenants.findById(user.tenantId!);
      return {
        me: { user: toUserDto(user), tenant: t ? toTenantDto(t.tenant, t.industry) : null },
        sessionToken: await startSession(repos, config, user),
      };
    },
  };
};
