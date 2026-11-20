import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changePasswordMutation, getMeQueryKey, logOutMutation, type Me } from '@carbon-glint/sdk';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { AppShell } from '../../components/shell/AppShell';
import { AssistantLauncherContainer } from '../assistant/AssistantLauncherContainer';
import { PLATFORM_TABS, TENANT_TABS } from './tabs';
import { toErrorMessage } from '../../lib/errors';
import { useMe } from '../session/useMe';

/** Signed-in chrome (tenant app or platform console): tabs, account menu, sign-out, change password. */
export function ShellContainer({ variant }: { variant: 'tenant' | 'platform' }) {
  const { me } = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const logOut = useMutation({
    ...logOutMutation(),
    onSettled: () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
  const changePassword = useMutation({
    ...changePasswordMutation(),
    onSuccess: () =>
      queryClient.setQueryData<Me>(getMeQueryKey(), (old) =>
        old ? { ...old, user: { ...old.user, passwordIsTemporary: false } } : old,
      ),
  });

  const tabs = variant === 'tenant' ? TENANT_TABS : PLATFORM_TABS;
  const active = [...tabs].sort((a, b) => b.path.length - a.path.length).find((t) => pathname.startsWith(t.path));

  return (
    <AppShell
      contextLabel={variant === 'tenant' ? (me?.tenant?.name ?? '') : 'Platform admin'}
      userName={me?.user.name ?? ''}
      userEmail={me?.user.email ?? ''}
      tabs={tabs}
      activePath={active?.path ?? false}
      menuAnchor={menuAnchor}
      onOpenMenu={setMenuAnchor}
      onCloseMenu={() => setMenuAnchor(null)}
      onLogout={() => logOut.mutate({})}
      onChangePassword={() => {
        setMenuAnchor(null);
        changePassword.reset();
        setDialogOpen(true);
      }}
      showTemporaryPasswordBanner={Boolean(me?.user.passwordIsTemporary)}
      floating={
        variant === 'tenant' && !pathname.startsWith('/app/assistant') ? <AssistantLauncherContainer /> : undefined
      }
      changePassword={{
        open: dialogOpen,
        onClose: () => setDialogOpen(false),
        onSubmit: (body) => changePassword.mutate({ body }),
        isSubmitting: changePassword.isPending,
        error: toErrorMessage(changePassword.error),
        success: changePassword.isSuccess,
      }}
    >
      <Outlet />
    </AppShell>
  );
}
