export type HomesteadControllerMode = 'manual' | 'deterministic' | 'ai-shadow';
export type HomesteadTimestep = 'day';
export type HomesteadUnitSystem = 'metric';
export type HomesteadSeasonName = 'winter' | 'spring' | 'summer' | 'autumn';
export type FoodProducerType = 'vegetable-bed' | 'staple-field' | 'orchard' | 'greenhouse' | 'nursery';
export type RevenueActivityType = 'PRODUCE' | 'EDUCATION' | 'CONSULTING' | 'FARM_STAY' | 'EXPERIENCE' | 'CONTENT' | 'KNOWLEDGE_PRODUCT' | 'MEMBERSHIP' | 'OTHER';

export interface ScenarioRevisionDefinition {
  id: string;
  parentRevisionId?: string;
  changeSet: ScenarioChange[];
  reason: string;
  evidenceRefs: string[];
  createdAt: string;
}

export interface ScenarioChange {
  path: string;
  previousValue?: unknown;
  nextValue?: unknown;
  operation: 'add' | 'replace' | 'remove';
}

export type LandPlacementType =
  | 'house' | 'workshop' | 'vegetable-bed' | 'staple-field' | 'orchard' | 'greenhouse' | 'nursery'
  | 'livestock' | 'feed-storage' | 'compost' | 'vermicompost' | 'biogas' | 'nutrient-store'
  | 'water' | 'water-source' | 'pump' | 'irrigation-zone'
  | 'solar' | 'battery' | 'grid' | 'energy-load'
  | 'shed' | 'food-storage' | 'equipment-storage'
  | 'road' | 'path' | 'service-area'
  | 'revenue-activity' | 'cost-activity';

export interface LandPlacementDefinition {
  id: string;
  type: LandPlacementType;
  areaM2: number;
}

export interface LandScenarioDefinition {
  totalAreaM2: number;
  usableAreaM2: number;
  reservedAreaM2: number;
  slopePercent: number;
  aspect: 'north' | 'south' | 'east' | 'west' | 'mixed';
  elevationM: number;
  soilZones: Array<{ id: string; areaM2: number; moisture: number; fertility: number; organicMatter: number; drainage: number; waterHoldingCapacity: number; healthScore: number }>;
  waterZones: Array<{ id: string; type: 'tank' | 'pond' | 'swale'; areaM2: number }>;
  placements: LandPlacementDefinition[];
}

export interface SeasonalClimateProfile {
  season: HomesteadSeasonName;
  startDayOfYear: number;
  endDayOfYear: number;
  meanTemperatureC: number;
  rainfallProbability: number;
  rainfallMmWhenWet: number;
  solarHours: number;
  humidityPercent: number;
  frostRisk: number;
}

export interface ClimateScenarioDefinition {
  profileId: string;
  deterministicStress?: 'none' | 'zero-rainfall' | 'solar-deficit';
  seasons: SeasonalClimateProfile[];
}

export interface FoodProducerDefinition {
  id: string;
  type: FoodProducerType;
  placementId: string;
  cropId: string;
  areaM2: number;
  plantingDay: number;
  cycleDays: number;
  establishmentDays?: number;
  waterLitresPerM2Day: number;
  nutrientUnitsPerM2Cycle: number;
  labourMinutesPerDay: number;
  harvestLabourMinutes: number;
  expectedCaloriesPerHarvest: number;
  expectedKgPerHarvest: number;
  residueUnitsPerHarvest: number;
}

export interface LivestockScenarioDefinition {
  id: string;
  placementId: string;
  type: 'chickens' | 'bees' | 'sheep' | 'cattle';
  count: number;
  feedKgPerAnimalDay: number;
  waterLitresPerAnimalDay: number;
  labourMinutesPerDay: number;
  caloriesProducedPerDay: number;
  manureUnitsPerDay: number;
  initialFeedKg: number;
}

export interface WaterScenarioDefinition {
  tankCapacityL: number;
  initialTankLevelL: number;
  catchmentAreaM2: number;
  captureEfficiency: number;
  leakageFractionPerDay: number;
  tankEvaporationLPerDay: number;
  pondCapacityL: number;
  initialPondLevelL: number;
  runoffAreaM2: number;
  runoffCoefficient: number;
  pondEvaporationLPerDay: number;
  externalWaterLPerDay: number;
}

export interface EnergyScenarioDefinition {
  solarCapacityKw: number;
  solarEfficiency: number;
  batteryCapacityKwh: number;
  initialBatteryKwh: number;
  gridEnabled: boolean;
  biomassKwhPerDay: number;
  householdLoadKwhPerDay: number;
  farmBaseLoadKwhPerDay: number;
  pumpKwhPerLitre: number;
  systemLossFraction: number;
}

