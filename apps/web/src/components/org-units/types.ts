import type { OrgUnit, OrgUnitType } from '@carbon-glint/sdk';

export const ORG_UNIT_TYPES: { value: OrgUnitType; label: string; icon: string }[] = [
  { value: 'hq', label: 'Headquarters', icon: '🏛️' },
  { value: 'branch', label: 'Branch', icon: '🏢' },
  { value: 'plant', label: 'Plant / factory', icon: '🏭' },
  { value: 'office', label: 'Office', icon: '🏬' },
  { value: 'warehouse', label: 'Warehouse', icon: '📦' },
  { value: 'campus', label: 'Campus', icon: '🎓' },
  { value: 'store', label: 'Store', icon: '🛍️' },
  { value: 'other', label: 'Other', icon: '📍' },
];
export const typeMeta = (t: OrgUnitType) => ORG_UNIT_TYPES.find((x) => x.value === t)!;

/** Callbacks a node / row can trigger. */
export type OrgUnitActions = {
  onAddChild: (parent: OrgUnit) => void;
  onEdit: (unit: OrgUnit) => void;
  onDelete: (unit: OrgUnit) => void;
};
