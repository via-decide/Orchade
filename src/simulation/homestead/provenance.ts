import type { HomesteadScenarioDefinition } from './scenario';

export type ParameterOrigin =
  | 'MEASURED'
  | 'RESEARCHED'
  | 'REGIONAL_DEFAULT'
  | 'USER_ASSUMPTION'
  | 'DERIVED';

export type ProvenanceConfidence = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED';

export interface ModelIdentity {
  simulationVersion: string;
  scenarioRevisionId: string;
  modelParameterRevisionId: string;
  seed: string;
}

export interface ParameterProvenanceRecord<T = unknown> {
  id: string;
  path: string;
  value: T;
  unit?: string;
  origin: ParameterOrigin;
  sourceRef?: string;
  methodologyRef?: string;
  confidence?: ProvenanceConfidence;
  validFrom?: string;
  validTo?: string;
  geography?: string;
  cultivar?: string;
  notes?: string;
  modelRef?: string;
}

export interface ParameterValue<T> {
  value: T;
  unit?: string;
  provenanceRef: string;
}

export interface ParameterProvenanceRegistry {
  scenarioId: string;
  scenarioRevisionId: string;
  modelParameterRevisionId: string;
  records: Record<string, ParameterProvenanceRecord>;
}

export interface DerivedValueEvidence {
  derivationId: string;
  modelId: string;
  modelVersion: string;
  scenarioId: string;
  scenarioRevisionId: string;
  modelParameterRevisionId: string;
  inputParameterRefs: string[];
  inputObservationRefs: string[];
  inputEventRefs: string[];
  outputMetric: string;
  outputValue: number;
  unit: string;
}

export interface ParameterProvenanceOverride {
  origin?: ParameterOrigin;
  sourceRef?: string;
  methodologyRef?: string;
  confidence?: ProvenanceConfidence;
  validFrom?: string;
  validTo?: string;
  geography?: string;
  cultivar?: string;
  notes?: string;
}

const recordId = (revisionId: string, path: string): string => `parameter:${revisionId}:${path}`;

export function createParameterProvenanceRecord<T>(
  revisionId: string,
  path: string,
  value: T,
  origin: ParameterOrigin,
  options: Omit<ParameterProvenanceRecord<T>, 'id' | 'path' | 'value' | 'origin'> = {},
): ParameterProvenanceRecord<T> {
  if (!revisionId.trim() || !path.trim()) throw new Error('Parameter provenance requires a revision id and path.');
  return {
    id: recordId(revisionId, path),
    path,
    value,
    origin,
    ...options,
  };
}

export function createModelIdentity(
  scenario: HomesteadScenarioDefinition,
  modelParameterRevisionId = `${scenario.revision.id}:parameters-v1`,
): ModelIdentity {
  return {
    simulationVersion: scenario.simulationVersion,
    scenarioRevisionId: scenario.revision.id,
    modelParameterRevisionId,
    seed: scenario.seed,
  };
}

