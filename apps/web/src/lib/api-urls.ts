import { demoReportUrl, demoTemplateUrl } from '../demo/blobs';
import { isDemoMode } from '../demo/session';

/** Plain file-download links (browser navigations, not API calls). */
const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api';
export const templateUrl = (format: 'xlsx' | 'csv') =>
  isDemoMode() ? demoTemplateUrl() : `${base()}/templates/activity-data${format === 'csv' ? '?format=csv' : ''}`;
export const reportDownloadUrl = (reportId: string) =>
  isDemoMode() ? demoReportUrl(reportId) : `${base()}/reports/${reportId}/download`;
