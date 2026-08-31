/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createCompostBin, loadCompostBin, advanceCompostDay, computeCnRatio, withdrawCompost } from '../internal/composting';
import type { ByproductStack } from '../public';

function makeGreenStack(lbs: number, nDensity = 12): ByproductStack {
  return { kind: 'manure', massLbs: lbs, nitrogenDensityPerTon: nDensity, producedOnDay: 0, sourceZoneId: 1 };
}

function makeBrownStack(lbs: number): ByproductStack {
  return { kind: 'crop_residue', massLbs: lbs, nitrogenDensityPerTon: 8, producedOnDay: 0, sourceZoneId: 2 };
}

export function runCompostingTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  function assert(condition: boolean, name: string) {
    if (condition) {
      passed++;
      results.push(`  ✓ ${name}`);
    } else {
      failed++;
      results.push(`  ✗ ${name}`);
    }
  }

  // Test: createCompostBin scales capacity with sqft
  const bin16 = createCompostBin(1, 16);
  assert(bin16.inputCapacityLbs === 1000, 'createCompostBin: 16 sqft = 1000 lb capacity');

  const bin32 = createCompostBin(2, 32);
  assert(bin32.inputCapacityLbs === 2000, 'createCompostBin: 32 sqft = 2000 lb capacity');

  const binSmall = createCompostBin(3, 8);
  assert(binSmall.inputCapacityLbs === 1000, 'createCompostBin: 8 sqft floors to 1 unit = 1000 lb capacity');

  // Test: C:N ratio computation
  const cn = computeCnRatio(100, 22, 300);
  assert(cn > 20 && cn < 40, `C:N ratio in reasonable range: ${cn.toFixed(1)}`);

  const cnAllGreen = computeCnRatio(100, 22, 0);
  assert(cnAllGreen < 15, `All-green C:N is low (nitrogen-heavy): ${cnAllGreen.toFixed(1)}`);

  // Test: loadCompostBin pulls at 3:1 ratio
  const emptyBin = createCompostBin(10, 16);
  const loadResult = loadCompostBin(emptyBin, [makeGreenStack(500)], [makeBrownStack(1000)]);
  assert(loadResult.greenConsumedLbs > 0, 'loadCompostBin consumes green');
  assert(loadResult.brownConsumedLbs > 0, 'loadCompostBin consumes brown');
  assert(loadResult.brownConsumedLbs > loadResult.greenConsumedLbs, 'loadCompostBin: brown > green (3:1 ratio)');

  // Test: loadCompostBin does not exceed capacity
  const fullBin = createCompostBin(10, 16);
  fullBin.greenInputLbs = 250;
  fullBin.brownInputLbs = 750;
  const fullResult = loadCompostBin(fullBin, [makeGreenStack(100)], [makeBrownStack(100)]);
  assert(fullResult.greenConsumedLbs === 0 && fullResult.brownConsumedLbs === 0, 'Full bin accepts nothing');

  // Test: advanceCompostDay progresses phases
  const activeBin = createCompostBin(10, 16);
  activeBin.greenInputLbs = 200;
  activeBin.brownInputLbs = 600;
  activeBin.cnRatio = 27;
  let testBin = activeBin;
  for (let d = 0; d < 8; d++) {
    const r = advanceCompostDay(testBin);
    testBin = r.bin;
  }
  assert(testBin.phase === 'thermophilic' || testBin.phase === 'mesophilic', `Phase advances after 8 days: ${testBin.phase}`);

  // Test: sub-minimum pile stays cold
  const tinyBin = createCompostBin(10, 16);
  tinyBin.greenInputLbs = 30;
  tinyBin.brownInputLbs = 60;
  tinyBin.cnRatio = 27;
  let tinyTest = tinyBin;
  for (let d = 0; d < 10; d++) {
    const r = advanceCompostDay(tinyTest);
    tinyTest = r.bin;
  }
  assert(tinyTest.phase === 'cold', `Sub-minimum pile stays cold: ${tinyTest.phase}`);

  // Test: finished compost can be withdrawn
  const finishedBin = createCompostBin(10, 16);
  finishedBin.outputReadyLbs = 100;
  const { bin: afterWithdraw, withdrawnLbs } = withdrawCompost(finishedBin, 50);
  assert(withdrawnLbs === 50, 'Withdraw correct amount');
  assert(afterWithdraw.outputReadyLbs === 50, 'Remaining output correct');

  return { passed, failed, results };
}
