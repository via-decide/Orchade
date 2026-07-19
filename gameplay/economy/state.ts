export type EconomyStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type MarketGood = {
  itemId: string;
  basePrice: number;
  supply: number;
  demand: number;
  merchantStock: number;
  imports: number;
  exports: number;
  volatility: number;
  currentPrice: number;
};

export type EconomyEvent = { tick: number; type: 'shortage' | 'surplus' | 'price-shift'; itemId: string; message: string };

export type EconomyState = {
  module: 'economy';
  status: EconomyStatus;
  updatedAt: string | null;
  currencySupply: number;
  inflationGuard: number;
  goods: Record<string, MarketGood>;
  events: EconomyEvent[];
};

export const initialEconomyState: EconomyState = {
  module: 'economy',
  status: 'in-progress',
  updatedAt: null,
  currencySupply: 10000,
  inflationGuard: 1,
  goods: {},
  events: [],
};
