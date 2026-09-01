import type { HomesteadPlanningState } from '../../src/simulation/homestead/planningTransition';
import type { HomesteadSimulationState } from '../../src/simulation/homestead/state';
import type { HomesteadScenarioDefinition } from '../../src/simulation/homestead/scenario';
import type { UnlockSeason } from '../research-credits/public';

export type NewGamePhase = 'ORIENTATION' | 'FIRST_BUILD' | 'FIRST_OPERATION' | 'ESTABLISHED';

export interface NewGameState {
  runId: string;
  scenarioId: string;
  seed: string;
  day: number;
  phase: NewGamePhase;
  objectiveId: string;
  completedObjectiveIds: string[];
  planning: HomesteadPlanningState;
  simulation: HomesteadSimulationState;
  scenario: HomesteadScenarioDefinition;
  bootstrapRedeemed: boolean;
  simulationReady: boolean;
  failure?: NewGameFailure;
}

export type FailureType =
  | 'INSUFFICIENT_AREA'
  | 'INSUFFICIENT_RESOURCE'
  | 'WRONG_SEASON'
  | 'MISSING_PREREQUISITE'
  | 'WATER_SHORTAGE'
  | 'FOOD_SHORTAGE';

export interface RecoveryAction {
  intentType: string;
  description: string;
  targetId?: string;
}

export interface NewGameFailure {
  type: FailureType;
  reason: string;
  stateEvidence: Record<string, unknown>;
  recoveryActions: RecoveryAction[];
}

export type ActionAvailability =
  | 'AVAILABLE'
  | 'LOCKED'
  | 'BLOCKED_RESOURCE'
  | 'BLOCKED_LEVEL'
  | 'BLOCKED_SEASON'
  | 'BLOCKED_PREREQUISITE'
  | 'BLOCKED_STATE';

export interface PlayerAction {
  id: string;
  label: string;
  intentType: string;
  availability: ActionAvailability;
  blockReason?: string;
  targetId?: string;
  cost?: number;
}

export interface ObjectiveBlocker {
  type: string;
  reason: string;
}

export interface PlayerObjective {
  id: string;
  title: string;
  reason: string;
  permittedIntentTypes: string[];
  targetIds?: string[];
  blockedBy?: ObjectiveBlocker[];
}

export interface ObjectiveDefinition {
  id: string;
  phase: NewGamePhase;
  title: string;
  reason: string;
  permittedIntentTypes: string[];
  isComplete: (state: NewGameState) => boolean;
  getTargetIds?: (state: NewGameState, season: UnlockSeason) => string[];
  getBlockers?: (state: NewGameState, season: UnlockSeason) => ObjectiveBlocker[];
}

export interface NewGameTransition {
  state: NewGameState;
  events: NewGameEvent[];
}

export type NewGameEventType =
  | 'GAME_STARTED'
  | 'OBJECTIVE_COMPLETED'
  | 'OBJECTIVE_ADVANCED'
  | 'PHASE_CHANGED'
  | 'BOOTSTRAP_REDEEMED'
  | 'PLACEMENT_APPLIED_TO_SCENARIO'
  | 'LEVEL_AUTO_EVALUATED'
  | 'FAILURE_DETECTED'
  | 'FAILURE_CLEARED';

export interface NewGameEvent {
  type: NewGameEventType;
  day: number;
  payload: Record<string, unknown>;
}
