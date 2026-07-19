export type MemoryRecord = { type: string; value: unknown; tick: number; strength: number };
export class Memory { private records: MemoryRecord[] = []; remember(record: MemoryRecord): void { this.records.push(record); } recall(type?: string): readonly MemoryRecord[] { return type ? this.records.filter(r => r.type === type) : this.records; } }
