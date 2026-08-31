export type ResearchTick = number;

export interface CreditSource {
  gameId: string;
  action: string;
  tick: ResearchTick;
  evidenceRef?: string;
}

export interface DebitReason {
  gameId: string;
  action: string;
  contentId: string;
  tick: ResearchTick;
}

export interface LedgerEntry {
  id: string;
  sequence: number;
  type: 'credit' | 'debit';
  amount: number;
  source?: CreditSource;
  reason?: DebitReason;
}

export type UnlockCategory = 'crop' | 'livestock' | 'water_upgrade' | 'energy_upgrade';
export type UnlockSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface UnlockableContent {
  contentId: string;
  category: UnlockCategory;
  displayName: string;
  cost: number;
  requiredLevel: 1 | 2 | 3;
  validSeasons?: UnlockSeason[];
  prerequisites?: string[];
}

export interface UnlockRecord {
  contentId: string;
  unlockedAt: number;
  cost: number;
}
