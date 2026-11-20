import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { FullPageLoader } from './components/common/FullPageLoader';
import { LandingContainer } from './containers/LandingContainer';
import { AcceptInviteContainer } from './containers/auth/AcceptInviteContainer';
import { ForgotPasswordContainer } from './containers/auth/ForgotPasswordContainer';
import { LoginContainer } from './containers/auth/LoginContainer';
import { SignUpContainer } from './containers/auth/SignUpContainer';
import { VerifyEmailContainer } from './containers/auth/VerifyEmailContainer';
import { ActivityDefinitionsContainer } from './containers/activity-definitions/ActivityDefinitionsContainer';
import { OnboardingContainer } from './containers/onboarding/OnboardingContainer';
import { PlatformTenantDetailContainer } from './containers/platform/PlatformTenantDetailContainer';
import { PlatformTenantsContainer } from './containers/platform/PlatformTenantsContainer';
import { RequireSession } from './containers/session/RequireSession';
import { SettingsContainer } from './containers/settings/SettingsContainer';
import { ShellContainer } from './containers/shell/ShellContainer';

/** Heavy pages (charts, React Flow, wizards) load on demand. */
const OrgUnitsContainer = lazy(() =>
  import('./containers/org-units/OrgUnitsContainer').then((m) => ({ default: m.OrgUnitsContainer })),
);
const ActivityDefinitionDetailContainer = lazy(() =>
  import('./containers/activity-definitions/ActivityDefinitionDetailContainer').then((m) => ({
    default: m.ActivityDefinitionDetailContainer,
  })),
);
const EmissionFactorsContainer = lazy(() =>
  import('./containers/emissions/EmissionFactorsContainer').then((m) => ({ default: m.EmissionFactorsContainer })),
);
const DashboardContainer = lazy(() =>
  import('./containers/dashboard/DashboardContainer').then((m) => ({ default: m.DashboardContainer })),
);
const ReportsContainer = lazy(() =>
  import('./containers/reports/ReportsContainer').then((m) => ({ default: m.ReportsContainer })),
);
const AssistantContainer = lazy(() =>
  import('./containers/assistant/AssistantContainer').then((m) => ({ default: m.AssistantContainer })),
);
const page = (node: ReactNode) => <Suspense fallback={<FullPageLoader />}>{node}</Suspense>;

/** All routes (used by the browser router and by tests via createMemoryRouter). */
export const routes: RouteObject[] = [
  { path: '/', element: <LandingContainer /> },
  {
    element: <RequireSession gate="guest" />,
    children: [
      { path: '/signup', element: <SignUpContainer /> },
      { path: '/login', element: <LoginContainer /> },
      { path: '/forgot-password', element: <ForgotPasswordContainer /> },
    ],
  },
  { path: '/verify-email', element: <VerifyEmailContainer /> },
  { path: '/invite', element: <AcceptInviteContainer /> },
  {
    element: <RequireSession gate="onboarding" />,
    children: [{ path: '/onboarding', element: <OnboardingContainer /> }],
  },
  {
    path: '/app',
    element: <RequireSession gate="tenant" />,
    children: [
      {
        element: <ShellContainer variant="tenant" />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: 'dashboard', element: page(<DashboardContainer />) },
          { path: 'org-units', element: page(<OrgUnitsContainer />) },
          { path: 'activity-definitions', element: <ActivityDefinitionsContainer /> },
          { path: 'activity-definitions/:activityDefinitionId', element: page(<ActivityDefinitionDetailContainer />) },
          { path: 'emission-factors', element: page(<EmissionFactorsContainer />) },
          { path: 'reports', element: page(<ReportsContainer />) },
          { path: 'assistant', element: page(<AssistantContainer />) },
          { path: 'settings', element: <SettingsContainer /> },
        ],
      },
    ],
  },
  {
    path: '/platform',
    element: <RequireSession gate="superadmin" />,
    children: [
      {
        element: <ShellContainer variant="platform" />,
        children: [
          { index: true, element: <PlatformTenantsContainer /> },
          { path: 'tenants/:tenantId', element: <PlatformTenantDetailContainer /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];
