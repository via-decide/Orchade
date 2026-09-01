import type {
  SiteAccessRequirement,
  SiteEvidenceLevel,
  SiteModuleType,
  SiteResourceClass,
} from '../public';

/**
 * Default, documented, overridable template per module type. These are explicit
 * assumptions (Part U): reasonable starting points, not validated engineering
 * coefficients. Every number here is isolated in this one file -- no magic
 * constants live inside placement, validation, or UI code.
 */
export interface SiteModuleTemplate {
  defaultWidthM: number;
  defaultDepthM: number;
  defaultCapacity?: number;
  /** null = no access requirement (e.g. a rooftop solar array needs none of its own). */
  accessRequirement: SiteAccessRequirement | null;
  /** Resource classes this module must receive at least one enabled connection for. */
  requiredResourceInputs: SiteResourceClass[];
  /** Resource classes this module can supply to others when enabled. */
  producesResourceOutputs: SiteResourceClass[];
  labourMinutesPerDay: number;
  energyConsumptionKwhPerDay: number;
  energyProductionKwhPerDay: number;
  waterConsumptionLitresPerDay: number;
  waterProductionLitresPerDay: number;
  capitalCost: number;
  operatingCostPerDay: number;
  evidenceLevel: SiteEvidenceLevel;
  /** Module types this module may legally overlap (e.g. solar mounted on a roof). */
  allowedOverlapWith: SiteModuleType[];
  /** PATH/ROAD/SERVICE_AREA are traversable: they never block the access reachability graph. */
  isTraversable: boolean;
}

