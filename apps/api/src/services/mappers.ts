import type { Schemas } from '@carbon-glint/api-spec';
import type { IndustryModel, InvitationModel, TenantModel, UserModel } from '../models/index.js';
import type { TenantSummaryRow } from '../repositories/tenant.repository.js';

/** Model → DTO (spec shape). The only place DB rows become API responses. */
const iso = (d: Date) => d.toISOString();
const isoOrNull = (d: Date | null) => (d ? d.toISOString() : null);

export const toIndustryDto = (i: IndustryModel): Schemas['Industry'] => ({ id: i.id, code: i.code, name: i.name });

export const toUserDto = (u: UserModel): Schemas['User'] => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  status: u.status,
  emailVerified: u.emailVerifiedAt !== null,
  passwordIsTemporary: u.passwordIsTemporary,
  lastLoginAt: isoOrNull(u.lastLoginAt),
  createdAt: iso(u.createdAt),
});

export const toTenantDto = (t: TenantModel, industry: IndustryModel | null): Schemas['Tenant'] => ({
  id: t.id,
  name: t.name,
  emailDomain: t.emailDomain,
  status: t.status,
  onboarded: t.onboardedAt !== null,
  industry: industry ? toIndustryDto(industry) : null,
  employeeBand: t.employeeBand,
  businessUnitCount: t.businessUnitCount,
  website: t.website,
  linkedinUrl: t.linkedinUrl,
  createdAt: iso(t.createdAt),
});

export const toTenantSummaryDto = ({ tenant: t, industry, userCount }: TenantSummaryRow): Schemas['TenantSummary'] => ({
  id: t.id,
  name: t.name,
  emailDomain: t.emailDomain,
  status: t.status,
  onboarded: t.onboardedAt !== null,
  industryName: industry?.name ?? null,
  employeeBand: t.employeeBand,
  businessUnitCount: t.businessUnitCount,
  userCount,
  createdAt: iso(t.createdAt),
});

export const invitationStatus = (i: InvitationModel, now = new Date()): Schemas['Invitation']['status'] =>
  i.acceptedAt ? 'accepted' : i.revokedAt ? 'revoked' : i.expiresAt <= now ? 'expired' : 'pending';

export const toInvitationDto = (i: InvitationModel): Schemas['Invitation'] => ({
  id: i.id,
  email: i.email,
  status: invitationStatus(i),
  expiresAt: iso(i.expiresAt),
  createdAt: iso(i.createdAt),
});
