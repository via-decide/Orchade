/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type {
  ByproductKind,
  ByproductStack,
  CompostBin,
  CompostPhase,
  ContaminationRecord,
  GreywaterFlow,
  ByproductLedger,
  ManureProfile,
  ResidueProfile,
  WasteEconomyEventType,
} from './public';

export type { WasteEconomyState } from './state';
export { initialWasteEconomyState } from './state';

export { produceManure, produceResidue, decayManure, getResidueProfile, MANURE_PROFILES } from './internal/byproducts';
export { createCompostBin, loadCompostBin, advanceCompostDay, withdrawCompost, computeCnRatio } from './internal/composting';
export { applyRawManure, isHarvestContaminated, getContaminationPenalty, cleanExpiredContaminations } from './internal/contamination';
export { computeByproductRoutes, computeGreywaterFlows, areAdjacent, findAdjacentZones } from './internal/routing';
export type { ZoneRef, ByproductRoute } from './internal/routing';
export {
  updateClosedLoop,
  recordProduction,
  recordGreywaterProduction,
  recordReuse,
  recordGreywaterReuse,
  recordWaste,
} from './internal/ledger';

import type { WasteEconomyState } from './state';
import type { ByproductStack } from './public';
import type { ZoneRef } from './internal/routing';
import { produceManure, decayManure } from './internal/byproducts';
import { loadCompostBin, advanceCompostDay, withdrawCompost } from './internal/composting';
import { applyRawManure } from './internal/contamination';
import { cleanExpiredContaminations } from './internal/contamination';
import { computeByproductRoutes, computeGreywaterFlows } from './internal/routing';
import {
  recordProduction,
  recordGreywaterProduction,
  recordReuse,
  recordGreywaterReuse,
  recordWaste,
} from './internal/ledger';

export interface PaddockRef {
  breedId: string;
  population: number;
  zoneId: number;
}

export interface SoilDelta {
  zoneId: number;
  nitrogenDelta: number;
  phosphorusDelta: number;
  potassiumDelta: number;
  organicMatterDelta: number;
}

export interface WaterDelta {
  reduceConsumptionGallons: number;
}

export interface AdvanceDayResult {
  state: WasteEconomyState;
  soilDeltas: SoilDelta[];
  waterDelta: WaterDelta;
  compostToApply: Array<{ zoneId: number; compostLbs: number }>;
  newContaminationZones: number[];
  logs: string[];
}

