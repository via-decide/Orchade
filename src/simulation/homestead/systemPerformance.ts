import { checksum } from '../../engine/replay/checksum';
import { calculateSelfSufficiencyMetrics } from './analytics';
import type { HomesteadFailureType, ProjectDailyRecord, ProjectHomesteadState } from './projectState';
import { advanceProject001Day } from './projectTransition';
import type { HomesteadScenarioDefinition } from './scenario';

export type MetricAvailability = 'AVAILABLE' | 'UNAVAILABLE';

export type MetricUnavailableReason =
  | 'NO_DEMAND'
  | 'WATER_DELIVERY_PROVENANCE_MISSING'
  | 'ENERGY_DELIVERY_PROVENANCE_MISSING';

export interface FoodCoverageMetric {
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  reason?: 'NO_DEMAND';
  coverage: number | null;
  supplyCalories: number;
  demandCalories: number;
  shortfallCalories: number;
  surplusCalories: number;
  elapsedDays: number;
}

export interface WaterIndependenceMetric {
  availability: 'UNAVAILABLE';
  reason: 'WATER_DELIVERY_PROVENANCE_MISSING';
  independence: null;
  totalDemandL: number;
  deliveredL: number;
  externalInputTodayL: number;
  unmetDemandL: number;
  storageL: number;
  storageCapacityL: number;
  storageHeadroomL: number;
}

export interface EnergyIndependenceMetric {
  availability: 'UNAVAILABLE';
  reason: 'ENERGY_DELIVERY_PROVENANCE_MISSING';
  independence: null;
  totalLoadDemandKwh: number;
  deliveredLoadKwh: number;
  localGenerationUsableKwh: number;
  gridImportKwh: number;
  unmetLoadKwh: number;
  batteryKwh: number;
  batteryCapacityKwh: number;
  batteryHeadroomKwh: number;
}

export interface NutrientCircularityMetric {
  availability: 'AVAILABLE';
  circularity: number;
  internalSupplyUnits: number;
  externalSupplyUnits: number;
  requirementUnits: number;
  deficitTodayUnits: number;
}

export interface LabourBurdenMetric {
  availability: 'AVAILABLE';
  requiredMinutesToday: number;
  availableMinutesToday: number;
  utilisation: number | null;
  overloadMinutesToday: number;
  rolling7DayRequiredMinutes: number;
  rolling7DayAvailableMinutes: number;
}

export interface CashRequirementMetric {
  availability: 'AVAILABLE';
  currency: 'INR';
  requirementToday: number;
  rolling30DayRequirement: number;
  scenarioPeriodRequirement: number;
  todayByCategory: Record<string, number>;
}

export interface FailureFrequencyMetric {
  availability: 'AVAILABLE';
  rawCount: number;
  rolling30DayCount: number;
  byType: Partial<Record<HomesteadFailureType, number>>;
  affectedEntityIds: string[];
}

export type SupportedResilienceStress = 'zero-rainfall' | 'solar-deficit';

export interface ResilienceStressProfileResult {
  stressType: SupportedResilienceStress;
  horizonDays: number;
  startStateHash: string;
  endStateHash: string;
  failureCount: number;
  failuresByType: Partial<Record<HomesteadFailureType, number>>;
  affectedEntityIds: string[];
  daysUntilFirstFailure: number | null;
  daysUntilMultipleEntityFailure: number | null;
  cumulativeWaterShortageL: number;
  cumulativeEnergyShortageKwh: number;
  waterStorageStartL: number;
  waterStorageEndL: number;
  batteryStartKwh: number;
  batteryEndKwh: number;
  labourHeadroomEndMinutes: number;
}

export interface ResilienceUnderStressMetric {
  availability: 'AVAILABLE';
  profiles: ResilienceStressProfileResult[];
}

export interface SystemPerformanceSnapshot {
  tick: number;
  stateHash: string;
  foodCoverage: FoodCoverageMetric;
  waterIndependence: WaterIndependenceMetric;
  energyIndependence: EnergyIndependenceMetric;
  nutrientCircularity: NutrientCircularityMetric;
  labourBurden: LabourBurdenMetric;
  cashRequirement: CashRequirementMetric;
  failureFrequency: FailureFrequencyMetric;
  resilienceUnderStress: ResilienceUnderStressMetric;
}

