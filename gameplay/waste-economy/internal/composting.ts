/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CompostBin, CompostPhase, ByproductStack } from '../public';

// ── Constants (sourced from zone-research.json + waste-economy-research.json) ──

const CAPACITY_LBS_PER_16_SQFT = 1000;
const MINIMUM_PILE_LBS = 250;
const SHRINKAGE_RATE = 0.50;

const TARGET_CN_LOW = 25;
const TARGET_CN_HIGH = 30;

// Carbon density: crop residue ≈ 400 lb C/ton (high-carbon brown material)
const BROWN_CARBON_PER_TON = 400;

// Phase transition thresholds (days at correct C:N ratio)
const MESOPHILIC_START_DAYS = 3;
const THERMOPHILIC_START_DAYS = 7;
const CURING_START_DAYS = 21;
const FINISHED_DAYS = 47;

export function createCompostBin(zoneId: number, zoneSqft: number): CompostBin {
  const units = Math.max(1, zoneSqft / 16);
  return {
    zoneId,
    greenInputLbs: 0,
    brownInputLbs: 0,
    cnRatio: 0,
    maturityDays: 0,
    phase: 'cold',
    outputReadyLbs: 0,
    inputCapacityLbs: Math.round(units * CAPACITY_LBS_PER_16_SQFT),
  };
}

export function computeCnRatio(
  greenLbs: number,
  greenNDensityPerTon: number,
  brownLbs: number,
): number {
  if (greenLbs <= 0 && brownLbs <= 0) return 0;

  // Nitrogen from green inputs
  const greenNLbs = (greenLbs / 2000) * greenNDensityPerTon;
  // Nitrogen from brown inputs (low — crop residue)
  const brownNLbs = (brownLbs / 2000) * 8;
  const totalNLbs = greenNLbs + brownNLbs;

  if (totalNLbs <= 0) return 999;

  // Carbon from brown inputs
  const brownCLbs = (brownLbs / 2000) * BROWN_CARBON_PER_TON;
  // Carbon from green inputs (manure has some carbon too, ~100 lb C/ton)
  const greenCLbs = (greenLbs / 2000) * 100;
  const totalCLbs = brownCLbs + greenCLbs;

  return totalCLbs / totalNLbs;
}

function nextPhase(current: CompostPhase, maturityDays: number, totalInputLbs: number, cnRatio: number): CompostPhase {
  if (totalInputLbs < MINIMUM_PILE_LBS) return 'cold';

  const cnInRange = cnRatio >= TARGET_CN_LOW && cnRatio <= TARGET_CN_HIGH;
  // Out-of-range C:N slows progression but doesn't fully block it
  const cnPenalty = cnInRange ? 1.0 : 0.3;
  const effectiveDays = maturityDays * cnPenalty;

  if (effectiveDays >= FINISHED_DAYS) return 'finished';
  if (effectiveDays >= CURING_START_DAYS) return 'curing';
  if (effectiveDays >= THERMOPHILIC_START_DAYS) return 'thermophilic';
  if (effectiveDays >= MESOPHILIC_START_DAYS) return 'mesophilic';
  return 'cold';
}

export interface CompostLoadResult {
  bin: CompostBin;
  greenConsumedLbs: number;
  brownConsumedLbs: number;
}

export function loadCompostBin(
  bin: CompostBin,
  availableGreen: ByproductStack[],
  availableBrown: ByproductStack[],
): CompostLoadResult {
  const remainingCapacity = bin.inputCapacityLbs - bin.greenInputLbs - bin.brownInputLbs;
  if (remainingCapacity <= 0) {
    return { bin, greenConsumedLbs: 0, brownConsumedLbs: 0 };
  }

  // Pull brown (residue) and green (manure) at 3:1 brown:green by volume
  // Volume approximation: 1 lb brown ≈ 1 lb green for simplicity (both are bulk organic matter)
  const targetBrown = remainingCapacity * 0.75;
  const targetGreen = remainingCapacity * 0.25;

  let greenAvailTotal = 0;
  let weightedNDensity = 0;
  for (const stack of availableGreen) {
    greenAvailTotal += stack.massLbs;
    weightedNDensity += stack.massLbs * stack.nitrogenDensityPerTon;
  }
  const avgNDensity = greenAvailTotal > 0 ? weightedNDensity / greenAvailTotal : 12;

  let brownAvailTotal = 0;
  for (const stack of availableBrown) {
    brownAvailTotal += stack.massLbs;
  }

  const greenToLoad = Math.min(targetGreen, greenAvailTotal);
  const brownToLoad = Math.min(targetBrown, brownAvailTotal);

  if (greenToLoad <= 0 && brownToLoad <= 0) {
    return { bin, greenConsumedLbs: 0, brownConsumedLbs: 0 };
  }

  const newGreen = bin.greenInputLbs + greenToLoad;
  const newBrown = bin.brownInputLbs + brownToLoad;
  const newCnRatio = computeCnRatio(newGreen, avgNDensity, newBrown);

  return {
    bin: {
      ...bin,
      greenInputLbs: newGreen,
      brownInputLbs: newBrown,
      cnRatio: newCnRatio,
    },
    greenConsumedLbs: greenToLoad,
    brownConsumedLbs: brownToLoad,
  };
}

export interface CompostAdvanceResult {
  bin: CompostBin;
  newlyFinishedLbs: number;
  warning: string | null;
}

export function advanceCompostDay(bin: CompostBin): CompostAdvanceResult {
  const totalInput = bin.greenInputLbs + bin.brownInputLbs;
  if (totalInput <= 0) {
    return { bin, newlyFinishedLbs: 0, warning: null };
  }

  const newMaturity = bin.maturityDays + 1;
  const newPhase = nextPhase(bin.phase, newMaturity, totalInput, bin.cnRatio);

  let warning: string | null = null;
  if (bin.cnRatio > 0 && bin.cnRatio < TARGET_CN_LOW) {
    warning = `Compost Zone #${bin.zoneId}: Too much nitrogen (C:N ${bin.cnRatio.toFixed(0)}:1). Risk of anaerobic decomposition. Add more brown material.`;
  } else if (bin.cnRatio > TARGET_CN_HIGH * 1.5) {
    warning = `Compost Zone #${bin.zoneId}: Too much carbon (C:N ${bin.cnRatio.toFixed(0)}:1). Decomposition stalled. Add more green material.`;
  }

  let newlyFinishedLbs = 0;
  let updatedBin = { ...bin, maturityDays: newMaturity, phase: newPhase };

  if (newPhase === 'finished' && bin.phase !== 'finished') {
    newlyFinishedLbs = totalInput * (1 - SHRINKAGE_RATE);
    updatedBin = {
      ...updatedBin,
      outputReadyLbs: updatedBin.outputReadyLbs + newlyFinishedLbs,
      greenInputLbs: 0,
      brownInputLbs: 0,
      maturityDays: 0,
      phase: 'cold',
      cnRatio: 0,
    };
  }

  return { bin: updatedBin, newlyFinishedLbs, warning };
}

export function withdrawCompost(bin: CompostBin, amountLbs: number): { bin: CompostBin; withdrawnLbs: number } {
  const withdrawn = Math.min(amountLbs, bin.outputReadyLbs);
  return {
    bin: { ...bin, outputReadyLbs: bin.outputReadyLbs - withdrawn },
    withdrawnLbs: withdrawn,
  };
}
