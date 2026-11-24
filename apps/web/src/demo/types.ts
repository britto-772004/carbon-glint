import type {
  ActivityDefinition,
  Conversation,
  ChatMessage,
  DataSource,
  EmissionFactorSyncStatus,
  GhgCategory,
  Industry,
  Invitation,
  OrgUnit,
  OverrideRecord,
  Report,
  Tenant,
  User,
} from '@carbon-glint/sdk';

export interface DemoActivity {
  id: string;
  definitionId: string;
  dataSourceId: string;
  rowNumber: number;
  description: string;
  location: string | null;
  measure: number;
  unit: string;
  orgUnitId: string | null;
  periodStart: string;
  periodEnd: string;
  /** Seed only: the factor this row is calculated with (omitted → the demo matcher chooses). */
  factorKey?: string | null;
  /** Seed only: calculate with low confidence so the row shows "Needs review". */
  review?: boolean;
}

export interface DemoCalc {
  activityId: string;
  factorId: string | null;
  method: 'ai' | 'search' | 'override' | 'none';
  status: 'matched' | 'needs_review' | 'unmatched' | 'overridden';
  confidence: number;
  conversion: number | null;
  co2eKg: number;
  rationale: string;
  query: string;
  alternatives: Array<{
    id: string;
    name: string;
    source: string;
    co2ePerUnit: number;
    unit: string | null;
    score: number;
  }>;
  calculatedAt: string;
  override?: { type: string; reason: string; at: string; previousCo2eKg: number | null };
  /** For overrides that replace the factor with a custom value. */
  customFactor?: { value: number; unit: string };
}

export interface DemoState {
  user: User;
  tenant: Tenant;
  industries: Industry[];
  orgUnits: OrgUnit[];
  categories: GhgCategory[];
  definitions: Array<Omit<ActivityDefinition, 'dataSourceCount' | 'activityCount'>>;
  dataSources: DataSource[];
  activities: DemoActivity[];
  calcs: Map<string, DemoCalc>;
  overrides: Map<string, OverrideRecord[]>;
  reports: Report[];
  conversations: Conversation[];
  messages: Map<string, ChatMessage[]>;
  users: User[];
  invitations: Invitation[];
  sync: EmissionFactorSyncStatus;
  seq: number;
}
