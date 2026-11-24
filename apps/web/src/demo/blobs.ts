/**
 * Download links in demo mode. The generated files (report PDFs) are registered here by the fake API
 * (lazy chunk); this tiny module is safe to import statically from lib/api-urls.
 */
const urls = new Map<string, string>();

export const registerDemoReportUrl = (reportId: string, url: string) => urls.set(reportId, url);
export const hasDemoReportUrl = (reportId: string) => urls.has(reportId);
export const demoReportUrl = (reportId: string): string => urls.get(reportId) ?? '#';

const TEMPLATE_CSV = [
  'Activity Description,Location,Measure,Unit,Period Start,Period End,Spend,Currency',
  'Grid electricity - office,"Bengaluru, IN",18450,kWh,2026-01-01,2026-03-31,166050,INR',
  'Diesel - DG set backup power,"Bengaluru, IN",1200,L,2026-01-01,2026-03-31,108000,INR',
  'Petrol - company cars,"Bengaluru, IN",640,L,2026-01-01,2026-03-31,65280,INR',
  'Natural gas - boiler,"Pune, IN",5200,m3,2026-01-01,2026-03-31,',
  'Flight BLR - DXB return (economy),"Bengaluru, IN",4880,passenger.km,2026-02-10,2026-02-14,',
].join('\n');
export const demoTemplateUrl = (): string => `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`;
