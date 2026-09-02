/**
 * PropertyEntity (sections 7-10 of ORCHADE P0 master task).
 *
 * A bounded, v1-scoped entity-type set ("do not model everything in v1,
 * keep extensible" -- section 9). Names intentionally match
 * `gameplay/site-planner`'s `SiteModuleType` where the same real-world
 * thing is meant, for continuity when Site Planner migrates onto this
 * foundation (Wave 11, deferred) -- but this file does not import from
 * `gameplay/site-planner`: `src/property/` is core substrate that Site
 * Planner should eventually depend on, never the reverse. See
 * docs/PROPERTY_MODEL_MIGRATION.md for why this is a deliberate, temporary
 * duplication of a handful of type literals, not a duplicated engine.
 */
import type { EntityRealityStatus } from './reality';

export type PropertyEntityType =
  // Land
  | 'PARCEL' | 'ZONE' | 'PATH' | 'ROAD' | 'ACCESS_POINT' | 'EXCLUDED_ZONE'
  // Household
  | 'HOUSEHOLD'
  // Food
  | 'VEGETABLE_BED' | 'STAPLE_FIELD' | 'ORCHARD' | 'GREENHOUSE' | 'NURSERY' | 'FOOD_STORAGE'
  // Livestock
  | 'CHICKEN_COOP' | 'SMALL_LIVESTOCK' | 'FEED_STORAGE'
  // Water
  | 'RAIN_CATCHMENT' | 'WATER_TANK' | 'POND' | 'WATER_SOURCE' | 'PUMP' | 'IRRIGATION_ZONE'
  // Energy
  | 'SOLAR_ARRAY' | 'BATTERY' | 'GRID_CONNECTION' | 'ENERGY_LOAD'
  // Nutrients
  | 'COMPOST' | 'VERMICOMPOST' | 'NUTRIENT_STORE'
  // Infrastructure
  | 'RESIDENCE' | 'WORKSHOP' | 'SHED' | 'EQUIPMENT_STORAGE' | 'SERVICE_AREA'
  // Economy
  | 'REVENUE_ACTIVITY' | 'COST_ACTIVITY';

/** Section 10: future features should query capabilities, not branch on entityType/name. */
export type PropertyEntityCapability =
  | 'STORE_WATER' | 'PROVIDE_WATER' | 'CONSUME_WATER' | 'MEASURE_WATER'
  | 'MOVE_WATER' | 'REPORT_LEVEL'
  | 'GENERATE_ENERGY' | 'STORE_ENERGY' | 'CONSUME_ENERGY' | 'REPORT_STATE'
  | 'PRODUCE_CROP' | 'PRODUCE_LIVESTOCK_OUTPUT'
  | 'CONSUME_NUTRIENTS' | 'PRODUCE_NUTRIENTS'
  | 'REQUIRE_LABOUR' | 'REQUIRE_ACCESS' | 'PROVIDE_WORKSPACE' | 'PROVIDE_ACCESS'
  | 'REPORT_TELEMETRY';

export type PropertyEntityStatus = 'PLANNED' | 'INSTALLED' | 'ACTIVE' | 'INACTIVE' | 'FAILED' | 'REMOVED' | 'HISTORICAL';

export type PropertyResourceType =
  | 'LAND_AREA' | 'WATER' | 'ENERGY' | 'FOOD' | 'FEED' | 'BIOMASS' | 'MANURE'
  | 'COMPOST' | 'NUTRIENTS' | 'LABOUR' | 'CASH' | 'STORAGE' | 'ACCESS' | 'DATA';

export interface PropertyResourceProfile {
  resourceType: PropertyResourceType;
  ratePerDay: number;
}

export interface PropertyLabourProfile {
  minutesPerDay: number;
}

export interface PropertyEconomicProfile {
  capitalCost: number;
  operatingCostPerDay: number;
}

/**
 * Bounded physical attributes the scenario compiler reads. What `capacity`
 * means depends on `entityType` (litres for WATER_TANK/POND, head-count for
 * livestock groups, kW for SOLAR_ARRAY, kWh for BATTERY, ...) -- documented
 * per type in `scenarioCompiler.ts`, never inferred from a name/string.
 */