export function createScenarioParameterProvenanceRegistry(
  scenario: HomesteadScenarioDefinition,
  overrides: Record<string, ParameterProvenanceOverride> = {},
  modelParameterRevisionId = `${scenario.revision.id}:parameters-v1`,
): ParameterProvenanceRegistry {
  const records: Record<string, ParameterProvenanceRecord> = {};
  const add = (path: string, value: unknown, unit?: string, defaultOrigin: ParameterOrigin = 'USER_ASSUMPTION') => {
    const override = overrides[path] ?? {};
    const origin = override.origin ?? defaultOrigin;
    records[path] = createParameterProvenanceRecord(scenario.revision.id, path, value, origin, {
      unit,
      sourceRef: override.sourceRef ?? `scenario:${scenario.revision.id}:${path}`,
      methodologyRef: override.methodologyRef,
      confidence: override.confidence,
      validFrom: override.validFrom,
      validTo: override.validTo,
      geography: override.geography,
      cultivar: override.cultivar,
      notes: override.notes,
      modelRef: scenario.simulationVersion,
    });
  };

  add('land.totalAreaM2', scenario.land.totalAreaM2, 'm2');
  add('land.usableAreaM2', scenario.land.usableAreaM2, 'm2');
  add('land.reservedAreaM2', scenario.land.reservedAreaM2, 'm2');
  add('land.slopePercent', scenario.land.slopePercent, 'percent');
  add('land.elevationM', scenario.land.elevationM, 'm');

  scenario.climate.seasons.forEach(profile => {
    const prefix = `climate.seasons.${profile.season}`;
    add(`${prefix}.meanTemperatureC`, profile.meanTemperatureC, 'degC');
    add(`${prefix}.rainfallProbability`, profile.rainfallProbability, 'ratio');
    add(`${prefix}.rainfallMmWhenWet`, profile.rainfallMmWhenWet, 'mm');
    add(`${prefix}.solarHours`, profile.solarHours, 'h');
    add(`${prefix}.humidityPercent`, profile.humidityPercent, 'percent');
    add(`${prefix}.frostRisk`, profile.frostRisk, 'ratio');
  });

  add('household.members', scenario.household.members, 'count');
  add('household.caloriesPerPersonDay', scenario.household.caloriesPerPersonDay, 'kcal/person/day');
  add('household.waterLitresPerPersonDay', scenario.household.waterLitresPerPersonDay, 'L/person/day');
  add('household.labourMinutesAvailablePerDay', scenario.household.labourMinutesAvailablePerDay, 'min/day');
  add('household.initialFoodInventoryCalories', scenario.household.initialFoodInventoryCalories, 'kcal');

  scenario.foodProducers.forEach(producer => {
    const prefix = `foodProducers.${producer.id}`;
    add(`${prefix}.areaM2`, producer.areaM2, 'm2');
    add(`${prefix}.plantingDay`, producer.plantingDay, 'day');
    add(`${prefix}.cycleDays`, producer.cycleDays, 'day');
    if (producer.establishmentDays !== undefined) add(`${prefix}.establishmentDays`, producer.establishmentDays, 'day');
    add(`${prefix}.waterLitresPerM2Day`, producer.waterLitresPerM2Day, 'L/m2/day');
    add(`${prefix}.nutrientUnitsPerM2Cycle`, producer.nutrientUnitsPerM2Cycle, 'model-unit/m2/cycle');
    add(`${prefix}.labourMinutesPerDay`, producer.labourMinutesPerDay, 'min/day');
    add(`${prefix}.harvestLabourMinutes`, producer.harvestLabourMinutes, 'min');
    add(`${prefix}.expectedCaloriesPerHarvest`, producer.expectedCaloriesPerHarvest, 'kcal');
    add(`${prefix}.expectedKgPerHarvest`, producer.expectedKgPerHarvest, 'kg');
    add(`${prefix}.residueUnitsPerHarvest`, producer.residueUnitsPerHarvest, 'model-unit');
  });

  scenario.livestock.forEach(animal => {
    const prefix = `livestock.${animal.id}`;
    add(`${prefix}.count`, animal.count, 'count');
    add(`${prefix}.feedKgPerAnimalDay`, animal.feedKgPerAnimalDay, 'kg/animal/day');
    add(`${prefix}.waterLitresPerAnimalDay`, animal.waterLitresPerAnimalDay, 'L/animal/day');
    add(`${prefix}.labourMinutesPerDay`, animal.labourMinutesPerDay, 'min/day');
    add(`${prefix}.caloriesProducedPerDay`, animal.caloriesProducedPerDay, 'kcal/day');
    add(`${prefix}.manureUnitsPerDay`, animal.manureUnitsPerDay, 'model-unit/day');
    add(`${prefix}.initialFeedKg`, animal.initialFeedKg, 'kg');
  });

  add('water.tankCapacityL', scenario.water.tankCapacityL, 'L');
  add('water.initialTankLevelL', scenario.water.initialTankLevelL, 'L');
  add('water.catchmentAreaM2', scenario.water.catchmentAreaM2, 'm2');
  add('water.captureEfficiency', scenario.water.captureEfficiency, 'ratio');
  add('water.leakageFractionPerDay', scenario.water.leakageFractionPerDay, 'ratio/day');
  add('water.tankEvaporationLPerDay', scenario.water.tankEvaporationLPerDay, 'L/day');
  add('water.pondCapacityL', scenario.water.pondCapacityL, 'L');
  add('water.initialPondLevelL', scenario.water.initialPondLevelL, 'L');
  add('water.runoffAreaM2', scenario.water.runoffAreaM2, 'm2');
  add('water.runoffCoefficient', scenario.water.runoffCoefficient, 'ratio');
  add('water.pondEvaporationLPerDay', scenario.water.pondEvaporationLPerDay, 'L/day');
  add('water.externalWaterLPerDay', scenario.water.externalWaterLPerDay, 'L/day');

  add('energy.solarCapacityKw', scenario.energy.solarCapacityKw, 'kW');
  add('energy.solarEfficiency', scenario.energy.solarEfficiency, 'ratio');
  add('energy.batteryCapacityKwh', scenario.energy.batteryCapacityKwh, 'kWh');
  add('energy.initialBatteryKwh', scenario.energy.initialBatteryKwh, 'kWh');
  add('energy.biomassKwhPerDay', scenario.energy.biomassKwhPerDay, 'kWh/day');
  add('energy.householdLoadKwhPerDay', scenario.energy.householdLoadKwhPerDay, 'kWh/day');
  add('energy.farmBaseLoadKwhPerDay', scenario.energy.farmBaseLoadKwhPerDay, 'kWh/day');
  add('energy.pumpKwhPerLitre', scenario.energy.pumpKwhPerLitre, 'kWh/L');
  add('energy.systemLossFraction', scenario.energy.systemLossFraction, 'ratio');

  add('nutrients.initialFreshMaterialUnits', scenario.nutrients.initialFreshMaterialUnits, 'model-unit');
  add('nutrients.initialActiveMaterialUnits', scenario.nutrients.initialActiveMaterialUnits, 'model-unit');
  add('nutrients.initialMatureCompostUnits', scenario.nutrients.initialMatureCompostUnits, 'model-unit');
  add('nutrients.freshToActiveFractionPerDay', scenario.nutrients.freshToActiveFractionPerDay, 'ratio/day');
  add('nutrients.activeToMatureFractionPerDay', scenario.nutrients.activeToMatureFractionPerDay, 'ratio/day');
  add('nutrients.organicWasteUnitsPerPersonDay', scenario.nutrients.organicWasteUnitsPerPersonDay, 'model-unit/person/day');
  add('nutrients.externalNutrientUnitsPerDay', scenario.nutrients.externalNutrientUnitsPerDay, 'model-unit/day');

  const currency = scenario.economy.currency;
  add('economy.initialCash', scenario.economy.initialCash, currency);
  add('economy.dailyPropertyOperatingCost', scenario.economy.dailyPropertyOperatingCost, `${currency}/day`);
  add('economy.dailyHouseholdExpenditure', scenario.economy.dailyHouseholdExpenditure, `${currency}/day`);
  add('economy.purchasedFoodCostPer1000Calories', scenario.economy.purchasedFoodCostPer1000Calories, `${currency}/1000kcal`);
  add('economy.feedCostPerKg', scenario.economy.feedCostPerKg, `${currency}/kg`);
  add('economy.gridCostPerKwh', scenario.economy.gridCostPerKwh, `${currency}/kWh`);
  add('economy.externalWaterCostPer1000L', scenario.economy.externalWaterCostPer1000L, `${currency}/1000L`);
  add('economy.externalNutrientCostPerUnit', scenario.economy.externalNutrientCostPerUnit, `${currency}/model-unit`);

  scenario.economy.activities.forEach(activity => {
    const prefix = `economy.activities.${activity.id}`;
    add(`${prefix}.occurrencesPerMonth`, activity.occurrencesPerMonth, 'count/month');
    add(`${prefix}.capacityPerOccurrence`, activity.capacityPerOccurrence, 'count/occurrence');
    add(`${prefix}.unitPrice`, activity.unitPrice, currency);
    add(`${prefix}.operatingCostPerOccurrence`, activity.operatingCostPerOccurrence, currency);
    add(`${prefix}.labourMinutesPerOccurrence`, activity.labourMinutesPerOccurrence, 'min');
  });

  return {
    scenarioId: scenario.id,
    scenarioRevisionId: scenario.revision.id,
    modelParameterRevisionId,
    records,
  };
}

export function getParameterProvenance(
  registry: ParameterProvenanceRegistry,
  path: string,
): ParameterProvenanceRecord | undefined {
  return registry.records[path];
}

export function createDerivedValueEvidence(input: Omit<DerivedValueEvidence, 'derivationId'> & { derivationId?: string }): DerivedValueEvidence {
  if (!input.modelId.trim() || !input.modelVersion.trim() || !input.outputMetric.trim() || !input.unit.trim()) {
    throw new Error('Derived value evidence requires model identity, output metric, and unit.');
  }
  if (!Number.isFinite(input.outputValue)) throw new Error('Derived value evidence output must be finite.');
  const derivationId = input.derivationId
    ?? `derivation:${input.scenarioId}:${input.scenarioRevisionId}:${input.modelId}:${input.outputMetric}`;
  return {
    ...input,
    derivationId,
    inputParameterRefs: [...input.inputParameterRefs],
    inputObservationRefs: [...input.inputObservationRefs],
    inputEventRefs: [...input.inputEventRefs],
  };
}
