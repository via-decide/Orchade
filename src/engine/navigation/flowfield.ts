import type { GridPoint } from './grid';
export type FlowField = Map<string, GridPoint>;
export const flowKey = (point: GridPoint) => `${point.x},${point.y}`;
