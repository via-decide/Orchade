export type {
  NewGameState,
  NewGamePhase,
  NewGameFailure,
  FailureType,
  RecoveryAction,
  ActionAvailability,
  PlayerAction,
  PlayerObjective,
  ObjectiveBlocker,
  NewGameTransition,
  NewGameEvent,
  NewGameEventType,
} from './public';

export { createNewGameState, type CreateNewGameOptions } from './state';
export { deriveNextPlayerObjective, OBJECTIVE_GRAPH, completeObjective } from './internal/objectives';
export { deriveAvailablePlayerActions } from './internal/actions';
export { deriveStarterBootstrap, redeemBootstrap, type BootstrapVoucher } from './internal/bootstrap';
export { applyPlacementsToScenario, advanceNewGameDay, placementToFoodProducer } from './internal/transitions';
export { processSimulationConsequences, deriveProgressionInputs } from './internal/progression';
export { detectFailure, clearFailure } from './internal/failures';
