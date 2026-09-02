/**
 * Property -> Scenario Compiler (section 37 of ORCHADE P0 master task).
 *
 * The one hard boundary. No feature -- not Site Planner, not the equipment
 * candidate-test workflow, not any future UI -- may construct a
 * HomesteadScenarioDefinition on its own. Everything goes through this
 * function.
 *
 * The input PropertyRevision is already known-valid: `createPropertyRevision`
 * (revision.ts) validates the whole graph (unique entity ids, no
 * cross-property references, legal reality statuses, resolvable resource
 * connections) before a revision can even be constructed. This compiler
 * therefore does not re-run that validation -- it maps and, additionally,
 * reports ADVISORY notes (an entity's declared resource input has no
 * connection at all) that never block compilation, matching the same
 * fatal/advisory split used by `gameplay/site-planner`'s compiler.
 */
import {
  HOMESTEAD_SCENARIO_SCHEMA_VERSION,
  PROJECT_001_SIMULATION_VERSION,
  validateHomesteadScenario,
  type FoodProducerDefinition,
  type FoodProducerType,
  type HomesteadScenarioDefinition,
  type LandPlacementDefinition,
  type LandPlacementType,
  type LivestockScenarioDefinition,
} from '../simulation/homestead/scenario';
import { PROJECT_001_BASELINE_SCENARIO } from '../simulation/homestead/project001Scenario';
import type { PropertyEntity, PropertyEntityType } from './entity';
import type { PropertyEquipmentInstance } from './propertyEquipment';
import type { PropertyRevision } from './revision';
import {
  DEFAULT_PROPERTY_SCENARIO_ASSUMPTIONS,
  type PropertyCropEntityType,
  type PropertyLivestockEntityType,
  type PropertyScenarioAssumptions,
} from './scenarioAssumptions';

const CROP_ENTITY_TYPES: PropertyCropEntityType[] = ['VEGETABLE_BED', 'STAPLE_FIELD', 'ORCHARD', 'GREENHOUSE', 'NURSERY'];
const LIVESTOCK_ENTITY_TYPES: PropertyLivestockEntityType[] = ['CHICKEN_COOP', 'SMALL_LIVESTOCK'];

const CROP_TO_FOOD_PRODUCER_TYPE: Record<PropertyCropEntityType, FoodProducerType> = {
  VEGETABLE_BED: 'vegetable-bed',
  STAPLE_FIELD: 'staple-field',
  ORCHARD: 'orchard',
  GREENHOUSE: 'greenhouse',
  NURSERY: 'nursery',
};

/** Entity types that occupy land and appear in `land.placements`. PARCEL/ZONE/ACCESS_POINT/EXCLUDED_ZONE/HOUSEHOLD are excluded deliberately (see below). */
const ENTITY_TYPE_TO_LAND_PLACEMENT_TYPE: Partial<Record<PropertyEntityType, LandPlacementType>> = {
  VEGETABLE_BED: 'vegetable-bed',
  STAPLE_FIELD: 'staple-field',
  ORCHARD: 'orchard',
  GREENHOUSE: 'greenhouse',
  NURSERY: 'nursery',
  FOOD_STORAGE: 'food-storage',
  CHICKEN_COOP: 'livestock',
  SMALL_LIVESTOCK: 'livestock',
  FEED_STORAGE: 'feed-storage',
  RAIN_CATCHMENT: 'water',
  WATER_TANK: 'water',
  POND: 'water',
  WATER_SOURCE: 'water-source',
  PUMP: 'pump',
  IRRIGATION_ZONE: 'irrigation-zone',
  SOLAR_ARRAY: 'solar',
  BATTERY: 'battery',
  GRID_CONNECTION: 'grid',
  ENERGY_LOAD: 'energy-load',
  COMPOST: 'compost',
  VERMICOMPOST: 'vermicompost',
  NUTRIENT_STORE: 'nutrient-store',
  RESIDENCE: 'house',
  WORKSHOP: 'workshop',
  SHED: 'shed',
  EQUIPMENT_STORAGE: 'equipment-storage',
  SERVICE_AREA: 'service-area',
  PATH: 'path',
  ROAD: 'road',
  REVENUE_ACTIVITY: 'revenue-activity',
  COST_ACTIVITY: 'cost-activity',
};

/** Only these statuses contribute operational flow (Section 59 test 23: "disabled entities contribute no operational flow"). */
const OPERATIONAL_STATUSES = new Set(['PLANNED', 'INSTALLED', 'ACTIVE']);

