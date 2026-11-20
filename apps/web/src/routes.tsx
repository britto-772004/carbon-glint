import { Navigate, type RouteObject } from 'react-router';
import { ComingSoon } from './components/common/ComingSoon';
import { LandingContainer } from './containers/LandingContainer';
import { AcceptInviteContainer } from './containers/auth/AcceptInviteContainer';
import { ForgotPasswordContainer } from './containers/auth/ForgotPasswordContainer';
import { LoginContainer } from './containers/auth/LoginContainer';
import { SignUpContainer } from './containers/auth/SignUpContainer';
import { VerifyEmailContainer } from './containers/auth/VerifyEmailContainer';
import { ActivityDefinitionDetailContainer } from './containers/activity-definitions/ActivityDefinitionDetailContainer';
import { ActivityDefinitionsContainer } from './containers/activity-definitions/ActivityDefinitionsContainer';
import { DashboardContainer } from './containers/dashboard/DashboardContainer';
import { EmissionFactorsContainer } from './containers/emissions/EmissionFactorsContainer';
import { OrgUnitsContainer } from './containers/org-units/OrgUnitsContainer';
import { OnboardingContainer } from './containers/onboarding/OnboardingContainer';
import { PlatformTenantDetailContainer } from './containers/platform/PlatformTenantDetailContainer';
import { PlatformTenantsContainer } from './containers/platform/PlatformTenantsContainer';
import { RequireSession } from './containers/session/RequireSession';
import { SettingsContainer } from './containers/settings/SettingsContainer';
import { ShellContainer } from './containers/shell/ShellContainer';

const soon = (title: string, description: string) => <ComingSoon title={title} description={description} />;

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
          { path: 'dashboard', element: <DashboardContainer /> },
          { path: 'org-units', element: <OrgUnitsContainer /> },
          { path: 'activity-definitions', element: <ActivityDefinitionsContainer /> },
          { path: 'activity-definitions/:activityDefinitionId', element: <ActivityDefinitionDetailContainer /> },
          { path: 'emission-factors', element: <EmissionFactorsContainer /> },
          { path: 'reports', element: soon('Reports', 'Country-format ESG reports.') },
          { path: 'assistant', element: soon('Assistant', 'Ask questions about your emissions.') },
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
