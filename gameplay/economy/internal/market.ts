import { initialEconomyState, type EconomyEvent, type EconomyState, type MarketGood } from '../state';
import type { Season } from '../../world/api';

export const registerMarketGood = (state: EconomyState = initialEconomyState, good: Omit<MarketGood, 'currentPrice'> & { currentPrice?: number }): EconomyState => ({
  ...state,
  goods: { ...state.goods, [good.itemId]: { ...good, currentPrice: good.currentPrice ?? good.basePrice } },
  updatedAt: new Date().toISOString(),
});

const seasonDemand = (season: Season, itemId: string) => {
  if (season === 'winter' && itemId.includes('crop')) return 1.25;
  if (season === 'spring' && itemId.includes('seed')) return 1.2;
  return 1;
};

export const advanceEconomy = (state: EconomyState, season: Season, tick: number): EconomyState => {
  const events: EconomyEvent[] = [];
  const goods = Object.fromEntries(Object.entries(state.goods).map(([itemId, good]) => {
    const supply = Math.max(0, good.supply + good.imports - good.exports + Math.floor(good.merchantStock * 0.02));
    const demand = Math.max(1, good.demand * seasonDemand(season, itemId));
    const scarcity = demand / Math.max(1, supply);
    const targetPrice = good.basePrice * Math.min(3, Math.max(0.35, scarcity)) * state.inflationGuard;
    const currentPrice = Number((good.currentPrice + (targetPrice - good.currentPrice) * good.volatility).toFixed(2));
    if (scarcity > 1.5) events.push({ tick, type: 'shortage', itemId, message: `${itemId} shortage is pushing prices upward.` });
    if (scarcity < 0.55) events.push({ tick, type: 'surplus', itemId, message: `${itemId} surplus is depressing prices.` });
    return [itemId, { ...good, supply, demand, currentPrice } satisfies MarketGood];
  }));
  return { ...state, goods, events: [...events, ...state.events].slice(0, 50), updatedAt: new Date().toISOString() };
};

export const recordProduction = (state: EconomyState, itemId: string, quantity: number): EconomyState => {
  const good = state.goods[itemId];
  if (!good) return state;
  return { ...state, goods: { ...state.goods, [itemId]: { ...good, supply: good.supply + quantity, merchantStock: good.merchantStock + Math.floor(quantity / 2) } }, updatedAt: new Date().toISOString() };
};
