/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ByproductLedger } from '../public';

const LBS_PER_GALLON = 8.34;

export function updateClosedLoop(ledger: ByproductLedger): ByproductLedger {
  const totalProducedNormalized =
    ledger.totalProducedLbs + ledger.totalGreywaterGallons * LBS_PER_GALLON;
  const totalReusedNormalized =
    ledger.totalReusedLbs + ledger.totalGreywaterReusedGallons * LBS_PER_GALLON;

  const closedLoopPercent =
    totalProducedNormalized > 0
      ? Math.round((totalReusedNormalized / totalProducedNormalized) * 100)
      : 0;

  return { ...ledger, closedLoopPercent };
}

export function recordProduction(ledger: ByproductLedger, massLbs: number): ByproductLedger {
  return updateClosedLoop({
    ...ledger,
    totalProducedLbs: ledger.totalProducedLbs + massLbs,
  });
}

export function recordGreywaterProduction(ledger: ByproductLedger, gallons: number): ByproductLedger {
  return updateClosedLoop({
    ...ledger,
    totalGreywaterGallons: ledger.totalGreywaterGallons + gallons,
  });
}

export function recordReuse(ledger: ByproductLedger, massLbs: number): ByproductLedger {
  return updateClosedLoop({
    ...ledger,
    totalReusedLbs: ledger.totalReusedLbs + massLbs,
  });
}

export function recordGreywaterReuse(ledger: ByproductLedger, gallons: number): ByproductLedger {
  return updateClosedLoop({
    ...ledger,
    totalGreywaterReusedGallons: ledger.totalGreywaterReusedGallons + gallons,
  });
}

export function recordWaste(ledger: ByproductLedger, massLbs: number): ByproductLedger {
  return updateClosedLoop({
    ...ledger,
    totalWastedLbs: ledger.totalWastedLbs + massLbs,
  });
}
