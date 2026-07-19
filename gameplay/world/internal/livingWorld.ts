import { advanceEconomy, type EconomyState } from '../../economy/api';
import { advanceNpcRoutines, type NpcState } from '../../npc/api';
import { createEntity, getComponent, upsertEntity, type AIComponent, type EcologyComponent, type Entity } from './ecs';
import { simulateWorldTick, type HarvestResult } from './simulation';
import type { WorldState } from '../state';

export type LivingWorldState = { schemaVersion: 2; world: WorldState; npc: NpcState; economy: EconomyState };

export const attachDefaultLivingEntities = (world: WorldState): WorldState => {
  const entities: Entity[] = [
    createEntity({ id: 'entity-player', kind: 'player', name: 'Player', tags: ['player'], components: [{ kind: 'transform', regionId: 'farmstead', position: { x: 0, y: 0 }, facing: 'south' }, { kind: 'interaction', actions: ['plant', 'harvest', 'talk'] }, { kind: 'animation', state: 'idle' }] }, world.clock.tick),
    createEntity({ id: 'entity-animal-hen-1', kind: 'animal', name: 'Henrietta', tags: ['farm-animal'], components: [{ kind: 'transform', regionId: 'farmstead', position: { x: 1, y: 1 } }, { kind: 'ai', behavior: 'graze', currentGoal: 'forage' }, { kind: 'ecology', species: 'chicken', hunger: 20, thirst: 15, fear: 5, breedingCooldown: 72 }] }, world.clock.tick),
    createEntity({ id: 'entity-wildlife-rabbit-1', kind: 'wildlife', name: 'Cottontail', tags: ['wildlife'], components: [{ kind: 'transform', regionId: 'farmstead', position: { x: 2, y: 1 } }, { kind: 'ai', behavior: 'wander', currentGoal: 'graze' }, { kind: 'ecology', species: 'rabbit', hunger: 30, thirst: 20, fear: 35, breedingCooldown: 96 }] }, world.clock.tick),
  ];
  return entities.reduce((current, entity) => current.entities[entity.id] ? current : upsertEntity(current, entity), world);
};

const advanceEcology = (world: WorldState): WorldState => {
  const entities = Object.fromEntries(Object.entries(world.entities).map(([id, entity]) => {
    const ecology = getComponent<EcologyComponent>(entity, 'ecology');
    const ai = getComponent<AIComponent>(entity, 'ai');
    if (!ecology || !ai) return [id, entity];
    const rainRelief = world.weather.current === 'rain' ? -4 : 1;
    const hunger = Math.min(100, Math.max(0, ecology.hunger + (ai.behavior === 'graze' || ai.behavior === 'wander' ? -2 : 1)));
    const thirst = Math.min(100, Math.max(0, ecology.thirst + rainRelief));
    const fear = Math.min(100, Math.max(0, ecology.fear + (world.weather.current === 'storm' ? 8 : -1)));
    const breedingCooldown = Math.max(0, ecology.breedingCooldown - 1);
    return [id, { ...entity, components: { ...entity.components, ecology: { ...ecology, hunger, thirst, fear, breedingCooldown }, ai: { ...ai, lastDecision: fear > 60 ? 'seek shelter' : hunger > 70 ? 'forage' : ai.currentGoal } } } satisfies Entity];
  }));
  const farmstead = world.regions.farmstead;
  const waterDelta = world.weather.current === 'rain' || world.weather.current === 'storm' ? 3 : -1;
  const forageDelta = world.clock.tick % world.clock.ticksPerDay === 0 ? 2 : 0;
  return {
    ...world,
    entities,
    regions: { ...world.regions, farmstead: { ...farmstead, resources: { ...farmstead.resources, water: Math.max(0, farmstead.resources.water + waterDelta), forage: Math.max(0, farmstead.resources.forage + forageDelta) } } },
  };
};

export const simulateLivingWorldTick = (state: LivingWorldState): LivingWorldState => {
  const world = advanceEcology(attachDefaultLivingEntities(simulateWorldTick(state.world)));
  const hour = world.clock.tick % world.clock.ticksPerDay;
  return { schemaVersion: 2, world, npc: advanceNpcRoutines(state.npc, hour, world.weather.current, world.clock.season), economy: advanceEconomy(state.economy, world.clock.season, world.clock.tick) };
};

export const recordHarvestInEconomy = (state: LivingWorldState, harvest: HarvestResult): LivingWorldState => {
  if (!harvest.itemId || harvest.quantity <= 0) return state;
  return { ...state, economy: { ...state.economy, goods: { ...state.economy.goods, [harvest.itemId]: state.economy.goods[harvest.itemId] ? { ...state.economy.goods[harvest.itemId], supply: state.economy.goods[harvest.itemId].supply + harvest.quantity } : { itemId: harvest.itemId, basePrice: 25, supply: harvest.quantity, demand: 10, merchantStock: 0, imports: 0, exports: 0, volatility: 0.2, currentPrice: 25 } } } };
};

export const migrateWorldSaveToV2 = (save: { schemaVersion: 1; world: WorldState } | LivingWorldState, npc: NpcState, economy: EconomyState): LivingWorldState => {
  if (save.schemaVersion === 2) return save;
  return { schemaVersion: 2, world: attachDefaultLivingEntities(save.world), npc, economy };
};
