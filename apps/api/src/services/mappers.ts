import type { Schemas } from '@carbon-glint/api-spec';
import type {
  ActivityModel,
  DataSourceModel,
  GhgCategoryModel,
  IndustryModel,
  InvitationModel,
  OrgUnitModel,
  TenantModel,
  UserModel,
} from '../models/index.js';
import type { DefinitionRow } from '../repositories/activity-definition.repository.js';
import type { TenantSummaryRow } from '../repositories/tenant.repository.js';

/** Model → DTO (spec shape). The only place DB rows become API responses. */
const iso = (d: Date) => d.toISOString();
const isoOrNull = (d: Date | null) => (d ? d.toISOString() : null);

export const toIndustryDto = (i: IndustryModel): Schemas['Industry'] => ({ id: i.id, code: i.code, name: i.name });

export const toUserDto = (u: UserModel): Schemas['User'] => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  status: u.status,
  emailVerified: u.emailVerifiedAt !== null,
  passwordIsTemporary: u.passwordIsTemporary,
  lastLoginAt: isoOrNull(u.lastLoginAt),
  createdAt: iso(u.createdAt),
});

export const toTenantDto = (t: TenantModel, industry: IndustryModel | null): Schemas['Tenant'] => ({
  id: t.id,
  name: t.name,
  emailDomain: t.emailDomain,
  status: t.status,
  onboarded: t.onboardedAt !== null,
  industry: industry ? toIndustryDto(industry) : null,
  employeeBand: t.employeeBand,
  businessUnitCount: t.businessUnitCount,
  website: t.website,
  linkedinUrl: t.linkedinUrl,
  createdAt: iso(t.createdAt),
});

export const toTenantSummaryDto = ({ tenant: t, industry, userCount }: TenantSummaryRow): Schemas['TenantSummary'] => ({
  id: t.id,
  name: t.name,
  emailDomain: t.emailDomain,
  status: t.status,
  onboarded: t.onboardedAt !== null,
  industryName: industry?.name ?? null,
  employeeBand: t.employeeBand,
  businessUnitCount: t.businessUnitCount,
  userCount,
  createdAt: iso(t.createdAt),
});

export const invitationStatus = (i: InvitationModel, now = new Date()): Schemas['Invitation']['status'] =>
  i.acceptedAt ? 'accepted' : i.revokedAt ? 'revoked' : i.expiresAt <= now ? 'expired' : 'pending';

export const toInvitationDto = (i: InvitationModel): Schemas['Invitation'] => ({
  id: i.id,
  email: i.email,
  status: invitationStatus(i),
  expiresAt: iso(i.expiresAt),
  createdAt: iso(i.createdAt),
});

export const toOrgUnitDto = (o: OrgUnitModel): Schemas['OrgUnit'] => ({
  id: o.id,
  parentId: o.parentId,
  name: o.name,
  code: o.code,
  type: o.type,
  country: o.country,
  city: o.city,
  address: o.address,
  active: o.active,
  createdAt: iso(o.createdAt),
});

type Scope = Schemas['Scope'];
const scopeOf = (n: number) => n as Scope;

export const toGhgCategoryDto = (c: GhgCategoryModel, rank: number | null): Schemas['GhgCategory'] => ({
  id: c.id,
  scope: scopeOf(c.scope),
  code: c.code,
  name: c.name,
  description: c.description,
  custom: c.tenantId !== null,
  recommended: rank !== null,
  rank,
});

export const toActivityDefinitionDto = ({
  definition: d,
  category,
  dataSourceCount,
  activityCount,
}: DefinitionRow): Schemas['ActivityDefinition'] => ({
  id: d.id,
  name: d.name,
  description: d.description,
  scope: scopeOf(d.scope),
  category: { id: category.id, code: category.code, name: category.name, scope: scopeOf(category.scope) },
  defaultOrgUnitId: d.defaultOrgUnitId,
  periodStart: d.periodStart,
  periodEnd: d.periodEnd,
  status: d.status,
  publishedAt: isoOrNull(d.publishedAt),
  dataSourceCount,
  activityCount,
  createdAt: iso(d.createdAt),
});

export const toDataSourceDto = (d: DataSourceModel): Schemas['DataSource'] => ({
  id: d.id,
  activityDefinitionId: d.activityDefinitionId,
  fileName: d.fileName,
  fileType: d.fileType,
  fileSize: d.fileSize,
  sheets: d.sheets,
  sheetName: d.sheetName,
  headerRow: d.headerRow,
  columns: d.columns,
  preview: d.preview,
  rowCount: d.rowCount,
  mapping: d.mapping,
  mappingMode: d.mappingMode,
  status: d.status,
  importedCount: d.importedCount,
  errorCount: d.errorCount,
  errors: d.errors,
  importedAt: isoOrNull(d.importedAt),
  createdAt: iso(d.createdAt),
});

export const toActivityDto = (a: ActivityModel): Schemas['Activity'] => ({
  id: a.id,
  dataSourceId: a.dataSourceId,
  rowNumber: a.rowNumber,
  description: a.description,
  location: a.location,
  measure: a.measure,
  unit: a.unit,
  orgUnitId: a.orgUnitId,
  periodStart: a.periodStart,
  periodEnd: a.periodEnd,
  spend: a.spend,
  currency: a.currency,
});
