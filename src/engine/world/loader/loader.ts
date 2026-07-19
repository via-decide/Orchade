import type { Chunk } from '../chunks/chunk';
export type ChunkLoader = { load(id: string): Promise<Chunk>; unload(id: string): Promise<void>; save(chunk: Chunk): Promise<void> };
