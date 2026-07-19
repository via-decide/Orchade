import type { Component, ComponentType, EntityId, EntityRecord } from './entity';

export class EntityRegistry {
  private sequence = 0;
  private entities = new Map<EntityId, EntityRecord>();
  private components = new Map<ComponentType, Map<EntityId, Component>>();

  create(archetype: string, tick = 0, id = `${archetype}-${++this.sequence}`): EntityRecord {
    const entity = { id, archetype, enabled: true, createdTick: tick, updatedTick: tick };
    this.entities.set(id, entity);
    return entity;
  }

  destroy(id: EntityId): void {
    this.entities.delete(id);
    this.components.forEach(store => store.delete(id));
  }

  addComponent<T extends Component>(id: EntityId, type: ComponentType, component: T, tick = 0): void {
    if (!this.entities.has(id)) throw new Error(`Cannot add ${type} to missing entity ${id}`);
    const store = this.components.get(type) ?? new Map<EntityId, Component>();
    store.set(id, structuredClone(component));
    this.components.set(type, store);
    this.touch(id, tick);
  }

  getComponent<T extends Component>(id: EntityId, type: ComponentType): T | undefined {
    return this.components.get(type)?.get(id) as T | undefined;
  }

  query(...types: ComponentType[]): EntityId[] {
    return [...this.entities.keys()].filter(id => types.every(type => this.components.get(type)?.has(id)));
  }

  snapshot(): unknown {
    return {
      sequence: this.sequence,
      entities: [...this.entities.entries()],
      components: [...this.components.entries()].map(([type, store]) => [type, [...store.entries()]]),
    };
  }

  restore(snapshot: unknown): void {
    const data = snapshot as { sequence: number; entities: [EntityId, EntityRecord][]; components: [ComponentType, [EntityId, Component][]][] };
    this.sequence = data.sequence;
    this.entities = new Map(data.entities);
    this.components = new Map(data.components.map(([type, entries]) => [type, new Map(entries)]));
  }

  private touch(id: EntityId, tick: number): void {
    const entity = this.entities.get(id);
    if (entity) entity.updatedTick = tick;
  }
}
