/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CROP_DEFINITIONS,
  GENERIC_PLANT_STAGES,
  getCropDefinition,
  getPlantStages,
  getTotalCycleDays,
  resolveStageIndex,
  createNewPlant,
  applyHarvest
} from '../api';

export function runCropsTests(): { passed: number; failed: number; errors: string[] } {
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

  // Test 1: Verify all 6 researched crops exist in definitions
  const expectedCrops = ['tomato', 'lettuce', 'potato', 'wheat', 'apple', 'basil'];
  expectedCrops.forEach(cropId => {
    const crop = getCropDefinition(cropId);
    assert(crop !== null, `Crop '${cropId}' must exist in crop definitions`);
    if (crop) {
      assert(crop.growthStages.length >= 3, `Crop '${cropId}' must have at least 3 growth stages`);
      assert(crop.water.min > 0 && crop.water.max > crop.water.min, `Crop '${cropId}' must have valid water min/max`);
      assert(crop.diseases.length > 0, `Crop '${cropId}' must have documented diseases`);
      assert(crop.fertilizerEffects.compost > 0, `Crop '${cropId}' must define fertilizer multipliers`);
    }
  });

  // Test 2: Verify Apple is perennial with 3-stage / ~3-year timescale (1,095 days total)
  const apple = getCropDefinition('apple');
  assert(apple?.isPerennial === true, 'Apple must be flagged as isPerennial: true');
  assert(apple?.growthStages.length === 3, 'Apple dwarf rootstock must have exactly 3 multi-year stages');
  const appleTotalDays = getTotalCycleDays('apple');
  assert(appleTotalDays === 1095, `Apple total reference cycle must equal 1,095 days (found: ${appleTotalDays})`);

  // Test 3: Verify Apple harvest retains mature bearing stage instead of resetting to seed
  const matureApplePlant = createNewPlant('apple');
  matureApplePlant.rootStrength = 1095;
  matureApplePlant.stageIndex = 2; // Bearing stage
  matureApplePlant.isHarvestable = true;

  const harvestResult = applyHarvest(matureApplePlant);
  assert(harvestResult.harvested === true, 'Apple harvest must succeed when mature');
  assert(!('reward' in harvestResult), 'Harvest results must not award score currency');
  assert(harvestResult.yieldCount >= 20 && harvestResult.yieldCount <= 60, 'Apple yield must fall within researched range (20-60)');
  assert(harvestResult.resetPlant.stageIndex === 2, 'Perennial Apple must remain in bearing stage (index 2) after harvest');
  assert(harvestResult.resetPlant.rootStrength === 730, 'Perennial Apple root strength must reset to stage 2 threshold (730d)');

  // Test 4: Verify Annual crop (Tomato) resets back to seed stage on harvest
  const matureTomatoPlant = createNewPlant('tomato');
  matureTomatoPlant.rootStrength = 76;
  matureTomatoPlant.stageIndex = 4; // Fruiting stage
  const tomatoHarvest = applyHarvest(matureTomatoPlant);
  assert(tomatoHarvest.harvested === true, 'Tomato harvest must succeed when mature');
  assert(tomatoHarvest.resetPlant.stageIndex === 0, 'Annual Tomato must reset to seed stage (index 0) after harvest');
  assert(tomatoHarvest.resetPlant.rootStrength === 0, 'Annual Tomato root strength must reset to 0 after harvest');

  // Test 5: Fallback to GENERIC_PLANT_STAGES when cropId is undefined
  const genericStages = getPlantStages(undefined);
  assert(genericStages.length === 5, 'Undefined cropId must fallback to 5 generic stages');
  assert(genericStages[0].name === 'Dormant Seed', 'Fallback stage 0 must be Dormant Seed');
  assert(genericStages[4].name === 'Mature Tree', 'Fallback stage 4 must be Mature Tree');

  // Test 6: Dynamic stage threshold resolution per crop
  // Lettuce: Seed (5d), Seedling (10d), Leafing (15d), Heading (20d) -> Thresholds: 0, 5, 15, 30
  assert(resolveStageIndex('lettuce', 0) === 0, 'Lettuce 0 pts -> stage 0 (Seed)');
  assert(resolveStageIndex('lettuce', 4) === 0, 'Lettuce 4 pts -> stage 0 (Seed)');
  assert(resolveStageIndex('lettuce', 5) === 1, 'Lettuce 5 pts -> stage 1 (Seedling)');
  assert(resolveStageIndex('lettuce', 14) === 1, 'Lettuce 14 pts -> stage 1 (Seedling)');
  assert(resolveStageIndex('lettuce', 15) === 2, 'Lettuce 15 pts -> stage 2 (Leafing)');
  assert(resolveStageIndex('lettuce', 30) === 3, 'Lettuce 30 pts -> stage 3 (Heading)');

  return { passed, failed, errors };
}
