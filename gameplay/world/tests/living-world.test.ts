import { initialEconomyState, registerMarketGood } from '../../economy/api';
import { addNpc, createVillager, initialNpcState } from '../../npc/api';
import { attachDefaultLivingEntities, createFarmWorld, migrateWorldSaveToV2, simulateLivingWorldTick } from '../api';

let world = attachDefaultLivingEntities(createFarmWorld(3, 3, 99));
let npc = addNpc(initialNpcState, createVillager('mara', 'Mara', 'farmer', 'mara-cottage'));
let economy = registerMarketGood(initialEconomyState, { itemId: 'Basic-crop', basePrice: 20, supply: 5, demand: 25, merchantStock: 2, imports: 0, exports: 1, volatility: 0.5 });
let living = { schemaVersion: 2 as const, world, npc, economy };

for (let index = 0; index < 30; index += 1) living = simulateLivingWorldTick(living);

if (!living.world.entities['entity-animal-hen-1']) throw new Error('animal entity missing');
if (!living.world.entities['entity-wildlife-rabbit-1']) throw new Error('wildlife entity missing');
if (living.npc.profiles.mara.currentActivity === 'sleep') throw new Error('NPC schedule did not advance');
if (living.economy.goods['Basic-crop'].currentPrice <= 20) throw new Error('shortage should increase price');
if (living.world.regions.farmstead.resources.water === world.regions.farmstead.resources.water && living.world.weather.current === 'rain') throw new Error('rain should affect ecology resources');

const migrated = migrateWorldSaveToV2({ schemaVersion: 1 as const, world }, npc, economy);
if (migrated.schemaVersion !== 2 || !migrated.world.entities['entity-player']) throw new Error('v1 migration should attach ECS entities');