function isOperational(entity: PropertyEntity): boolean {
  return OPERATIONAL_STATUSES.has(entity.status);
}

function isAddressable(entity: PropertyEntity): boolean {
  return entity.status !== 'REMOVED' && entity.status !== 'HISTORICAL';
}

function isCropType(entityType: PropertyEntityType): entityType is PropertyCropEntityType {
  return (CROP_ENTITY_TYPES as string[]).includes(entityType);
}

function isLivestockType(entityType: PropertyEntityType): entityType is PropertyLivestockEntityType {
  return (LIVESTOCK_ENTITY_TYPES as string[]).includes(entityType);
}

function resourceRate(entity: PropertyEntity, direction: 'resourceInputs' | 'resourceOutputs', resourceType: string): number {
  return entity[direction].filter(profile => profile.resourceType === resourceType).reduce((sum, profile) => sum + profile.ratePerDay, 0);
}

export interface PropertyScenarioCompilerNote {
  entityId?: string;
  reason: string;
}

export interface CompiledPropertyScenario {
  scenario: HomesteadScenarioDefinition;
  notes: PropertyScenarioCompilerNote[];
}

function compileLandPlacements(entities: PropertyEntity[]): LandPlacementDefinition[] {
  return entities
    .filter(entity => ENTITY_TYPE_TO_LAND_PLACEMENT_TYPE[entity.entityType] !== undefined)
    .map(entity => ({
      id: entity.entityId,
      type: ENTITY_TYPE_TO_LAND_PLACEMENT_TYPE[entity.entityType]!,
      areaM2: entity.physical.footprintM2 ?? 0,
    }));
}

function compileFoodProducers(entities: PropertyEntity[], assumptions: PropertyScenarioAssumptions, startDay: number): FoodProducerDefinition[] {
  return entities.filter(isOperational).filter(entity => isCropType(entity.entityType)).map(entity => {
    const cropType = entity.entityType as PropertyCropEntityType;
    const profile = assumptions.cropProfiles[cropType];
    const area = entity.physical.footprintM2;
    if (!area || area <= 0) throw new Error(`Property entity ${entity.entityId} (${cropType}) requires a positive footprintM2.`);
    return {
      id: `fp-${entity.entityId}`,
      type: CROP_TO_FOOD_PRODUCER_TYPE[cropType],
      placementId: entity.entityId,
      cropId: `property-entity:${cropType}`,
      areaM2: area,
      plantingDay: startDay,
      cycleDays: profile.cycleDays,
      waterLitresPerM2Day: profile.waterLitresPerM2Day,
      nutrientUnitsPerM2Cycle: profile.nutrientUnitsPerM2Cycle,
      labourMinutesPerDay: profile.labourMinutesPerDay,
      harvestLabourMinutes: profile.harvestLabourMinutes,
      expectedCaloriesPerHarvest: profile.caloriesPerM2Cycle * area,
      expectedKgPerHarvest: profile.kgPerM2Cycle * area,
      residueUnitsPerHarvest: profile.residueUnitsPerM2Cycle * area,
    };
  });
}

function compileLivestock(entities: PropertyEntity[], assumptions: PropertyScenarioAssumptions): LivestockScenarioDefinition[] {
  return entities.filter(isOperational).filter(entity => isLivestockType(entity.entityType)).map(entity => {
    const livestockType = entity.entityType as PropertyLivestockEntityType;
    const profile = assumptions.livestockProfiles[livestockType];
    const count = entity.physical.capacity;
    if (!count || count <= 0) throw new Error(`Property entity ${entity.entityId} (${livestockType}) requires a positive physical.capacity (head count).`);
    return {
      id: `ls-${entity.entityId}`,
      placementId: entity.entityId,
      type: livestockType === 'CHICKEN_COOP' ? 'chickens' as const : 'sheep' as const,
      count,
      feedKgPerAnimalDay: profile.feedKgPerAnimalDay,
      waterLitresPerAnimalDay: profile.waterLitresPerAnimalDay,
      labourMinutesPerDay: profile.labourMinutesPerDay,
      caloriesProducedPerDay: profile.caloriesProducedPerAnimalDay * count,
      manureUnitsPerDay: profile.manureUnitsPerAnimalDay * count,
      initialFeedKg: profile.initialFeedKgPerAnimal * count,
    };
  });
}