export interface PropertyEntityPhysical {
  footprintM2?: number;
  capacity?: number;
}

export interface PropertyEntity {
  entityId: string;
  propertyId: string;
  entityType: PropertyEntityType;
  schemaVersion: number;
  /** Entity-local revision tag, bumped whenever this entity's own fields change (not a full sub-revision system). */
  revision: string;
  createdAt: string;
  createdBy: string;
  status: PropertyEntityStatus;
  realityStatus: EntityRealityStatus;
  geometryRef?: string;
  capabilities: PropertyEntityCapability[];
  tags: string[];
  evidenceRefs: string[];
  knowledgeRefs: string[];
  metadata: Record<string, string | number | boolean>;
  physical: PropertyEntityPhysical;
  resourceInputs: PropertyResourceProfile[];
  resourceOutputs: PropertyResourceProfile[];
  labourProfile: PropertyLabourProfile;
  economicProfile: PropertyEconomicProfile;
}

export const PROPERTY_ENTITY_SCHEMA_VERSION = 1;

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`PropertyEntity requires ${field}.`);
}

export interface CreatePropertyEntityOptions {
  entityId: string;
  propertyId: string;
  entityType: PropertyEntityType;
  createdAt: string;
  createdBy: string;
  realityStatus: EntityRealityStatus;
  status?: PropertyEntityStatus;
  revision?: string;
  capabilities?: PropertyEntityCapability[];
  tags?: string[];
  evidenceRefs?: string[];
  knowledgeRefs?: string[];
  metadata?: Record<string, string | number | boolean>;
  physical?: PropertyEntityPhysical;
  resourceInputs?: PropertyResourceProfile[];
  resourceOutputs?: PropertyResourceProfile[];
  labourProfile?: PropertyLabourProfile;
  economicProfile?: PropertyEconomicProfile;
  geometryRef?: string;
}

/** Convenience constructor with sensible empty defaults. Validates before returning. */
export function createPropertyEntity(options: CreatePropertyEntityOptions): PropertyEntity {
  const entity: PropertyEntity = {
    entityId: options.entityId,
    propertyId: options.propertyId,
    entityType: options.entityType,
    schemaVersion: PROPERTY_ENTITY_SCHEMA_VERSION,
    revision: options.revision ?? 'v1',
    createdAt: options.createdAt,
    createdBy: options.createdBy,
    status: options.status ?? 'PLANNED',
    realityStatus: options.realityStatus,
    geometryRef: options.geometryRef,
    capabilities: options.capabilities ?? [],
    tags: options.tags ?? [],
    evidenceRefs: options.evidenceRefs ?? [],
    knowledgeRefs: options.knowledgeRefs ?? [],
    metadata: options.metadata ?? {},
    physical: options.physical ?? {},
    resourceInputs: options.resourceInputs ?? [],
    resourceOutputs: options.resourceOutputs ?? [],
    labourProfile: options.labourProfile ?? { minutesPerDay: 0 },
    economicProfile: options.economicProfile ?? { capitalCost: 0, operatingCostPerDay: 0 },
  };
  validatePropertyEntity(entity);
  return entity;
}

export function validatePropertyEntity(entity: PropertyEntity): void {
  requireNonEmpty(entity.entityId, 'entityId');
  requireNonEmpty(entity.propertyId, 'propertyId');
  requireNonEmpty(entity.revision, 'revision');
  if (entity.physical.footprintM2 !== undefined && (!Number.isFinite(entity.physical.footprintM2) || entity.physical.footprintM2 < 0)) {
    throw new Error(`PropertyEntity ${entity.entityId} has an invalid footprintM2.`);
  }
  if (entity.physical.capacity !== undefined && (!Number.isFinite(entity.physical.capacity) || entity.physical.capacity < 0)) {
    throw new Error(`PropertyEntity ${entity.entityId} has an invalid capacity.`);
  }
  if (!(['PLANNED', 'INSTALLED', 'ACTIVE', 'INACTIVE', 'FAILED', 'REMOVED', 'HISTORICAL'] as const).includes(entity.status)) {
    throw new Error(`PropertyEntity ${entity.entityId} has an unsupported status: ${String(entity.status)}.`);
  }
}
