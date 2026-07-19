export type ClockStep = { tick: number; deltaMs: number; alpha: number };

export class SimulationClock {
  private accumulatorMs = 0;
  private tick = 0;

  constructor(readonly fixedDeltaMs = 1000 / 30, readonly maxSubSteps = 5) {}

  advance(elapsedMs: number): ClockStep[] {
    this.accumulatorMs += Math.min(elapsedMs, this.fixedDeltaMs * this.maxSubSteps);
    const steps: ClockStep[] = [];
    while (this.accumulatorMs >= this.fixedDeltaMs && steps.length < this.maxSubSteps) {
      this.accumulatorMs -= this.fixedDeltaMs;
      this.tick += 1;
      steps.push({ tick: this.tick, deltaMs: this.fixedDeltaMs, alpha: this.accumulatorMs / this.fixedDeltaMs });
    }
    return steps;
  }

  currentTick(): number { return this.tick; }
  reset(tick = 0): void { this.tick = tick; this.accumulatorMs = 0; }
}
