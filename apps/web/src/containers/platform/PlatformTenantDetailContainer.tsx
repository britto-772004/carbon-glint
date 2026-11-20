import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPlatformTenantOptions,
  getPlatformTenantQueryKey,
  platformResendVerificationMutation,
  updatePlatformTenantMutation,
  updatePlatformUserMutation,
} from '@carbon-glint/sdk';
import { useNavigate, useParams } from 'react-router';
import { TenantDetailPanel } from '../../components/platform/TenantDetailPanel';
import { toErrorMessage } from '../../lib/errors';

export function PlatformTenantDetailContainer() {
  const { tenantId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detail = useQuery(getPlatformTenantOptions({ path: { tenantId } }));
  const refresh = () => queryClient.invalidateQueries({ queryKey: getPlatformTenantQueryKey({ path: { tenantId } }) });

  const setTenant = useMutation({ ...updatePlatformTenantMutation(), onSuccess: refresh });
  const setUser = useMutation({ ...updatePlatformUserMutation(), onSuccess: refresh });
  const resend = useMutation(platformResendVerificationMutation());

  return (
    <TenantDetailPanel
      detail={detail.data}
      isLoading={detail.isPending}
      error={toErrorMessage(detail.error ?? setTenant.error ?? setUser.error ?? resend.error)}
      onBack={() => navigate('/platform')}
      onSetTenantStatus={(status) => setTenant.mutate({ path: { tenantId }, body: { status } })}
      onSetUserStatus={(userId, status) => setUser.mutate({ path: { userId }, body: { status } })}
      onResendVerification={(userId) => resend.mutate({ path: { userId } })}
      notice={resend.isSuccess ? 'Verification email sent.' : undefined}
    />
  );
}
