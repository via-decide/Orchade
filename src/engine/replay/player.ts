import type { ReplayFrame } from './timeline';
export class ReplayPlayer { private cursor = 0; constructor(private frames: ReplayFrame[]) {} next(): ReplayFrame | undefined { return this.frames[this.cursor++]; } rewind(tick: number): void { this.cursor = Math.max(0, this.frames.findIndex(f => f.tick >= tick)); } }
