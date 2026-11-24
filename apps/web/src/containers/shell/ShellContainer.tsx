import { lazy, Suspense, useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changePasswordMutation, getMeQueryKey, logOutMutation, type Me } from '@carbon-glint/sdk';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { AppShell } from '../../components/shell/AppShell';
import { PLATFORM_TABS, TENANT_TABS } from './tabs';
import { TourContainer } from '../tour/TourContainer';
import { toErrorMessage } from '../../lib/errors';
import { useMe } from '../session/useMe';
import { isDemoMode } from '../../demo/session';

/** The assistant (ECharts + markdown) loads after the shell renders. */
const NAV_OPEN_KEY = 'cg.sidebarOpen';

/** Remembered per browser; storage may be unavailable (private mode), so default to open. */
function readNavOpen(): boolean {
  try {
    return window.localStorage.getItem(NAV_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeNavOpen(open: boolean) {
  try {
    window.localStorage.setItem(NAV_OPEN_KEY, String(open));
  } catch {
    // ignore: the preference just won't persist
  }
}

const AssistantLauncherContainer = lazy(() =>
  import('../assistant/AssistantLauncherContainer').then((m) => ({ default: m.AssistantLauncherContainer })),
);

/** Signed-in chrome (tenant app or platform console): tabs, account menu, sign-out, change password. */
export function ShellContainer({ variant }: { variant: 'tenant' | 'platform' }) {
  const { me } = useMe();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(readNavOpen);
  const [tourMenuOpen, setTourMenuOpen] = useState(false);
  const onTourMenu = useCallback((open: boolean) => setTourMenuOpen(open), []);

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
      pageTitle={active?.label}
      pageSubtitle={active?.subtitle}
      navOpen={navOpen}
      onToggleNav={() =>
        setNavOpen((o) => {
          writeNavOpen(!o);
          return !o;
        })
      }
      mobileNavOpen={mobileNavOpen}
      onToggleMobileNav={() => setMobileNavOpen((o) => !o)}
      onStartTour={variant === 'tenant' ? () => setTourMenuOpen(true) : undefined}
      menuAnchor={menuAnchor}
      onOpenMenu={setMenuAnchor}
      onCloseMenu={() => setMenuAnchor(null)}
      onLogout={() => logOut.mutate({})}
      onChangePassword={() => {
        setMenuAnchor(null);
        changePassword.reset();
        setDialogOpen(true);
      }}
      isDemo={isDemoMode()}
      showTemporaryPasswordBanner={Boolean(me?.user.passwordIsTemporary)}
      floating={
        variant === 'tenant' ? (
          <>
            {!pathname.startsWith('/app/assistant') && (
              <Suspense fallback={null}>
                <AssistantLauncherContainer />
              </Suspense>
            )}
            <TourContainer
              menuOpen={tourMenuOpen}
              onMenuOpenChange={onTourMenu}
              industryCode={me?.tenant?.industry?.code}
            />
          </>
        ) : undefined
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