/** Advisory only: does every declared resource input have at least one enabled connection feeding it? Never blocks compilation. */
function collectResourceConnectionNotes(revision: PropertyRevision, operationalEntities: PropertyEntity[]): PropertyScenarioCompilerNote[] {
  const notes: PropertyScenarioCompilerNote[] = [];
  const operationalIds = new Set(operationalEntities.map(entity => entity.entityId));
  operationalEntities.forEach(entity => {
    entity.resourceInputs.forEach(input => {
      const satisfied = revision.graph.resourceGraph.connections.some(connection =>
        connection.enabled &&
        connection.toEntityId === entity.entityId &&
        connection.resourceType === input.resourceType &&
        operationalIds.has(connection.fromEntityId),
      );
      if (!satisfied) {
        notes.push({ entityId: entity.entityId, reason: `No enabled ${input.resourceType} connection supplies ${entity.entityId} (${entity.entityType}).` });
      }
    });
  });
  return notes;
}

/** The only configuration keys the compiler reads off an equipment instance; every one is a non-negative magnitude (see docs/EQUIPMENT_TEST_WORKFLOW.md). */
const EQUIPMENT_CONFIG_KEYS = [
  'energyConsumptionKwhPerDay',
  'energyProductionKwhPerDay',
  'waterProductionLitresPerDay',
  'waterConsumptionLitresPerDay',
  'labourMinutesPerDay',
  'purchaseCostINR',
  'dailyOperatingCostINR',
] as const;

/**
 * Reads a documented equipment configuration lever. Every lever is a
 * magnitude (a cost, a consumption rate, a production rate, a labour
 * requirement) -- never itself signed -- so a negative value can only be
 * malformed or adversarial input (e.g. a negative purchaseCostINR that would
 * increase cash, or a negative labourMinutesPerDay that would create free
 * labour). Fails closed rather than silently producing a falsely beneficial
 * scenario.
 */
function nonNegativeNumericConfig(instance: PropertyEquipmentInstance, key: (typeof EQUIPMENT_CONFIG_KEYS)[number]): number {
  const value = instance.configuration[key];
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  if (value < 0) {
    throw new Error(`PropertyEquipmentInstance ${instance.instanceId} configuration.${key} must be non-negative (got ${value}).`);
  }
  return value;
}

interface EquipmentInstanceDeltas {
  netEnergyKwhPerDay: number;
  netWaterSupplyLPerDay: number;
  netLabourMinutesPerDay: number;
  purchaseCostINR: number;
  dailyOperatingCostINR: number;
}

function computeEquipmentInstanceDeltas(instance: PropertyEquipmentInstance): EquipmentInstanceDeltas {
  const quantity = instance.quantity;
  // farmBaseLoadKwhPerDay is a DEMAND quantity: consumption adds to it, production offsets it.
  const netEnergyKwhPerDay = (nonNegativeNumericConfig(instance, 'energyConsumptionKwhPerDay') - nonNegativeNumericConfig(instance, 'energyProductionKwhPerDay')) * quantity;
  // externalWaterLPerDay is a SUPPLY quantity: production adds to it, consumption offsets it (opposite convention from energy).
  const netWaterSupplyLPerDay = (nonNegativeNumericConfig(instance, 'waterProductionLitresPerDay') - nonNegativeNumericConfig(instance, 'waterConsumptionLitresPerDay')) * quantity;
  return {
    netEnergyKwhPerDay,
    netWaterSupplyLPerDay,
    netLabourMinutesPerDay: nonNegativeNumericConfig(instance, 'labourMinutesPerDay') * quantity,
    purchaseCostINR: nonNegativeNumericConfig(instance, 'purchaseCostINR') * quantity,
    dailyOperatingCostINR: nonNegativeNumericConfig(instance, 'dailyOperatingCostINR') * quantity,
  };
}

/**
 * Folds one PropertyEquipmentInstance's declared resource/labour/cost
 * deltas additively onto an already-compiled scenario (section 37: "Pinned
 * EquipmentTwin revisions" is one of the compiler's own inputs; section 42:
 * "equipment effects -> only supported existing scenario fields/models").
 * Pure -- returns a new scenario, never mutates its input. Reads only
 * `instance.configuration`, never the twin's descriptive/commercial fields
 * (name, source, listed price), so no equipment source or listing can ever
 * receive privileged physics.
 */
export function applyEquipmentInstanceDeltas(
  scenario: HomesteadScenarioDefinition,
  instance: PropertyEquipmentInstance,
): HomesteadScenarioDefinition {
  return applyEquipmentInstancesDeltas(scenario, [instance]);
}

