export class DeterministicRandom {
  private state: number;
  constructor(seed = 1) { this.state = seed >>> 0 || 1; }
  next(): number { this.state = (1664525 * this.state + 1013904223) >>> 0; return this.state / 0x100000000; }
  integer(min: number, max: number): number { return Math.floor(this.next() * (max - min + 1)) + min; }
  snapshot(): number { return this.state; }
  restore(state: number): void { this.state = state >>> 0 || 1; }
}

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) { hash ^= seed.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
