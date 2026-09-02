import type { NewGameState, NewGameFailure, RecoveryAction, FailureType } from '../public';
import type { UnlockSeason } from '../../research-credits/public';
import { UNLOCK_REGISTRY, isUnlocked, getAvailableUnlocks } from '../../research-credits/internal/unlocks';

export function detectFailure(
  state: NewGameState,
  season: UnlockSeason,
): NewGameFailure | undefined {
  const area = state.planning.availableAreaM2 - state.planning.occupiedAreaM2;
  if (area < 5 && state.planning.placements.length === 0) {
    return makeFailure('INSUFFICIENT_AREA', 'Not enough usable area for any placement.', { availableAreaM2: area }, []);
  }

  const starterCrops = UNLOCK_REGISTRY.filter(u =>
    u.category === 'crop' && u.cost === 0 && (!u.validSeasons || u.validSeasons.includes(season)),
  );
  if (starterCrops.length === 0 && state.planning.placements.length === 0) {
    return makeFailure('WRONG_SEASON', `No starter crops are available in ${season}.`,
      { season, availableStarters: 0 },
      [{ intentType: 'ADVANCE_DAY', description: 'Wait for the season to change by advancing days.' }],
    );
  }

  if (state.day > 0) {
    const waterShort = state.simulation.zones.every(z => z.plant.cropId && z.plant.water < 15);
    if (waterShort && state.simulation.water.currentStoredGallons < 10) {
      const waterUnlocks = getAvailableUnlocks(state.planning.research, state.planning.progression.level, season)
        .filter(u => u.category === 'water_upgrade');
      return makeFailure('WATER_SHORTAGE', 'All planted zones are critically dry and no water storage is available.',
        { storedGallons: state.simulation.water.currentStoredGallons },
        (waterUnlocks.map(u => ({
          intentType: 'UNLOCK_CONTENT',
          description: `Unlock ${u.displayName} to add water infrastructure.`,
          targetId: u.contentId,
        })) as RecoveryAction[]).concat({ intentType: 'ADVANCE_DAY', description: 'Wait for rainfall.' }),
      );
    }
  }

  if (state.planning.research.balance < 5 && state.planning.placements.length > 0 && state.day > 30) {
    const noHarvestable = !state.simulation.zones.some(z => z.plant.isHarvestable);
    if (noHarvestable) {
      return makeFailure('INSUFFICIENT_RESOURCE', 'Low research credits and no harvestable crops. Continue advancing days until crops mature.',
        { balance: state.planning.research.balance, day: state.day },
        [{ intentType: 'ADVANCE_DAY', description: 'Advance days to let crops grow to harvest.' }],
      );
    }
  }

  return undefined;
}

export function clearFailure(state: NewGameState): NewGameState {
  if (!state.failure) return state;
  return { ...state, failure: undefined };
}

function makeFailure(type: FailureType, reason: string, evidence: Record<string, unknown>, recovery: RecoveryAction[]): NewGameFailure {
  return { type, reason, stateEvidence: evidence, recoveryActions: recovery };
}
