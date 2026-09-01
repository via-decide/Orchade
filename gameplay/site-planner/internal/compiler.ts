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
} from '../../../src/simulation/homestead/scenario';
import { PROJECT_001_BASELINE_SCENARIO } from '../../../src/simulation/homestead/project001Scenario';
import { FATAL_SITE_FAILURE_TYPES } from '../public';
import type {
  CompiledSiteScenario,
  SiteCropModuleType,
  SiteLivestockModuleType,
  SiteModuleDefinition,
  SiteModuleType,
  SiteProject,
  SiteScenarioAssumptions,
} from '../public';
import { computePolygonAreaM2, siteAreaM2 } from './geometry';
import { validateSiteProject } from './validation';
import { DEFAULT_SITE_SCENARIO_ASSUMPTIONS } from './scenarioAssumptions';

/**
 * Named, documented compiler-only assumptions that don't warrant their own
 * SiteScenarioAssumptions field because they are structural mapping choices,
 * not agronomic/operational numbers a planner would want to tune per-site.
 * (Part F: "isolated, documented and configurable" -- isolated here means
 * this one file, not hidden inside placement/validation/UI code.)
 */
const INITIAL_TANK_FILL_FRACTION = 1;
const INITIAL_POND_FILL_FRACTION = 1;
const INITIAL_BATTERY_FILL_FRACTION = 1;
const RAIN_CAPTURE_EFFICIENCY = 0.8;
const TANK_LEAKAGE_FRACTION_PER_DAY = 0.01;
const POND_RUNOFF_COEFFICIENT = 0.7;
const SOLAR_PANEL_EFFICIENCY = 0.85;
const COMPOST_FRESH_TO_ACTIVE_FRACTION_PER_DAY = 0.1;
const COMPOST_ACTIVE_TO_MATURE_FRACTION_PER_DAY = 0.05;
const ORGANIC_WASTE_UNITS_PER_PERSON_DAY = 0.3;

const MODULE_TYPE_TO_LAND_PLACEMENT_TYPE: Record<SiteModuleType, LandPlacementType> = {
  RESIDENCE: 'house',
  WORKSHOP: 'shed',
  GREENHOUSE: 'greenhouse',
  VEGETABLE_BED: 'vegetable-bed',
  STAPLE_FIELD: 'staple-field',
  ORCHARD: 'orchard',
  NURSERY: 'nursery',
  CHICKEN_COOP: 'livestock',
  SMALL_LIVESTOCK: 'livestock',
  COMPOST: 'compost',
  VERMICOMPOST: 'vermicompost',
  BIOGAS: 'biogas',
  RAIN_CATCHMENT: 'water',
  WATER_TANK: 'water',
  POND: 'water',
  SOLAR_ARRAY: 'solar',
  BATTERY: 'battery',
  GRID_CONNECTION: 'grid',
  SHED: 'shed',
  FOOD_STORAGE: 'food-storage',
  EQUIPMENT_STORAGE: 'equipment-storage',
  ROAD: 'road',
  PATH: 'path',
  SERVICE_AREA: 'service-area',
};

const CROP_MODULE_TO_FOOD_PRODUCER_TYPE: Record<SiteCropModuleType, FoodProducerType> = {
  VEGETABLE_BED: 'vegetable-bed',
  STAPLE_FIELD: 'staple-field',
  ORCHARD: 'orchard',
  GREENHOUSE: 'greenhouse',
  NURSERY: 'nursery',
};

const CROP_MODULE_TYPES: SiteCropModuleType[] = ['VEGETABLE_BED', 'STAPLE_FIELD', 'ORCHARD', 'GREENHOUSE', 'NURSERY'];
const LIVESTOCK_MODULE_TYPES: SiteLivestockModuleType[] = ['CHICKEN_COOP', 'SMALL_LIVESTOCK'];

function isCropModuleType(moduleType: SiteModuleType): moduleType is SiteCropModuleType {
  return (CROP_MODULE_TYPES as string[]).includes(moduleType);
}

function isLivestockModuleType(moduleType: SiteModuleType): moduleType is SiteLivestockModuleType {
  return (LIVESTOCK_MODULE_TYPES as string[]).includes(moduleType);
}

function excludedAndStructureAreaM2(project: SiteProject): number {
  const excluded = project.geometry.excludedZones.reduce((sum, zone) => sum + computePolygonAreaM2(zone.polygon), 0);
  const structures = project.geometry.existingStructures.reduce((sum, structure) => sum + computePolygonAreaM2(structure.polygon), 0);
  return excluded + structures;
}

function compileLandPlacements(modules: SiteModuleDefinition[]): LandPlacementDefinition[] {
  return modules.map(module => ({
    id: module.moduleId,
    type: MODULE_TYPE_TO_LAND_PLACEMENT_TYPE[module.moduleType],
    areaM2: module.footprintM2,
  }));
}

