export type EntityId = string;
export type ComponentType = string;
export type Component = Record<string, unknown>;

export type EntityRecord = {
  id: EntityId;
  archetype: string;
  enabled: boolean;
  createdTick: number;
  updatedTick: number;
};
