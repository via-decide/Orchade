import type { NewGameState, NewGameEvent } from '../public';
import type { UnlockSeason } from '../../research-credits/public';
import { UNLOCK_REGISTRY } from '../../research-credits/internal/unlocks';
import { credit } from '../../research-credits/internal/ledger';

export interface BootstrapVoucher {
  starterCropId: string;
  areaM2: number;
  researchGrant: number;
}

export function deriveStarterBootstrap(
  state: NewGameState,
  season: UnlockSeason,
): BootstrapVoucher | null {
  if (state.bootstrapRedeemed) return null;

  const starterCrops = UNLOCK_REGISTRY
    .filter(u => u.category === 'crop' && u.cost === 0 && (!u.validSeasons || u.validSeasons.includes(season)))
    .map(u => u.contentId);

  if (starterCrops.length === 0) return null;

  const availableArea = state.planning.availableAreaM2 - state.planning.occupiedAreaM2;
  const placementArea = Math.min(50, availableArea * 0.1);
  if (placementArea < 5) return null;

  return {
    starterCropId: starterCrops[0],
    areaM2: Math.round(placementArea * 10) / 10,
    researchGrant: 20,
  };
}

export function redeemBootstrap(
  state: NewGameState,
  voucher: BootstrapVoucher,
): { state: NewGameState; events: NewGameEvent[] } {
  if (state.bootstrapRedeemed) {
    return { state, events: [] };
  }

  const research = credit(state.planning.research, voucher.researchGrant, {
    gameId: 'orchade',
    action: 'starter_bootstrap',
    tick: state.day,
    evidenceRef: `bootstrap:${state.runId}`,
  });

  return {
    state: {
      ...state,
      bootstrapRedeemed: true,
      planning: { ...state.planning, research },
    },
    events: [{
      type: 'BOOTSTRAP_REDEEMED',
      day: state.day,
      payload: {
        starterCropId: voucher.starterCropId,
        areaM2: voucher.areaM2,
        researchGrant: voucher.researchGrant,
        runId: state.runId,
      },
    }],
  };
}
