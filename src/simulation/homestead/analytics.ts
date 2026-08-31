import type { HomesteadScenarioDefinition } from './scenario';
import type { ProjectDailyRecord, ProjectHomesteadState, SelfSufficiencyMetrics } from './projectState';

export const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));
export const safeRatio = (numerator: number, denominator: number): number => denominator > 0 ? numerator / denominator : 0;

export function addDaysToIsoDate(startDate: string, offsetDays: number): string {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function calculateSelfSufficiencyMetrics(state: ProjectHomesteadState): SelfSufficiencyMetrics {
  const consumedCalories = state.household.cumulativeLocalCaloriesConsumed + state.household.cumulativePurchasedCaloriesConsumed;
  const waterConsumed = state.water.cumulativeConsumedL;
  const localWaterAvailable = state.water.cumulativeCapturedL + state.water.cumulativeRecycledL;
  const energyConsumed = state.energy.cumulativeConsumedKwh;
  const netPropertyIncome = state.economy.cumulativeRevenue - state.economy.cumulativeInputPurchases;
  const combinedExpenditure = state.economy.cumulativePropertyOperatingCost + state.economy.cumulativeHouseholdExpenditure + state.economy.cumulativeInputPurchases;
  return {
    foodSelfSufficiency: clamp(safeRatio(state.household.cumulativeLocalCaloriesConsumed, consumedCalories), 0, 1),
    waterIndependence: clamp(safeRatio(Math.min(localWaterAvailable, waterConsumed), waterConsumed), 0, 1),
    energyIndependence: clamp(safeRatio(Math.min(state.energy.cumulativeLocalGeneratedKwh, energyConsumed), energyConsumed), 0, 1),
    nutrientCircularity: clamp(safeRatio(state.nutrients.cumulativeInternalSupplyUnits, state.nutrients.cumulativeRequirementUnits), 0, 1),
    propertyCostCoverage: safeRatio(netPropertyIncome, state.economy.cumulativePropertyOperatingCost),
    householdEconomicCoverage: safeRatio(netPropertyIncome, combinedExpenditure),
    labourFeasibility: safeRatio(state.household.cumulativeLabourRequiredMinutes, state.household.cumulativeLabourAvailableMinutes),
  };
}

export function createDailyRecord(
  scenario: HomesteadScenarioDefinition,
  state: ProjectHomesteadState,
): ProjectDailyRecord {
  const metrics = calculateSelfSufficiencyMetrics(state);
  const cropAreaM2 = state.foodProducers.reduce((sum, producer) => sum + producer.areaM2, 0);
  const harvestKg = state.foodProducers.reduce((sum, producer) => sum + producer.lastHarvestKg, 0);
  const harvestCalories = state.foodProducers.reduce((sum, producer) => sum + producer.lastHarvestCalories, 0)
    + state.household.foodProducedTodayCalories;
  const averageSoilMoisture = safeRatio(
    state.foodProducers.reduce((sum, producer) => sum + producer.soilMoisture, 0),
    state.foodProducers.length,
  );
  const manureUnits = state.livestock.reduce((sum, animal) => sum + (animal.totalManureUnits > 0 ? scenario.livestock.find(item => item.id === animal.id)?.manureUnitsPerDay ?? 0 : 0), 0);
  return {
    date: state.date,
    day: state.day,
    scenarioRevision: scenario.revision.id,
    rainfallMm: state.climate.rainfallMm,
    capturedWaterL: state.water.capturedTodayL,
    tankLevelL: state.water.tankLevelL,
    pondLevelL: state.water.pondLevelL,
    irrigationL: state.water.irrigationTodayL,
    householdWaterL: state.water.householdConsumedTodayL,
    soilMoisture: averageSoilMoisture,
    solarGeneratedKwh: state.energy.solarGeneratedTodayKwh,
    batterySoc: safeRatio(state.energy.batteryKwh, state.energy.batteryCapacityKwh),
    gridImportKwh: state.energy.gridImportedTodayKwh,
    cropAreaM2,
    harvestKg,
    harvestCalories,
    foodConsumedCalories: state.household.foodConsumedTodayCalories,
    foodPurchasedCalories: state.household.foodPurchasedTodayCalories,
    manureKg: manureUnits,
    compostMatureKg: state.nutrients.matureCompostUnits,
    labourRequiredMinutes: state.household.labourRequiredTodayMinutes,
    labourAvailableMinutes: state.household.labourAvailableTodayMinutes,
    revenue: state.economy.revenueToday,
    operatingCost: state.economy.operatingCostToday + state.economy.householdExpenditureToday,
    cashBalance: state.economy.cashBalance,
    ...metrics,
  };
}
