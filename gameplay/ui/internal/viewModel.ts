import { GameState } from '../../../src/types';
export type ActiveTab = GameState['activeTab'];
export const selectTab = (state: GameState, activeTab: ActiveTab): GameState => ({ ...state, activeTab });
export const selectOrchard = (state: GameState, activeOrchardId: string): GameState => ({ ...state, activeOrchardId, selectedPlantIndex: null });
export const selectPlant = (state: GameState, selectedPlantIndex: number | null): GameState => ({ ...state, selectedPlantIndex });
