/**
 * Public contracts for ORCHADE SITE PLANNER 001.
 *
 * Scope of this first slice: canonical geometry, module placement, spatial
 * validation, and the site -> homestead scenario compiler. UI, revisions,
 * comparison, and the bottleneck panel are later slices (see docs/SITE_PLANNER.md).
 */
import type { HomesteadScenarioDefinition } from '../../src/simulation/homestead/scenario';

export type MeasurementSystem = 'metric' | 'imperial';

export interface SitePoint2D {
  xM: number;
  yM: number;
}

export type SiteAccessPointType = 'main-gate' | 'service-access' | 'pedestrian' | 'vehicle';

export interface SiteAccessPoint {
  id: string;
  type: SiteAccessPointType;
  position: SitePoint2D;
}

export interface SiteExcludedZone {
  id: string;
  polygon: SitePoint2D[];
  reason: string;
}

export interface SiteExistingStructure {
  id: string;
  polygon: SitePoint2D[];
  label: string;
}

/** Canonical site geometry contract (Part A). Internal geometry is always SI (metres). */
export interface SiteGeometry {
  siteGeometryId: string;
  schemaVersion: number;
  revision: string;
  measurementSystem: MeasurementSystem;
  boundaryPolygon: SitePoint2D[];
  northBearingDegrees: number;
  accessPoints: SiteAccessPoint[];
  excludedZones: SiteExcludedZone[];
  existingStructures: SiteExistingStructure[];
}

export const SITE_GEOMETRY_SCHEMA_VERSION = 1;

/** The 23 initial module classes (Part B). */
export type SiteModuleType =
  | 'RESIDENCE'
  | 'WORKSHOP'
  | 'GREENHOUSE'
  | 'VEGETABLE_BED'
  | 'STAPLE_FIELD'
  | 'ORCHARD'
  | 'NURSERY'
  | 'CHICKEN_COOP'
  | 'SMALL_LIVESTOCK'
  | 'COMPOST'
  | 'VERMICOMPOST'
  | 'BIOGAS'
  | 'RAIN_CATCHMENT'
  | 'WATER_TANK'
  | 'POND'
  | 'SOLAR_ARRAY'
  | 'BATTERY'
  | 'GRID_CONNECTION'
  | 'SHED'
  | 'FOOD_STORAGE'
  | 'EQUIPMENT_STORAGE'
  | 'ROAD'
  | 'PATH'
  | 'SERVICE_AREA';

/** Resource classes flowing between modules (Part E). */
export type SiteResourceClass =
  | 'WATER' | 'ENERGY' | 'FOOD' | 'FEED' | 'BIOMASS' | 'MANURE' | 'COMPOST' | 'NUTRIENTS' | 'LABOUR' | 'CASH';

export type SiteAccessRequirement = 'pedestrian' | 'service' | 'vehicle' | 'maintenance' | 'operator';

export type SiteEvidenceLevel = 'MEASURED' | 'VERIFIED' | 'DERIVED' | 'ASSUMED';

export interface SiteModuleGeometry {
  /** Bottom-left corner of the (pre-rotation) footprint rectangle, in site-local metres. */
  anchor: SitePoint2D;
  widthM: number;
  depthM: number;
}

export interface SiteLabourProfile {
  minutesPerDay: number;
}

export interface SiteEnergyProfile {
  consumptionKwhPerDay: number;
  productionKwhPerDay: number;
}

export interface SiteWaterProfile {
  consumptionLitresPerDay: number;
  productionLitresPerDay: number;
}

export interface SiteEconomicProfile {
  capitalCost: number;
  operatingCostPerDay: number;
}

export interface SiteResourceProfile {
  resourceClass: SiteResourceClass;
  /** Meaning depends on resourceClass; see docs/SITE_RESOURCE_GRAPH.md for units. */
  ratePerDay: number;
}

/** Typed site module contract (Part B). */
export interface SiteModuleDefinition {
  moduleId: string;
  moduleType: SiteModuleType;
  geometry: SiteModuleGeometry;
  rotationDegrees: number;
  footprintM2: number;
  capacity?: number;
  /** Hard prerequisites: other moduleIds that must exist and be enabled. Must stay acyclic. */
  dependencies: string[];
  resourceInputs: SiteResourceProfile[];
  resourceOutputs: SiteResourceProfile[];
  labourProfile: SiteLabourProfile;
  energyProfile: SiteEnergyProfile;
  waterProfile: SiteWaterProfile;
  economicProfile: SiteEconomicProfile;
  evidenceLevel: SiteEvidenceLevel;
  enabled: boolean;
}

/** Explicit resource flow between two modules (Part E). Never inferred from proximity. */
export interface SiteResourceConnection {
  id: string;
  fromModuleId: string;
  toModuleId: string;
  resourceClass: SiteResourceClass;
}

export interface SiteRevisionMetadata {
  revisionId: string;
  parentRevisionId?: string;
  createdAt: string;
  changes: string[];
  rationale: string;
  evidenceRefs: string[];
}