export interface DeriveSystemPerformanceOptions {
  dailyRecords?: readonly ProjectDailyRecord[];
  resilienceHorizonDays?: number;
}

const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);

const findNumericEventPayload = (
  state: ProjectHomesteadState,
  type: string,
  field: string,
): number | null => {
  for (let index = state.lastEvents.length - 1; index >= 0; index -= 1) {
    const event = state.lastEvents[index];
    if (event.type !== type || !event.payload || typeof event.payload !== 'object') continue;
    const value = (event.payload as Record<string, unknown>)[field];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
};

const deriveFoodCoverage = (
  scenario: HomesteadScenarioDefinition,
  state: ProjectHomesteadState,
): FoodCoverageMetric => {
  const elapsedDays = Math.max(0, state.day - scenario.startDay + 1);
  const supplyCalories = sum(state.foodProducers.map(producer => producer.totalCaloriesProduced))
    + sum(state.livestock.map(animal => animal.totalCaloriesProduced));
  const demandCalories = state.household.members * scenario.household.caloriesPerPersonDay * elapsedDays;
  if (demandCalories <= 0) {
    return {
      availability: 'UNAVAILABLE',
      reason: 'NO_DEMAND',
      coverage: null,
      supplyCalories,
      demandCalories,
      shortfallCalories: 0,
      surplusCalories: supplyCalories,
      elapsedDays,
    };
  }
  return {
    availability: 'AVAILABLE',
    coverage: supplyCalories / demandCalories,
    supplyCalories,
    demandCalories,
    shortfallCalories: Math.max(0, demandCalories - supplyCalories),
    surplusCalories: Math.max(0, supplyCalories - demandCalories),
    elapsedDays,
  };
};

const deriveWaterIndependence = (
  scenario: HomesteadScenarioDefinition,
  state: ProjectHomesteadState,
): WaterIndependenceMetric => {
  const householdDemandL = state.household.members * scenario.household.waterLitresPerPersonDay;
  const livestockDemandL = sum(state.livestock.map(animal => {
    const definition = scenario.livestock.find(item => item.id === animal.id);
    return definition ? definition.count * definition.waterLitresPerAnimalDay : 0;
  }));
  const irrigationDemandL = findNumericEventPayload(state, 'IRRIGATION_SKIPPED', 'requestedL')
    ?? state.water.irrigationTodayL;
  const totalDemandL = householdDemandL + livestockDemandL + irrigationDemandL;
  const deliveredL = state.water.householdConsumedTodayL + state.water.livestockConsumedTodayL + state.water.irrigationTodayL;
  const storageL = state.water.tankLevelL + state.water.pondLevelL;
  const storageCapacityL = state.water.tankCapacityL + state.water.pondCapacityL;
  return {
    availability: 'UNAVAILABLE',
    reason: 'WATER_DELIVERY_PROVENANCE_MISSING',
    independence: null,
    totalDemandL,
    deliveredL,
    externalInputTodayL: state.water.externalTodayL,
    unmetDemandL: Math.max(0, totalDemandL - deliveredL),
    storageL,
    storageCapacityL,
    storageHeadroomL: Math.max(0, storageCapacityL - storageL),
  };
};

const deriveEnergyIndependence = (state: ProjectHomesteadState): EnergyIndependenceMetric => {
  const requestedFromFailure = findNumericEventPayload(state, 'ENERGY_SHORTAGE', 'requestedKwh');
  const totalLoadDemandKwh = requestedFromFailure
    ?? state.energy.householdLoadTodayKwh + state.energy.farmLoadTodayKwh + state.energy.pumpLoadTodayKwh;
  const deliveredLoadKwh = Math.max(0, totalLoadDemandKwh - state.energy.shortageTodayKwh);
  const localGenerationUsableKwh = Math.max(
    0,
    state.energy.solarGeneratedTodayKwh + state.energy.biomassTodayKwh - state.energy.lossesTodayKwh,
  );
  return {
    availability: 'UNAVAILABLE',
    reason: 'ENERGY_DELIVERY_PROVENANCE_MISSING',
    independence: null,
    totalLoadDemandKwh,
    deliveredLoadKwh,
    localGenerationUsableKwh,
    gridImportKwh: state.energy.gridImportedTodayKwh,
    unmetLoadKwh: state.energy.shortageTodayKwh,
    batteryKwh: state.energy.batteryKwh,
    batteryCapacityKwh: state.energy.batteryCapacityKwh,
    batteryHeadroomKwh: Math.max(0, state.energy.batteryCapacityKwh - state.energy.batteryKwh),
  };
};

const deriveNutrientCircularity = (state: ProjectHomesteadState): NutrientCircularityMetric => ({
  availability: 'AVAILABLE',
  circularity: calculateSelfSufficiencyMetrics(state).nutrientCircularity,
  internalSupplyUnits: state.nutrients.cumulativeInternalSupplyUnits,
  externalSupplyUnits: state.nutrients.cumulativeExternalSupplyUnits,
  requirementUnits: state.nutrients.cumulativeRequirementUnits,
  deficitTodayUnits: state.nutrients.deficitTodayUnits,
});

const deriveLabourBurden = (
  state: ProjectHomesteadState,
  records: readonly ProjectDailyRecord[],
): LabourBurdenMetric => {
  const rollingRecords = records.filter(record => record.day > state.day - 7 && record.day <= state.day);
  const requiredMinutesToday = state.household.labourRequiredTodayMinutes;
  const availableMinutesToday = state.household.labourAvailableTodayMinutes;
  return {
    availability: 'AVAILABLE',
    requiredMinutesToday,
    availableMinutesToday,
    utilisation: availableMinutesToday > 0 ? requiredMinutesToday / availableMinutesToday : null,
    overloadMinutesToday: state.household.labourOverloadTodayMinutes,
    rolling7DayRequiredMinutes: rollingRecords.length > 0
      ? sum(rollingRecords.map(record => record.labourRequiredMinutes))
      : requiredMinutesToday,
    rolling7DayAvailableMinutes: rollingRecords.length > 0
      ? sum(rollingRecords.map(record => record.labourAvailableMinutes))
      : availableMinutesToday,
  };
};

const isExternalRequirementTransaction = (transaction: ProjectHomesteadState['economy']['transactions'][number]): boolean =>
  transaction.type === 'PURCHASE' || (transaction.type === 'COST' && transaction.category === 'PROPERTY');

const sumRequirements = (
  state: ProjectHomesteadState,
  minimumDay: number,
  maximumDay: number,
): number => sum(state.economy.transactions
  .filter(transaction => transaction.day >= minimumDay && transaction.day <= maximumDay && isExternalRequirementTransaction(transaction))
  .map(transaction => transaction.amount));

const deriveCashRequirement = (state: ProjectHomesteadState): CashRequirementMetric => {
  const todayTransactions = state.economy.transactions.filter(transaction => transaction.day === state.day && isExternalRequirementTransaction(transaction));
  const todayByCategory = todayTransactions.reduce<Record<string, number>>((result, transaction) => {
    result[transaction.category] = (result[transaction.category] ?? 0) + transaction.amount;
    return result;
  }, {});
  return {
    availability: 'AVAILABLE',
    currency: 'INR',
    requirementToday: sum(todayTransactions.map(transaction => transaction.amount)),
    rolling30DayRequirement: sumRequirements(state, Math.max(0, state.day - 29), state.day),
    scenarioPeriodRequirement: state.economy.cumulativePropertyOperatingCost + state.economy.cumulativeInputPurchases,
    todayByCategory,
  };
};

const deriveFailureFrequency = (state: ProjectHomesteadState): FailureFrequencyMetric => {
  const byType: Partial<Record<HomesteadFailureType, number>> = {};
  state.knowledge.failures.forEach(failure => {
    byType[failure.type] = (byType[failure.type] ?? 0) + 1;
  });
  const affectedEntityIds = [...new Set(state.knowledge.failures.map(failure => failure.entityId))].sort();
  return {
    availability: 'AVAILABLE',
    rawCount: state.knowledge.failures.length,
    rolling30DayCount: state.knowledge.failures.filter(failure => failure.tick > state.day - 30 && failure.tick <= state.day).length,
    byType,
    affectedEntityIds,
  };
};

export function evaluateResilienceStressProfile(
  scenario: HomesteadScenarioDefinition,
  state: ProjectHomesteadState,
  stressType: SupportedResilienceStress,
  horizonDays = 30,
): ResilienceStressProfileResult {
  if (!Number.isInteger(horizonDays) || horizonDays < 1) throw new Error('Resilience horizon must be a positive integer.');
  const stressedScenario: HomesteadScenarioDefinition = {
    ...scenario,
    climate: { ...scenario.climate, deterministicStress: stressType },
  };
  const baselineFailureCount = state.knowledge.failures.length;
  let current = state;
  let observedFailureCount = baselineFailureCount;
  let daysUntilFirstFailure: number | null = null;
  let daysUntilMultipleEntityFailure: number | null = null;
  let cumulativeWaterShortageL = 0;
  let cumulativeEnergyShortageKwh = 0;
  const affectedEntityIds = new Set<string>();
  const newFailuresByType: Partial<Record<HomesteadFailureType, number>> = {};

  for (let offset = 1; offset <= horizonDays; offset += 1) {
    const result = advanceProject001Day(stressedScenario, current);
    current = result.state;
    cumulativeWaterShortageL += current.water.shortageTodayL;
    cumulativeEnergyShortageKwh += current.energy.shortageTodayKwh;
    const newFailures = current.knowledge.failures.slice(observedFailureCount);
    if (newFailures.length > 0 && daysUntilFirstFailure === null) daysUntilFirstFailure = offset;
    newFailures.forEach(failure => {
      affectedEntityIds.add(failure.entityId);
      newFailuresByType[failure.type] = (newFailuresByType[failure.type] ?? 0) + 1;
    });
    observedFailureCount = current.knowledge.failures.length;
    if (affectedEntityIds.size >= 2 && daysUntilMultipleEntityFailure === null) daysUntilMultipleEntityFailure = offset;
  }

  return {
    stressType,
    horizonDays,
    startStateHash: checksum(state),
    endStateHash: checksum(current),
    failureCount: current.knowledge.failures.length - baselineFailureCount,
    failuresByType: newFailuresByType,
    affectedEntityIds: [...affectedEntityIds].sort(),
    daysUntilFirstFailure,
    daysUntilMultipleEntityFailure,
    cumulativeWaterShortageL,
    cumulativeEnergyShortageKwh,
    waterStorageStartL: state.water.tankLevelL + state.water.pondLevelL,
    waterStorageEndL: current.water.tankLevelL + current.water.pondLevelL,
    batteryStartKwh: state.energy.batteryKwh,
    batteryEndKwh: current.energy.batteryKwh,
    labourHeadroomEndMinutes: current.household.labourAvailableTodayMinutes - current.household.labourRequiredTodayMinutes,
  };
}

export function evaluateResilienceUnderStress(
  scenario: HomesteadScenarioDefinition,
  state: ProjectHomesteadState,
  horizonDays = 30,
): ResilienceUnderStressMetric {
  return {
    availability: 'AVAILABLE',
    profiles: [
      evaluateResilienceStressProfile(scenario, state, 'zero-rainfall', horizonDays),
      evaluateResilienceStressProfile(scenario, state, 'solar-deficit', horizonDays),
    ],
  };
}

export function deriveSystemPerformance(
  scenario: HomesteadScenarioDefinition,
  state: ProjectHomesteadState,
  options: DeriveSystemPerformanceOptions = {},
): SystemPerformanceSnapshot {
  const records = options.dailyRecords ?? [];
  const resilienceHorizonDays = options.resilienceHorizonDays ?? 30;
  return {
    tick: state.day,
    stateHash: checksum(state),
    foodCoverage: deriveFoodCoverage(scenario, state),
    waterIndependence: deriveWaterIndependence(scenario, state),
    energyIndependence: deriveEnergyIndependence(state),
    nutrientCircularity: deriveNutrientCircularity(state),
    labourBurden: deriveLabourBurden(state, records),
    cashRequirement: deriveCashRequirement(state),
    failureFrequency: deriveFailureFrequency(state),
    resilienceUnderStress: evaluateResilienceUnderStress(scenario, state, resilienceHorizonDays),
  };
}