export interface HouseholdScenarioDefinition {
  members: number;
  caloriesPerPersonDay: number;
  waterLitresPerPersonDay: number;
  labourMinutesAvailablePerDay: number;
  initialFoodInventoryCalories: number;
}

export interface NutrientScenarioDefinition {
  initialFreshMaterialUnits: number;
  initialActiveMaterialUnits: number;
  initialMatureCompostUnits: number;
  freshToActiveFractionPerDay: number;
  activeToMatureFractionPerDay: number;
  organicWasteUnitsPerPersonDay: number;
  externalNutrientUnitsPerDay: number;
}

export type RevenueEvidenceLevel = 'MEASURED' | 'VERIFIED' | 'DERIVED' | 'ASSUMED';

export interface RevenueActivityDefinition {
  id: string;
  type: RevenueActivityType;
  enabled: boolean;
  occurrencesPerMonth: number;
  capacityPerOccurrence: number;
  unitPrice: number;
  operatingCostPerOccurrence: number;
  labourMinutesPerOccurrence: number;
  evidenceLevel: RevenueEvidenceLevel;
}

export interface EconomyScenarioDefinition {
  currency: 'INR';
  initialCash: number;
  dailyPropertyOperatingCost: number;
  dailyHouseholdExpenditure: number;
  purchasedFoodCostPer1000Calories: number;
  feedCostPerKg: number;
  gridCostPerKwh: number;
  externalWaterCostPer1000L: number;
  externalNutrientCostPerUnit: number;
  activities: RevenueActivityDefinition[];
}

export interface OperatingPolicyDefinition {
  prioritizeHouseholdWater: boolean;
  allowFoodPurchases: boolean;
  allowFeedPurchases: boolean;
  allowExternalWater: boolean;
  allowGridImport: boolean;
  irrigationSoilMoistureTarget: number;
  minimumCropMoisture: number;
  applyMatureCompost: boolean;
}

export interface ExperimentDefinition {
  id: string;
  question: string;
  hypothesis: string;
  scenarioBaselineRevisionId: string;
  changedVariables: string[];
  startTick: number;
  endTick: number;
  expectedOutcome: string;
  status: 'PLANNED' | 'RUNNING' | 'COMPLETED';
}

export interface HomesteadScenarioDefinition {
  id: string;
  schemaVersion: number;
  simulationVersion: string;
  seed: string;
  startDate: string;
  startDay: number;
  durationDays: number;
  timestep: HomesteadTimestep;
  unitSystem: HomesteadUnitSystem;
  controllerMode: HomesteadControllerMode;
  intents: string[];
  revision: ScenarioRevisionDefinition;
  land: LandScenarioDefinition;
  climate: ClimateScenarioDefinition;
  household: HouseholdScenarioDefinition;
  foodProducers: FoodProducerDefinition[];
  livestock: LivestockScenarioDefinition[];
  water: WaterScenarioDefinition;
  energy: EnergyScenarioDefinition;
  nutrients: NutrientScenarioDefinition;
  economy: EconomyScenarioDefinition;
  operatingPolicy: OperatingPolicyDefinition;
  experiments: ExperimentDefinition[];
  metadata?: { name?: string; description?: string };
}

export const HOMESTEAD_SCENARIO_SCHEMA_VERSION = 2;
export const PROJECT_001_SIMULATION_VERSION = 'project-001-v1';

const finite = (value: number, path: string, minimum = 0) => {
  if (!Number.isFinite(value) || value < minimum) throw new Error(`Invalid homestead scenario: ${path}.`);
};

const requireUniqueIds = (items: Array<{ id: string }>, path: string) => {
  const ids = items.map(item => item.id);
  if (ids.some(id => !id.trim()) || new Set(ids).size !== ids.length) throw new Error(`Invalid homestead scenario: ${path} ids must be unique and non-empty.`);
};

