import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checksum } from '../src/engine/replay/checksum';
import {
  PROJECT_001_BASELINE_SCENARIO,
  calculateSelfSufficiencyMetrics,
  deriveSystemPerformance,
  runProject001Scenario,
  type HomesteadScenarioDefinition,
  type ProjectHomesteadState,
} from '../src/simulation/homestead';

const cloneScenario = (durationDays = 30): HomesteadScenarioDefinition => ({
  ...structuredClone(PROJECT_001_BASELINE_SCENARIO),
  durationDays,
});

export function runSystemPerformanceTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error(`❌ Test failed: ${message}`); }
  };

  const scenario = cloneScenario();
  const run = runProject001Scenario(scenario, scenario.durationDays);
  const sourceHash = checksum(run.finalState);
  const snapshotA = deriveSystemPerformance(scenario, run.finalState, {
    dailyRecords: run.metricSeries,
    resilienceHorizonDays: 5,
  });
  const snapshotB = deriveSystemPerformance(scenario, run.finalState, {
    dailyRecords: run.metricSeries,
    resilienceHorizonDays: 5,
  });

  assert(JSON.stringify(snapshotA) === JSON.stringify(snapshotB), 'Same canonical state produces identical eight-metric system-performance snapshot');
  assert(checksum(run.finalState) === sourceHash, 'System-performance derivation does not mutate canonical Project 001 state');

  const expectedFoodSupply = run.finalState.foodProducers.reduce((total, producer) => total + producer.totalCaloriesProduced, 0)
    + run.finalState.livestock.reduce((total, animal) => total + animal.totalCaloriesProduced, 0);
  const expectedFoodDemand = run.finalState.household.members * scenario.household.caloriesPerPersonDay * scenario.durationDays;
  assert(snapshotA.foodCoverage.supplyCalories === expectedFoodSupply, 'Food coverage uses actual cumulative crop and livestock food output');
  assert(snapshotA.foodCoverage.demandCalories === expectedFoodDemand, 'Food coverage denominator uses actual household requirement across elapsed days');

  const moreFoodState = structuredClone(run.finalState) as ProjectHomesteadState;
  moreFoodState.foodProducers[0].totalCaloriesProduced += 50000;
  const moreFood = deriveSystemPerformance(scenario, moreFoodState, { resilienceHorizonDays: 1 });
  assert((moreFood.foodCoverage.coverage ?? 0) > (snapshotA.foodCoverage.coverage ?? 0), 'Food coverage changes only when its physical food-supply source changes');

  const moreDemandState = structuredClone(run.finalState) as ProjectHomesteadState;
  moreDemandState.household.members += 1;
  const moreDemand = deriveSystemPerformance(scenario, moreDemandState, { resilienceHorizonDays: 1 });
  assert((moreDemand.foodCoverage.coverage ?? 0) < (snapshotA.foodCoverage.coverage ?? 0), 'Food coverage falls when canonical household demand rises without added supply');

  assert(snapshotA.waterIndependence.availability === 'UNAVAILABLE'
    && snapshotA.waterIndependence.reason === 'WATER_DELIVERY_PROVENANCE_MISSING'
    && snapshotA.waterIndependence.independence === null,
  'Water independence fails closed until delivered water source provenance exists');
  assert(snapshotA.energyIndependence.availability === 'UNAVAILABLE'
    && snapshotA.energyIndependence.reason === 'ENERGY_DELIVERY_PROVENANCE_MISSING'
    && snapshotA.energyIndependence.independence === null,
  'Energy independence fails closed until delivered energy and battery provenance exists');
  assert(snapshotA.energyIndependence.gridImportKwh === run.finalState.energy.gridImportedTodayKwh, 'Energy read model exposes grid import separately from independent supply');

  const existingMetrics = calculateSelfSufficiencyMetrics(run.finalState);
  assert(snapshotA.nutrientCircularity.circularity === existingMetrics.nutrientCircularity, 'Nutrient Circularity exactly reuses the existing closed-loop calculation');
  assert(snapshotA.nutrientCircularity.internalSupplyUnits === run.finalState.nutrients.cumulativeInternalSupplyUnits
    && snapshotA.nutrientCircularity.requirementUnits === run.finalState.nutrients.cumulativeRequirementUnits,
  'Nutrient Circularity exposes canonical internal supply and requirement evidence');

  assert(snapshotA.labourBurden.requiredMinutesToday === run.finalState.household.labourRequiredTodayMinutes
    && snapshotA.labourBurden.availableMinutesToday === run.finalState.household.labourAvailableTodayMinutes
    && snapshotA.labourBurden.overloadMinutesToday === run.finalState.household.labourOverloadTodayMinutes,
  'Labour burden derives from existing Project 001 labour state');
  const expectedRollingLabour = run.metricSeries
    .filter(record => record.day > run.finalState.day - 7 && record.day <= run.finalState.day)
    .reduce((total, record) => total + record.labourRequiredMinutes, 0);
  assert(snapshotA.labourBurden.rolling7DayRequiredMinutes === expectedRollingLabour, 'Labour burden exposes deterministic rolling seven-day demand');

  const expectedTodayCashRequirement = run.finalState.economy.transactions
    .filter(transaction => transaction.day === run.finalState.day
      && (transaction.type === 'PURCHASE' || (transaction.type === 'COST' && transaction.category === 'PROPERTY')))
    .reduce((total, transaction) => total + transaction.amount, 0);
  assert(snapshotA.cashRequirement.currency === 'INR' && snapshotA.cashRequirement.requirementToday === expectedTodayCashRequirement, 'Cash requirement uses actual INR property/input transactions, not gameplay credits');
  assert(snapshotA.cashRequirement.scenarioPeriodRequirement
    === run.finalState.economy.cumulativePropertyOperatingCost + run.finalState.economy.cumulativeInputPurchases,
  'Scenario-period cash requirement reuses existing property operating cost and input-purchase totals');

  assert(snapshotA.failureFrequency.rawCount === run.finalState.knowledge.failures.length, 'Failure frequency counts existing simulator FailureRecords only');
  assert(Object.values(snapshotA.failureFrequency.byType).reduce((total, count) => total + (count ?? 0), 0) === snapshotA.failureFrequency.rawCount, 'Failure-frequency type breakdown reconciles to raw count');

  assert(snapshotA.resilienceUnderStress.profiles.length === 2
    && snapshotA.resilienceUnderStress.profiles[0].stressType === 'zero-rainfall'
    && snapshotA.resilienceUnderStress.profiles[1].stressType === 'solar-deficit',
  'Resilience is a vector of fixed physical stress evaluations, not a weighted score');
  assert(JSON.stringify(snapshotA.resilienceUnderStress) === JSON.stringify(snapshotB.resilienceUnderStress), 'Resilience stress evaluation is deterministic from the same current-state snapshot');
  assert(snapshotA.resilienceUnderStress.profiles.every(profile => profile.startStateHash === sourceHash), 'Every resilience profile starts from the exact canonical state snapshot');

  const serialized = JSON.stringify(snapshotA);
  assert(!/"(?:xp|coin|coins|reward|rewarded|score|level|paidUnlockCount)"\s*:/i.test(serialized), 'System-performance contract contains no XP, coin, reward, score, level, or paid-unlock fields');

  const rerun = runProject001Scenario(scenario, scenario.durationDays);
  assert(rerun.finalStateHash === run.finalStateHash
    && JSON.stringify(rerun.dailyChecksums) === JSON.stringify(run.dailyChecksums),
  'Adding the read model does not alter Project 001 physical replay/checksum behavior');

  const source = readFileSync(fileURLToPath(new URL('../src/simulation/homestead/systemPerformance.ts', import.meta.url)), 'utf8');
  assert(!/Math\.random\s*\(|Date\.now\s*\(|crypto\.randomUUID\s*\(/.test(source), 'System-performance read model contains no ambient randomness or wall-clock IDs');

  return { passed, failed, errors };
}
