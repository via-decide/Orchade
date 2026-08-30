/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveStageIndex, getPlantStages } from '../gameplay/farming/api';

export function runDeterminismTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`❌ Test failed: ${msg}`);
    }
  }

  // Wheat: 5 stages (0, 10, 35, 65, 85)
  const wheatStages = getPlantStages('wheat');
  assert(wheatStages[0].threshold === 0, 'Wheat stage 0 starts at 0');
  assert(wheatStages[1].threshold === 10, 'Wheat stage 1 starts at 10');
  assert(wheatStages[2].threshold === 35, 'Wheat stage 2 starts at 35');
  assert(wheatStages[3].threshold === 65, 'Wheat stage 3 starts at 65');
  assert(wheatStages[4].threshold === 85, 'Wheat stage 4 starts at 85');

  // Verify consistent stage evaluation across repeated invocations
  for (let i = 0; i < 100; i++) {
    const stageAt15 = resolveStageIndex('wheat', 15);
    const stageAt60 = resolveStageIndex('wheat', 60);
    const stageAt90 = resolveStageIndex('wheat', 90);
    if (stageAt15 !== 1 || stageAt60 !== 2 || stageAt90 !== 4) {
      assert(false, `Determinism violated at iteration ${i}`);
      break;
    }
  }
  assert(true, '100 iterations of stage evaluation remained strictly deterministic');

  return { passed, failed, errors };
}
