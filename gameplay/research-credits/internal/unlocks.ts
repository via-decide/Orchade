type PlayerLevel = 1 | 2 | 3;
import { debit } from './ledger';
import type { UnlockableContent, UnlockRecord, UnlockSeason } from '../public';
import type { ResearchCreditsState } from '../state';

export const UNLOCK_REGISTRY: UnlockableContent[] = [
  { contentId: 'tomato', category: 'crop', displayName: 'Tomato', cost: 0, requiredLevel: 1, validSeasons: ['spring', 'summer'] },
  { contentId: 'lettuce', category: 'crop', displayName: 'Lettuce', cost: 0, requiredLevel: 1, validSeasons: ['spring', 'autumn'] },
  { contentId: 'carrot', category: 'crop', displayName: 'Carrot', cost: 0, requiredLevel: 1, validSeasons: ['spring', 'summer'] },
  { contentId: 'basil', category: 'crop', displayName: 'Basil', cost: 0, requiredLevel: 1, validSeasons: ['spring', 'summer'] },
  { contentId: 'garlic', category: 'crop', displayName: 'Garlic', cost: 10, requiredLevel: 1, validSeasons: ['autumn', 'winter', 'spring', 'summer'] },
  { contentId: 'clover', category: 'crop', displayName: 'Clover', cost: 10, requiredLevel: 1, validSeasons: ['spring', 'summer', 'autumn', 'winter'] },
  { contentId: 'marigold', category: 'crop', displayName: 'Marigold', cost: 5, requiredLevel: 1, validSeasons: ['spring', 'summer'] },
  { contentId: 'potato', category: 'crop', displayName: 'Potato', cost: 10, requiredLevel: 2, validSeasons: ['spring', 'summer'] },
  { contentId: 'corn', category: 'crop', displayName: 'Sweet Corn', cost: 15, requiredLevel: 2, validSeasons: ['spring', 'summer'] },
  { contentId: 'wheat', category: 'crop', displayName: 'Wheat', cost: 15, requiredLevel: 2, validSeasons: ['spring', 'summer', 'autumn'] },
  { contentId: 'apple', category: 'crop', displayName: 'Apple', cost: 20, requiredLevel: 2 },
  { contentId: 'blueberry', category: 'crop', displayName: 'Blueberry', cost: 20, requiredLevel: 2, validSeasons: ['spring', 'summer'] },
  { contentId: 'heritage_chickens', category: 'livestock', displayName: 'Pastured Chickens', cost: 15, requiredLevel: 2 },
  { contentId: 'st_croix_sheep', category: 'livestock', displayName: 'St. Croix Sheep', cost: 25, requiredLevel: 2 },
  { contentId: 'kunekune_pigs', category: 'livestock', displayName: 'KuneKune Pigs', cost: 30, requiredLevel: 2 },
  { contentId: 'apiculture_bees', category: 'livestock', displayName: 'Honeybee Colony', cost: 20, requiredLevel: 2 },
  { contentId: 'rainwater_cistern_1000', category: 'water_upgrade', displayName: '1,000 Gal Cistern', cost: 10, requiredLevel: 2 },
  { contentId: 'gravity_drip_manifold', category: 'water_upgrade', displayName: 'Gravity Drip Kit', cost: 10, requiredLevel: 2, prerequisites: ['rainwater_cistern_1000'] },
  { contentId: 'keyline_contour_swale', category: 'water_upgrade', displayName: 'Keyline Swale', cost: 15, requiredLevel: 2 },
  { contentId: 'subsurface_clay_ollas', category: 'water_upgrade', displayName: 'Terracotta Ollas Set', cost: 10, requiredLevel: 2 },
  { contentId: 'solar_panel_array_2kw', category: 'energy_upgrade', displayName: '2kW Solar Array', cost: 15, requiredLevel: 2 },
  { contentId: 'lifepo4_battery_5kwh', category: 'energy_upgrade', displayName: '5kWh Battery Module', cost: 20, requiredLevel: 2, prerequisites: ['solar_panel_array_2kw'] },
  { contentId: 'solar_pasture_energizer', category: 'energy_upgrade', displayName: 'Solar Fence Energizer', cost: 10, requiredLevel: 2, prerequisites: ['solar_panel_array_2kw'] },
  { contentId: 'woodgas_biomass_inverter', category: 'energy_upgrade', displayName: 'Woodgas Co-Gen', cost: 25, requiredLevel: 2 },
];

export type UnlockError = 'unknown-content' | 'already-unlocked' | 'level-required' | 'wrong-season' | 'missing-prerequisite' | 'insufficient';

export type UnlockResult =
  | { ok: true; state: ResearchCreditsState; content: UnlockableContent }
  | { ok: false; error: UnlockError; state: ResearchCreditsState; content?: UnlockableContent };

export const getStarterUnlocks = (): UnlockRecord[] => UNLOCK_REGISTRY
  .filter(item => item.cost === 0)
  .map(item => ({ contentId: item.contentId, unlockedAt: 0, cost: 0 }));

export const isUnlocked = (state: ResearchCreditsState, contentId: string): boolean =>
  state.unlocks.some(item => item.contentId === contentId);

export const getUnlockCost = (contentId: string): number | null =>
  UNLOCK_REGISTRY.find(item => item.contentId === contentId)?.cost ?? null;

export function canUnlock(
  state: ResearchCreditsState,
  contentId: string,
  playerLevel: PlayerLevel,
  currentSeason: UnlockSeason,
): true | { error: UnlockError } {
  const content = UNLOCK_REGISTRY.find(item => item.contentId === contentId);
  if (!content) return { error: 'unknown-content' };
  if (isUnlocked(state, contentId)) return { error: 'already-unlocked' };
  if (content.requiredLevel > playerLevel) return { error: 'level-required' };
  if (content.validSeasons && !content.validSeasons.includes(currentSeason)) return { error: 'wrong-season' };
  if (content.prerequisites?.some(id => !isUnlocked(state, id))) return { error: 'missing-prerequisite' };
  if (state.balance < content.cost) return { error: 'insufficient' };
  return true;
}

export function performUnlock(
  state: ResearchCreditsState,
  contentId: string,
  playerLevel: PlayerLevel,
  currentSeason: UnlockSeason,
  currentDay: number,
): UnlockResult {
  const content = UNLOCK_REGISTRY.find(item => item.contentId === contentId);
  const allowed = canUnlock(state, contentId, playerLevel, currentSeason);
  if (allowed !== true) return { ok: false, error: allowed.error, state, content };
  if (!content) return { ok: false, error: 'unknown-content', state };
  if (content.cost === 0) {
    return { ok: true, content, state: { ...state, unlocks: [...state.unlocks, { contentId, unlockedAt: currentDay, cost: 0 }] } };
  }
  const spent = debit(state, content.cost, { gameId: 'orchade', action: 'unlock_' + content.category, contentId, tick: currentDay });
  if (!spent.ok) return { ok: false, error: 'insufficient', state, content };
  return {
    ok: true,
    content,
    state: { ...spent.state, unlocks: [...spent.state.unlocks, { contentId, unlockedAt: currentDay, cost: content.cost }] },
  };
}

export function getAvailableUnlocks(
  state: ResearchCreditsState,
  playerLevel: PlayerLevel,
  currentSeason: UnlockSeason,
): UnlockableContent[] {
  return UNLOCK_REGISTRY.filter(content => canUnlock(state, content.contentId, playerLevel, currentSeason) === true);
}
