import type { Health, Industry, Invitation, Me, Tenant, TenantSummary, User } from '@carbon-glint/sdk';

/**
 * Fixture builders typed with SDK types — if the spec changes, fixtures fail to compile.
 * Pattern: one `buildX(overrides)` per schema, valid by default.
 */
export const buildHealth = (overrides: Partial<Health> = {}): Health => ({
  status: 'ok',
  version: '0.1.0',
  uptimeSeconds: 42,
  checks: { database: 'up', redis: 'up' },
  ...overrides,
});

export const INDUSTRIES: Industry[] = [
  { id: '11111111-1111-4111-8111-111111111111', code: 'it_software', name: 'IT & software services' },
  { id: '22222222-2222-4222-8222-222222222222', code: 'manufacturing', name: 'Manufacturing' },
];

export const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'asha@acme.com',
  name: 'Asha Rao',
  role: 'admin',
  status: 'active',
  emailVerified: true,
  passwordIsTemporary: false,
  lastLoginAt: '2026-11-20T10:00:00.000Z',
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

export const buildTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Acme',
  emailDomain: 'acme.com',
  status: 'active',
  onboarded: true,
  industry: INDUSTRIES[0]!,
  employeeBand: '51-250',
  businessUnitCount: 3,
  website: 'https://acme.com',
  linkedinUrl: 'https://www.linkedin.com/company/acme',
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

export const buildMe = (overrides: { user?: Partial<User>; tenant?: Partial<Tenant> | null } = {}): Me => ({
  user: buildUser(overrides.user),
  tenant: overrides.tenant === null ? null : buildTenant(overrides.tenant ?? {}),
});

export const superAdminMe = (): Me =>
  buildMe({ user: { role: 'superadmin', email: 'ops@carbonglint.app', name: 'Ops' }, tenant: null });

export const buildInvitation = (overrides: Partial<Invitation> = {}): Invitation => ({
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  email: 'ben@acme.com',
  status: 'pending',
  expiresAt: '2026-11-27T10:00:00.000Z',
  createdAt: '2026-11-20T10:00:00.000Z',
  ...overrides,
});

export const buildTenantSummary = (overrides: Partial<TenantSummary> = {}): TenantSummary => ({
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Acme',
  emailDomain: 'acme.com',
  status: 'active',
  onboarded: true,
  industryName: 'IT & software services',
  employeeBand: '51-250',
  businessUnitCount: 3,
  userCount: 2,
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});
