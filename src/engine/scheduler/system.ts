import type { SimulationPhase } from './phases';

export type SchedulerUpdateContext = {
  tick: number;
  deltaMs: number;
  paused: boolean;
  step: boolean;
  seed: string;
  flags: Record<string, boolean>;
};

export type SimulationSystem = {
  name: string;
  phase: SimulationPhase;
  priority: number;
  dependencies?: string[];
  enabled?: boolean;
  update(context: SchedulerUpdateContext): void | Promise<void>;
};

export type RegisteredSystem = SimulationSystem & {
  enabled: boolean;
  version: number;
};
