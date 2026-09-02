/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { advanceWasteEconomy } from '../api';
import { initialWasteEconomyState } from '../state';
import type { ZoneRef } from '../internal/routing';
import type { ByproductStack } from '../public';

function makeZone(id: number, type: ZoneRef['type'], col: number, row: number, w = 1, h = 1): ZoneRef {
  return { id, type, col, row, w, h, sqft: w * h * 100 };
}

function makeManureStack(sourceZoneId: number, massLbs: number): ByproductStack {
  return { kind: 'manure', massLbs, nitrogenDensityPerTon: 20, producedOnDay: 1, sourceZoneId };
}

export function runApiTests(): { passed: number; failed: number; results: string[] } {
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

  // Test: manure_direct routes split a zone's manure instead of the first route
  // consuming the whole stack and starving the rest.
  {
    const livestock = makeZone(1, 'livestock', 5, 5);
    const cropA = makeZone(2, 'crop', 6, 5);
    const cropB = makeZone(3, 'crop', 4, 5);
    const zones = [livestock, cropA, cropB];

    const prevState = {
      ...initialWasteEconomyState,
      byproducts: [makeManureStack(1, 100)],
    };

    const result = advanceWasteEconomy(prevState, zones, [], 0, 2);

    const deltaA = result.soilDeltas.find(d => d.zoneId === cropA.id);
    const deltaB = result.soilDeltas.find(d => d.zoneId === cropB.id);
    assert(!!deltaA && !!deltaB, 'Both crop zones adjacent to the livestock zone receive a soil delta');
    assert(
      result.newContaminationZones.includes(cropA.id) && result.newContaminationZones.includes(cropB.id),
      'Both crop zones are recorded as contaminated, not just the first route',
    );
    assert(
      !!deltaA && !!deltaB && deltaA.nitrogenDelta > 0 && deltaB.nitrogenDelta > 0 && deltaA.nitrogenDelta === deltaB.nitrogenDelta,
      'Manure is split evenly across routes sharing the same source zone (equal deltas), not fully consumed by the first route',
    );
  }

  // Test: advanceWasteEconomy does not mutate the byproduct stacks passed in via prevState
  {
    const livestock = makeZone(1, 'livestock', 5, 5);
    const cropA = makeZone(2, 'crop', 6, 5);
    const zones = [livestock, cropA];

    const originalStack = makeManureStack(1, 50);
    const prevState = {
      ...initialWasteEconomyState,
      byproducts: [originalStack],
    };

    advanceWasteEconomy(prevState, zones, [], 0, 2);

    assert(originalStack.massLbs === 50, 'Original byproduct stack object is untouched after advanceWasteEconomy runs');
    assert(prevState.byproducts[0].massLbs === 50, 'prevState.byproducts is untouched after advanceWasteEconomy runs');
  }

  return { passed, failed, results };
}
