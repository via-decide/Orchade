import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  PROJECT_001_BASELINE_SCENARIO,
  advanceProject001RunSession,
  createEvidenceBackedLearnedRule,
  createProject001InitialState,
  createProject001RunSession,
  createScenarioRevision,
  finalizeProject001Run,
  runProject001Demonstration,
  runProject001Scenario,
  validateHomesteadScenario,
  type HomesteadScenarioDefinition,
  type Project001RunSession,
} from '../src/simulation/homestead';

const cloneScenario = (): HomesteadScenarioDefinition => structuredClone(PROJECT_001_BASELINE_SCENARIO);
const withDuration = (scenario: HomesteadScenarioDefinition, durationDays: number): HomesteadScenarioDefinition => ({ ...scenario, durationDays });

export function runProject001Tests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error(`❌ Test failed: ${message}`); }
  };
  const assertThrows = (callback: () => void, message: string) => {
    try { callback(); assert(false, message); } catch { assert(true, message); }
  };

  validateHomesteadScenario(PROJECT_001_BASELINE_SCENARIO);
  assert(true, 'Canonical Project 001 scenario validates');
  const initial = createProject001InitialState(PROJECT_001_BASELINE_SCENARIO);
  assert(initial.state.land.remainingUsableAreaM2 >= 0, 'Land allocation never produces negative remaining area');
  assert(new Set(initial.state.foodProducers.map(item => item.type)).size === 4, 'Vegetable, staple, orchard, and greenhouse producers coexist');
  assert(initial.state.livestock.length === 1, 'Livestock coexists with food producers');

  const deterministicScenario = withDuration(cloneScenario(), 30);
  const deterministicA = runProject001Scenario(deterministicScenario);
  const deterministicB = runProject001Scenario(deterministicScenario);
  assert(deterministicA.finalStateHash === deterministicB.finalStateHash, 'Same Project 001 scenario and seed produce identical final checksum');
  assert(JSON.stringify(deterministicA.dailyChecksums) === JSON.stringify(deterministicB.dailyChecksums), 'Same Project 001 scenario and seed produce identical checksum sequence');
  assert(JSON.stringify(deterministicA.events) === JSON.stringify(deterministicB.events), 'Same Project 001 scenario and seed produce identical events');

  const overArea = cloneScenario();
  overArea.land.placements.push({ id: 'oversized-component', type: 'greenhouse', areaM2: overArea.land.usableAreaM2 });
  const overAreaInitial = createProject001InitialState(overArea);
  assert(overAreaInitial.state.land.rejectedPlacementIds.includes('oversized-component'), 'Component exceeding remaining land is rejected');
  assert(overAreaInitial.events.some(event => event.type === 'PLACEMENT_REJECTED'), 'Rejected placement emits structured event');

  const zeroRain = withDuration(cloneScenario(), 45);
  zeroRain.climate = { ...zeroRain.climate, deterministicStress: 'zero-rainfall' };
  zeroRain.water = { ...zeroRain.water, initialTankLevelL: 500, initialPondLevelL: 0 };
  zeroRain.operatingPolicy = { ...zeroRain.operatingPolicy, allowExternalWater: false };
  const zeroRainRun = runProject001Scenario(zeroRain);
  assert(zeroRainRun.events.some(event => event.type === 'WATER_SHORTAGE'), 'Zero rainfall drains storage and emits water shortage');
  assert(zeroRainRun.finalState.water.tankLevelL >= 0 && zeroRainRun.finalState.water.pondLevelL >= 0, 'Zero rainfall never creates negative water');

  const zeroEnergy = withDuration(cloneScenario(), 15);
  zeroEnergy.climate = { ...zeroEnergy.climate, deterministicStress: 'solar-deficit' };
  zeroEnergy.energy = { ...zeroEnergy.energy, solarCapacityKw: 0, initialBatteryKwh: 0, gridEnabled: false, biomassKwhPerDay: 0 };
  zeroEnergy.operatingPolicy = { ...zeroEnergy.operatingPolicy, allowGridImport: false };
  const zeroEnergyRun = runProject001Scenario(zeroEnergy);
  assert(zeroEnergyRun.events.some(event => event.type === 'ENERGY_SHORTAGE'), 'Zero solar without grid emits energy shortage');
  assert(zeroEnergyRun.events.some(event => event.type === 'IRRIGATION_SKIPPED'), 'Energy shortage prevents or degrades irrigation');
  assert(zeroEnergyRun.events.some(event => event.type === 'CROP_STRESSED'), 'Skipped irrigation propagates into crop stress');

  const foodShortage = withDuration(cloneScenario(), 2);
  foodShortage.household = { ...foodShortage.household, initialFoodInventoryCalories: 0 };
  foodShortage.economy = { ...foodShortage.economy, initialCash: 0 };
  foodShortage.operatingPolicy = { ...foodShortage.operatingPolicy, allowFoodPurchases: false };
  const foodShortageRun = runProject001Scenario(foodShortage);
  assert(foodShortageRun.events.some(event => event.type === 'FOOD_SHORTAGE'), 'Household demand exceeding food supply emits shortage');

  const livestockShortage = withDuration(cloneScenario(), 2);
  livestockShortage.livestock = livestockShortage.livestock.map(item => ({ ...item, initialFeedKg: 0 }));
  livestockShortage.water = { ...livestockShortage.water, initialTankLevelL: 0, initialPondLevelL: 0 };
  livestockShortage.climate = { ...livestockShortage.climate, deterministicStress: 'zero-rainfall' };
  livestockShortage.operatingPolicy = { ...livestockShortage.operatingPolicy, allowFeedPurchases: false };
  const livestockShortageRun = runProject001Scenario(livestockShortage);
  assert(livestockShortageRun.events.some(event => event.type === 'LIVESTOCK_RESOURCE_SHORTAGE'), 'Livestock without water/feed emits explicit shortage');

  const labourOverload = withDuration(cloneScenario(), 2);
  labourOverload.household = { ...labourOverload.household, labourMinutesAvailablePerDay: 1 };
  assert(runProject001Scenario(labourOverload).events.some(event => event.type === 'LABOUR_OVERLOAD'), 'Finite labour capacity emits overload');

  const cashShortage = withDuration(cloneScenario(), 2);
  cashShortage.economy = { ...cashShortage.economy, initialCash: 0, activities: cashShortage.economy.activities.map(activity => ({ ...activity, enabled: false })) };
  assert(runProject001Scenario(cashShortage).events.some(event => event.type === 'CASH_SHORTAGE'), 'Expenditure exceeding cash emits shortage');

  assertThrows(() => validateHomesteadScenario({ ...cloneScenario(), seed: '' }), 'Malformed scenario fails before runtime');
  assertThrows(() => validateHomesteadScenario({ ...cloneScenario(), unitSystem: 'imperial' as HomesteadScenarioDefinition['unitSystem'] }), 'Unsupported units fail closed');

  const checkpointScenario = withDuration(cloneScenario(), 60);
  const uninterrupted = runProject001Scenario(checkpointScenario);
  const checkpoint = advanceProject001RunSession(createProject001RunSession(checkpointScenario), 30);
  const serializedCheckpoint = JSON.parse(JSON.stringify(checkpoint)) as Project001RunSession;
  const resumed = finalizeProject001Run(advanceProject001RunSession(serializedCheckpoint, 30));
  assert(resumed.finalStateHash === uninterrupted.finalStateHash, 'Checkpoint/resume matches uninterrupted final state');
  assert(JSON.stringify(resumed.dailyChecksums) === JSON.stringify(uninterrupted.dailyChecksums), 'Checkpoint/resume preserves daily checksum sequence');

  const revised = createScenarioRevision(cloneScenario(), {
    id: 'project-001-remove-greenhouse', createdAt: '2026-08-31T00:00:02.000Z', reason: 'Test deterministic component deletion.', evidenceRefs: [],
    changes: [{ path: 'land.placements.greenhouse', operation: 'remove', previousValue: 'greenhouse' }],
  });
  assert(!revised.land.placements.some(item => item.id === 'greenhouse') && !revised.foodProducers.some(item => item.placementId === 'greenhouse'), 'Component deletion produces a revision without orphan producer state');

  assertThrows(() => createEvidenceBackedLearnedRule(deterministicA, {
    id: 'invalid-rule', condition: 'water is low', outcome: 'yield falls', evidenceRefs: ['missing-evidence'], status: 'SUPPORTED',
  }), 'Learned rule with inconsistent evidence is rejected');
  const validEvidence = deterministicA.events.find(event => event.type === 'WATER_SHORTAGE')?.id ?? deterministicA.events[0].id;
  assert(Boolean(createEvidenceBackedLearnedRule(deterministicA, {
    id: 'evidence-rule', condition: 'water storage is constrained', outcome: 'irrigation is reduced', evidenceRefs: [validEvidence], status: 'SUPPORTED',
  })), 'Learned rule accepts real simulation evidence');

  const sourceFiles = ['projectTransition.ts', 'projectRun.ts', 'projectInitialState.ts', 'analytics.ts', 'knowledge.ts', 'revision.ts'];
  const sources = sourceFiles.map(file => readFileSync(fileURLToPath(new URL(`../src/simulation/homestead/${file}`, import.meta.url)), 'utf8')).join('\n');
  assert(!/from ['\"]react|Math\.random\s*\(|Date\.now\s*\(|crypto\.randomUUID\s*\(/.test(sources), 'Project 001 simulation is React-independent and contains no ambient randomness or wall-clock IDs');

  const demo = runProject001Demonstration();
  assert(demo.baseline.metricSeries.length === 365, 'Project 001 baseline produces 365 analysis-ready daily records');
  assert(demo.baseline.finalStateHash === 'e9b4b178' && demo.intervention.finalStateHash === 'cc4e9785', '365-day baseline and intervention match checked-in final checksums');
  assert(demo.baseline.dailyChecksums.length === 365 && demo.baseline.replayFrames.length === 365, 'Project 001 baseline produces daily replay/checksum evidence');
  assert(demo.baseline.scenarioHash !== demo.intervention.scenarioHash && demo.baseline.seed === demo.intervention.seed, 'Baseline and revision isolate configuration change under shared seed');
  assert((demo.intervention.failureSummary.WATER_SHORTAGE ?? 0) < (demo.baseline.failureSummary.WATER_SHORTAGE ?? 0), 'Water-storage intervention reduces shortage failures');
  assert(demo.intervention.finalMetrics.foodSelfSufficiency > demo.baseline.finalMetrics.foodSelfSufficiency, 'Intervention improves downstream food coverage');
  assert(demo.experimentSummary.evidence.scenarioHashes.length === 2 && demo.experimentSummary.status === 'SUPPORTED', 'Completed experiment generates structured evidence-backed summary');
  assert(Boolean(demo.firstConstraint?.immediateCause && demo.firstConstraint.upstreamCauses.length), 'Demonstration exposes a causal failure chain');
  assert(demo.baseline.metricSeries.every(record => Number.isFinite(record.cashBalance) && Number.isFinite(record.foodSelfSufficiency)), 'Daily analytics records are finite and dashboard-independent');

  return { passed, failed, errors };
}
