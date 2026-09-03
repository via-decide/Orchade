/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runCropsTests } from '../gameplay/farming/tests/crops.test';
import { runFarmLoopTests } from '../gameplay/world/tests/farm-loop.test';
import { runDeterminismTests } from './determinism.test';
import { runDigitalTwinContractTests } from './digitalTwinContracts.test';
import { runHomesteadSimulationTests } from './homesteadSimulation.test';
import { runPrerequisiteContractTests } from './prerequisiteContracts.test';
import { runProject001Tests } from './project001.test';
import { runProgressionContractTests } from './progressionContracts.test';
import { runSystemPerformanceTests } from './systemPerformance.test';
import { runPropertyRealityTests } from './propertyReality.test';
import { runPropertyFoundationTests } from './propertyFoundation.test';
import { runEquipmentTwinTests } from './equipmentTwin.test';
import { runEquipmentCandidateTestTests } from './equipmentCandidateTest.test';
import { runFeatureContractTests } from './featureContract.test';
import { runScenarioCompilerEquipmentTests } from './scenarioCompilerEquipment.test';
import { runLogicHubImportTests } from './logicHubImport.test';

console.log('🧪 Starting Orchade Test Runner...\n');

const cropResults = runCropsTests();
console.log(`[Crops Module] Passed: ${cropResults.passed}, Failed: ${cropResults.failed}`);

const farmLoopResults = runFarmLoopTests();
console.log(`[Farm Loop Module] Passed: ${farmLoopResults.passed}, Failed: ${farmLoopResults.failed}`);

const determinismResults = runDeterminismTests();
console.log(`[Determinism Module] Passed: ${determinismResults.passed}, Failed: ${determinismResults.failed}`);

const homesteadResults = runHomesteadSimulationTests();
console.log(`[Homestead Simulation] Passed: ${homesteadResults.passed}, Failed: ${homesteadResults.failed}`);

const project001Results = runProject001Tests();
console.log(`[Project 001] Passed: ${project001Results.passed}, Failed: ${project001Results.failed}`);

const progressionResults = runProgressionContractTests();
console.log(`[Progression Contracts] Passed: ${progressionResults.passed}, Failed: ${progressionResults.failed}`);

const systemPerformanceResults = runSystemPerformanceTests();
console.log(`[System Performance] Passed: ${systemPerformanceResults.passed}, Failed: ${systemPerformanceResults.failed}`);

const prerequisiteResults = runPrerequisiteContractTests();
console.log(`[Physical Prerequisites] Passed: ${prerequisiteResults.passed}, Failed: ${prerequisiteResults.failed}`);

const digitalTwinResults = runDigitalTwinContractTests();
console.log(`[True Number / Digital Twin] Passed: ${digitalTwinResults.passed}, Failed: ${digitalTwinResults.failed}`);

const propertyRealityResults = runPropertyRealityTests();
console.log(`[Property Reality] Passed: ${propertyRealityResults.passed}, Failed: ${propertyRealityResults.failed}`);

const propertyFoundationResults = runPropertyFoundationTests();
console.log(`[Property Foundation] Passed: ${propertyFoundationResults.passed}, Failed: ${propertyFoundationResults.failed}`);

const equipmentTwinResults = runEquipmentTwinTests();
console.log(`[Equipment Twin] Passed: ${equipmentTwinResults.passed}, Failed: ${equipmentTwinResults.failed}`);

const equipmentCandidateTestResults = runEquipmentCandidateTestTests();
console.log(`[Equipment Candidate Test] Passed: ${equipmentCandidateTestResults.passed}, Failed: ${equipmentCandidateTestResults.failed}`);

const featureContractResults = runFeatureContractTests();
console.log(`[Feature Contract] Passed: ${featureContractResults.passed}, Failed: ${featureContractResults.failed}`);

const scenarioCompilerEquipmentResults = runScenarioCompilerEquipmentTests();
console.log(`[Scenario Compiler Equipment] Passed: ${scenarioCompilerEquipmentResults.passed}, Failed: ${scenarioCompilerEquipmentResults.failed}`);

const logicHubImportResults = await runLogicHubImportTests();
console.log(`[LogicHub Import (KUP-STACK-001D)] Passed: ${logicHubImportResults.passed}, Failed: ${logicHubImportResults.failed}`);

const totalPassed = cropResults.passed
  + farmLoopResults.passed
  + determinismResults.passed
  + homesteadResults.passed
  + project001Results.passed
  + progressionResults.passed
  + systemPerformanceResults.passed
  + prerequisiteResults.passed
  + digitalTwinResults.passed
  + propertyRealityResults.passed
  + propertyFoundationResults.passed
  + equipmentTwinResults.passed
  + equipmentCandidateTestResults.passed
  + featureContractResults.passed
  + scenarioCompilerEquipmentResults.passed
  + logicHubImportResults.passed;
const totalFailed = cropResults.failed
  + farmLoopResults.failed
  + determinismResults.failed
  + homesteadResults.failed
  + project001Results.failed
  + progressionResults.failed
  + systemPerformanceResults.failed
  + prerequisiteResults.failed
  + digitalTwinResults.failed
  + propertyRealityResults.failed
  + propertyFoundationResults.failed
  + equipmentTwinResults.failed
  + equipmentCandidateTestResults.failed
  + featureContractResults.failed
  + scenarioCompilerEquipmentResults.failed
  + logicHubImportResults.failed;

console.log(`\n========================================`);
console.log(`Total Passed: ${totalPassed} | Total Failed: ${totalFailed}`);
console.log(`========================================\n`);

if (totalFailed > 0) {
  console.error('❌ Tests failed!');
  process.exit(1);
} else {
  console.log('✅ All test assertions passed with 100% success rate.');
}
