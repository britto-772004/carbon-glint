import { useMutation } from '@tanstack/react-query';
import { forgotPasswordMutation } from '@carbon-glint/sdk';
import { ForgotPasswordForm } from '../../components/auth/ForgotPasswordForm';
import { toErrorMessage } from '../../lib/errors';

export function ForgotPasswordContainer() {
  const forgot = useMutation(forgotPasswordMutation());
  return (
    <ForgotPasswordForm
      onSubmit={(email) => forgot.mutate({ body: { email } })}
      isSubmitting={forgot.isPending}
      sent={forgot.isSuccess}
      error={toErrorMessage(forgot.error)}
    />
  );
}
