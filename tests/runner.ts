/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runCropsTests } from '../gameplay/farming/tests/crops.test';
import { runFarmLoopTests } from '../gameplay/world/tests/farm-loop.test';
import { runDeterminismTests } from './determinism.test';
import { runHomesteadSimulationTests } from './homesteadSimulation.test';

console.log('🧪 Starting Orchade Test Runner...\n');

const cropResults = runCropsTests();
console.log(`[Crops Module] Passed: ${cropResults.passed}, Failed: ${cropResults.failed}`);

const farmLoopResults = runFarmLoopTests();
console.log(`[Farm Loop Module] Passed: ${farmLoopResults.passed}, Failed: ${farmLoopResults.failed}`);

const determinismResults = runDeterminismTests();
console.log(`[Determinism Module] Passed: ${determinismResults.passed}, Failed: ${determinismResults.failed}`);

const homesteadResults = runHomesteadSimulationTests();
console.log(`[Homestead Simulation] Passed: ${homesteadResults.passed}, Failed: ${homesteadResults.failed}`);

const totalPassed = cropResults.passed + farmLoopResults.passed + determinismResults.passed + homesteadResults.passed;
const totalFailed = cropResults.failed + farmLoopResults.failed + determinismResults.failed + homesteadResults.failed;

console.log(`\n========================================`);
console.log(`Total Passed: ${totalPassed} | Total Failed: ${totalFailed}`);
console.log(`========================================\n`);

if (totalFailed > 0) {
  console.error('❌ Tests failed!');
  process.exit(1);
} else {
  console.log('✅ All test assertions passed with 100% success rate.');
}
