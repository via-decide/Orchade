import { advanceEconomy, initialEconomyState, recordProduction, registerMarketGood } from '../api';

let economy = registerMarketGood(initialEconomyState, { itemId: 'Basic-crop', basePrice: 20, supply: 10, demand: 30, merchantStock: 0, imports: 0, exports: 0, volatility: 0.5 });
economy = advanceEconomy(economy, 'winter', 1);
if (economy.goods['Basic-crop'].currentPrice <= 20) throw new Error('winter scarcity should raise crop price');
economy = recordProduction(economy, 'Basic-crop', 100);
economy = advanceEconomy(economy, 'spring', 2);
if (!economy.events.some(event => event.type === 'surplus')) throw new Error('large production should create surplus event');
