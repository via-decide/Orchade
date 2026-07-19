import type { SimulationPhase } from './phases';

export type SystemTiming = {
  name: string;
  phase: SimulationPhase;
  priority: number;
  durationMs: number;
  tick: number;
};

export class SimulationTimeline {
  private entries: SystemTiming[] = [];

  record(entry: SystemTiming): void {
    this.entries.push(entry);
    if (this.entries.length > 2_000) this.entries.shift();
  }

  latest(): readonly SystemTiming[] {
    return this.entries;
  }

  byTick(tick: number): readonly SystemTiming[] {
    return this.entries.filter(entry => entry.tick === tick);
  }
}
