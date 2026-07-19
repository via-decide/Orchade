export type ChunkState = 'Loaded' | 'Visible' | 'Active' | 'Sleeping' | 'Unloaded';
export type Chunk = { id: string; regionId: string; state: ChunkState; entityCount: number; dirty: boolean };
