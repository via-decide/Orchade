import type { LedgerEntry, UnlockRecord } from './public';

export interface ResearchCreditsState {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  nextSequence: number;
  ledger: LedgerEntry[];
  unlocks: UnlockRecord[];
}

export const initialResearchCreditsState: ResearchCreditsState = {
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
  nextSequence: 0,
  ledger: [],
  unlocks: [],
};

export function createResearchCreditsState(unlocks: UnlockRecord[] = []): ResearchCreditsState {
  return { ...initialResearchCreditsState, ledger: [], unlocks: unlocks.map(item => ({ ...item })) };
}
