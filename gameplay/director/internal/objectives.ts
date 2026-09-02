import type { NewGameState, PlayerObjective, ObjectiveDefinition, ObjectiveBlocker } from '../public';
import type { UnlockSeason } from '../../research-credits/public';
import { UNLOCK_REGISTRY, getAvailableUnlocks } from '../../research-credits/internal/unlocks';

function getSeasonValidStarterCrops(season: UnlockSeason): string[] {
  return UNLOCK_REGISTRY
    .filter(u => u.category === 'crop' && u.cost === 0 && (!u.validSeasons || u.validSeasons.includes(season)))
    .map(u => u.contentId);
}

export const OBJECTIVE_GRAPH: ObjectiveDefinition[] = [
  {
    id: 'inspect_land',
    phase: 'ORIENTATION',
    title: 'Inspect Your Land',
    reason: 'Survey the blank property to understand area, soil, and season before placing anything.',
    permittedIntentTypes: [],
    isComplete: (state) => state.completedObjectiveIds.includes('inspect_land'),
  },
  {
    id: 'choose_starter_plan',
    phase: 'ORIENTATION',
    title: 'Choose a Starter Plan',
    reason: 'Select a season-valid starter crop from unlocked options to begin your first food-producing zone.',
    permittedIntentTypes: ['UNLOCK_CONTENT'],
    isComplete: (state) => state.completedObjectiveIds.includes('choose_starter_plan'),
    getTargetIds: (_state, season) => getSeasonValidStarterCrops(season),
    getBlockers: (_state, season) => {
      const crops = getSeasonValidStarterCrops(season);
      if (crops.length === 0) return [{ type: 'WRONG_SEASON', reason: `No starter crops available in ${season}. Wait for a season with valid options.` }];
      return [];
    },
  },
  {
    id: 'place_first_food_producer',
    phase: 'FIRST_BUILD',
    title: 'Place Your First Food-Producing Zone',
    reason: 'Use the starter bootstrap voucher to place a crop zone on your land. This is your first real action.',
    permittedIntentTypes: ['PLACE_COMPONENT'],
    isComplete: (state) => state.planning.placements.length > 0,
    getTargetIds: (state, season) => getSeasonValidStarterCrops(season).filter(id =>
      state.planning.research.unlocks.some(u => u.contentId === id),
    ),
    getBlockers: (state, season) => {
      const blockers: ObjectiveBlocker[] = [];
      const unlocked = getSeasonValidStarterCrops(season).filter(id =>
        state.planning.research.unlocks.some(u => u.contentId === id),
      );
      if (unlocked.length === 0) blockers.push({ type: 'MISSING_PREREQUISITE', reason: 'No season-valid crops are unlocked. Complete the previous objective first.' });
      if (state.planning.availableAreaM2 - state.planning.occupiedAreaM2 < 10) blockers.push({ type: 'INSUFFICIENT_AREA', reason: 'Not enough usable area for a crop zone.' });
      return blockers;
    },
  },
  {
    id: 'establish_water_source',
    phase: 'FIRST_BUILD',
    title: 'Establish a Water Plan',
    reason: 'Crops need water. Identify or note how your land will receive irrigation — rainfall or stored water.',
    permittedIntentTypes: ['PLACE_COMPONENT', 'UNLOCK_CONTENT'],
    isComplete: (state) => state.completedObjectiveIds.includes('establish_water_source'),
  },
  {
    id: 'advance_first_day',
    phase: 'FIRST_OPERATION',
    title: 'Advance Your First Day',
    reason: 'Run the homestead simulation for one day to see how weather, water, and crops respond.',
    permittedIntentTypes: ['ADVANCE_DAY'],
    // state.day (not simulation.day) is the player-facing counter: it starts at 0 and
    // only becomes >=1 once advanceNewGameDay actually runs. simulation.day starts at
    // 1 unconditionally (validateHomesteadScenario requires startDay >= 1), so using it
    // here would report this objective complete before the player ever advances a day.
    isComplete: (state) => state.day >= 1,
    getBlockers: (state) => {
      if (state.planning.placements.length === 0) return [{ type: 'BLOCKED_STATE', reason: 'Place at least one food-producing zone before advancing time.' }];
      return [];
    },
  },
  {
    id: 'respond_to_consequence',
    phase: 'FIRST_OPERATION',
    title: 'Respond to Your First Consequence',
    reason: 'After the first day, check crop water levels and soil nutrients. Take a corrective action if needed.',
    permittedIntentTypes: ['PLACE_COMPONENT', 'UNLOCK_CONTENT'],
    isComplete: (state) => state.completedObjectiveIds.includes('respond_to_consequence'),
  },
  {
    id: 'complete_first_harvest',
    phase: 'FIRST_OPERATION',
    title: 'Complete Your First Harvest',
    reason: 'Grow a crop to its final stage and harvest. This is the first meaningful resolution.',
    permittedIntentTypes: ['ADVANCE_DAY', 'HARVEST'],
    isComplete: (state) => {
      const hasHarvestable = state.simulation.zones.some(z => z.plant.isHarvestable);
      return state.completedObjectiveIds.includes('complete_first_harvest') || hasHarvestable;
    },
  },
  {
    id: 'introduce_research',
    phase: 'FIRST_OPERATION',
    title: 'Explore the Research System',
    reason: 'Harvest earnings fund research credits. Use them to unlock new crops, livestock, or infrastructure.',
    permittedIntentTypes: ['UNLOCK_CONTENT', 'GRANT_RESEARCH_CREDITS'],
    isComplete: (state) => state.planning.research.unlocks.some(u => u.cost > 0),
  },
  {
    id: 'unlock_next_system',
    phase: 'ESTABLISHED',
    title: 'Unlock a New System',
    reason: 'Expand beyond starter crops — unlock water infrastructure, livestock, or energy to progress toward OPERATE level.',
    permittedIntentTypes: ['UNLOCK_CONTENT', 'PLACE_COMPONENT'],
    isComplete: (state) => {
      const paidUnlocks = state.planning.research.unlocks.filter(u => u.cost > 0);
      return paidUnlocks.length >= 2;
    },
    getTargetIds: (state, season) => getAvailableUnlocks(state.planning.research, state.planning.progression.level, season)
      .filter(u => u.cost > 0)
      .map(u => u.contentId),
  },
];

