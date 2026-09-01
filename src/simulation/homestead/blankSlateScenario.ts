import { requireActiveEnvironmentSkin } from '../../../gameplay/progression/api';
import { PROJECT_001_BASELINE_SCENARIO } from './project001Scenario';
import { validateHomesteadScenario, type HomesteadScenarioDefinition } from './scenario';

export interface BlankSlateScenarioOptions {
  id?: string;
  seed?: string;
  durationDays?: number;
  totalAreaM2?: number;
  usableFraction?: number;
  householdMembers?: number;
  skinId?: string;
  revisionId?: string;
  createdAt?: string;
}

export function createBlankSlateScenario(options: BlankSlateScenarioOptions = {}): HomesteadScenarioDefinition {
  const totalAreaM2 = options.totalAreaM2 ?? PROJECT_001_BASELINE_SCENARIO.land.totalAreaM2;
  const usableFraction = options.usableFraction ?? 0.824;
  if (!Number.isFinite(usableFraction) || usableFraction <= 0 || usableFraction > 1) throw new Error('Blank-slate usableFraction must be within (0, 1].');
  const usableAreaM2 = totalAreaM2 * usableFraction;
  const skin = requireActiveEnvironmentSkin(options.skinId ?? 'default');
  const scenario: HomesteadScenarioDefinition = {
    ...PROJECT_001_BASELINE_SCENARIO,
    id: options.id ?? 'orchade-blank-slate',
    seed: options.seed ?? 'orchade-blank-slate-fixed',
    durationDays: options.durationDays ?? 365,
    intents: ['build-from-empty-land', 'measure-constraints-before-expansion'],
    revision: {
      id: options.revisionId ?? 'blank-slate-rev-001',
      changeSet: [],
      reason: 'Deterministic blank-slate planning scenario.',
      evidenceRefs: [],
      createdAt: options.createdAt ?? '2026-08-31T00:00:04.000Z',
    },
    land: {
      ...PROJECT_001_BASELINE_SCENARIO.land,
      totalAreaM2,
      usableAreaM2,
      reservedAreaM2: totalAreaM2 - usableAreaM2,
      soilZones: [{
        id: 'blank-soil-zone',
        areaM2: usableAreaM2,
        moisture: 50,
        fertility: 50,
        organicMatter: skin.climatePreset.soilProfile.organicMatterPercent,
        drainage: 50,
        waterHoldingCapacity: 50,
        healthScore: 50,
      }],
      waterZones: [],
      placements: [],
    },
    climate: {
      profileId: 'skin:' + skin.id,
      deterministicStress: 'none',
      seasons: skin.climatePreset.seasons.map(profile => ({ ...profile })),
    },
    household: {
      ...PROJECT_001_BASELINE_SCENARIO.household,
      members: options.householdMembers ?? 4,
      initialFoodInventoryCalories: 0,
    },
    foodProducers: [],
    livestock: [],
    water: {
      tankCapacityL: 0,
      initialTankLevelL: 0,
      catchmentAreaM2: 0,
      captureEfficiency: 0,
      leakageFractionPerDay: 0,
      tankEvaporationLPerDay: 0,
      pondCapacityL: 0,
      initialPondLevelL: 0,
      runoffAreaM2: 0,
      runoffCoefficient: 0,
      pondEvaporationLPerDay: 0,
      externalWaterLPerDay: 0,
    },
    energy: {
      solarCapacityKw: 0,
      solarEfficiency: 0,
      batteryCapacityKwh: 0,
      initialBatteryKwh: 0,
      gridEnabled: false,
      biomassKwhPerDay: 0,
      householdLoadKwhPerDay: 0,
      farmBaseLoadKwhPerDay: 0,
      pumpKwhPerLitre: PROJECT_001_BASELINE_SCENARIO.energy.pumpKwhPerLitre,
      systemLossFraction: 0,
    },
    nutrients: {
      ...PROJECT_001_BASELINE_SCENARIO.nutrients,
      initialFreshMaterialUnits: 0,
      initialActiveMaterialUnits: 0,
      initialMatureCompostUnits: 0,
      externalNutrientUnitsPerDay: 0,
    },
    economy: {
      ...PROJECT_001_BASELINE_SCENARIO.economy,
      initialCash: 100,
      dailyPropertyOperatingCost: 0,
      activities: [],
    },
    operatingPolicy: {
      ...PROJECT_001_BASELINE_SCENARIO.operatingPolicy,
      allowFoodPurchases: false,
      allowFeedPurchases: false,
      allowExternalWater: false,
      allowGridImport: false,
    },
    experiments: [],
    metadata: {
      name: 'Blank-slate homestead',
      description: 'Empty land and zero infrastructure. All additions must enter through deterministic planning intents.',
    },
  };
  validateHomesteadScenario(scenario);
  return scenario;
}
