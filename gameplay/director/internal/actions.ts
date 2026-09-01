import type { NewGameState, PlayerAction, ActionAvailability } from '../public';
import type { UnlockSeason } from '../../research-credits/public';
import { UNLOCK_REGISTRY, canUnlock, isUnlocked } from '../../research-credits/internal/unlocks';
import { deriveNextPlayerObjective } from './objectives';

export function deriveAvailablePlayerActions(
  state: NewGameState,
  season: UnlockSeason,
): PlayerAction[] {
  const objective = deriveNextPlayerObjective(state, season);
  const actions: PlayerAction[] = [];
  const level = state.planning.progression.level;

  actions.push({
    id: 'advance_day',
    label: 'Advance Day',
    intentType: 'ADVANCE_DAY',
    ...deriveAdvanceDayAvailability(state, objective),
  });

  const unlockedCrops = UNLOCK_REGISTRY.filter(u =>
    u.category === 'crop' && isUnlocked(state.planning.research, u.contentId),
  );
  for (const crop of unlockedCrops) {
    const seasonBlocked = crop.validSeasons && !crop.validSeasons.includes(season);
    const areaAvailable = state.planning.availableAreaM2 - state.planning.occupiedAreaM2 >= 10;
    let availability: ActionAvailability = 'AVAILABLE';
    let blockReason: string | undefined;
    if (seasonBlocked) { availability = 'BLOCKED_SEASON'; blockReason = `${crop.displayName} cannot be planted in ${season}.`; }
    else if (!areaAvailable) { availability = 'BLOCKED_RESOURCE'; blockReason = 'Not enough area for a new crop zone.'; }

    actions.push({
      id: `place_crop_${crop.contentId}`,
      label: `Place ${crop.displayName}`,
      intentType: 'PLACE_COMPONENT',
      availability,
      blockReason,
      targetId: crop.contentId,
    });
  }

  for (const content of UNLOCK_REGISTRY) {
    if (isUnlocked(state.planning.research, content.contentId)) continue;
    const check = canUnlock(state.planning.research, content.contentId, level, season);
    let availability: ActionAvailability;
    let blockReason: string | undefined;
    if (check === true) {
      availability = 'AVAILABLE';
    } else if (check.error === 'level-required') {
      availability = 'BLOCKED_LEVEL';
      blockReason = `Requires level ${content.requiredLevel}.`;
    } else if (check.error === 'wrong-season') {
      availability = 'BLOCKED_SEASON';
      blockReason = `Not available in ${season}.`;
    } else if (check.error === 'missing-prerequisite') {
      availability = 'BLOCKED_PREREQUISITE';
      blockReason = `Requires: ${content.prerequisites?.join(', ')}.`;
    } else if (check.error === 'insufficient') {
      availability = 'BLOCKED_RESOURCE';
      blockReason = `Costs ${content.cost} credits (have ${state.planning.research.balance}).`;
    } else {
      availability = 'LOCKED';
    }

    actions.push({
      id: `unlock_${content.contentId}`,
      label: `Unlock ${content.displayName}`,
      intentType: 'UNLOCK_CONTENT',
      availability,
      blockReason,
      targetId: content.contentId,
      cost: content.cost,
    });
  }

  actions.push({
    id: 'evaluate_level',
    label: 'Evaluate Progression',
    intentType: 'EVALUATE_LEVEL',
    availability: state.day > 0 ? 'AVAILABLE' : 'BLOCKED_STATE',
    blockReason: state.day === 0 ? 'Advance at least one day first.' : undefined,
  });

  const harvestableZones = state.simulation.zones.filter(z => z.plant.isHarvestable);
  if (harvestableZones.length > 0) {
    for (const zone of harvestableZones) {
      actions.push({
        id: `harvest_zone_${zone.id}`,
        label: `Harvest Zone #${zone.id}`,
        intentType: 'HARVEST',
        availability: 'AVAILABLE',
        targetId: String(zone.id),
      });
    }
  }

  return actions;
}

function deriveAdvanceDayAvailability(
  state: NewGameState,
  objective: { id: string; blockedBy?: Array<{ type: string; reason: string }> },
): { availability: ActionAvailability; blockReason?: string } {
  if (state.planning.placements.length === 0 && state.day === 0) {
    return { availability: 'BLOCKED_STATE', blockReason: 'Place at least one component before advancing time.' };
  }
  if (!state.simulationReady && state.day === 0) {
    return { availability: 'BLOCKED_STATE', blockReason: 'Apply placements to the scenario before advancing.' };
  }
  return { availability: 'AVAILABLE' };
}
