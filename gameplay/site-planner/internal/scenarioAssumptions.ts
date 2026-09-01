import type { SiteScenarioAssumptions } from '../public';

/**
 * Default, explicit, overridable assumptions consumed only by the site->scenario
 * compiler (Part G / Part U). Every number is named and lives in exactly this
 * file. Reuses the same temperate climate and household defaults already
 * checked into `project001Scenario.ts` so both planners describe the same world.
 * These are labelled ASSUMED, not measured or engineering-verified (Part U).
 */
export const DEFAULT_SITE_SCENARIO_ASSUMPTIONS: SiteScenarioAssumptions = {
  startDate: '2026-01-01',
  startDay: 1,
  climateProfileId: 'site-planner-temperate-assumption',
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
};
