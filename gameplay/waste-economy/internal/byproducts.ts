/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ByproductStack, ManureProfile, ResidueProfile } from '../public';

// ── Manure production rates (sourced) ──

export const MANURE_PROFILES: Record<string, ManureProfile> = {
  heritage_chickens: {
    speciesId: 'heritage_chickens',
    lbPerAnimalPerDay: 0.35,
    nitrogenDensityPerTon: 12,
  },
  st_croix_sheep: {
    speciesId: 'st_croix_sheep',
    lbPerAnimalPerDay: 4,
    nitrogenDensityPerTon: 14,
  },
  kunekune_pigs: {
    speciesId: 'kunekune_pigs',
    lbPerAnimalPerDay: 11,
    nitrogenDensityPerTon: 10,
  },
};

// Goat profile for future use when goats are added to livestockData
export const GOAT_MANURE_PROFILE: ManureProfile = {
  speciesId: 'goats',
  lbPerAnimalPerDay: 1.25,
  nitrogenDensityPerTon: 22,
};

// ── Residue profiles (per-crop harvest index) ──

export const RESIDUE_PROFILES: Record<string, ResidueProfile> = {
  wheat: { cropId: 'wheat', residueToYieldRatio: 0.48, isResearched: true },
  tomato: { cropId: 'tomato', residueToYieldRatio: 0.50, isResearched: false },
  lettuce: { cropId: 'lettuce', residueToYieldRatio: 0.30, isResearched: false },
  potato: { cropId: 'potato', residueToYieldRatio: 0.50, isResearched: false },
  basil: { cropId: 'basil', residueToYieldRatio: 0.40, isResearched: false },
  apple: { cropId: 'apple', residueToYieldRatio: 0.25, isResearched: false },
};

const DEFAULT_RESIDUE_RATIO = 0.45;
const DEFAULT_N_DENSITY = 8; // crop residue is carbon-rich, low N

// ── Manure decay ──

const MANURE_DAILY_DECAY_RATE = 0.05;
const MANURE_MAX_AGE_DAYS = 20;

export function produceManure(
  breedId: string,
  population: number,
  zoneId: number,
  currentDay: number,
): ByproductStack | null {
  const profile = MANURE_PROFILES[breedId];
  if (!profile) return null;

  const massLbs = profile.lbPerAnimalPerDay * population;
  if (massLbs <= 0) return null;

  return {
    kind: 'manure',
    massLbs,
    nitrogenDensityPerTon: profile.nitrogenDensityPerTon,
    producedOnDay: currentDay,
    sourceZoneId: zoneId,
  };
}

export function produceResidue(
  cropId: string,
  harvestedMassLbs: number,
  zoneId: number,
  currentDay: number,
): ByproductStack | null {
  if (harvestedMassLbs <= 0) return null;

  const profile = RESIDUE_PROFILES[cropId];
  const ratio = profile?.residueToYieldRatio ?? DEFAULT_RESIDUE_RATIO;
  const massLbs = harvestedMassLbs * ratio;

  return {
    kind: 'crop_residue',
    massLbs,
    nitrogenDensityPerTon: DEFAULT_N_DENSITY,
    producedOnDay: currentDay,
    sourceZoneId: zoneId,
  };
}

export function decayManure(
  stacks: ByproductStack[],
  currentDay: number,
): { surviving: ByproductStack[]; wastedLbs: number } {
  let wastedLbs = 0;

  const surviving = stacks.reduce<ByproductStack[]>((acc, stack) => {
    if (stack.kind !== 'manure') {
      acc.push(stack);
      return acc;
    }

    const age = currentDay - stack.producedOnDay;
    if (age >= MANURE_MAX_AGE_DAYS) {
      wastedLbs += stack.massLbs;
      return acc;
    }

    const decayed = stack.massLbs * (1 - MANURE_DAILY_DECAY_RATE);
    const lost = stack.massLbs - decayed;
    wastedLbs += lost;

    if (decayed > 0.01) {
      acc.push({ ...stack, massLbs: decayed });
    }
    return acc;
  }, []);

  return { surviving, wastedLbs };
}

export function getResidueProfile(cropId: string): ResidueProfile {
  return RESIDUE_PROFILES[cropId] ?? {
    cropId,
    residueToYieldRatio: DEFAULT_RESIDUE_RATIO,
    isResearched: false,
  };
}
