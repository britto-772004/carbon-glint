import { useMutation } from '@tanstack/react-query';
import { signUpMutation } from '@carbon-glint/sdk';
import { SignUpForm } from '../../components/auth/SignUpForm';
import { toErrorMessage } from '../../lib/errors';

export function SignUpContainer() {
  const signUp = useMutation(signUpMutation());
  return (
    <SignUpForm
      onSubmit={(body) => signUp.mutate({ body })}
      isSubmitting={signUp.isPending}
      error={toErrorMessage(signUp.error)}
      sentTo={signUp.isSuccess ? signUp.variables.body.email : undefined}
    />
  );
}