export function deriveNextPlayerObjective(
  state: NewGameState,
  season: UnlockSeason,
): PlayerObjective {
  for (const def of OBJECTIVE_GRAPH) {
    if (state.completedObjectiveIds.includes(def.id)) continue;
    if (def.isComplete(state)) continue;

    const blockers = def.getBlockers?.(state, season) ?? [];
    const targetIds = def.getTargetIds?.(state, season);

    return {
      id: def.id,
      title: def.title,
      reason: def.reason,
      permittedIntentTypes: def.permittedIntentTypes,
      targetIds,
      blockedBy: blockers.length > 0 ? blockers : undefined,
    };
  }

  return {
    id: 'free_play',
    title: 'Free Play',
    reason: 'All initial objectives complete. Continue building your homestead toward the OPERATE level.',
    permittedIntentTypes: ['PLACE_COMPONENT', 'UNLOCK_CONTENT', 'ADVANCE_DAY', 'EVALUATE_LEVEL', 'HARVEST'],
  };
}

export function getPhaseForObjective(objectiveId: string): NewGameState['phase'] {
  const def = OBJECTIVE_GRAPH.find(o => o.id === objectiveId);
  return def?.phase ?? 'ESTABLISHED';
}

export function completeObjective(state: NewGameState, objectiveId: string): NewGameState {
  if (state.completedObjectiveIds.includes(objectiveId)) return state;
  return {
    ...state,
    completedObjectiveIds: [...state.completedObjectiveIds, objectiveId],
  };
}
