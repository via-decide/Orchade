/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ByproductStack, GreywaterFlow } from '../public';

export interface ZoneRef {
  id: number;
  type: 'crop' | 'building' | 'water' | 'livestock' | 'compost';
  buildingType?: 'house' | 'shed' | 'greenhouse' | null;
  col: number;
  row: number;
  w: number;
  h: number;
  sqft: number;
}

export function areAdjacent(a: ZoneRef, b: ZoneRef): boolean {
  const xOverlap = !(a.col + a.w < b.col - 1 || a.col - 1 > b.col + b.w);
  const yOverlap = !(a.row + a.h < b.row - 1 || a.row - 1 > b.row + b.h);
  return xOverlap && yOverlap;
}

export function findAdjacentZones(source: ZoneRef, allZones: ZoneRef[], targetType?: string): ZoneRef[] {
  return allZones.filter(z => {
    if (z.id === source.id) return false;
    if (targetType && z.type !== targetType) return false;
    return areAdjacent(source, z);
  });
}

export interface ByproductRoute {
  fromZoneId: number;
  toZoneId: number;
  kind: 'manure_to_compost' | 'residue_to_compost' | 'manure_direct' | 'compost_to_crop' | 'greywater_to_water' | 'greywater_to_crop';
}

export function computeByproductRoutes(zones: ZoneRef[]): ByproductRoute[] {
  const routes: ByproductRoute[] = [];

  for (const zone of zones) {
    if (zone.type === 'livestock') {
      const adjacentCompost = findAdjacentZones(zone, zones, 'compost');
      const adjacentCrop = findAdjacentZones(zone, zones, 'crop');

      for (const compost of adjacentCompost) {
        routes.push({ fromZoneId: zone.id, toZoneId: compost.id, kind: 'manure_to_compost' });
      }

      // Direct manure only applies to crop zones not also served by a compost zone
      const compostIds = new Set(adjacentCompost.map(c => c.id));
      for (const crop of adjacentCrop) {
        const cropHasAdjacentCompost = zones.some(
          z => z.type === 'compost' && z.id !== zone.id && areAdjacent(z, crop),
        );
        if (!cropHasAdjacentCompost) {
          routes.push({ fromZoneId: zone.id, toZoneId: crop.id, kind: 'manure_direct' });
        }
      }
    }

    if (zone.type === 'crop') {
      const adjacentCompost = findAdjacentZones(zone, zones, 'compost');
      for (const compost of adjacentCompost) {
        routes.push({ fromZoneId: zone.id, toZoneId: compost.id, kind: 'residue_to_compost' });
      }
    }

    if (zone.type === 'compost') {
      const adjacentCrop = findAdjacentZones(zone, zones, 'crop');
      for (const crop of adjacentCrop) {
        routes.push({ fromZoneId: zone.id, toZoneId: crop.id, kind: 'compost_to_crop' });
      }
    }

    if (zone.type === 'building' && zone.buildingType === 'house') {
      const adjacentWater = findAdjacentZones(zone, zones, 'water');
      const adjacentCrop = findAdjacentZones(zone, zones, 'crop');

      for (const water of adjacentWater) {
        routes.push({ fromZoneId: zone.id, toZoneId: water.id, kind: 'greywater_to_water' });
      }
      for (const crop of adjacentCrop) {
        routes.push({ fromZoneId: zone.id, toZoneId: crop.id, kind: 'greywater_to_crop' });
      }
    }
  }

  return routes;
}

export function computeGreywaterFlows(
  zones: ZoneRef[],
  dailyWaterConsumptionGallons: number,
): GreywaterFlow[] {
  const houseZones = zones.filter(z => z.type === 'building' && z.buildingType === 'house');
  if (houseZones.length === 0) return [];

  const perHouseGallons = (dailyWaterConsumptionGallons * 0.75) / houseZones.length;

  return houseZones.map(house => {
    const adjacentWater = findAdjacentZones(house, zones, 'water');
    const adjacentCrop = findAdjacentZones(house, zones, 'crop');
    const connectedTo = adjacentWater[0] ?? adjacentCrop[0] ?? null;

    return {
      sourceZoneId: house.id,
      dailyGallons: perHouseGallons,
      connectedToZoneId: connectedTo?.id ?? null,
    };
  });
}
