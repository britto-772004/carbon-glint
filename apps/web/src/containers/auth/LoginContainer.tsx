import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getMeQueryKey, logInMutation, resendVerificationMutation } from '@carbon-glint/sdk';
import { useLocation, useNavigate } from 'react-router';
import { LoginForm } from '../../components/auth/LoginForm';
import { errorCode, toErrorMessage } from '../../lib/errors';
import { homePath } from '../session/useMe';

export function LoginContainer() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const resend = useMutation(resendVerificationMutation());
  const logIn = useMutation({
    ...logInMutation(),
    onSuccess: (me) => {
      queryClient.setQueryData(getMeQueryKey(), me);
      navigate(from && homePath(me) === '/app/dashboard' && from.startsWith('/app') ? from : homePath(me), {
        replace: true,
      });
    },
  });

  return (
    <LoginForm
      onSubmit={(body) => {
        resend.reset();
        logIn.mutate({ body });
      }}
      isSubmitting={logIn.isPending}
      error={toErrorMessage(logIn.error)}
      needsVerification={errorCode(logIn.error) === 'EMAIL_NOT_VERIFIED'}
      onResendVerification={() => logIn.variables && resend.mutate({ body: { email: logIn.variables.body.email } })}
      resendSent={resend.isSuccess}
      notice={from ? 'Please sign in to continue.' : undefined}
    />
  );
}