/**
 * Folds a whole set of PropertyEquipmentInstances onto an already-compiled
 * scenario in one step. Deltas are summed across every instance BEFORE the
 * zero floor on energy/water is applied, so an offsetting pair (e.g. a
 * producer and a consumer of the same magnitude) always nets out the same
 * way regardless of array order -- clamping after each instance instead
 * would make the compiled result order-dependent.
 */
function applyEquipmentInstancesDeltas(
  scenario: HomesteadScenarioDefinition,
  instances: readonly PropertyEquipmentInstance[],
): HomesteadScenarioDefinition {
  const totals = instances.reduce<EquipmentInstanceDeltas>((sum, instance) => {
    const delta = computeEquipmentInstanceDeltas(instance);
    return {
      netEnergyKwhPerDay: sum.netEnergyKwhPerDay + delta.netEnergyKwhPerDay,
      netWaterSupplyLPerDay: sum.netWaterSupplyLPerDay + delta.netWaterSupplyLPerDay,
      netLabourMinutesPerDay: sum.netLabourMinutesPerDay + delta.netLabourMinutesPerDay,
      purchaseCostINR: sum.purchaseCostINR + delta.purchaseCostINR,
      dailyOperatingCostINR: sum.dailyOperatingCostINR + delta.dailyOperatingCostINR,
    };
  }, { netEnergyKwhPerDay: 0, netWaterSupplyLPerDay: 0, netLabourMinutesPerDay: 0, purchaseCostINR: 0, dailyOperatingCostINR: 0 });

  return {
    ...scenario,
    energy: { ...scenario.energy, farmBaseLoadKwhPerDay: Math.max(0, scenario.energy.farmBaseLoadKwhPerDay + totals.netEnergyKwhPerDay) },
    water: { ...scenario.water, externalWaterLPerDay: Math.max(0, scenario.water.externalWaterLPerDay + totals.netWaterSupplyLPerDay) },
    household: { ...scenario.household, labourMinutesAvailablePerDay: scenario.household.labourMinutesAvailablePerDay - totals.netLabourMinutesPerDay },
    economy: {
      ...scenario.economy,
      initialCash: scenario.economy.initialCash - totals.purchaseCostINR,
      dailyPropertyOperatingCost: scenario.economy.dailyPropertyOperatingCost + totals.dailyOperatingCostINR,
    },
  };
}

/**
 * Maps a PropertyRevision into the existing canonical HomesteadScenarioDefinition.
 * Pure and deterministic: same revision + same assumptions + same pinned
 * equipment instances always produces a byte-identical scenario. Throws
 * only when the graph cannot be mapped at all (no PARCEL entity, a
 * crop/livestock entity missing the physical dimension its type requires,
 * or a folded-in equipment instance makes the result invalid, e.g.
 * unaffordable) -- everything else is advisory.
 */
