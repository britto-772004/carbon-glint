/** Plain file-download links (browser navigations, not API calls). */
const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api';
export const templateUrl = (format: 'xlsx' | 'csv') =>
  `${base()}/templates/activity-data${format === 'csv' ? '?format=csv' : ''}`;
export const reportDownloadUrl = (reportId: string) => `${base()}/reports/${reportId}/download`;
