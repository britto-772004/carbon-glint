import type { ShellTab } from '../../components/shell/AppShell';

export const TENANT_TABS: ShellTab[] = [
  { label: 'Dashboard', path: '/app/dashboard', icon: 'dashboard', tourId: 'nav-dashboard' },
  { label: 'Org Units', path: '/app/org-units', icon: 'org', tourId: 'nav-org-units' },
  {
    label: 'Activity Definitions',
    path: '/app/activity-definitions',
    icon: 'activities',
    tourId: 'nav-activity-definitions',
  },
  { label: 'Emission Factors', path: '/app/emission-factors', icon: 'factors', tourId: 'nav-emission-factors' },
  { label: 'Reports', path: '/app/reports', icon: 'reports', tourId: 'nav-reports' },
  { label: 'Assistant', path: '/app/assistant', icon: 'assistant', tourId: 'nav-assistant' },
  { label: 'Settings', path: '/app/settings', icon: 'settings', tourId: 'nav-settings' },
];
export const PLATFORM_TABS: ShellTab[] = [{ label: 'Companies', path: '/platform', icon: 'companies' }];
