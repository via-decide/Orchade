/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ── Byproduct Types ──

export type ByproductKind = 'manure' | 'crop_residue' | 'greywater' | 'finished_compost';

export interface ByproductStack {
  kind: ByproductKind;
  massLbs: number;
  nitrogenDensityPerTon: number;
  producedOnDay: number;
  sourceZoneId: number;
}

// ── Composting ──

export type CompostPhase = 'cold' | 'mesophilic' | 'thermophilic' | 'curing' | 'finished';

export interface CompostBin {
  zoneId: number;
  greenInputLbs: number;
  brownInputLbs: number;
  cnRatio: number;
  maturityDays: number;
  phase: CompostPhase;
  outputReadyLbs: number;
  inputCapacityLbs: number;
}

// ── Contamination ──

export interface ContaminationRecord {
  zoneId: number;
  appliedOnDay: number;
  safeHarvestDay: number;
  massAppliedLbs: number;
}

// ── Greywater ──

export interface GreywaterFlow {
  sourceZoneId: number;
  dailyGallons: number;
  connectedToZoneId: number | null;
}

// ── Ledger ──

export interface ByproductLedger {
  totalProducedLbs: number;
  totalGreywaterGallons: number;
  totalReusedLbs: number;
  totalGreywaterReusedGallons: number;
  totalWastedLbs: number;
  closedLoopPercent: number;
}

// ── Manure Config ──

export interface ManureProfile {
  speciesId: string;
  lbPerAnimalPerDay: number;
  nitrogenDensityPerTon: number;
}

// ── Residue Config ──

export interface ResidueProfile {
  cropId: string;
  residueToYieldRatio: number;
  isResearched: boolean;
}

// ── Events ──

export type WasteEconomyEventType =
  | 'BYPRODUCT_PRODUCED'
  | 'COMPOST_MATURED'
  | 'CONTAMINATION_APPLIED'
  | 'CLOSED_LOOP_UPDATED';
