import type { Config } from '../config.js';
import type { AiClient } from '../lib/gemini.js';
import type { JobQueue } from '../jobs/types.js';
import type { FileStorage } from '../lib/storage.js';
import type { Repositories } from '../repositories/index.js';
import { createActivityDefinitionService, type ActivityDefinitionService } from './activity-definition.service.js';
import { createDataSourceService, type DataSourceService } from './data-source.service.js';
import { createTaxonomyService, type TaxonomyService } from './taxonomy.service.js';
import { createCalculationService, type CalculationService } from './calculation.service.js';
import { createEmissionsService, type EmissionsService } from './emissions.service.js';
import { createReportService, type ReportService } from './report.service.js';
import { createAssistantService, type AssistantService } from './assistant.service.js';
import { createAuthService, type AuthService } from './auth.service.js';
import { createHealthService, type HealthService } from './health.service.js';
import { createOrgUnitService, type OrgUnitService } from './org-unit.service.js';
import { createPlatformService, type PlatformService } from './platform.service.js';
import { createTeamService, type TeamService } from './team.service.js';
import { createTenantService, type TenantService } from './tenant.service.js';

export interface ServiceDeps {
  repositories: Repositories;
  ai: AiClient;
  /** Schedule background work (emails, imports, calculations). */
  jobs: JobQueue;
  /** Uploaded files and generated reports. */
  files: FileStorage;
  config: Config;
}

export interface Services {
  health: HealthService;
  auth: AuthService;
  tenant: TenantService;
  team: TeamService;
  platform: PlatformService;
  orgUnits: OrgUnitService;
  taxonomy: TaxonomyService;
  activityDefinitions: ActivityDefinitionService;
  dataSources: DataSourceService;
  calculations: CalculationService;
  emissions: EmissionsService;
  reports: ReportService;
  assistant: AssistantService;
}

export const createServices = (deps: ServiceDeps): Services => {
  const auth = createAuthService(deps);
  const calculations = createCalculationService(deps);
  const emissions = createEmissionsService(deps, calculations);
  return {
    health: createHealthService(deps),
    auth,
    tenant: createTenantService(deps),
    team: createTeamService(deps),
    platform: createPlatformService(deps, auth),
    orgUnits: createOrgUnitService(deps),
    taxonomy: createTaxonomyService(deps),
    activityDefinitions: createActivityDefinitionService(deps),
    dataSources: createDataSourceService(deps),
    calculations,
    emissions,
    reports: createReportService(deps),
    assistant: createAssistantService(deps, emissions),
  };
};
