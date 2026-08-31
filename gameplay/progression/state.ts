import type { PlayerLevel } from './public';

export interface ProgressionState {
  level: PlayerLevel;
  skinId: string;
  levelUpHistory: Array<{ level: PlayerLevel; onDay: number }>;
  observedStages: Record<string, number[]>;
}

export const initialProgressionState: ProgressionState = {
  level: 1,
  skinId: 'default',
  levelUpHistory: [],
  observedStages: {},
};

export function createProgressionState(skinId = 'default'): ProgressionState {
  return { ...initialProgressionState, skinId, levelUpHistory: [], observedStages: {} };
}