function compileFoodProducers(modules: SiteModuleDefinition[], assumptions: SiteScenarioAssumptions, startDay: number): FoodProducerDefinition[] {
  return modules
    .filter(module => module.enabled && isCropModuleType(module.moduleType))
    .map(module => {
      const moduleType = module.moduleType as SiteCropModuleType;
      const profile = assumptions.cropProfiles[moduleType];
      const area = module.footprintM2;
      return {
        id: `fp-${module.moduleId}`,
        type: CROP_MODULE_TO_FOOD_PRODUCER_TYPE[moduleType],
        placementId: module.moduleId,
        cropId: `site-module:${moduleType}`,
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

function compileLivestock(modules: SiteModuleDefinition[], assumptions: SiteScenarioAssumptions): LivestockScenarioDefinition[] {
  return modules
    .filter(module => module.enabled && isLivestockModuleType(module.moduleType))
    .map(module => {
      const moduleType = module.moduleType as SiteLivestockModuleType;
      const profile = assumptions.livestockProfiles[moduleType];
      const count = module.capacity ?? 1;
      return {
        id: `ls-${module.moduleId}`,
        placementId: module.moduleId,
        type: moduleType === 'CHICKEN_COOP' ? 'chickens' as const : 'sheep' as const,
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

/**
 * Maps a validated SiteProject into the existing canonical HomesteadScenarioDefinition.
 * Throws only on FATAL spatial/geometry failures (a physically impossible site
 * cannot be compiled at all). ADVISORY failures (missing resource connections,
 * unreachable modules, missing dependencies) are returned alongside the
 * compiled scenario so the caller can still choose to run it -- the underlying
 * simulation reasons over aggregated scenario numbers, not the resource graph,
 * so a compiled scenario is always runnable once it is spatially valid.
 */
export function compileSiteProjectToHomesteadScenario(
  project: SiteProject,
  assumptionsOverride: Partial<SiteScenarioAssumptions> = {},
): CompiledSiteScenario {
  const assumptions: SiteScenarioAssumptions = { ...DEFAULT_SITE_SCENARIO_ASSUMPTIONS, ...assumptionsOverride };
  const failures = validateSiteProject(project);
  const fatalFailures = failures.filter(f => FATAL_SITE_FAILURE_TYPES.includes(f.type));
  if (fatalFailures.length > 0) {
    throw new Error(`Cannot compile site project ${project.siteProjectId}: ${fatalFailures.map(f => f.reason).join(' ')}`);
  }

  const totalAreaM2 = siteAreaM2(project.geometry);
  const nonProductiveAreaM2 = excludedAndStructureAreaM2(project) +
    project.modules.filter(m => m.moduleType === 'ROAD' || m.moduleType === 'PATH' || m.moduleType === 'SERVICE_AREA').reduce((sum, m) => sum + m.footprintM2, 0);
  const reservedAreaM2 = Math.min(nonProductiveAreaM2, totalAreaM2);
  const usableAreaM2 = Math.max(0.01, totalAreaM2 - reservedAreaM2);

  const enabledModules = project.modules.filter(m => m.enabled);
  const rainCatchmentAreaM2 = enabledModules.filter(m => m.moduleType === 'RAIN_CATCHMENT').reduce((sum, m) => sum + m.footprintM2, 0);
  const tankCapacityL = enabledModules.filter(m => m.moduleType === 'WATER_TANK').reduce((sum, m) => sum + (m.capacity ?? 0), 0);
  const pondCapacityL = enabledModules.filter(m => m.moduleType === 'POND').reduce((sum, m) => sum + (m.capacity ?? 0), 0);
  const solarCapacityKw = enabledModules.filter(m => m.moduleType === 'SOLAR_ARRAY').reduce((sum, m) => sum + (m.capacity ?? 0), 0);
  const batteryCapacityKwh = enabledModules.filter(m => m.moduleType === 'BATTERY').reduce((sum, m) => sum + (m.capacity ?? 0), 0);
  const gridEnabled = enabledModules.some(m => m.moduleType === 'GRID_CONNECTION');
  const biomassKwhPerDay = enabledModules.filter(m => m.moduleType === 'BIOGAS').reduce((sum, m) => sum + m.energyProfile.productionKwhPerDay, 0);
  const householdLoadKwhPerDay = enabledModules.filter(m => m.moduleType === 'RESIDENCE').reduce((sum, m) => sum + m.energyProfile.consumptionKwhPerDay, 0);
  const farmBaseLoadKwhPerDay = enabledModules.filter(m => m.moduleType !== 'RESIDENCE').reduce((sum, m) => sum + m.energyProfile.consumptionKwhPerDay, 0);
  const dailyPropertyOperatingCost = enabledModules.reduce((sum, m) => sum + m.economicProfile.operatingCostPerDay, 0);

  const scenario: HomesteadScenarioDefinition = {
    id: `site-scenario:${project.siteProjectId}:${project.revision.revisionId}`,
    schemaVersion: HOMESTEAD_SCENARIO_SCHEMA_VERSION,
    simulationVersion: PROJECT_001_SIMULATION_VERSION,
    seed: project.seed,
    startDate: assumptions.startDate,
    startDay: assumptions.startDay,
    durationDays: project.planningHorizonDays,
    timestep: 'day',
    unitSystem: 'metric',
    controllerMode: 'manual',
    intents: ['site-planner-compiled'],
    revision: {
      id: project.revision.revisionId,
      parentRevisionId: project.revision.parentRevisionId,
      changeSet: [],
      reason: project.revision.rationale || 'Compiled from Site Planner project.',
      evidenceRefs: project.revision.evidenceRefs,
      createdAt: project.revision.createdAt,
    },
    land: {
      totalAreaM2,
      usableAreaM2,
      reservedAreaM2: totalAreaM2 - usableAreaM2,
      slopePercent: 0,
      aspect: 'south',
      elevationM: 0,
      soilZones: [{ id: 'site-soil-zone', areaM2: usableAreaM2, moisture: 50, fertility: 50, organicMatter: 5, drainage: 50, waterHoldingCapacity: 50, healthScore: 50 }],
      waterZones: [
        ...enabledModules.filter(m => m.moduleType === 'WATER_TANK').map(m => ({ id: m.moduleId, type: 'tank' as const, areaM2: m.footprintM2 })),
        ...enabledModules.filter(m => m.moduleType === 'POND').map(m => ({ id: m.moduleId, type: 'pond' as const, areaM2: m.footprintM2 })),
      ],
      placements: compileLandPlacements(project.modules),
    },
    climate: {
      profileId: assumptions.climateProfileId,
      deterministicStress: 'none',
      seasons: assumptions.climateSeasons,
    },
    household: {
      members: project.householdSize,
      caloriesPerPersonDay: assumptions.caloriesPerPersonDay,
      waterLitresPerPersonDay: assumptions.waterLitresPerPersonDay,
      labourMinutesAvailablePerDay: assumptions.labourMinutesAvailablePerDay,
      initialFoodInventoryCalories: 0,
    },
    foodProducers: compileFoodProducers(project.modules, assumptions, assumptions.startDay),
    livestock: compileLivestock(project.modules, assumptions),
    water: {
      tankCapacityL,
      initialTankLevelL: tankCapacityL * INITIAL_TANK_FILL_FRACTION,
      catchmentAreaM2: rainCatchmentAreaM2,
      captureEfficiency: RAIN_CAPTURE_EFFICIENCY,
      leakageFractionPerDay: TANK_LEAKAGE_FRACTION_PER_DAY,
      tankEvaporationLPerDay: 0,
      pondCapacityL,
      initialPondLevelL: pondCapacityL * INITIAL_POND_FILL_FRACTION,
      runoffAreaM2: rainCatchmentAreaM2,
      runoffCoefficient: POND_RUNOFF_COEFFICIENT,
      pondEvaporationLPerDay: 0,
      externalWaterLPerDay: 0,
    },
    energy: {
      solarCapacityKw,
      solarEfficiency: SOLAR_PANEL_EFFICIENCY,
      batteryCapacityKwh,
      initialBatteryKwh: batteryCapacityKwh * INITIAL_BATTERY_FILL_FRACTION,
      gridEnabled,
      biomassKwhPerDay,
      householdLoadKwhPerDay,
      farmBaseLoadKwhPerDay,
      pumpKwhPerLitre: assumptions.pumpKwhPerLitre,
      systemLossFraction: assumptions.systemLossFraction,
    },
    nutrients: {
      initialFreshMaterialUnits: 0,
      initialActiveMaterialUnits: 0,
      initialMatureCompostUnits: 0,
      freshToActiveFractionPerDay: COMPOST_FRESH_TO_ACTIVE_FRACTION_PER_DAY,
      activeToMatureFractionPerDay: COMPOST_ACTIVE_TO_MATURE_FRACTION_PER_DAY,
      organicWasteUnitsPerPersonDay: ORGANIC_WASTE_UNITS_PER_PERSON_DAY,
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
      allowExternalWater: false,
      allowGridImport: gridEnabled,
      irrigationSoilMoistureTarget: PROJECT_001_BASELINE_SCENARIO.operatingPolicy.irrigationSoilMoistureTarget,
      minimumCropMoisture: PROJECT_001_BASELINE_SCENARIO.operatingPolicy.minimumCropMoisture,
      applyMatureCompost: PROJECT_001_BASELINE_SCENARIO.operatingPolicy.applyMatureCompost,
    },
    experiments: [],
    metadata: { name: project.title, description: `Compiled from Site Planner project ${project.siteProjectId} revision ${project.revision.revisionId}.` },
  };

  validateHomesteadScenario(scenario);
  return { scenario, failures: failures.filter(f => !FATAL_SITE_FAILURE_TYPES.includes(f.type)) };
}
