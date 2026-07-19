import type { ReplaySnapshot } from './snapshot';
import type { ReplayFrame } from './timeline';

export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private snapshots: ReplaySnapshot[] = [];
  constructor(private snapshotIntervalTicks = 300) {}
  record(frame: ReplayFrame, state?: unknown): void { this.frames.push(frame); if (state !== undefined && frame.tick % this.snapshotIntervalTicks === 0 && frame.checksum) this.snapshots.push({ tick: frame.tick, state, checksum: frame.checksum }); }
  export(): readonly ReplayFrame[] { return this.frames; }
  checkpoints(): readonly ReplaySnapshot[] { return this.snapshots; }
  nearestCheckpoint(tick: number): ReplaySnapshot | undefined { return [...this.snapshots].reverse().find(snapshot => snapshot.tick <= tick); }
}
