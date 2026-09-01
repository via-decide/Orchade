import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hashSeed } from '../src/engine/random/rng';
import {
  DEFAULT_PLOT_PLANNER_SCENARIO,
  runHomesteadScenario,
  validateHomesteadScenario,
  type HomesteadScenarioDefinition,
  type HomesteadSimulationState,
  type HomesteadZoneState,
} from '../src/simulation/homestead';

type TestZone = HomesteadZoneState & { name: string };

export function makeScenario(seed: string): HomesteadScenarioDefinition {
  return { ...DEFAULT_PLOT_PLANNER_SCENARIO, id: 'homestead-determinism-test', seed, durationDays: 30 };
}

export function makeInitialState(scenario: HomesteadScenarioDefinition): HomesteadSimulationState<TestZone> {
  return {
    day: scenario.startDay,
    season: 'spring',
    rngState: hashSeed(scenario.seed),
    water: {
      catchmentSqft: 2800,
      currentStoredGallons: 4200,
      maxCisternCapacityGallons: 6000,
      annualRainfallInches: 38,
      dailyConsumptionGallons: 180,
      swaleInfiltrationRate: 1200,
      graywaterRecycledGallons: 45,
      irrigationType: 'drip',
      keylinePondsCount: 1,
    },
    solar: {
      solarArrayWatts: 6400,
      batteryBankKwh: 15,
      currentBatteryStorageKwh: 13.8,
      maxBatteryStorageKwh: 15,
      dailyGenerationKwh: 28.5,
      dailyLoadKwh: 18.2,
      isOffGridTied: true,
      backupBiomassGenActive: false,
    },
    zones: [{
      id: 1,
      name: 'Tomato test zone',
      soil: { nitrogen: 65, phosphorus: 60, potassium: 70, organicMatter: 6.2 },
      plant: { cropId: 'tomato', water: 65, health: 100, stageIndex: 1, rootStrength: 12, isHarvestable: false },
    }],
    paddocks: [{
      id: 'pad-test',
      zoneId: 1,
      breedId: 'heritage_chickens',
      population: 24,
      health: 100,
      pastureBiomass: 88,
      daysInPaddock: 2,
      manureAccumulation: 28,
      cycleProgress: 2,
      shelterStatus: 'coop',
    }],
  };
}

export function runHomesteadSimulationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else {
      failed += 1;
      errors.push(message);
      console.error(`❌ Test failed: ${message}`);
    }
  };
  const assertThrows = (callback: () => void, message: string) => {
    try {
      callback();
      assert(false, message);
    } catch {
      assert(true, message);
    }
  };

  const scenario = makeScenario('orchade-homestead-test-a');
  const firstRun = runHomesteadScenario(scenario, makeInitialState(scenario));
  const repeatedRun = runHomesteadScenario(scenario, makeInitialState(scenario));
  assert(JSON.stringify(firstRun.finalState) === JSON.stringify(repeatedRun.finalState), 'Same seed produces the same 30-day final state');
  assert(JSON.stringify(firstRun.events) === JSON.stringify(repeatedRun.events), 'Same seed produces identical deterministic events');
  assert(firstRun.finalStateChecksum === repeatedRun.finalStateChecksum, 'Same seed produces the same final checksum');
  assert(firstRun.finalStateChecksum === '23751fc', 'Fixed 30-day scenario matches its checked-in checksum');
  assert(firstRun.replayFrames.length === 30 && firstRun.endDay === 31, 'Fixed scenario creates a replayable 30-day frame history');
  assert(firstRun.replayFrames.every(frame => Boolean(frame.checksum)), 'Every replay frame contains checksum evidence');

  const otherScenario = makeScenario('orchade-homestead-test-b');
  const otherRun = runHomesteadScenario(otherScenario, makeInitialState(otherScenario));
  const stochasticTypes = new Set(['WEATHER_SAMPLED', 'RAINFALL_OCCURRED', 'FROST_DAMAGE_APPLIED']);
  const stochasticHistory = firstRun.events.filter(event => stochasticTypes.has(event.type)).map(event => ({ type: event.type, payload: event.payload }));
  const otherStochasticHistory = otherRun.events.filter(event => stochasticTypes.has(event.type)).map(event => ({ type: event.type, payload: event.payload }));
  assert(JSON.stringify(stochasticHistory) !== JSON.stringify(otherStochasticHistory), 'Different seeds produce different stochastic histories');

  const final = firstRun.finalState;
  assert(final.water.currentStoredGallons >= 0 && final.water.currentStoredGallons <= final.water.maxCisternCapacityGallons, 'Cistern remains bounded');
  assert(final.solar.currentBatteryStorageKwh >= 0 && final.solar.currentBatteryStorageKwh <= final.solar.maxBatteryStorageKwh, 'Battery remains bounded');
  assert(final.zones.every(zone => zone.plant.health >= 0 && zone.plant.health <= 100), 'Crop health remains bounded');
  assert(final.zones.every(zone => [zone.soil.nitrogen, zone.soil.phosphorus, zone.soil.potassium].every(value => value >= 0 && value <= 100)), 'Soil nutrients remain bounded');
  assert(final.paddocks.every(paddock => paddock.health >= 0 && paddock.health <= 100), 'Livestock health remains bounded');

  const simulatorSources = ['scenario.ts', 'state.ts', 'events.ts', 'advanceDay.ts', 'run.ts']
    .map(file => readFileSync(fileURLToPath(new URL(`../src/simulation/homestead/${file}`, import.meta.url)), 'utf8'))
    .join('\n');
  assert(!/Math\.random\s*\(|Date\.now\s*\(|crypto\.randomUUID\s*\(/.test(simulatorSources), 'Homestead simulator contains no wall-clock or nondeterministic random calls');

  assertThrows(() => validateHomesteadScenario({ ...scenario, seed: '' }), 'Empty scenario seed fails closed');
  assertThrows(() => validateHomesteadScenario({ ...scenario, schemaVersion: 99 }), 'Unsupported scenario schema fails closed');
  assertThrows(() => validateHomesteadScenario({ ...scenario, startDay: 0 }), 'Invalid scenario startDay fails closed');
  assertThrows(() => validateHomesteadScenario({ ...scenario, controllerMode: 'unsupported' as HomesteadScenarioDefinition['controllerMode'] }), 'Unsupported controller mode fails closed');

  return { passed, failed, errors };
}
