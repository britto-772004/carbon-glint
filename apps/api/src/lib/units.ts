/**
 * Unit catalogue: canonical codes, aliases, physical dimension and factor to the dimension's base unit.
 * Used to validate imported activity units and (Phase 4) convert activity quantities to emission-factor units.
 */
export type Dimension =
  | 'energy' // base kWh
  | 'volume' // base L
  | 'mass' // base kg
  | 'distance' // base km
  | 'passenger_distance' // base passenger.km
  | 'freight' // base tonne.km
  | 'area' // base m2
  | 'room_night'
  | 'count'
  | 'currency';

export interface UnitDef {
  code: string;
  label: string;
  dimension: Dimension;
  toBase: number;
  aliases: string[];
}

export const UNITS: UnitDef[] = [
  // energy
  {
    code: 'kWh',
    label: 'kilowatt-hour',
    dimension: 'energy',
    toBase: 1,
    aliases: ['kwh', 'kw h', 'kw-h', 'kilowatt hour', 'kilowatt-hours', 'units', 'unit (kwh)'],
  },
  { code: 'Wh', label: 'watt-hour', dimension: 'energy', toBase: 0.001, aliases: ['wh'] },
  { code: 'MWh', label: 'megawatt-hour', dimension: 'energy', toBase: 1000, aliases: ['mwh', 'megawatt hour'] },
  { code: 'GWh', label: 'gigawatt-hour', dimension: 'energy', toBase: 1_000_000, aliases: ['gwh'] },
  { code: 'MJ', label: 'megajoule', dimension: 'energy', toBase: 1 / 3.6, aliases: ['mj', 'megajoule', 'megajoules'] },
  {
    code: 'GJ',
    label: 'gigajoule',
    dimension: 'energy',
    toBase: 1000 / 3.6,
    aliases: ['gj', 'gigajoule', 'gigajoules'],
  },
  { code: 'therm', label: 'therm', dimension: 'energy', toBase: 29.3071, aliases: ['therms', 'thm'] },
  {
    code: 'MMBtu',
    label: 'million BTU',
    dimension: 'energy',
    toBase: 293.071,
    aliases: ['mmbtu', 'mm btu', 'million btu'],
  },
  // volume
  {
    code: 'L',
    label: 'litre',
    dimension: 'volume',
    toBase: 1,
    aliases: ['l', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters', 'lt'],
  },
  { code: 'mL', label: 'millilitre', dimension: 'volume', toBase: 0.001, aliases: ['ml'] },
  { code: 'kL', label: 'kilolitre', dimension: 'volume', toBase: 1000, aliases: ['kl', 'kilolitre', 'kiloliter'] },
  {
    code: 'm3',
    label: 'cubic metre',
    dimension: 'volume',
    toBase: 1000,
    aliases: ['m3', 'm³', 'cubic metre', 'cubic meter', 'cbm', 'scm'],
  },
  {
    code: 'gal_us',
    label: 'US gallon',
    dimension: 'volume',
    toBase: 3.785411784,
    aliases: ['gal', 'gallon', 'gallons', 'us gal', 'gal (us)'],
  },
  {
    code: 'gal_uk',
    label: 'UK gallon',
    dimension: 'volume',
    toBase: 4.54609,
    aliases: ['uk gal', 'imperial gallon', 'gal (uk)'],
  },
  // mass
  {
    code: 'kg',
    label: 'kilogram',
    dimension: 'mass',
    toBase: 1,
    aliases: ['kg', 'kgs', 'kilogram', 'kilograms', 'kilo'],
  },
  { code: 'g', label: 'gram', dimension: 'mass', toBase: 0.001, aliases: ['g', 'gram', 'grams', 'gm'] },
  {
    code: 't',
    label: 'tonne',
    dimension: 'mass',
    toBase: 1000,
    aliases: ['t', 'tonne', 'tonnes', 'metric ton', 'metric tons', 'mt', 'ton', 'tons'],
  },
  { code: 'lb', label: 'pound', dimension: 'mass', toBase: 0.45359237, aliases: ['lb', 'lbs', 'pound', 'pounds'] },
  {
    code: 'short_ton',
    label: 'short ton',
    dimension: 'mass',
    toBase: 907.18474,
    aliases: ['short ton', 'short tons', 'us ton'],
  },
  // distance
  {
    code: 'km',
    label: 'kilometre',
    dimension: 'distance',
    toBase: 1,
    aliases: ['km', 'kms', 'kilometre', 'kilometres', 'kilometer', 'kilometers'],
  },
  {
    code: 'm',
    label: 'metre',
    dimension: 'distance',
    toBase: 0.001,
    aliases: ['m', 'metre', 'meter', 'metres', 'meters'],
  },
  { code: 'mile', label: 'mile', dimension: 'distance', toBase: 1.609344, aliases: ['mi', 'mile', 'miles'] },
  {
    code: 'passenger.km',
    label: 'passenger-kilometre',
    dimension: 'passenger_distance',
    toBase: 1,
    aliases: ['pkm', 'p.km', 'passenger km', 'passenger-km', 'passenger.km', 'passenger kilometre'],
  },
  {
    code: 'passenger.mile',
    label: 'passenger-mile',
    dimension: 'passenger_distance',
    toBase: 1.609344,
    aliases: ['pmi', 'passenger mile', 'passenger-mile', 'passenger.mile'],
  },
  {
    code: 'tonne.km',
    label: 'tonne-kilometre',
    dimension: 'freight',
    toBase: 1,
    aliases: ['tkm', 't.km', 'tonne km', 'tonne-km', 'tonne.km', 'ton km', 'ton-km'],
  },
  {
    code: 'ton.mile',
    label: 'ton-mile',
    dimension: 'freight',
    toBase: 1.459972,
    aliases: ['ton mile', 'ton-mile', 'ton.mile'],
  },
  // other
  {
    code: 'm2',
    label: 'square metre',
    dimension: 'area',
    toBase: 1,
    aliases: ['m2', 'm²', 'sqm', 'sq m', 'square metre', 'square meter'],
  },
  {
    code: 'sqft',
    label: 'square foot',
    dimension: 'area',
    toBase: 0.09290304,
    aliases: ['sqft', 'sq ft', 'ft2', 'square foot', 'square feet'],
  },
  {
    code: 'room.night',
    label: 'room-night',
    dimension: 'room_night',
    toBase: 1,
    aliases: [
      'room night',
      'room nights',
      'room-night',
      'room.night',
      'night',
      'nights',
      'hotel night',
      'hotel nights',
    ],
  },
  {
    code: 'unit',
    label: 'unit / item',
    dimension: 'count',
    toBase: 1,
    aliases: ['unit', 'units (count)', 'item', 'items', 'each', 'pcs', 'piece', 'pieces', 'nos', 'no', 'number'],
  },
  // currency (spend-based; no cross-currency conversion here)
  ...['USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR', 'AUD', 'SGD', 'JPY', 'CNY', 'CAD'].map((c) => ({
    code: c,
    label: c,
    dimension: 'currency' as const,
    toBase: 1,
    aliases: [c.toLowerCase()],
  })),
];

const byAlias = new Map<string, UnitDef>();
for (const u of UNITS) {
  byAlias.set(u.code.toLowerCase(), u);
  for (const a of u.aliases) byAlias.set(a.toLowerCase(), u);
}

/** Resolve free-text unit ("Litres", "kWh ", "TONNES") to a catalogue unit, or null. */
export function normalizeUnit(raw: string): UnitDef | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return byAlias.get(key) ?? byAlias.get(key.replace(/\.$/, '')) ?? null;
}

export const findUnit = (code: string): UnitDef | undefined => UNITS.find((u) => u.code === code);

/** Factor to convert a quantity in `from` into `to` (null when dimensions differ or currencies differ). */
export function conversionFactor(from: string, to: string): number | null {
  const a = findUnit(from) ?? normalizeUnit(from);
  const b = findUnit(to) ?? normalizeUnit(to);
  if (!a || !b || a.dimension !== b.dimension) return null;
  if (a.dimension === 'currency' && a.code !== b.code) return null;
  return a.toBase / b.toBase;
}
