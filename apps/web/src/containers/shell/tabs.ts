import type { ShellTab } from '../../components/shell/AppShell';

export const TENANT_TABS: ShellTab[] = [
  {
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: 'dashboard',
    subtitle: 'Your carbon footprint at a glance — by scope, business unit and activity.',
    tourId: 'nav-dashboard',
  },
  {
    label: 'Org Units',
    path: '/app/org-units',
    icon: 'org',
    subtitle: 'Branches, plants and campuses as a parent/child tree.',
    tourId: 'nav-org-units',
  },
  {
    label: 'Activity Definitions',
    path: '/app/activity-definitions',
    icon: 'activities',
    subtitle: 'Classify emission sources by scope and GHG category, then upload their data.',
    tourId: 'nav-activity-definitions',
  },
  {
    label: 'Emission Factors',
    path: '/app/emission-factors',
    icon: 'factors',
    subtitle: 'How much each activity definition and activity emits — and which factor it came from.',
    tourId: 'nav-emission-factors',
  },
  {
    label: 'Reports',
    path: '/app/reports',
    icon: 'reports',
    subtitle: "Export an ESG / GHG report for a business unit in your country's format.",
    tourId: 'nav-reports',
  },
  {
    label: 'Assistant',
    path: '/app/assistant',
    icon: 'assistant',
    subtitle: "Ask anything about your company's emissions — answers are grounded in your data.",
    tourId: 'nav-assistant',
  },
  {
    label: 'Settings',
    path: '/app/settings',
    icon: 'settings',
    subtitle: 'Team members, roles and system status.',
    tourId: 'nav-settings',
  },
];
export const PLATFORM_TABS: ShellTab[] = [
  { label: 'Companies', path: '/platform', icon: 'companies', subtitle: 'Every company on the platform.' },
];
