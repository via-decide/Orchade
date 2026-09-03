/**
 * ORCHADE-RUNTIME-001 (#59), sub-scope 001A.
 *
 * Canonical PlannerActionIntent / validation / result contracts for the Plot Planner's
 * own action pipeline. See docs/PLANNER_ACTION_MIGRATION.md for the full handler
 * inventory this is derived from, and why this is a distinct layer from
 * src/simulation/homestead/revision.ts (which operates on the compiled
 * HomesteadScenarioDefinition, not on ZoneData/PaddockState/PantryItem).
 *
 * This file defines types only. No dispatcher, no handler migration (that is 001B/C-G).
 */

import type { ZoneData } from '../../components/PlotPlanner';
import type { PaddockState } from '../../data/livestockData';
import type { PantryItem } from '../../components/HarvestCellarPanel';
import type { HomesteadPreset } from '../../data/homesteadPresets';
import type { CreditSource, DebitReason } from '../../../gameplay/research-credits/public';
import type { HomesteadSimulationEventType } from '../homestead/events';

// ── Intents ────────────────────────────────────────────────────────────────
//
// Each intent captures only deterministic inputs and stable id references — no
// ambient component state. `ApplyAmendmentIntent` in particular fixes a real gap in
// the current handler (handleApplyAmendment reads `selectedZoneId` from component
// state rather than taking a zoneId parameter); the intent makes the target explicit.

export interface HydrateZoneIntent { type: 'HYDRATE_ZONE'; zoneId: number; }
export interface TendZoneIntent { type: 'TEND_ZONE'; zoneId: number; }
export interface ApplyAmendmentIntent { type: 'APPLY_AMENDMENT'; zoneId: number; amendmentId: string; }
export interface HarvestCropIntent { type: 'HARVEST_CROP'; zoneId: number; }
export interface RepositionZoneIntent { type: 'REPOSITION_ZONE'; zoneId: number; col: number; row: number; }

export interface AdoptLivestockIntent { type: 'ADOPT_LIVESTOCK'; targetZoneId: number; breedId: string; }
export interface RotatePaddockIntent { type: 'ROTATE_PADDOCK'; paddockId: string; destZoneId: number; }
export interface HarvestLivestockIntent { type: 'HARVEST_LIVESTOCK'; paddockId: string; }

export interface InstallWaterUpgradeIntent { type: 'INSTALL_WATER_UPGRADE'; upgradeId: string; }
export interface InstallEnergyUpgradeIntent { type: 'INSTALL_ENERGY_UPGRADE'; upgradeId: string; }
export interface ToggleGeneratorIntent { type: 'TOGGLE_GENERATOR'; }

export interface SellInventoryIntent { type: 'SELL_INVENTORY'; itemId: string; qty: number; pricePerUnit: number; }
export interface PreserveInventoryIntent { type: 'PRESERVE_INVENTORY'; itemId: string; method: 'cold_cellar' | 'dry' | 'canned'; }

export interface LoadPresetIntent { type: 'LOAD_PRESET'; preset: HomesteadPreset; }

export type PlannerActionIntent =
  | HydrateZoneIntent
  | TendZoneIntent
  | ApplyAmendmentIntent
  | HarvestCropIntent
  | RepositionZoneIntent
  | AdoptLivestockIntent
  | RotatePaddockIntent
  | HarvestLivestockIntent
  | InstallWaterUpgradeIntent
  | InstallEnergyUpgradeIntent
  | ToggleGeneratorIntent
  | SellInventoryIntent
  | PreserveInventoryIntent
  | LoadPresetIntent;

export type PlannerActionIntentType = PlannerActionIntent['type'];

// ── Validation ─────────────────────────────────────────────────────────────

export type PlannerActionValidation =
  | 'VALID'
  | 'INVALID'
  | 'INSUFFICIENT_RESOURCE'
  | 'MISSING_PREREQUISITE'
  | 'UNKNOWN'
  | 'UNSUPPORTED';

