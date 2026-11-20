import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptInvitationMutation, getMeQueryKey, lookupInvitation } from '@carbon-glint/sdk';
import { useNavigate, useSearchParams } from 'react-router';
import { AcceptInviteForm } from '../../components/auth/AcceptInviteForm';
import { toErrorMessage } from '../../lib/errors';
import { homePath } from '../session/useMe';

export function AcceptInviteContainer() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: async () => (await lookupInvitation({ body: { token }, throwOnError: true })).data,
    enabled: token.length >= 20,
    retry: false,
  });
  const accept = useMutation({
    ...acceptInvitationMutation(),
    onSuccess: (me) => {
      queryClient.setQueryData(getMeQueryKey(), me);
      navigate(homePath(me), { replace: true });
    },
  });

  return (
    <AcceptInviteForm
      invitation={preview.data}
      isLoading={preview.isPending && token.length >= 20}
      loadError={token.length < 20 ? 'This invitation link is incomplete.' : toErrorMessage(preview.error)}
      onSubmit={(values) => accept.mutate({ body: { token, ...values } })}
      isSubmitting={accept.isPending}
      error={toErrorMessage(accept.error)}
    />
  );
}
