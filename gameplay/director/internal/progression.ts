import type { NewGameState, NewGameEvent } from '../public';
import type { HomesteadSimulationEvent } from '../../../src/simulation/homestead/events';
import { checkLevelUp, type ProgressionInputs } from '../../progression/internal/levels';
import { completeObjective, getPhaseForObjective, deriveNextPlayerObjective } from './objectives';
import { detectFailure, clearFailure } from './failures';
import type { UnlockSeason } from '../../research-credits/public';

const QUALIFYING_EVENT_TYPES = new Set([
  'CROP_HARVESTED',
  'COMPOST_MATURED',
  'COMPOST_APPLIED',
  'WATER_CAPTURED',
  'ENERGY_BALANCE_UPDATED',
  'LIVESTOCK_UPDATED',
  'CONTENT_UNLOCKED',
  'PLACEMENT_ACCEPTED',
]);

export function deriveProgressionInputs(state: NewGameState): ProgressionInputs {
  const harvestableCount = state.simulation.zones.filter(z => z.plant.isHarvestable).length;
  const waterStored = state.simulation.water.currentStoredGallons;
  const solarWatts = state.simulation.solar.solarArrayWatts;
  const paidUnlockCount = state.planning.research.unlocks.filter(u => u.cost > 0).length;
  const activePaddockCount = state.simulation.paddocks.length;
  return {
    pantryItemCount: harvestableCount,
    totalReusedLbs: 0,
    waterStoredGallons: waterStored,
    paidUnlockCount,
    activePaddockCount,
    closedLoopPercent: 0,
    solarWatts,
  };
}

export function processSimulationConsequences(
  state: NewGameState,
  simulationEvents: HomesteadSimulationEvent[],
  season: UnlockSeason,
): { state: NewGameState; events: NewGameEvent[] } {
  const events: NewGameEvent[] = [];
  let current = state;

  const hasQualifyingEvent = simulationEvents.some(e => QUALIFYING_EVENT_TYPES.has(e.type));

  if (hasQualifyingEvent) {
    const inputs = deriveProgressionInputs(current);
    const paidUnlockCount = current.planning.research.unlocks.filter(u => u.cost > 0).length;
    const nextLevel = checkLevelUp(current.planning.progression.level, { ...inputs, paidUnlockCount });

    if (nextLevel) {
      current = {
        ...current,
        planning: {
          ...current.planning,
          progression: {
            ...current.planning.progression,
            level: nextLevel,
            levelUpHistory: [
              ...current.planning.progression.levelUpHistory,
              { level: nextLevel, onDay: current.day },
            ],
          },
        },
      };
      events.push({
        type: 'LEVEL_AUTO_EVALUATED',
        day: current.day,
        payload: { previousLevel: state.planning.progression.level, level: nextLevel },
      });
    }
  }

  current = autoCompleteObjectives(current, season);

  const objective = deriveNextPlayerObjective(current, season);
  const newPhase = getPhaseForObjective(objective.id);
  if (newPhase !== current.phase) {
    events.push({
      type: 'PHASE_CHANGED',
      day: current.day,
      payload: { previousPhase: current.phase, phase: newPhase },
    });
    current = { ...current, phase: newPhase, objectiveId: objective.id };
  } else if (objective.id !== current.objectiveId) {
    events.push({
      type: 'OBJECTIVE_ADVANCED',
      day: current.day,
      payload: { previousObjectiveId: current.objectiveId, objectiveId: objective.id },
    });
    current = { ...current, objectiveId: objective.id };
  }

  const failure = detectFailure(current, season);
  if (failure && !current.failure) {
    events.push({ type: 'FAILURE_DETECTED', day: current.day, payload: { failure } });
    current = { ...current, failure };
  } else if (!failure && current.failure) {
    events.push({ type: 'FAILURE_CLEARED', day: current.day, payload: { previousFailure: current.failure.type } });
    current = clearFailure(current);
  }

  return { state: current, events };
}

function autoCompleteObjectives(state: NewGameState, season: UnlockSeason): NewGameState {
  let current = state;

  if (!current.completedObjectiveIds.includes('inspect_land') && current.day >= 0) {
    current = completeObjective(current, 'inspect_land');
  }

  if (!current.completedObjectiveIds.includes('choose_starter_plan') && current.bootstrapRedeemed) {
    current = completeObjective(current, 'choose_starter_plan');
  }

  if (!current.completedObjectiveIds.includes('place_first_food_producer') && current.planning.placements.length > 0) {
    current = completeObjective(current, 'place_first_food_producer');
  }

  if (!current.completedObjectiveIds.includes('establish_water_source') && current.simulation.day >= 1) {
    current = completeObjective(current, 'establish_water_source');
  }

  if (!current.completedObjectiveIds.includes('advance_first_day') && current.simulation.day >= 1) {
    current = completeObjective(current, 'advance_first_day');
  }

  if (!current.completedObjectiveIds.includes('respond_to_consequence') && current.simulation.day >= 2) {
    current = completeObjective(current, 'respond_to_consequence');
  }

  if (!current.completedObjectiveIds.includes('complete_first_harvest')) {
    const hasHarvestable = current.simulation.zones.some(z => z.plant.isHarvestable);
    if (hasHarvestable) current = completeObjective(current, 'complete_first_harvest');
  }

  if (!current.completedObjectiveIds.includes('introduce_research')) {
    const hasPaidUnlock = current.planning.research.unlocks.some(u => u.cost > 0);
    if (hasPaidUnlock) current = completeObjective(current, 'introduce_research');
  }

  if (!current.completedObjectiveIds.includes('unlock_next_system')) {
    const paidUnlocks = current.planning.research.unlocks.filter(u => u.cost > 0);
    if (paidUnlocks.length >= 2) current = completeObjective(current, 'unlock_next_system');
  }

  return current;
}
