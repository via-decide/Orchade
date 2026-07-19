import { PHASE_INDEX } from './phases';
import type { RegisteredSystem, SchedulerUpdateContext, SimulationSystem } from './system';
import { SimulationTimeline } from './timeline';

export class SimulationScheduler {
  private systems = new Map<string, RegisteredSystem>();
  private paused = false;
  private tickNumber = 0;
  readonly timeline = new SimulationTimeline();

  register(system: SimulationSystem): void {
    if (!PHASE_INDEX.has(system.phase)) throw new Error(`Unknown simulation phase: ${system.phase}`);
    const previous = this.systems.get(system.name);
    this.systems.set(system.name, { ...system, enabled: system.enabled ?? true, version: (previous?.version ?? 0) + 1 });
    this.validateDependencies();
  }

  hotReload(system: SimulationSystem): void {
    this.register(system);
  }

  setEnabled(name: string, enabled: boolean): void {
    const system = this.systems.get(name);
    if (!system) throw new Error(`Cannot toggle missing system: ${name}`);
    this.systems.set(name, { ...system, enabled });
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }

  async step(context: Omit<SchedulerUpdateContext, 'tick' | 'paused' | 'step'>): Promise<void> {
    await this.runTick({ ...context, tick: this.tickNumber + 1, paused: this.paused, step: true });
  }

  async tick(context: Omit<SchedulerUpdateContext, 'tick' | 'paused' | 'step'>): Promise<void> {
    if (this.paused) return;
    await this.runTick({ ...context, tick: this.tickNumber + 1, paused: false, step: false });
  }

  orderedSystems(): RegisteredSystem[] {
    return [...this.systems.values()].sort((left, right) => {
      const phaseDelta = (PHASE_INDEX.get(left.phase) ?? 0) - (PHASE_INDEX.get(right.phase) ?? 0);
      return phaseDelta || left.priority - right.priority || left.name.localeCompare(right.name);
    });
  }

  validateDependencies(): void {
    for (const system of this.systems.values()) {
      for (const dependency of system.dependencies ?? []) {
        if (!this.systems.has(dependency)) throw new Error(`${system.name} depends on missing system ${dependency}`);
      }
    }
  }

  private async runTick(context: SchedulerUpdateContext): Promise<void> {
    this.tickNumber = context.tick;
    for (const system of this.orderedSystems()) {
      if (!system.enabled) continue;
      const started = performance.now();
      await system.update(context);
      this.timeline.record({ name: system.name, phase: system.phase, priority: system.priority, durationMs: performance.now() - started, tick: context.tick });
    }
  }
}
