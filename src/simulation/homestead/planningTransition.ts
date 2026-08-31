import {
  UNLOCK_REGISTRY,
  credit,
  createResearchCreditsState,
  getStarterUnlocks,
  isUnlocked,
  performUnlock,
  type ResearchCreditsState,
  type UnlockSeason,
} from '../../../gameplay/research-credits/api';
import {
  checkLevelUp,
  createProgressionState,
  requireActiveEnvironmentSkin,
  type ProgressionInputs,
  type ProgressionState,
} from '../../../gameplay/progression/api';
import { createHomesteadEvent, type HomesteadSimulationEvent } from './events';

export interface PlanningPlacement {
  id: string;
  contentId: string;
  areaM2: number;
  placedOnDay: number;
}

export interface HomesteadPlanningState {
  scenarioId: string;
  day: number;
  availableAreaM2: number;
  occupiedAreaM2: number;
  nextEventSequence: number;
  research: ResearchCreditsState;
  progression: ProgressionState;
  placements: PlanningPlacement[];
}

export type HomesteadPlanningIntent =
  | { type: 'GRANT_RESEARCH_CREDITS'; amount: number; gameId: string; action: string; evidenceRef?: string }
  | { type: 'UNLOCK_CONTENT'; contentId: string }
  | { type: 'PLACE_COMPONENT'; placementId: string; contentId: string; areaM2: number }
  | { type: 'EVALUATE_LEVEL' }
  | { type: 'SELECT_ENVIRONMENT_SKIN'; skinId: string };

export interface HomesteadPlanningContext {
  day: number;
  season: UnlockSeason;
  levelInputs: ProgressionInputs;
}

export interface HomesteadPlanningTransition {
  state: HomesteadPlanningState;
  events: HomesteadSimulationEvent[];
}

export function createInitialHomesteadPlanningState(
  scenarioId: string,
  availableAreaM2: number,
  skinId = 'default',
): HomesteadPlanningState {
  if (!scenarioId.trim()) throw new Error('Planning state requires scenarioId.');
  if (!Number.isFinite(availableAreaM2) || availableAreaM2 < 0) throw new Error('Planning state available area must be non-negative.');
  return {
    scenarioId,
    day: 0,
    availableAreaM2,
    occupiedAreaM2: 0,
    nextEventSequence: 0,
    research: createResearchCreditsState(getStarterUnlocks()),
    progression: createProgressionState(skinId),
    placements: [],
  };
}

const rejectPlacement = (
  state: HomesteadPlanningState,
  context: HomesteadPlanningContext,
  intent: Extract<HomesteadPlanningIntent, { type: 'PLACE_COMPONENT' }>,
  reason: string,
): HomesteadPlanningTransition => ({
  state: { ...state, day: context.day, nextEventSequence: state.nextEventSequence + 1 },
  events: [createHomesteadEvent(state.scenarioId, context.day, state.nextEventSequence, 'PLACEMENT_REJECTED', {
    source: 'planning-intent',
    placementId: intent.placementId,
    contentId: intent.contentId,
    areaM2: intent.areaM2,
    reason,
  })],
});

