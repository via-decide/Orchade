export type CanonicalPhysicalUnit =
  | 'm2'
  | 'L'
  | 'mm'
  | 'kWh'
  | 'W'
  | 'degC'
  | 'kg'
  | 'kcal'
  | 'min'
  | 'day'
  | 'percent'
  | 'ratio'
  | 'L/min'
  | 'INR'
  | 'index';

export type ConvertiblePhysicalUnit =
  | CanonicalPhysicalUnit
  | 'acre'
  | 'sqft'
  | 'gal_us'
  | 'in'
  | 'Wh'
  | 'gal_us/min';

export const SQUARE_METRES_PER_ACRE = 4046.8564224;
export const SQUARE_METRES_PER_SQUARE_FOOT = 0.09290304;
export const LITRES_PER_US_GALLON = 3.785411784;
export const MILLIMETRES_PER_INCH = 25.4;
export const KWH_PER_WH = 0.001;

const finite = (value: number): number => {
  if (!Number.isFinite(value)) throw new Error('Physical unit conversion requires a finite numeric value.');
  return value;
};

export const acreToM2 = (acre: number): number => finite(acre) * SQUARE_METRES_PER_ACRE;
export const m2ToAcre = (m2: number): number => finite(m2) / SQUARE_METRES_PER_ACRE;
export const sqftToM2 = (sqft: number): number => finite(sqft) * SQUARE_METRES_PER_SQUARE_FOOT;
export const m2ToSqft = (m2: number): number => finite(m2) / SQUARE_METRES_PER_SQUARE_FOOT;
export const usGallonToL = (gallons: number): number => finite(gallons) * LITRES_PER_US_GALLON;
export const lToUsGallon = (litres: number): number => finite(litres) / LITRES_PER_US_GALLON;
export const inchToMm = (inches: number): number => finite(inches) * MILLIMETRES_PER_INCH;
export const mmToInch = (millimetres: number): number => finite(millimetres) / MILLIMETRES_PER_INCH;
export const whToKwh = (wh: number): number => finite(wh) * KWH_PER_WH;
export const kwhToWh = (kwh: number): number => finite(kwh) / KWH_PER_WH;

export function normalizeUnitToken(unit: string): ConvertiblePhysicalUnit | string {
  const normalized = unit.trim().toLowerCase();
  const aliases: Record<string, ConvertiblePhysicalUnit> = {
    'm²': 'm2',
    'm2': 'm2',
    'acre': 'acre',
    'acres': 'acre',
    'sqft': 'sqft',
    'ft2': 'sqft',
    'ft²': 'sqft',
    'l': 'L',
    'litre': 'L',
    'litres': 'L',
    'liter': 'L',
    'liters': 'L',
    'gal': 'gal_us',
    'gallon': 'gal_us',
    'gallons': 'gal_us',
    'gal_us': 'gal_us',
    'mm': 'mm',
    'in': 'in',
    'inch': 'in',
    'inches': 'in',
    'kwh': 'kWh',
    'wh': 'Wh',
    'w': 'W',
    '°c': 'degC',
    'degc': 'degC',
    'c': 'degC',
    'kg': 'kg',
    'kcal': 'kcal',
    'min': 'min',
    'minute': 'min',
    'minutes': 'min',
    'day': 'day',
    'days': 'day',
    '%': 'percent',
    'percent': 'percent',
    'ratio': 'ratio',
    'l/min': 'L/min',
    'lpm': 'L/min',
    'gal_us/min': 'gal_us/min',
    'gpm': 'gal_us/min',
    'inr': 'INR',
    'index': 'index',
  };
  return aliases[normalized] ?? unit.trim();
}

export function convertPhysicalUnit(
  value: number,
  fromUnit: ConvertiblePhysicalUnit | string,
  toUnit: ConvertiblePhysicalUnit | string,
): number {
  const from = normalizeUnitToken(fromUnit);
  const to = normalizeUnitToken(toUnit);
  finite(value);
  if (from === to) return value;
  if (from === 'acre' && to === 'm2') return acreToM2(value);
  if (from === 'm2' && to === 'acre') return m2ToAcre(value);
  if (from === 'sqft' && to === 'm2') return sqftToM2(value);
  if (from === 'm2' && to === 'sqft') return m2ToSqft(value);
  if (from === 'gal_us' && to === 'L') return usGallonToL(value);
  if (from === 'L' && to === 'gal_us') return lToUsGallon(value);
  if (from === 'in' && to === 'mm') return inchToMm(value);
  if (from === 'mm' && to === 'in') return mmToInch(value);
  if (from === 'Wh' && to === 'kWh') return whToKwh(value);
  if (from === 'kWh' && to === 'Wh') return kwhToWh(value);
  if (from === 'gal_us/min' && to === 'L/min') return usGallonToL(value);
  if (from === 'L/min' && to === 'gal_us/min') return lToUsGallon(value);
  throw new Error(`Unsupported physical unit conversion: ${String(from)} -> ${String(to)}.`);
}
