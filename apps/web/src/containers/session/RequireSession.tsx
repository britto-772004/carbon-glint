import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '../../components/common/FullPageLoader';
import { homePath, useMe } from './useMe';

export type SessionGate = 'guest' | 'onboarding' | 'tenant' | 'superadmin';

/**
 * Route guard. guest: only signed-out users (else → their home). onboarding: tenant admin not yet onboarded.
 * tenant: onboarded tenant admin. superadmin: platform operator.
 */
export function RequireSession({ gate }: { gate: SessionGate }) {
  const { me, isPending } = useMe();
  const location = useLocation();

  if (isPending) return <FullPageLoader />;
  if (gate === 'guest') return me ? <Navigate to={homePath(me)} replace /> : <Outlet />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const home = homePath(me);
  const allowed =
    (gate === 'superadmin' && me.user.role === 'superadmin') ||
    (gate === 'onboarding' && home === '/onboarding') ||
    (gate === 'tenant' && home === '/app/dashboard');
  return allowed ? <Outlet /> : <Navigate to={home} replace />;
}