export function applyHomesteadPlanningIntent(
  state: HomesteadPlanningState,
  intent: HomesteadPlanningIntent,
  context: HomesteadPlanningContext,
): HomesteadPlanningTransition {
  if (!Number.isInteger(context.day) || context.day < 0) throw new Error('Planning context day must be a non-negative integer.');
  const event = (type: Parameters<typeof createHomesteadEvent>[3], payload: unknown): HomesteadPlanningTransition => ({
    state: { ...state, day: context.day, nextEventSequence: state.nextEventSequence + 1 },
    events: [createHomesteadEvent(state.scenarioId, context.day, state.nextEventSequence, type, payload)],
  });

  if (intent.type === 'GRANT_RESEARCH_CREDITS') {
    const research = credit(state.research, intent.amount, {
      gameId: intent.gameId,
      action: intent.action,
      tick: context.day,
      evidenceRef: intent.evidenceRef,
    });
    return {
      state: { ...state, day: context.day, research, nextEventSequence: state.nextEventSequence + 1 },
      events: [createHomesteadEvent(state.scenarioId, context.day, state.nextEventSequence, 'RESEARCH_CREDIT_GRANTED', {
        amount: intent.amount,
        gameId: intent.gameId,
        action: intent.action,
        evidenceRef: intent.evidenceRef,
        balance: research.balance,
      })],
    };
  }

  if (intent.type === 'UNLOCK_CONTENT') {
    const result = performUnlock(state.research, intent.contentId, state.progression.level, context.season, context.day);
    if (!result.ok) return event('UNLOCK_REJECTED', { contentId: intent.contentId, reason: result.error, balance: state.research.balance });
    return {
      state: { ...state, day: context.day, research: result.state, nextEventSequence: state.nextEventSequence + 1 },
      events: [createHomesteadEvent(state.scenarioId, context.day, state.nextEventSequence, 'CONTENT_UNLOCKED', {
        contentId: intent.contentId,
        cost: result.content.cost,
        balance: result.state.balance,
      })],
    };
  }

  if (intent.type === 'PLACE_COMPONENT') {
    const content = UNLOCK_REGISTRY.find(item => item.contentId === intent.contentId);
    if (!content) return rejectPlacement(state, context, intent, 'UNKNOWN_CONTENT');
    if (!isUnlocked(state.research, intent.contentId)) return rejectPlacement(state, context, intent, 'CONTENT_LOCKED');
    if (content.requiredLevel > state.progression.level) return rejectPlacement(state, context, intent, 'LEVEL_REQUIRED');
    if (content.validSeasons && !content.validSeasons.includes(context.season)) return rejectPlacement(state, context, intent, 'WRONG_SEASON');
    if (!intent.placementId.trim() || state.placements.some(item => item.id === intent.placementId)) return rejectPlacement(state, context, intent, 'DUPLICATE_PLACEMENT');
    if (!Number.isFinite(intent.areaM2) || intent.areaM2 <= 0) return rejectPlacement(state, context, intent, 'INVALID_AREA');
    if (state.occupiedAreaM2 + intent.areaM2 > state.availableAreaM2 + 0.001) return rejectPlacement(state, context, intent, 'INSUFFICIENT_AREA');
    const placement = { id: intent.placementId, contentId: intent.contentId, areaM2: intent.areaM2, placedOnDay: context.day };
    return {
      state: {
        ...state,
        day: context.day,
        occupiedAreaM2: state.occupiedAreaM2 + intent.areaM2,
        placements: [...state.placements, placement],
        nextEventSequence: state.nextEventSequence + 1,
      },
      events: [createHomesteadEvent(state.scenarioId, context.day, state.nextEventSequence, 'PLACEMENT_ACCEPTED', {
        source: 'planning-intent',
        ...placement,
      })],
    };
  }

  if (intent.type === 'EVALUATE_LEVEL') {
    const paidUnlockCount = state.research.unlocks.filter(item => item.cost > 0).length;
    const nextLevel = checkLevelUp(state.progression.level, { ...context.levelInputs, paidUnlockCount });
    if (!nextLevel) return event('LEVEL_ADVANCE_REJECTED', { level: state.progression.level });
    const progression = {
      ...state.progression,
      level: nextLevel,
      levelUpHistory: [...state.progression.levelUpHistory, { level: nextLevel, onDay: context.day }],
    };
    return {
      state: { ...state, day: context.day, progression, nextEventSequence: state.nextEventSequence + 1 },
      events: [createHomesteadEvent(state.scenarioId, context.day, state.nextEventSequence, 'LEVEL_ADVANCED', {
        previousLevel: state.progression.level,
        level: nextLevel,
      })],
    };
  }

  try {
    requireActiveEnvironmentSkin(intent.skinId);
    const progression = { ...state.progression, skinId: intent.skinId };
    return {
      state: { ...state, day: context.day, progression, nextEventSequence: state.nextEventSequence + 1 },
      events: [createHomesteadEvent(state.scenarioId, context.day, state.nextEventSequence, 'ENVIRONMENT_SKIN_SELECTED', {
        skinId: intent.skinId,
      })],
    };
  } catch {
    return event('ENVIRONMENT_SKIN_REJECTED', { skinId: intent.skinId, reason: 'UNCALIBRATED_SKIN' });
  }
}
