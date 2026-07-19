export type Stimulus = { kind: 'vision' | 'hearing'; sourceId: string; strength: number; tick: number; data?: unknown };
export class Perception { private stimuli: Stimulus[] = []; sense(stimulus: Stimulus): void { this.stimuli.push(stimulus); } recent(tick: number, window = 60): Stimulus[] { return this.stimuli.filter(s => tick - s.tick <= window); } }
