/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { applyRawManure, isHarvestContaminated, getContaminationPenalty, cleanExpiredContaminations } from '../internal/contamination';

export function runContaminationTests(): { passed: number; failed: number; results: string[] } {
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

  // Test: applyRawManure creates correct record
  const record = applyRawManure(5, 100, 10);
  assert(record.zoneId === 5, 'Record has correct zoneId');
  assert(record.appliedOnDay === 10, 'Record has correct day');
  assert(record.safeHarvestDay === 130, 'Safe harvest day = applied + 120');
  assert(record.massAppliedLbs === 100, 'Mass recorded');

  // Test: isHarvestContaminated before safe day
  assert(isHarvestContaminated(5, 50, [record]) === true, 'Contaminated before safe day');

  // Test: isHarvestContaminated after safe day
  assert(isHarvestContaminated(5, 131, [record]) === false, 'Not contaminated after safe day');

  // Test: isHarvestContaminated for different zone
  assert(isHarvestContaminated(3, 50, [record]) === false, 'Different zone not contaminated');

  // Test: getContaminationPenalty returns correct values
  const penalty = getContaminationPenalty(5, 50, [record]);
  assert(penalty !== null, 'Penalty exists');
  assert(penalty!.qualityMultiplier === 0.6, 'Quality multiplier = 0.6');
  assert(penalty!.priceMultiplier === 0.5, 'Price multiplier = 0.5');
  assert(penalty!.daysUntilSafe === 80, 'Days until safe = 80');

  // Test: getContaminationPenalty returns null after safe
  const noPenalty = getContaminationPenalty(5, 200, [record]);
  assert(noPenalty === null, 'No penalty after safe day');

  // Test: cleanExpiredContaminations
  const cleaned = cleanExpiredContaminations([record], 200);
  assert(cleaned.length === 0, 'Expired records cleaned');

  const notCleaned = cleanExpiredContaminations([record], 50);
  assert(notCleaned.length === 1, 'Active records preserved');

  return { passed, failed, results };
}
