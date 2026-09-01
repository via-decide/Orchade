import { PROJECT_001_MODEL_CAPABILITIES, type ModelCapabilities } from './modelCapabilities';
import { createScenarioParameterProvenanceRegistry, type ParameterProvenanceRegistry } from './provenance';
import { PROJECT_001_BASELINE_SCENARIO } from './project001Scenario';
import { runProject001Scenario, type Project001SimulationRun } from './projectRun';
import { validateHomesteadScenario, type HomesteadScenarioDefinition } from './scenario';
import { acreToM2 } from './units';

export interface FarmProfile {
  id: string;
  name: string;
  description: string;
  landProfile: {
    totalAreaM2: number;
    usableAreaM2: number;
  };
  climateProfile: {
    profileId: string;
  };
  householdProfile: {
    members: number;
  };
  labourProfile: {
    availableMinutesPerDay: number;
  };
  mechanizationProfile: {
    status: 'SUPPORTED' | 'ESTIMATE_ONLY' | 'NOT_MODELED';
    notes: string;
  };
  cropPlan: string[];
  livestockPlan: string[];
  waterInfrastructure: string[];
  energyInfrastructure: string[];
  nutrientStrategy: string;
  economyProfile: {
    currency: string;
  };
  provenanceRefs: string[];
  modelCapabilities: ModelCapabilities;
  scenarioParameters: HomesteadScenarioDefinition;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function createSmallMixedScenario(): HomesteadScenarioDefinition {
  const scenario = clone(PROJECT_001_BASELINE_SCENARIO);
  scenario.id = 'farm-profile-small-mixed';
  scenario.seed = 'orchade-farm-profile-small-mixed';
  scenario.revision = {
    id: 'farm-profile-small-mixed-rev-001',
    changeSet: [],
    reason: 'Parameter-only small mixed farm fixture using the Project 001 engine.',
    evidenceRefs: [],
    createdAt: '2026-09-01T00:00:00.000Z',
  };
  scenario.metadata = {
    name: 'Small mixed farm fixture',
    description: 'A 0.75-acre mixed household farm represented by the same Project 001 scenario contract.',
  };
  validateHomesteadScenario(scenario);
  return scenario;
}

function createBroadacreScenario(): HomesteadScenarioDefinition {
  const scenario = clone(PROJECT_001_BASELINE_SCENARIO);
  const totalAreaM2 = acreToM2(240);
  const usableAreaM2 = 900000;
  scenario.id = 'farm-profile-broadacre';
  scenario.seed = 'orchade-farm-profile-broadacre';
  scenario.revision = {
    id: 'farm-profile-broadacre-rev-001',
    changeSet: [],
    reason: 'Parameter-only broadacre fixture proving scale does not select alternate physics.',
    evidenceRefs: [],
    createdAt: '2026-09-01T00:00:01.000Z',
  };
  scenario.intents = ['test-large-area-parameterization', 'expose-current-machinery-model-limit'];
  scenario.land = {
    ...scenario.land,
    totalAreaM2,
    usableAreaM2,
    reservedAreaM2: totalAreaM2 - usableAreaM2,
    slopePercent: 1.2,
    elevationM: 210,
    soilZones: [{
      id: 'broadacre-soil-main',
      areaM2: usableAreaM2,
      moisture: 55,
      fertility: 60,
      organicMatter: 3.2,
      drainage: 68,
      waterHoldingCapacity: 58,
      healthScore: 61,
    }],
    waterZones: [
      { id: 'broadacre-tank-zone', type: 'tank', areaM2: 1000 },
      { id: 'broadacre-pond-zone', type: 'pond', areaM2: 5000 },
    ],
    placements: [
      { id: 'broadacre-house', type: 'house', areaM2: 250 },
      { id: 'broadacre-field', type: 'staple-field', areaM2: 800000 },
      { id: 'broadacre-water', type: 'water', areaM2: 6000 },
      { id: 'broadacre-solar', type: 'solar', areaM2: 12000 },
      { id: 'broadacre-shed', type: 'shed', areaM2: 4000 },
    ],
  };
  scenario.household = {
    ...scenario.household,
    members: 4,
    labourMinutesAvailablePerDay: 960,
    initialFoodInventoryCalories: 250000,
  };
  scenario.foodProducers = [{
    id: 'broadacre-staples',
    type: 'staple-field',
    placementId: 'broadacre-field',
    cropId: 'broadacre-grain-fixture',
    areaM2: 800000,
    plantingDay: 35,
    cycleDays: 120,
    waterLitresPerM2Day: 0.8,
    nutrientUnitsPerM2Cycle: 0.06,
    labourMinutesPerDay: 720,
    harvestLabourMinutes: 1440,
    expectedCaloriesPerHarvest: 850000000,
    expectedKgPerHarvest: 600000,
    residueUnitsPerHarvest: 75000,
  }];
  scenario.livestock = [];
  scenario.water = {
    ...scenario.water,
    tankCapacityL: 1200000,
    initialTankLevelL: 1000000,
    catchmentAreaM2: 1500,
    captureEfficiency: 0.8,
    leakageFractionPerDay: 0.0005,
    tankEvaporationLPerDay: 120,
    pondCapacityL: 2500000,
    initialPondLevelL: 1800000,
    runoffAreaM2: 200000,
    runoffCoefficient: 0.12,
    pondEvaporationLPerDay: 1500,
    externalWaterLPerDay: 0,
  };
  scenario.energy = {
    ...scenario.energy,
    solarCapacityKw: 300,
    solarEfficiency: 0.75,
    batteryCapacityKwh: 1000,
    initialBatteryKwh: 850,
    householdLoadKwhPerDay: 22,
    farmBaseLoadKwhPerDay: 220,
    pumpKwhPerLitre: 0.0012,
  };
  scenario.nutrients = {
    ...scenario.nutrients,
    initialFreshMaterialUnits: 1000,
    initialActiveMaterialUnits: 3000,
    initialMatureCompostUnits: 12000,
    organicWasteUnitsPerPersonDay: 0.25,
  };
  scenario.economy = {
    ...scenario.economy,
    initialCash: 5000000,
    dailyPropertyOperatingCost: 15000,
    dailyHouseholdExpenditure: 1000,
    activities: [],
  };
  scenario.experiments = [];
  scenario.metadata = {
    name: 'Broadacre farm fixture',
    description: 'A large-area parameter fixture. Machinery, fuel, and grain logistics remain explicitly NOT_MODELED.',
  };
  validateHomesteadScenario(scenario);
  return scenario;
}

const smallScenario = createSmallMixedScenario();
const broadacreScenario = createBroadacreScenario();

export const SMALL_MIXED_FARM_PROVENANCE: ParameterProvenanceRegistry = createScenarioParameterProvenanceRegistry(smallScenario);
export const BROADACRE_FARM_PROVENANCE: ParameterProvenanceRegistry = createScenarioParameterProvenanceRegistry(broadacreScenario);

export const SMALL_MIXED_FARM_PROFILE: FarmProfile = {
  id: 'small-mixed-farm',
  name: 'Small Mixed Farm',
  description: 'High-diversity household farm with manual labour, mixed producers, livestock, compost, rain capture, and modest infrastructure.',
  landProfile: { totalAreaM2: smallScenario.land.totalAreaM2, usableAreaM2: smallScenario.land.usableAreaM2 },
  climateProfile: { profileId: smallScenario.climate.profileId },
  householdProfile: { members: smallScenario.household.members },
  labourProfile: { availableMinutesPerDay: smallScenario.household.labourMinutesAvailablePerDay },
  mechanizationProfile: {
    status: 'NOT_MODELED',
    notes: 'This fixture relies on the existing human-labour model; no machinery physics are injected.',
  },
  cropPlan: smallScenario.foodProducers.map(item => item.id),
  livestockPlan: smallScenario.livestock.map(item => item.id),
  waterInfrastructure: smallScenario.land.placements.filter(item => item.type === 'water').map(item => item.id),
  energyInfrastructure: smallScenario.land.placements.filter(item => item.type === 'solar').map(item => item.id),
  nutrientStrategy: 'Existing Project 001 compost/manure loop.',
  economyProfile: { currency: smallScenario.economy.currency },
  provenanceRefs: Object.values(SMALL_MIXED_FARM_PROVENANCE.records).map(record => record.id),
  modelCapabilities: PROJECT_001_MODEL_CAPABILITIES,
  scenarioParameters: smallScenario,
};

export const BROADACRE_FARM_PROFILE: FarmProfile = {
  id: 'broadacre-farm',
  name: 'Broadacre Farm',
  description: 'Large-area fixture with low crop diversity and larger water/energy/capital parameters. It intentionally does not invent machinery, fuel, or grain-logistics equations.',
  landProfile: { totalAreaM2: broadacreScenario.land.totalAreaM2, usableAreaM2: broadacreScenario.land.usableAreaM2 },
  climateProfile: { profileId: broadacreScenario.climate.profileId },
  householdProfile: { members: broadacreScenario.household.members },
  labourProfile: { availableMinutesPerDay: broadacreScenario.household.labourMinutesAvailablePerDay },
  mechanizationProfile: {
    status: 'NOT_MODELED',
    notes: 'The profile documents a mechanization gap. Labour remains an explicit scenario input rather than a hidden tractor shortcut.',
  },
  cropPlan: broadacreScenario.foodProducers.map(item => item.id),
  livestockPlan: [],
  waterInfrastructure: broadacreScenario.land.placements.filter(item => item.type === 'water').map(item => item.id),
  energyInfrastructure: broadacreScenario.land.placements.filter(item => item.type === 'solar').map(item => item.id),
  nutrientStrategy: 'Existing normalized Project 001 nutrient-unit model; detailed field nutrient logistics are not modeled.',
  economyProfile: { currency: broadacreScenario.economy.currency },
  provenanceRefs: Object.values(BROADACRE_FARM_PROVENANCE.records).map(record => record.id),
  modelCapabilities: PROJECT_001_MODEL_CAPABILITIES,
  scenarioParameters: broadacreScenario,
};

export function createScenarioFromFarmProfile(profile: FarmProfile): HomesteadScenarioDefinition {
  const scenario = clone(profile.scenarioParameters);
  validateHomesteadScenario(scenario);
  return scenario;
}

export function runFarmProfile(profile: FarmProfile, durationDays = profile.scenarioParameters.durationDays): Project001SimulationRun {
  return runProject001Scenario(createScenarioFromFarmProfile(profile), durationDays);
}
