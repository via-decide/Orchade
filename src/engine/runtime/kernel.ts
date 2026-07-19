import { CommandBuffer, type SimulationCommand } from '../commands/commandBuffer';
import { EngineEventBus } from '../events/eventBus';
import { Metrics } from '../profiler/metrics';
import { ReplayRecorder } from '../replay/recorder';
import { checksum } from '../replay/checksum';
import { DeterministicRandom, hashSeed } from '../random/rng';
import { SimulationScheduler } from '../scheduler/scheduler';
import { SimulationClock } from './clock';

export type RuntimeHooks = {
  beforeTick?(tick: number): void;
  afterTick?(tick: number): void;
  onDesync?(tick: number, expected: string, actual: string): void;
};

export type EngineRuntimeOptions = {
  seed: string;
  fixedDeltaMs?: number;
  hooks?: RuntimeHooks;
};

export class EngineRuntimeKernel {
  readonly scheduler = new SimulationScheduler();
  readonly events = new EngineEventBus();
  readonly commands = new CommandBuffer();
  readonly replay = new ReplayRecorder();
  readonly metrics = new Metrics();
  readonly clock: SimulationClock;
  readonly random: DeterministicRandom;
  private paused = false;

  constructor(private options: EngineRuntimeOptions) {
    this.clock = new SimulationClock(options.fixedDeltaMs);
    this.random = new DeterministicRandom(hashSeed(options.seed));
  }

  enqueueCommand<T>(command: SimulationCommand<T>): void {
    this.commands.enqueue(command);
  }

  pause(): void { this.paused = true; this.scheduler.pause(); }
  resume(): void { this.paused = false; this.scheduler.resume(); }

  async advance(elapsedMs: number): Promise<number> {
    if (this.paused) return 0;
    const steps = this.clock.advance(elapsedMs);
    for (const step of steps) await this.executeTick(step.tick, step.deltaMs);
    return steps.length;
  }

  async singleStep(): Promise<void> {
    await this.executeTick(this.clock.currentTick() + 1, this.clock.fixedDeltaMs);
    this.clock.reset(this.clock.currentTick() + 1);
  }

  private async executeTick(tick: number, deltaMs: number): Promise<void> {
    const started = performance.now();
    this.options.hooks?.beforeTick?.(tick);
    const commands = this.commands.drain(tick);
    commands.forEach(command => this.events.queueEvent('CommandIssued', command, tick));
    const eventsBefore = this.events.inspect({ sinceTick: tick });
    await this.scheduler.tick({ deltaMs, seed: this.options.seed, flags: {} });
    const flushed = this.events.flush(tick);
    const events = [...eventsBefore, ...flushed];
    const frameChecksum = checksum({ tick, commands, events, rng: this.random.snapshot() });
    this.replay.record({ tick, input: [], commands, events, randomSeed: String(this.random.snapshot()), checksum: frameChecksum });
    this.metrics.record({ name: 'tick.durationMs', value: performance.now() - started });
    this.options.hooks?.afterTick?.(tick);
  }
}
