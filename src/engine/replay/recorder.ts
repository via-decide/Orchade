import type { ReplayFrame } from './timeline';
export class ReplayRecorder { private frames: ReplayFrame[] = []; record(frame: ReplayFrame): void { this.frames.push(frame); } export(): readonly ReplayFrame[] { return this.frames; } }
