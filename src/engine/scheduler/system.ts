import type { SimulationPhase } from './phases';
import type { CommandBuffer } from '../commands/commandBuffer';
import type { EngineEventBus } from '../events/eventBus';
import type { DeterministicRandom } from '../random/rng';
import type { SimulationWorld } from '../world/state/worldState';

export type SchedulerUpdateContext = { tick: number; deltaMs: number; paused: boolean; step: boolean; seed: string; flags: Record<string, boolean>; world?: SimulationWorld; events?: EngineEventBus; random?: DeterministicRandom; commands?: CommandBuffer };
export type SimulationSystem = { name: string; phase: SimulationPhase; priority: number; dependencies?: string[]; enabled?: boolean; update(context: SchedulerUpdateContext): void | Promise<void> };
export type RegisteredSystem = SimulationSystem & { enabled: boolean; version: number };