export interface PlannerActionFailure {
  validation: Exclude<PlannerActionValidation, 'VALID'>;
  reason: string;
  /** Structural evidence backing the failure — no free-text-only diagnosis. */
  evidence?: Record<string, unknown>;
}

// ── Result ─────────────────────────────────────────────────────────────────

/**
 * Reuses HomesteadSimulationEventType where the concept already exists there
 * (CROP_HARVESTED, IRRIGATION_APPLIED, RESEARCH_CREDIT_GRANTED, ...) rather than
 * inventing parallel event names, per issue #59's instruction not to duplicate
 * existing canonical event contracts.
 */
export interface PlannerRuntimeEvent {
  type: HomesteadSimulationEventType;
  payload: Record<string, unknown>;
}

export interface PlannerActionResult {
  accepted: boolean;
  actionId: string;
  intentType: PlannerActionIntentType;
  priorStateHash: string;
  nextStateHash: string;
  events: PlannerRuntimeEvent[];
  /** Present only for PROPERTY_REVISION_ACTION-class intents once 001G lands. */
  propertyRevisionRef?: string;
  rngStateBefore?: number;
  rngStateAfter?: number;
  failure?: PlannerActionFailure;
}

// ── Economy boundary ─────────────────────────────────────────────────────────
//
// Per issue #59 Critical boundary #3: credits do not own physical truth. A
// cost-bearing intent (ADOPT_LIVESTOCK, INSTALL_WATER_UPGRADE, INSTALL_ENERGY_UPGRADE,
// APPLY_AMENDMENT) must validate affordability separately from physical compatibility,
// and the eventual dispatcher (001B) must make the debit + physical mutation atomic —
// neither may succeed alone. This type exists so 001B has a place to pin the cost
// snapshot without embedding it inside the intent itself (the intent stays a pure
// deterministic input; the pinned cost is a dispatcher-produced fact about it).

export interface PinnedCostAssumption {
  source: CreditSource | DebitReason;
  amount: number;
  pinnedAtActionId: string;
}

// ── Handler → intent classification, mirrored from docs/PLANNER_ACTION_MIGRATION.md ──
//
// Kept here (not just in the doc) so 001B's dispatcher and its tests can import a
// single source of truth for "which intents are UI_ONLY vs migrated" instead of the
// classification silently drifting out of sync with the doc.

export type PlannerHandlerClass =
  | 'UI_ONLY'
  | 'PROPERTY_REVISION_ACTION'
  | 'OPERATIONAL_RUNTIME_ACTION'
  | 'ECONOMY_ONLY';

export const PLANNER_ACTION_INTENT_CLASS: Record<PlannerActionIntentType, PlannerHandlerClass> = {
  REPOSITION_ZONE: 'PROPERTY_REVISION_ACTION',
  ADOPT_LIVESTOCK: 'PROPERTY_REVISION_ACTION',
  INSTALL_WATER_UPGRADE: 'PROPERTY_REVISION_ACTION',
  INSTALL_ENERGY_UPGRADE: 'PROPERTY_REVISION_ACTION',
  LOAD_PRESET: 'PROPERTY_REVISION_ACTION',

  ROTATE_PADDOCK: 'OPERATIONAL_RUNTIME_ACTION',
  HARVEST_LIVESTOCK: 'OPERATIONAL_RUNTIME_ACTION',
  TOGGLE_GENERATOR: 'OPERATIONAL_RUNTIME_ACTION',
  HYDRATE_ZONE: 'OPERATIONAL_RUNTIME_ACTION',
  TEND_ZONE: 'OPERATIONAL_RUNTIME_ACTION',
  APPLY_AMENDMENT: 'OPERATIONAL_RUNTIME_ACTION',
  HARVEST_CROP: 'OPERATIONAL_RUNTIME_ACTION',
  PRESERVE_INVENTORY: 'OPERATIONAL_RUNTIME_ACTION',

  SELL_INVENTORY: 'ECONOMY_ONLY',
};
