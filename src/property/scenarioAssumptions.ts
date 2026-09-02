/**
 * Explicit, documented, overridable compiler-only assumptions
 * (`scenarioCompiler.ts`), mirroring `gameplay/site-planner`'s own
 * assumptions file so both describe the same world (deliberate, temporary
 * duplication -- see docs/PROPERTY_MODEL_MIGRATION.md, resolved at Wave 11
 * when Site Planner migrates onto this Property foundation).
 */
import type { HomesteadScenarioDefinition } from '../simulation/homestead/scenario';

export type PropertyCropEntityType = 'VEGETABLE_BED' | 'STAPLE_FIELD' | 'ORCHARD' | 'GREENHOUSE' | 'NURSERY';
export type PropertyLivestockEntityType = 'CHICKEN_COOP' | 'SMALL_LIVESTOCK';

export interface PropertyCropAssumptionProfile {
  cycleDays: number;
  waterLitresPerM2Day: number;
  nutrientUnitsPerM2Cycle: number;
  labourMinutesPerDay: number;
  harvestLabourMinutes: number;
  caloriesPerM2Cycle: number;
  kgPerM2Cycle: number;
  residueUnitsPerM2Cycle: number;
}

export interface PropertyLivestockAssumptionProfile {
  feedKgPerAnimalDay: number;
  waterLitresPerAnimalDay: number;
  labourMinutesPerDay: number;
  caloriesProducedPerAnimalDay: number;
  manureUnitsPerAnimalDay: number;
  initialFeedKgPerAnimal: number;
}

export interface PropertyScenarioAssumptions {
  startDate: string;
  startDay: number;
  climateProfileId: string;
  climateSeasons: HomesteadScenarioDefinition['climate']['seasons'];
  caloriesPerPersonDay: number;
  waterLitresPerPersonDay: number;
  labourMinutesAvailablePerDay: number;
  initialCash: number;
  dailyHouseholdExpenditure: number;
  cropProfiles: Record<PropertyCropEntityType, PropertyCropAssumptionProfile>;
  livestockProfiles: Record<PropertyLivestockEntityType, PropertyLivestockAssumptionProfile>;
  pumpKwhPerLitre: number;
  systemLossFraction: number;
  rainCaptureEfficiency: number;
  tankLeakageFractionPerDay: number;
  pondRunoffCoefficient: number;
  solarPanelEfficiency: number;
  initialTankFillFraction: number;
  initialPondFillFraction: number;
  initialBatteryFillFraction: number;
}

export const DEFAULT_PROPERTY_SCENARIO_ASSUMPTIONS: PropertyScenarioAssumptions = {
  startDate: '2026-01-01',
  startDay: 1,
  climateProfileId: 'property-model-temperate-assumption',
  climateSeasons: [
    { season: 'winter', startDayOfYear: 1, endDayOfYear: 59, meanTemperatureC: 8, rainfallProbability: 0.18, rainfallMmWhenWet: 7, solarHours: 5, humidityPercent: 68, frostRisk: 0.35 },
    { season: 'spring', startDayOfYear: 60, endDayOfYear: 151, meanTemperatureC: 18, rainfallProbability: 0.32, rainfallMmWhenWet: 9, solarHours: 8, humidityPercent: 62, frostRisk: 0.08 },
    { season: 'summer', startDayOfYear: 152, endDayOfYear: 243, meanTemperatureC: 29, rainfallProbability: 0.12, rainfallMmWhenWet: 12, solarHours: 10, humidityPercent: 52, frostRisk: 0 },
    { season: 'autumn', startDayOfYear: 244, endDayOfYear: 365, meanTemperatureC: 17, rainfallProbability: 0.22, rainfallMmWhenWet: 8, solarHours: 7, humidityPercent: 60, frostRisk: 0.12 },
  ],
  caloriesPerPersonDay: 2200,
  waterLitresPerPersonDay: 80,
  labourMinutesAvailablePerDay: 480,
  initialCash: 100_000,
  dailyHouseholdExpenditure: 50,
  cropProfiles: {
    VEGETABLE_BED: { cycleDays: 60, waterLitresPerM2Day: 1.4, nutrientUnitsPerM2Cycle: 0.08, labourMinutesPerDay: 8, harvestLabourMinutes: 40, caloriesPerM2Cycle: 600, kgPerM2Cycle: 0.6, residueUnitsPerM2Cycle: 0.15 },
    STAPLE_FIELD: { cycleDays: 120, waterLitresPerM2Day: 0.8, nutrientUnitsPerM2Cycle: 0.06, labourMinutesPerDay: 12, harvestLabourMinutes: 60, caloriesPerM2Cycle: 1357, kgPerM2Cycle: 1, residueUnitsPerM2Cycle: 0.14 },
    ORCHARD: { cycleDays: 365, waterLitresPerM2Day: 0.25, nutrientUnitsPerM2Cycle: 0.03, labourMinutesPerDay: 10, harvestLabourMinutes: 50, caloriesPerM2Cycle: 833, kgPerM2Cycle: 0.83, residueUnitsPerM2Cycle: 0.13 },
    GREENHOUSE: { cycleDays: 45, waterLitresPerM2Day: 1.1, nutrientUnitsPerM2Cycle: 0.1, labourMinutesPerDay: 25, harvestLabourMinutes: 45, caloriesPerM2Cycle: 1300, kgPerM2Cycle: 1.1, residueUnitsPerM2Cycle: 0.36 },
    NURSERY: { cycleDays: 30, waterLitresPerM2Day: 1.2, nutrientUnitsPerM2Cycle: 0.05, labourMinutesPerDay: 10, harvestLabourMinutes: 15, caloriesPerM2Cycle: 200, kgPerM2Cycle: 0.2, residueUnitsPerM2Cycle: 0.05 },
  },
  livestockProfiles: {
    CHICKEN_COOP: { feedKgPerAnimalDay: 0.12, waterLitresPerAnimalDay: 0.5, labourMinutesPerDay: 2, caloriesProducedPerAnimalDay: 37.5, manureUnitsPerAnimalDay: 0.075, initialFeedKgPerAnimal: 5 },
    SMALL_LIVESTOCK: { feedKgPerAnimalDay: 1.5, waterLitresPerAnimalDay: 6, labourMinutesPerDay: 10, caloriesProducedPerAnimalDay: 150, manureUnitsPerAnimalDay: 1.2, initialFeedKgPerAnimal: 15 },
  },
  pumpKwhPerLitre: 0.0007,
  systemLossFraction: 0.08,
  rainCaptureEfficiency: 0.8,
  tankLeakageFractionPerDay: 0.01,
  pondRunoffCoefficient: 0.7,
  solarPanelEfficiency: 0.85,
  initialTankFillFraction: 1,
  initialPondFillFraction: 1,
  initialBatteryFillFraction: 1,
};
