/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { areAdjacent, computeByproductRoutes, computeGreywaterFlows } from '../internal/routing';
import type { ZoneRef } from '../internal/routing';

function makeZone(id: number, type: ZoneRef['type'], col: number, row: number, w = 2, h = 2, buildingType?: ZoneRef['buildingType']): ZoneRef {
  return { id, type, col, row, w, h, sqft: w * h * 100, buildingType };
}

export function runRoutingTests(): { passed: number; failed: number; results: string[] } {
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

  // Test: areAdjacent detects neighbors within 1-cell margin
  const a = makeZone(1, 'livestock', 0, 0, 2, 2);
  const b = makeZone(2, 'compost', 3, 0, 2, 2); // 1 cell gap
  assert(areAdjacent(a, b) === true, 'Adjacent with 1-cell gap');

  const c = makeZone(3, 'crop', 5, 0, 2, 2); // 2 cell gap from a
  assert(areAdjacent(a, c) === false, 'Not adjacent with 2+ cell gap');

  // Test: computeByproductRoutes
  const zones: ZoneRef[] = [
    makeZone(1, 'livestock', 0, 0),
    makeZone(2, 'compost', 3, 0),
    makeZone(3, 'crop', 6, 0),
    makeZone(4, 'building', 9, 0, 2, 2, 'house'),
    makeZone(5, 'water', 12, 0),
  ];

  const routes = computeByproductRoutes(zones);

  assert(routes.some(r => r.kind === 'manure_to_compost' && r.fromZoneId === 1 && r.toZoneId === 2),
    'Livestock→Compost route exists');
  assert(routes.some(r => r.kind === 'residue_to_compost' && r.fromZoneId === 3 && r.toZoneId === 2),
    'Crop→Compost route exists');
  assert(routes.some(r => r.kind === 'compost_to_crop' && r.fromZoneId === 2 && r.toZoneId === 3),
    'Compost→Crop route exists');

  // Test: direct manure when no compost intermediary
  const directZones: ZoneRef[] = [
    makeZone(1, 'livestock', 0, 0),
    makeZone(2, 'crop', 3, 0),
  ];
  const directRoutes = computeByproductRoutes(directZones);
  assert(directRoutes.some(r => r.kind === 'manure_direct'), 'Direct manure route when no compost');

  // Test: no direct manure when compost is adjacent to crop
  const bufferedZones: ZoneRef[] = [
    makeZone(1, 'livestock', 0, 0),
    makeZone(2, 'compost', 3, 0),
    makeZone(3, 'crop', 6, 0),
  ];
  const bufferedRoutes = computeByproductRoutes(bufferedZones);
  assert(!bufferedRoutes.some(r => r.kind === 'manure_direct'), 'No direct manure when compost buffers');

  // Test: greywater flows
  const gwZones: ZoneRef[] = [
    makeZone(1, 'building', 0, 0, 2, 2, 'house'),
    makeZone(2, 'water', 3, 0),
  ];
  const flows = computeGreywaterFlows(gwZones, 100);
  assert(flows.length === 1, 'One greywater flow');
  assert(flows[0].dailyGallons === 75, 'Greywater = 75% of consumption');
  assert(flows[0].connectedToZoneId === 2, 'Connected to adjacent water zone');

  // Test: greywater with no adjacent target
  const isolatedZones: ZoneRef[] = [
    makeZone(1, 'building', 0, 0, 2, 2, 'house'),
    makeZone(2, 'water', 10, 10),
  ];
  const isolatedFlows = computeGreywaterFlows(isolatedZones, 100);
  assert(isolatedFlows[0].connectedToZoneId === null, 'No connection when not adjacent');

  return { passed, failed, results };
}
