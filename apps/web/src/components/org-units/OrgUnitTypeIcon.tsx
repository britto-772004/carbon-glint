import type { OrgUnitType } from '@carbon-glint/sdk';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import FactoryOutlined from '@mui/icons-material/FactoryOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import WarehouseOutlined from '@mui/icons-material/WarehouseOutlined';
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined';

const ICONS: Record<OrgUnitType, typeof BusinessOutlined> = {
  hq: ApartmentOutlined,
  branch: BusinessOutlined,
  plant: FactoryOutlined,
  office: WorkOutlineOutlined,
  warehouse: WarehouseOutlined,
  campus: SchoolOutlined,
  store: StorefrontOutlined,
  other: LocationOnOutlined,
};

/** Business-unit type glyph (Material icon, no emoji). */
export function OrgUnitTypeIcon({ type, ...props }: { type: OrgUnitType } & SvgIconProps) {
  const Icon = ICONS[type] ?? LocationOnOutlined;
  return <Icon aria-hidden {...props} />;
}