/** The aggregate root for a site design (Parts A-F, L). */
export interface SiteProject {
  siteProjectId: string;
  schemaVersion: number;
  title: string;
  measurementSystem: MeasurementSystem;
  householdSize: number;
  planningHorizonDays: number;
  seed: string;
  geometry: SiteGeometry;
  modules: SiteModuleDefinition[];
  connections: SiteResourceConnection[];
  revision: SiteRevisionMetadata;
}

export const SITE_PROJECT_SCHEMA_VERSION = 1;

export type SitePlacementIntentType =
  | 'PLACE_MODULE' | 'MOVE_MODULE' | 'ROTATE_MODULE' | 'RESIZE_MODULE' | 'REMOVE_MODULE' | 'ENABLE_MODULE' | 'DISABLE_MODULE';

export interface SitePlacementIntent {
  type: SitePlacementIntentType;
  moduleId: string;
  moduleType?: SiteModuleType;
  anchor?: SitePoint2D;
  widthM?: number;
  depthM?: number;
  rotationDegrees?: number;
  capacity?: number;
}

/**
 * FATAL failures reject the placement/compile outright (fail closed, state unchanged).
 * ADVISORY failures are reported but do not block placement or compilation, because
 * they can legitimately be resolved by a later placement/connection in the same session.
 */
export type SiteValidationFailureType =
  | 'INVALID_SITE_GEOMETRY'
  | 'OUTSIDE_BOUNDARY'
  | 'MODULE_OVERLAP'
  | 'INSUFFICIENT_AREA'
  | 'INVALID_DIMENSIONS'
  | 'EXCLUDED_ZONE_COLLISION'
  | 'DUPLICATE_MODULE_ID'
  | 'CIRCULAR_MODULE_DEPENDENCY'
  | 'INVALID_INTENT'
  | 'ACCESS_BLOCKED'
  | 'RESOURCE_CONNECTION_MISSING'
  | 'MODULE_DEPENDENCY_MISSING';

export const FATAL_SITE_FAILURE_TYPES: readonly SiteValidationFailureType[] = [
  'INVALID_SITE_GEOMETRY',
  'OUTSIDE_BOUNDARY',
  'MODULE_OVERLAP',
  'INSUFFICIENT_AREA',
  'INVALID_DIMENSIONS',
  'EXCLUDED_ZONE_COLLISION',
  'DUPLICATE_MODULE_ID',
  'CIRCULAR_MODULE_DEPENDENCY',
  'INVALID_INTENT',
];

export const ADVISORY_SITE_FAILURE_TYPES: readonly SiteValidationFailureType[] = [
  'ACCESS_BLOCKED',
  'RESOURCE_CONNECTION_MISSING',
  'MODULE_DEPENDENCY_MISSING',
];

export interface SiteValidationFailure {
  type: SiteValidationFailureType;
  moduleId?: string;
  reason: string;
  evidence: Record<string, unknown>;
}

export interface SiteEvent {
  type:
    | 'MODULE_PLACED' | 'MODULE_MOVED' | 'MODULE_ROTATED' | 'MODULE_RESIZED'
    | 'MODULE_REMOVED' | 'MODULE_ENABLED' | 'MODULE_DISABLED' | 'INTENT_REJECTED';
  moduleId: string;
  payload: Record<string, unknown>;
}

export interface SitePlacementResult {
  project: SiteProject;
  accepted: boolean;
  failures: SiteValidationFailure[];
  events: SiteEvent[];
}

export type SiteCropModuleType = 'VEGETABLE_BED' | 'STAPLE_FIELD' | 'ORCHARD' | 'GREENHOUSE' | 'NURSERY';
export type SiteLivestockModuleType = 'CHICKEN_COOP' | 'SMALL_LIVESTOCK';

export interface SiteCropAssumptionProfile {
  cycleDays: number;
  waterLitresPerM2Day: number;
  nutrientUnitsPerM2Cycle: number;
  labourMinutesPerDay: number;
  harvestLabourMinutes: number;
  caloriesPerM2Cycle: number;
  kgPerM2Cycle: number;
  residueUnitsPerM2Cycle: number;
}

export interface SiteLivestockAssumptionProfile {
  feedKgPerAnimalDay: number;
  waterLitresPerAnimalDay: number;
  labourMinutesPerDay: number;
  caloriesProducedPerAnimalDay: number;
  manureUnitsPerAnimalDay: number;
  initialFeedKgPerAnimal: number;
}

/** Explicit, documented, overridable assumptions used only by the compiler (Part G). No hidden constants. */
export interface SiteScenarioAssumptions {
  startDate: string;
  startDay: number;
  climateProfileId: string;
  climateSeasons: HomesteadScenarioDefinition['climate']['seasons'];
  caloriesPerPersonDay: number;
  waterLitresPerPersonDay: number;
  labourMinutesAvailablePerDay: number;
  initialCash: number;
  dailyHouseholdExpenditure: number;
  cropProfiles: Record<SiteCropModuleType, SiteCropAssumptionProfile>;
  livestockProfiles: Record<SiteLivestockModuleType, SiteLivestockAssumptionProfile>;
  pumpKwhPerLitre: number;
  systemLossFraction: number;
}

export interface CompiledSiteScenario {
  scenario: HomesteadScenarioDefinition;
  failures: SiteValidationFailure[];
}
