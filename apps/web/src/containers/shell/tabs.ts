import type { ShellTab } from '../../components/shell/AppShell';

export const TENANT_TABS: ShellTab[] = [
  { label: 'Dashboard', path: '/app/dashboard' },
  { label: 'Org Units', path: '/app/org-units' },
  { label: 'Activity Definitions', path: '/app/activity-definitions' },
  { label: 'Emission Factors', path: '/app/emission-factors' },
  { label: 'Reports', path: '/app/reports' },
  { label: 'Assistant', path: '/app/assistant' },
  { label: 'Settings', path: '/app/settings' },
];
export const PLATFORM_TABS: ShellTab[] = [{ label: 'Companies', path: '/platform' }];
