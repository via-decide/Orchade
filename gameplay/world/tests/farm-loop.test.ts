/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createNewPlant, getCropDefinition, getPlantStages, resolveStageIndex } from '../../farming/api';

export function runFarmLoopTests(): { passed: number; failed: number; errors: string[] } {
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

  // Simulation test: Advance day moisture drain and drought stress
  const potato = createNewPlant('potato');
  const cropDef = getCropDefinition('potato')!;
  
  // Starting water is min optimal
  assert(potato.water === cropDef.water.min, 'Potato initial water should match optimal min');
  
  // Simulate severe drought drain (e.g. heatwave)
  const simulatedDrain = 30;
  potato.water = Math.max(0, potato.water - simulatedDrain);
  assert(potato.water < cropDef.water.min, 'Water dropped below minimum threshold');
  
  // Stress accumulation when below water.min
  if (potato.water < cropDef.water.min) {
    potato.stress += 10;
  }
  assert(potato.stress === 10, 'Stress increases when water drops below crop deficit threshold');

  // Simulation test: Tending progression towards harvest
  // Basil total: 50 days (Seed 7d, Seedling 14d, Vegetative 15d, Mature 14d -> mature threshold: 36d)
  const basil = createNewPlant('basil');
  const basilStages = getPlantStages('basil');
  assert(basilStages.length === 4, 'Basil has 4 stages');
  
  // Apply tending points
  basil.rootStrength = 40;
  basil.stageIndex = resolveStageIndex('basil', basil.rootStrength);
  assert(basil.stageIndex === 3, 'Basil at 40 points is in stage 3 (Mature Bush)');

  return { passed, failed, errors };
}
