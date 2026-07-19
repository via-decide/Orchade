import { EventBus } from './events';

export type SimulationPhase =
  | 'boot'
  | 'main-menu'
  | 'world-generation'
  | 'player-spawn'
  | 'simulation-tick'
  | 'input'
  | 'gameplay-systems'
  | 'render'
  | 'autosave'
  | 'shutdown';

export type SimulationContext = {
  tick: number;
  day: number;
  deltaMs: number;
  events: EventBus;
  worldSeed: string;
  flags: Record<string, boolean>;
};

export interface GameplaySystem {
  id: string;
  order: number;
  update(context: SimulationContext): void;
}

export type DataPack<T> = {
  schemaVersion: number;
  entries: T[];
};
