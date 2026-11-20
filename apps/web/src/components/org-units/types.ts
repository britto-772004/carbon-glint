import type { OrgUnit, OrgUnitType } from '@carbon-glint/sdk';

export const ORG_UNIT_TYPES: { value: OrgUnitType; label: string }[] = [
  { value: 'hq', label: 'Headquarters' },
  { value: 'branch', label: 'Branch' },
  { value: 'plant', label: 'Plant / factory' },
  { value: 'office', label: 'Office' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'campus', label: 'Campus' },
  { value: 'store', label: 'Store' },
  { value: 'other', label: 'Other' },
];
export const typeMeta = (t: OrgUnitType) => ORG_UNIT_TYPES.find((x) => x.value === t)!;

/** Callbacks a node / row can trigger. */
export type OrgUnitActions = {
  onAddChild: (parent: OrgUnit) => void;
  onEdit: (unit: OrgUnit) => void;
  onDelete: (unit: OrgUnit) => void;
};
