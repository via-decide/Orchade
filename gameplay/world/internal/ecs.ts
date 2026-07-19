import type { FarmPosition, WorldState } from '../state';

export type EntityKind = 'player' | 'npc' | 'animal' | 'wildlife' | 'monster' | 'vehicle' | 'projectile' | 'item' | 'decoration';
export type ComponentKind = 'transform' | 'movement' | 'health' | 'inventory' | 'ai' | 'interaction' | 'animation' | 'ecology';

export type TransformComponent = { kind: 'transform'; regionId: string; position: FarmPosition; facing?: 'north' | 'east' | 'south' | 'west' };
export type MovementComponent = { kind: 'movement'; speed: number; path: FarmPosition[]; destination?: FarmPosition };
export type HealthComponent = { kind: 'health'; current: number; max: number };
export type InventoryComponent = { kind: 'inventory'; containerId: string };
export type AIComponent = { kind: 'ai'; behavior: 'villager' | 'wander' | 'graze' | 'idle'; currentGoal?: string; lastDecision?: string };
export type InteractionComponent = { kind: 'interaction'; actions: string[] };
export type AnimationComponent = { kind: 'animation'; state: 'idle' | 'walk' | 'work' | 'sleep' | 'eat' | 'socialize' };
export type EcologyComponent = { kind: 'ecology'; species: string; hunger: number; thirst: number; fear: number; breedingCooldown: number; owner?: string };

export type EntityComponent = TransformComponent | MovementComponent | HealthComponent | InventoryComponent | AIComponent | InteractionComponent | AnimationComponent | EcologyComponent;
export type Entity = { id: string; kind: EntityKind; name: string; components: Partial<Record<ComponentKind, EntityComponent>>; tags: string[]; createdAt: number };
export type EntityPatch = { id?: string; kind: EntityKind; name: string; components: EntityComponent[]; tags?: string[] };

export const createEntity = (patch: EntityPatch, tick = 0): Entity => ({
  id: patch.id ?? `entity-${patch.kind}-${tick}-${patch.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  kind: patch.kind,
  name: patch.name,
  tags: patch.tags ?? [],
  createdAt: tick,
  components: patch.components.reduce<Entity['components']>((components, component) => ({ ...components, [component.kind]: component }), {}),
});

export const upsertEntity = (world: WorldState, entity: Entity): WorldState => ({
  ...world,
  entities: { ...world.entities, [entity.id]: entity },
  updatedAt: new Date().toISOString(),
});

export const getComponent = <T extends EntityComponent>(entity: Entity, kind: T['kind']): T | undefined => entity.components[kind] as T | undefined;