export function validateHomesteadScenario(scenario: HomesteadScenarioDefinition): void {
  if (!scenario || typeof scenario !== 'object') throw new Error('Homestead scenario is required.');
  if (!scenario.id?.trim()) throw new Error('Homestead scenario id must be non-empty.');
  if (scenario.schemaVersion !== HOMESTEAD_SCENARIO_SCHEMA_VERSION) throw new Error(`Unsupported homestead scenario schema version: ${scenario.schemaVersion}.`);
  if (scenario.simulationVersion !== PROJECT_001_SIMULATION_VERSION) throw new Error(`Unsupported homestead simulation version: ${scenario.simulationVersion}.`);
  if (!scenario.seed?.trim()) throw new Error('Homestead scenario seed must be non-empty.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scenario.startDate)) throw new Error('Homestead scenario startDate must use YYYY-MM-DD.');
  if (!Number.isInteger(scenario.startDay) || scenario.startDay < 1) throw new Error('Homestead scenario startDay must be a positive integer.');
  if (!Number.isInteger(scenario.durationDays) || scenario.durationDays < 1) throw new Error('Homestead scenario durationDays must be a positive integer.');
  if (scenario.timestep !== 'day') throw new Error(`Unsupported homestead timestep: ${String(scenario.timestep)}.`);
  if (scenario.unitSystem !== 'metric') throw new Error(`Unsupported homestead unit system: ${String(scenario.unitSystem)}.`);
  if (!['manual', 'deterministic', 'ai-shadow'].includes(scenario.controllerMode)) throw new Error(`Unsupported homestead controller mode: ${String(scenario.controllerMode)}.`);
  if (!scenario.revision?.id?.trim() || !scenario.revision.reason?.trim() || !scenario.revision.createdAt?.trim()) throw new Error('Homestead scenario revision metadata is required.');

  finite(scenario.land.totalAreaM2, 'land.totalAreaM2', 0.01);
  finite(scenario.land.usableAreaM2, 'land.usableAreaM2', 0.01);
  finite(scenario.land.reservedAreaM2, 'land.reservedAreaM2');
  if (scenario.land.usableAreaM2 + scenario.land.reservedAreaM2 > scenario.land.totalAreaM2 + 0.001) throw new Error('Invalid homestead scenario: usable and reserved land exceed total area.');
  requireUniqueIds(scenario.land.placements, 'land.placements');
  requireUniqueIds(scenario.land.soilZones, 'land.soilZones');
  requireUniqueIds(scenario.foodProducers, 'foodProducers');
  requireUniqueIds(scenario.livestock, 'livestock');
  requireUniqueIds(scenario.economy.activities, 'economy.activities');
  requireUniqueIds(scenario.experiments, 'experiments');
  scenario.land.placements.forEach(item => finite(item.areaM2, `placement.${item.id}.areaM2`, 0.01));

  const placements = new Set(scenario.land.placements.map(item => item.id));
  scenario.foodProducers.forEach(producer => {
    if (!placements.has(producer.placementId)) throw new Error(`Invalid homestead scenario: producer ${producer.id} references missing placement.`);
    finite(producer.areaM2, `foodProducers.${producer.id}.areaM2`, 0.01);
    finite(producer.waterLitresPerM2Day, `foodProducers.${producer.id}.waterLitresPerM2Day`);
    finite(producer.expectedCaloriesPerHarvest, `foodProducers.${producer.id}.expectedCaloriesPerHarvest`);
    finite(producer.expectedKgPerHarvest, `foodProducers.${producer.id}.expectedKgPerHarvest`);
    if (!Number.isInteger(producer.cycleDays) || producer.cycleDays < 1) throw new Error(`Invalid homestead scenario: producer ${producer.id} cycleDays.`);
  });
  scenario.livestock.forEach(animal => {
    if (!placements.has(animal.placementId)) throw new Error(`Invalid homestead scenario: livestock ${animal.id} references missing placement.`);
    finite(animal.count, `livestock.${animal.id}.count`, 1);
  });
  if (scenario.climate.seasons.length !== 4) throw new Error('Invalid homestead scenario: exactly four seasonal climate profiles are required.');
  scenario.climate.seasons.forEach(profile => {
    if (profile.rainfallProbability < 0 || profile.rainfallProbability > 1 || profile.frostRisk < 0 || profile.frostRisk > 1) throw new Error(`Invalid homestead scenario: climate probability for ${profile.season}.`);
  });

  finite(scenario.household.members, 'household.members', 1);
  finite(scenario.household.caloriesPerPersonDay, 'household.caloriesPerPersonDay');
  finite(scenario.household.waterLitresPerPersonDay, 'household.waterLitresPerPersonDay');
  finite(scenario.household.labourMinutesAvailablePerDay, 'household.labourMinutesAvailablePerDay');
  finite(scenario.water.tankCapacityL, 'water.tankCapacityL');
  finite(scenario.water.initialTankLevelL, 'water.initialTankLevelL');
  if (scenario.water.initialTankLevelL > scenario.water.tankCapacityL) throw new Error('Invalid homestead scenario: initial tank level exceeds capacity.');
  finite(scenario.energy.batteryCapacityKwh, 'energy.batteryCapacityKwh');
  finite(scenario.energy.initialBatteryKwh, 'energy.initialBatteryKwh');
  if (scenario.energy.initialBatteryKwh > scenario.energy.batteryCapacityKwh) throw new Error('Invalid homestead scenario: initial battery exceeds capacity.');
  finite(scenario.economy.initialCash, 'economy.initialCash');
}
