import type { CreditSource, DebitReason, LedgerEntry } from '../public';
import type { ResearchCreditsState } from '../state';

const LEDGER_LIMIT = 200;

export type DebitResult =
  | { ok: true; state: ResearchCreditsState }
  | { ok: false; error: 'insufficient' | 'invalid-amount'; state: ResearchCreditsState };

function assertSource(value: CreditSource | DebitReason): void {
  if (!value.gameId.trim() || !value.action.trim()) throw new Error('Research credit source requires gameId and action.');
  if (!Number.isInteger(value.tick) || value.tick < 0) throw new Error('Research credit tick must be a non-negative integer.');
}

function appendEntry(state: ResearchCreditsState, entry: LedgerEntry): LedgerEntry[] {
  return [...state.ledger, entry].slice(-LEDGER_LIMIT);
}

export function credit(state: ResearchCreditsState, amount: number, source: CreditSource): ResearchCreditsState {
  assertSource(source);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('Research credit amount must be a positive integer.');
  const entry: LedgerEntry = {
    id: 'research:' + source.tick + ':' + state.nextSequence + ':credit',
    sequence: state.nextSequence,
    type: 'credit',
    amount,
    source: { ...source },
  };
  return {
    ...state,
    balance: state.balance + amount,
    totalEarned: state.totalEarned + amount,
    nextSequence: state.nextSequence + 1,
    ledger: appendEntry(state, entry),
  };
}

export function debit(state: ResearchCreditsState, amount: number, reason: DebitReason): DebitResult {
  assertSource(reason);
  if (!reason.contentId.trim()) throw new Error('Research credit debit requires contentId.');
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: 'invalid-amount', state };
  if (state.balance < amount) return { ok: false, error: 'insufficient', state };
  const entry: LedgerEntry = {
    id: 'research:' + reason.tick + ':' + state.nextSequence + ':debit',
    sequence: state.nextSequence,
    type: 'debit',
    amount,
    reason: { ...reason },
  };
  return {
    ok: true,
    state: {
      ...state,
      balance: state.balance - amount,
      totalSpent: state.totalSpent + amount,
      nextSequence: state.nextSequence + 1,
      ledger: appendEntry(state, entry),
    },
  };
}

export const getBalance = (state: ResearchCreditsState): number => state.balance;
export const getAuditTrail = (state: ResearchCreditsState): LedgerEntry[] => state.ledger.map(entry => ({
  ...entry,
  source: entry.source ? { ...entry.source } : undefined,
  reason: entry.reason ? { ...entry.reason } : undefined,
}));