export const SITE_MODULE_CATALOG: Record<SiteModuleType, SiteModuleTemplate> = {
  RESIDENCE: {
    defaultWidthM: 12, defaultDepthM: 10, accessRequirement: 'pedestrian',
    requiredResourceInputs: ['WATER', 'ENERGY'], producesResourceOutputs: [],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 6, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 2_500_000, operatingCostPerDay: 20,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: ['SOLAR_ARRAY', 'BATTERY', 'RAIN_CATCHMENT'], isTraversable: false,
  },
  WORKSHOP: {
    defaultWidthM: 8, defaultDepthM: 6, accessRequirement: 'service',
    requiredResourceInputs: ['ENERGY'], producesResourceOutputs: [],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 2, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 400_000, operatingCostPerDay: 10,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: ['SOLAR_ARRAY', 'BATTERY', 'RAIN_CATCHMENT'], isTraversable: false,
  },
  GREENHOUSE: {
    defaultWidthM: 8, defaultDepthM: 5, accessRequirement: 'operator',
    requiredResourceInputs: ['WATER'], producesResourceOutputs: ['FOOD', 'BIOMASS'],
    labourMinutesPerDay: 25, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 250_000, operatingCostPerDay: 5,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  VEGETABLE_BED: {
    defaultWidthM: 6, defaultDepthM: 4, accessRequirement: 'operator',
    requiredResourceInputs: ['WATER'], producesResourceOutputs: ['FOOD', 'BIOMASS'],
    labourMinutesPerDay: 8, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 15_000, operatingCostPerDay: 1,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  STAPLE_FIELD: {
    defaultWidthM: 15, defaultDepthM: 10, accessRequirement: 'operator',
    requiredResourceInputs: ['WATER'], producesResourceOutputs: ['FOOD', 'BIOMASS', 'FEED'],
    labourMinutesPerDay: 12, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 40_000, operatingCostPerDay: 2,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  ORCHARD: {
    defaultWidthM: 12, defaultDepthM: 12, accessRequirement: 'operator',
    requiredResourceInputs: ['WATER'], producesResourceOutputs: ['FOOD', 'BIOMASS'],
    labourMinutesPerDay: 10, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 60_000, operatingCostPerDay: 2,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  NURSERY: {
    defaultWidthM: 4, defaultDepthM: 3, accessRequirement: 'operator',
    requiredResourceInputs: ['WATER'], producesResourceOutputs: ['FOOD'],
    labourMinutesPerDay: 10, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 20_000, operatingCostPerDay: 1,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  CHICKEN_COOP: {
    defaultWidthM: 4, defaultDepthM: 3, defaultCapacity: 10, accessRequirement: 'operator',
    requiredResourceInputs: ['WATER', 'FEED'], producesResourceOutputs: ['FOOD', 'MANURE'],
    labourMinutesPerDay: 20, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 50_000, operatingCostPerDay: 5,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  SMALL_LIVESTOCK: {
    defaultWidthM: 6, defaultDepthM: 6, defaultCapacity: 4, accessRequirement: 'operator',
    requiredResourceInputs: ['WATER', 'FEED'], producesResourceOutputs: ['FOOD', 'MANURE'],
    labourMinutesPerDay: 40, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 120_000, operatingCostPerDay: 15,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  COMPOST: {
    defaultWidthM: 3, defaultDepthM: 3, accessRequirement: 'operator',
    requiredResourceInputs: ['BIOMASS'], producesResourceOutputs: ['COMPOST', 'NUTRIENTS'],
    labourMinutesPerDay: 10, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 10_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  VERMICOMPOST: {
    defaultWidthM: 2, defaultDepthM: 2, accessRequirement: 'operator',
    requiredResourceInputs: ['BIOMASS'], producesResourceOutputs: ['COMPOST', 'NUTRIENTS'],
    labourMinutesPerDay: 8, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 8_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  BIOGAS: {
    defaultWidthM: 3, defaultDepthM: 3, accessRequirement: 'maintenance',
    requiredResourceInputs: ['MANURE'], producesResourceOutputs: ['ENERGY'],
    labourMinutesPerDay: 5, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 3,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 90_000, operatingCostPerDay: 2,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  RAIN_CATCHMENT: {
    defaultWidthM: 10, defaultDepthM: 10, accessRequirement: null,
    requiredResourceInputs: [], producesResourceOutputs: ['WATER'],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 30_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: ['RESIDENCE', 'WORKSHOP', 'SHED', 'SOLAR_ARRAY', 'BATTERY'], isTraversable: false,
  },
  WATER_TANK: {
    defaultWidthM: 2, defaultDepthM: 2, defaultCapacity: 5000, accessRequirement: 'maintenance',
    requiredResourceInputs: ['WATER'], producesResourceOutputs: ['WATER'],
    labourMinutesPerDay: 2, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 60_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  POND: {
    defaultWidthM: 8, defaultDepthM: 6, defaultCapacity: 20000, accessRequirement: 'maintenance',
    requiredResourceInputs: [], producesResourceOutputs: ['WATER'],
    labourMinutesPerDay: 5, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 150_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  SOLAR_ARRAY: {
    defaultWidthM: 4, defaultDepthM: 3, defaultCapacity: 3, accessRequirement: 'maintenance',
    requiredResourceInputs: [], producesResourceOutputs: ['ENERGY'],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 210_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: ['RESIDENCE', 'WORKSHOP', 'SHED'], isTraversable: false,
  },
  BATTERY: {
    defaultWidthM: 1, defaultDepthM: 1, defaultCapacity: 10, accessRequirement: 'maintenance',
    requiredResourceInputs: ['ENERGY'], producesResourceOutputs: ['ENERGY'],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 180_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: ['RESIDENCE', 'WORKSHOP', 'SHED'], isTraversable: false,
  },
  GRID_CONNECTION: {
    defaultWidthM: 0.5, defaultDepthM: 0.5, accessRequirement: 'maintenance',
    requiredResourceInputs: [], producesResourceOutputs: ['ENERGY'],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 40_000, operatingCostPerDay: 3,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  SHED: {
    defaultWidthM: 4, defaultDepthM: 3, accessRequirement: 'service',
    requiredResourceInputs: [], producesResourceOutputs: [],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 80_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: ['SOLAR_ARRAY', 'BATTERY', 'RAIN_CATCHMENT'], isTraversable: false,
  },
  FOOD_STORAGE: {
    defaultWidthM: 3, defaultDepthM: 3, accessRequirement: 'pedestrian',
    requiredResourceInputs: [], producesResourceOutputs: [],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 1, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 60_000, operatingCostPerDay: 1,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  EQUIPMENT_STORAGE: {
    defaultWidthM: 3, defaultDepthM: 3, accessRequirement: 'service',
    requiredResourceInputs: [], producesResourceOutputs: [],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 40_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: false,
  },
  ROAD: {
    defaultWidthM: 3, defaultDepthM: 10, accessRequirement: null,
    requiredResourceInputs: [], producesResourceOutputs: [],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 50_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: true,
  },
  PATH: {
    defaultWidthM: 1, defaultDepthM: 10, accessRequirement: null,
    requiredResourceInputs: [], producesResourceOutputs: [],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 8_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: true,
  },
  SERVICE_AREA: {
    defaultWidthM: 5, defaultDepthM: 5, accessRequirement: null,
    requiredResourceInputs: [], producesResourceOutputs: [],
    labourMinutesPerDay: 0, energyConsumptionKwhPerDay: 0, energyProductionKwhPerDay: 0,
    waterConsumptionLitresPerDay: 0, waterProductionLitresPerDay: 0,
    capitalCost: 15_000, operatingCostPerDay: 0,
    evidenceLevel: 'ASSUMED', allowedOverlapWith: [], isTraversable: true,
  },
};

export function moduleTemplate(moduleType: SiteModuleType): SiteModuleTemplate {
  return SITE_MODULE_CATALOG[moduleType];
}

export function overlapIsAllowed(a: SiteModuleType, b: SiteModuleType): boolean {
  return SITE_MODULE_CATALOG[a].allowedOverlapWith.includes(b) || SITE_MODULE_CATALOG[b].allowedOverlapWith.includes(a);
}
