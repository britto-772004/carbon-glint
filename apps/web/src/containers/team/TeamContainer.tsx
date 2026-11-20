import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createInvitationMutation,
  listInvitationsOptions,
  listInvitationsQueryKey,
  listUsersOptions,
  listUsersQueryKey,
  resendInvitationMutation,
  revokeInvitationMutation,
  updateUserMutation,
} from '@carbon-glint/sdk';
import { TeamPanel } from '../../components/team/TeamPanel';
import { toErrorMessage } from '../../lib/errors';
import { useMe } from '../session/useMe';

export function TeamContainer() {
  const { me } = useMe();
  const queryClient = useQueryClient();
  const users = useQuery(listUsersOptions());
  const invitations = useQuery(listInvitationsOptions());
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: listUsersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: listInvitationsQueryKey() }),
    ]);

  const invite = useMutation({ ...createInvitationMutation(), onSuccess: refresh });
  const revoke = useMutation({ ...revokeInvitationMutation(), onSuccess: refresh });
  const resend = useMutation({ ...resendInvitationMutation(), onSuccess: refresh });
  const setStatus = useMutation({ ...updateUserMutation(), onSuccess: refresh });

  return (
    <TeamPanel
      users={users.data}
      invitations={invitations.data}
      isLoading={users.isPending || invitations.isPending}
      error={toErrorMessage(users.error ?? invitations.error ?? setStatus.error ?? revoke.error ?? resend.error)}
      currentUserId={me?.user.id ?? ''}
      emailDomain={me?.tenant?.emailDomain ?? ''}
      onInvite={(email) => invite.mutate({ body: { email } })}
      isInviting={invite.isPending}
      inviteError={toErrorMessage(invite.error)}
      inviteSentTo={invite.isSuccess ? invite.data.email : undefined}
      onRevoke={(invitationId) => revoke.mutate({ path: { invitationId } })}
      onResend={(invitationId) => resend.mutate({ path: { invitationId } })}
      onSetUserStatus={(userId, status) => setStatus.mutate({ path: { userId }, body: { status } })}
    />
  );
}
