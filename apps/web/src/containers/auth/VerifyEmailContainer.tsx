import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getMeQueryKey, verifyEmailMutation } from '@carbon-glint/sdk';
import { useNavigate, useSearchParams } from 'react-router';
import { VerifyEmailStatus } from '../../components/auth/VerifyEmailStatus';
import { toErrorMessage } from '../../lib/errors';
import { homePath } from '../session/useMe';

export function VerifyEmailContainer() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const started = useRef(false);

  const verify = useMutation({
    ...verifyEmailMutation(),
    onSuccess: (me) => {
      queryClient.setQueryData(getMeQueryKey(), me);
      navigate(homePath(me), { replace: true });
    },
  });
  const { mutate } = verify;

  useEffect(() => {
    if (started.current || token.length < 20) return; // links are single-use: never double-submit (StrictMode)
    started.current = true;
    mutate({ body: { token } });
  }, [token, mutate]);

  const error = token.length < 20 ? 'This verification link is incomplete.' : toErrorMessage(verify.error);
  return <VerifyEmailStatus isVerifying={!error && !verify.isSuccess} error={error} />;
}