export function compilePropertyRevisionToHomesteadScenario(
  revision: PropertyRevision,
  options: {
    assumptions?: Partial<PropertyScenarioAssumptions>;
    /** Pinned EquipmentTwin-backed instances to fold in (section 37). Never mutates `revision`. */
    equipmentInstances?: PropertyEquipmentInstance[];
  } = {},
): CompiledPropertyScenario {
  const assumptionsOverride = options.assumptions ?? {};
  const assumptions: PropertyScenarioAssumptions = { ...DEFAULT_PROPERTY_SCENARIO_ASSUMPTIONS, ...assumptionsOverride };
  const addressableEntities = revision.graph.entities.filter(isAddressable);
  const operationalEntities = addressableEntities.filter(isOperational);

  const totalAreaM2 = addressableEntities.filter(entity => entity.entityType === 'PARCEL').reduce((sum, entity) => sum + (entity.physical.footprintM2 ?? 0), 0);
  if (!(totalAreaM2 > 0)) throw new Error(`Property ${revision.propertyId} revision ${revision.revisionId} has no PARCEL entity with positive footprintM2.`);

  const reservedAreaM2 = Math.min(
    totalAreaM2,
    operationalEntities
      .filter(entity => entity.entityType === 'PATH' || entity.entityType === 'ROAD' || entity.entityType === 'SERVICE_AREA' || entity.entityType === 'EXCLUDED_ZONE')
      .reduce((sum, entity) => sum + (entity.physical.footprintM2 ?? 0), 0),
  );
  const usableAreaM2 = Math.max(0.01, totalAreaM2 - reservedAreaM2);

  const rainCatchmentAreaM2 = operationalEntities.filter(e => e.entityType === 'RAIN_CATCHMENT').reduce((sum, e) => sum + (e.physical.footprintM2 ?? 0), 0);
  const tankCapacityL = operationalEntities.filter(e => e.entityType === 'WATER_TANK').reduce((sum, e) => sum + (e.physical.capacity ?? 0), 0);
  const pondCapacityL = operationalEntities.filter(e => e.entityType === 'POND').reduce((sum, e) => sum + (e.physical.capacity ?? 0), 0);
  const solarCapacityKw = operationalEntities.filter(e => e.entityType === 'SOLAR_ARRAY').reduce((sum, e) => sum + (e.physical.capacity ?? 0), 0);
  const batteryCapacityKwh = operationalEntities.filter(e => e.entityType === 'BATTERY').reduce((sum, e) => sum + (e.physical.capacity ?? 0), 0);
  const gridEnabled = operationalEntities.some(e => e.entityType === 'GRID_CONNECTION');
  const householdLoadKwhPerDay = operationalEntities.filter(e => e.entityType === 'RESIDENCE').reduce((sum, e) => sum + resourceRate(e, 'resourceInputs', 'ENERGY'), 0);
  const farmBaseLoadKwhPerDay = operationalEntities.filter(e => e.entityType !== 'RESIDENCE').reduce((sum, e) => sum + resourceRate(e, 'resourceInputs', 'ENERGY') - resourceRate(e, 'resourceOutputs', 'ENERGY'), 0);
  const dailyPropertyOperatingCost = operationalEntities.reduce((sum, e) => sum + e.economicProfile.operatingCostPerDay, 0);

  const scenario: HomesteadScenarioDefinition = {
    id: `property-scenario:${revision.propertyId}:${revision.revisionId}`,
    schemaVersion: HOMESTEAD_SCENARIO_SCHEMA_VERSION,
    simulationVersion: PROJECT_001_SIMULATION_VERSION,
    seed: revision.intent.seed,
    startDate: assumptions.startDate,
    startDay: assumptions.startDay,
    durationDays: revision.intent.planningHorizonDays,
    timestep: 'day',
    unitSystem: 'metric',
    controllerMode: 'manual',
    intents: ['property-model-compiled'],
    revision: {
      id: revision.revisionId,
      parentRevisionId: revision.parentRevisionId,
      changeSet: [],
      reason: revision.rationale,
      evidenceRefs: [...revision.evidenceRefs],
      createdAt: revision.createdAt,
    },
    land: {
      totalAreaM2,
      usableAreaM2,
      reservedAreaM2: totalAreaM2 - usableAreaM2,
      slopePercent: 0,
      aspect: 'south',
      elevationM: 0,
      soilZones: [{ id: 'property-soil-zone', areaM2: usableAreaM2, moisture: 50, fertility: 50, organicMatter: 5, drainage: 50, waterHoldingCapacity: 50, healthScore: 50 }],
      waterZones: [
        ...operationalEntities.filter(e => e.entityType === 'WATER_TANK').map(e => ({ id: e.entityId, type: 'tank' as const, areaM2: e.physical.footprintM2 ?? 0 })),
        ...operationalEntities.filter(e => e.entityType === 'POND').map(e => ({ id: e.entityId, type: 'pond' as const, areaM2: e.physical.footprintM2 ?? 0 })),
      ],
      placements: compileLandPlacements(addressableEntities),
    },
    climate: { profileId: assumptions.climateProfileId, deterministicStress: 'none', seasons: assumptions.climateSeasons },
    household: {
      members: revision.intent.householdIntent.size,
      caloriesPerPersonDay: assumptions.caloriesPerPersonDay,
      waterLitresPerPersonDay: assumptions.waterLitresPerPersonDay,
      labourMinutesAvailablePerDay: assumptions.labourMinutesAvailablePerDay,
      initialFoodInventoryCalories: 0,
    },
    foodProducers: compileFoodProducers(operationalEntities, assumptions, assumptions.startDay),
    livestock: compileLivestock(operationalEntities, assumptions),
    water: {
      tankCapacityL,
      initialTankLevelL: tankCapacityL * assumptions.initialTankFillFraction,
      catchmentAreaM2: rainCatchmentAreaM2,
      captureEfficiency: assumptions.rainCaptureEfficiency,
      leakageFractionPerDay: assumptions.tankLeakageFractionPerDay,
      tankEvaporationLPerDay: 0,
      pondCapacityL,
      initialPondLevelL: pondCapacityL * assumptions.initialPondFillFraction,
      runoffAreaM2: rainCatchmentAreaM2,
      runoffCoefficient: assumptions.pondRunoffCoefficient,
      pondEvaporationLPerDay: 0,
      externalWaterLPerDay: 0,
    },
    energy: {
      solarCapacityKw,
      solarEfficiency: assumptions.solarPanelEfficiency,
      batteryCapacityKwh,
      initialBatteryKwh: batteryCapacityKwh * assumptions.initialBatteryFillFraction,
      gridEnabled,
      biomassKwhPerDay: 0,
      householdLoadKwhPerDay,
      farmBaseLoadKwhPerDay: Math.max(0, farmBaseLoadKwhPerDay),
      pumpKwhPerLitre: assumptions.pumpKwhPerLitre,
      systemLossFraction: assumptions.systemLossFraction,
    },
    nutrients: {
      initialFreshMaterialUnits: 0,
      initialActiveMaterialUnits: 0,
      initialMatureCompostUnits: 0,
      freshToActiveFractionPerDay: 0.1,
      activeToMatureFractionPerDay: 0.05,
      organicWasteUnitsPerPersonDay: 0.3,
      externalNutrientUnitsPerDay: 0,
    },
    economy: {
      currency: 'INR',
      initialCash: assumptions.initialCash,
      dailyPropertyOperatingCost,
      dailyHouseholdExpenditure: assumptions.dailyHouseholdExpenditure,
      purchasedFoodCostPer1000Calories: PROJECT_001_BASELINE_SCENARIO.economy.purchasedFoodCostPer1000Calories,
      feedCostPerKg: PROJECT_001_BASELINE_SCENARIO.economy.feedCostPerKg,
      gridCostPerKwh: PROJECT_001_BASELINE_SCENARIO.economy.gridCostPerKwh,
      externalWaterCostPer1000L: PROJECT_001_BASELINE_SCENARIO.economy.externalWaterCostPer1000L,
      externalNutrientCostPerUnit: PROJECT_001_BASELINE_SCENARIO.economy.externalNutrientCostPerUnit,
      activities: [],
    },
    operatingPolicy: {
      prioritizeHouseholdWater: true,
      allowFoodPurchases: false,
      allowFeedPurchases: false,
      // Unlike Site Planner's from-scratch blank-slate authoring flow, every
      // Property entity/equipment instance must explicitly declare its own
      // resource contribution via a typed profile -- externalWaterLPerDay
      // starts at 0 and can only become nonzero when something explicit
      // supplies it, so leaving this gate open does not create a silent
      // infinite-supply risk (Part Q's concern for Site Planner doesn't
      // apply the same way here).
      allowExternalWater: true,
      allowGridImport: gridEnabled,
      irrigationSoilMoistureTarget: PROJECT_001_BASELINE_SCENARIO.operatingPolicy.irrigationSoilMoistureTarget,
      minimumCropMoisture: PROJECT_001_BASELINE_SCENARIO.operatingPolicy.minimumCropMoisture,
      applyMatureCompost: PROJECT_001_BASELINE_SCENARIO.operatingPolicy.applyMatureCompost,
    },
    experiments: [],
    metadata: { name: revision.intent.name, description: `Compiled from Property ${revision.propertyId} revision ${revision.revisionId}.` },
  };

  const suppliedEquipmentInstances = options.equipmentInstances ?? [];
  // Instances are explicitly revision-pinned (see propertyEquipment.ts): one
  // for another property or another property revision must never fold its
  // effects into this compilation, even if a caller mistakenly passes it in.
  const mismatched = suppliedEquipmentInstances.find(
    instance => instance.propertyId !== revision.propertyId || instance.propertyRevisionId !== revision.revisionId,
  );
  if (mismatched) {
    throw new Error(
      `PropertyEquipmentInstance ${mismatched.instanceId} is pinned to property ${mismatched.propertyId} revision ${mismatched.propertyRevisionId}, not ${revision.propertyId} revision ${revision.revisionId}.`,
    );
  }
  const equipmentInstances = suppliedEquipmentInstances.filter(instance => instance.active);
  const finalScenario = applyEquipmentInstancesDeltas(scenario, equipmentInstances);

  validateHomesteadScenario(finalScenario);
  return { scenario: finalScenario, notes: collectResourceConnectionNotes(revision, operationalEntities) };
}
