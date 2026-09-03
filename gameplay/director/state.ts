import type { NewGameState } from './public';
import type { HomesteadSimulationState } from '../../src/simulation/homestead/state';
import { createBlankSlateScenario, type BlankSlateScenarioOptions } from '../../src/simulation/homestead/blankSlateScenario';
import { createInitialHomesteadPlanningState } from '../../src/simulation/homestead/planningTransition';
import { DeterministicRandom, hashSeed as rngHashSeed } from '../../src/engine/random/rng';

export interface CreateNewGameOptions {
  runId?: string;
  seed?: string;
  scenarioOptions?: BlankSlateScenarioOptions;
}

export function createNewGameState(options: CreateNewGameOptions = {}): NewGameState {
  const seed = options.seed ?? 'orchade-new-game-' + Date.now();
  const scenario = createBlankSlateScenario({
    ...options.scenarioOptions,
    seed,
    id: options.scenarioOptions?.id ?? 'orchade-new-game',
  });

  const planning = createInitialHomesteadPlanningState(
    scenario.id,
    scenario.land.usableAreaM2,
    options.scenarioOptions?.skinId,
  );

  const rng = new DeterministicRandom(rngHashSeed(seed));

  const simulation: HomesteadSimulationState = {
    day: 1,
    season: scenario.climate.seasons[0]?.season ?? 'spring',
    water: {
      catchmentSqft: 0,
      currentStoredGallons: 0,
      maxCisternCapacityGallons: 0,
      annualRainfallInches: 38,
      dailyConsumptionGallons: 0,
      swaleInfiltrationRate: 0,
      graywaterRecycledGallons: 0,
      irrigationType: 'drip' as const,
      keylinePondsCount: 0,
    },
    solar: {
      solarArrayWatts: 0,
      batteryBankKwh: 0,
      currentBatteryStorageKwh: 0,
      maxBatteryStorageKwh: 0,
      dailyGenerationKwh: 0,
      dailyLoadKwh: 0,
      isOffGridTied: false,
      backupBiomassGenActive: false,
    },
    zones: scenario.land.soilZones.map((sz, i) => ({
      id: i + 1,
      soil: { nitrogen: sz.fertility, phosphorus: sz.fertility, potassium: sz.fertility, organicMatter: sz.organicMatter },
      plant: { cropId: null, water: sz.moisture, health: 100, stageIndex: 0, rootStrength: 0, isHarvestable: false },
    })),
    paddocks: [],
    rngState: rng.snapshot(),
  };

  return {
    runId: options.runId ?? 'run-' + seed,
    scenarioId: scenario.id,
    seed,
    day: 0,
    phase: 'ORIENTATION',
    objectiveId: 'inspect_land',
    completedObjectiveIds: [],
    planning,
    simulation,
    scenario,
    bootstrapRedeemed: false,
    simulationReady: false,
  };
}