export function advanceWasteEconomy(
  prevState: WasteEconomyState,
  zones: ZoneRef[],
  paddocks: PaddockRef[],
  dailyWaterConsumptionGallons: number,
  currentDay: number,
): AdvanceDayResult {
  let { byproducts, compostBins, contaminations, greywaterFlows, ledger } = {
    // Stack objects are mutated in place below (massLbs deductions), so each
    // stack must be its own copy -- spreading only the array would leave these
    // mutations reaching back into prevState.byproducts.
    byproducts: prevState.byproducts.map(s => ({ ...s })),
    compostBins: prevState.compostBins.map(b => ({ ...b })),
    contaminations: [...prevState.contaminations],
    greywaterFlows: [...prevState.greywaterFlows],
    ledger: { ...prevState.ledger },
  };

  const logs: string[] = [];
  const soilDeltas: SoilDelta[] = [];
  const compostToApply: Array<{ zoneId: number; compostLbs: number }> = [];
  const newContaminationZones: number[] = [];

  // 1. Produce manure from all livestock paddocks
  for (const paddock of paddocks) {
    const stack = produceManure(paddock.breedId, paddock.population, paddock.zoneId, currentDay);
    if (stack) {
      byproducts.push(stack);
      ledger = recordProduction(ledger, stack.massLbs);
    }
  }

  // 2. Compute routes based on current zone layout
  const routes = computeByproductRoutes(zones);

  // 3. Feed compost bins from adjacent livestock + crop zones
  for (const bin of compostBins) {
    const compostRoutes = routes.filter(r => r.toZoneId === bin.zoneId);
    const greenSourceZoneIds = compostRoutes
      .filter(r => r.kind === 'manure_to_compost')
      .map(r => r.fromZoneId);
    const brownSourceZoneIds = compostRoutes
      .filter(r => r.kind === 'residue_to_compost')
      .map(r => r.fromZoneId);

    const availableGreen = byproducts.filter(
      s => s.kind === 'manure' && greenSourceZoneIds.includes(s.sourceZoneId),
    );
    const availableBrown = byproducts.filter(
      s => s.kind === 'crop_residue' && brownSourceZoneIds.includes(s.sourceZoneId),
    );

    const loadResult = loadCompostBin(bin, availableGreen, availableBrown);
    Object.assign(bin, loadResult.bin);

    if (loadResult.greenConsumedLbs > 0 || loadResult.brownConsumedLbs > 0) {
      const totalConsumed = loadResult.greenConsumedLbs + loadResult.brownConsumedLbs;
      ledger = recordReuse(ledger, totalConsumed);

      // Deduct consumed mass from byproduct stacks
      let greenToDeduct = loadResult.greenConsumedLbs;
      for (const stack of availableGreen) {
        if (greenToDeduct <= 0) break;
        const take = Math.min(stack.massLbs, greenToDeduct);
        stack.massLbs -= take;
        greenToDeduct -= take;
      }
      let brownToDeduct = loadResult.brownConsumedLbs;
      for (const stack of availableBrown) {
        if (brownToDeduct <= 0) break;
        const take = Math.min(stack.massLbs, brownToDeduct);
        stack.massLbs -= take;
        brownToDeduct -= take;
      }
    }
  }

  // 4. Advance compost bins by one day
  for (let i = 0; i < compostBins.length; i++) {
    const result = advanceCompostDay(compostBins[i]);
    compostBins[i] = result.bin;
    if (result.newlyFinishedLbs > 0) {
      logs.push(`🌿 Compost Zone #${result.bin.zoneId}: ${Math.round(result.newlyFinishedLbs)} lb of finished compost ready!`);
    }
    if (result.warning) {
      logs.push(`⚠️ ${result.warning}`);
    }
  }

  // 5. Distribute finished compost to adjacent crop zones
  for (const bin of compostBins) {
    if (bin.outputReadyLbs <= 0) continue;

    const compostToCropRoutes = routes.filter(
      r => r.fromZoneId === bin.zoneId && r.kind === 'compost_to_crop',
    );
    if (compostToCropRoutes.length === 0) continue;

    const perCropLbs = bin.outputReadyLbs / compostToCropRoutes.length;
    for (const route of compostToCropRoutes) {
      const { bin: updatedBin, withdrawnLbs } = withdrawCompost(bin, perCropLbs);
      Object.assign(bin, updatedBin);

      if (withdrawnLbs > 0) {
        compostToApply.push({ zoneId: route.toZoneId, compostLbs: withdrawnLbs });
        // Compost NPK boost: moderate, balanced
        soilDeltas.push({
          zoneId: route.toZoneId,
          nitrogenDelta: Math.round(withdrawnLbs * 0.015),
          phosphorusDelta: Math.round(withdrawnLbs * 0.01),
          potassiumDelta: Math.round(withdrawnLbs * 0.01),
          organicMatterDelta: Math.min(1.0, withdrawnLbs * 0.005),
        });
      }
    }
  }

  // 6. Direct manure application (shortcut path — with contamination)
  // A single livestock zone can have manure_direct routes to several crop zones.
  // Routes sharing a fromZoneId must split that zone's manure between them --
  // applying it in full to the first route and leaving nothing for the rest.
  const directManureRoutes = routes.filter(r => r.kind === 'manure_direct');
  const directRoutesByFromZone = new Map<number, typeof directManureRoutes>();
  for (const route of directManureRoutes) {
    const existing = directRoutesByFromZone.get(route.fromZoneId);
    if (existing) existing.push(route);
    else directRoutesByFromZone.set(route.fromZoneId, [route]);
  }

  for (const [fromZoneId, routesFromZone] of directRoutesByFromZone) {
    const manureStacks = byproducts.filter(
      s => s.kind === 'manure' && s.sourceZoneId === fromZoneId && s.massLbs > 0,
    );
    const totalAvailable = manureStacks.reduce((sum, s) => sum + s.massLbs, 0);
    if (totalAvailable <= 0) continue;

    const perRouteLbs = totalAvailable / routesFromZone.length;
    let remainingToDeduct = totalAvailable;
    for (const stack of manureStacks) {
      if (remainingToDeduct <= 0) break;
      const take = Math.min(stack.massLbs, remainingToDeduct);
      stack.massLbs -= take;
      remainingToDeduct -= take;
    }

    for (const route of routesFromZone) {
      const totalApplied = perRouteLbs;
      if (totalApplied <= 0) continue;

      ledger = recordReuse(ledger, totalApplied);
      const record = applyRawManure(route.toZoneId, totalApplied, currentDay);
      contaminations.push(record);
      newContaminationZones.push(route.toZoneId);

      // Raw manure NPK: higher immediate boost but unbalanced
      soilDeltas.push({
        zoneId: route.toZoneId,
        nitrogenDelta: Math.round(totalApplied * 0.02),
        phosphorusDelta: Math.round(totalApplied * 0.012),
        potassiumDelta: Math.round(totalApplied * 0.008),
        organicMatterDelta: Math.min(0.5, totalApplied * 0.003),
      });

      logs.push(`⚠️ Raw manure applied to Zone #${route.toZoneId}. Harvest safety: wait ${120} days before harvest.`);
    }
  }

  // 7. Greywater flows
  greywaterFlows = computeGreywaterFlows(zones, dailyWaterConsumptionGallons);
  let totalGreywaterProduced = 0;
  let totalGreywaterReused = 0;
  let waterReduction = 0;

  for (const flow of greywaterFlows) {
    totalGreywaterProduced += flow.dailyGallons;
    if (flow.connectedToZoneId !== null) {
      const targetZone = zones.find(z => z.id === flow.connectedToZoneId);
      // Greywater routed to a crop zone offsets that crop's irrigation demand
      // the same way routing it to a water zone offsets stored-water draw --
      // both reduce the fresh water otherwise needed, so both count as reuse.
      // A flow with no such target (e.g. no adjacent water/crop zone at all)
      // is not actually reused and must not claim closed-loop credit.
      if (targetZone?.type === 'water' || targetZone?.type === 'crop') {
        totalGreywaterReused += flow.dailyGallons;
        waterReduction += flow.dailyGallons;
      }
    }
  }

  if (totalGreywaterProduced > 0) {
    ledger = recordGreywaterProduction(ledger, totalGreywaterProduced);
  }
  if (totalGreywaterReused > 0) {
    ledger = recordGreywaterReuse(ledger, totalGreywaterReused);
  }

  // 8. Decay unused manure
  const decayResult = decayManure(byproducts, currentDay);
  byproducts = decayResult.surviving.filter(s => s.massLbs > 0.01);
  if (decayResult.wastedLbs > 0) {
    ledger = recordWaste(ledger, decayResult.wastedLbs);
  }

  // 9. Clean expired contamination records
  contaminations = cleanExpiredContaminations(contaminations, currentDay);

  return {
    state: { byproducts, compostBins, contaminations, greywaterFlows, ledger },
    soilDeltas,
    waterDelta: { reduceConsumptionGallons: waterReduction },
    compostToApply,
    newContaminationZones,
    logs,
  };
}
