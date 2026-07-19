import type { GridPoint } from './grid';
import { NavigationGrid } from './grid';
import { PriorityQueue } from './priorityQueue';

const key = (point: GridPoint) => `${point.x},${point.y}`;
const heuristic = (left: GridPoint, right: GridPoint) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y);

export function findAStarPath(grid: NavigationGrid, start: GridPoint, goal: GridPoint): GridPoint[] {
  const frontier = new PriorityQueue<GridPoint>();
  const cameFrom = new Map<string, GridPoint>();
  const costs = new Map<string, number>([[key(start), 0]]);
  frontier.push(start, 0);

  while (frontier.size) {
    const current = frontier.pop()!;
    if (key(current) === key(goal)) return reconstruct(cameFrom, current);
    for (const next of grid.neighbors(current)) {
      const nextCost = (costs.get(key(current)) ?? 0) + (grid.cell(next)?.cost ?? 1);
      if (nextCost >= (costs.get(key(next)) ?? Infinity)) continue;
      costs.set(key(next), nextCost);
      cameFrom.set(key(next), current);
      frontier.push(next, nextCost + heuristic(next, goal));
    }
  }

  return [];
}

function reconstruct(cameFrom: Map<string, GridPoint>, current: GridPoint): GridPoint[] {
  const path = [current];
  while (cameFrom.has(key(current))) {
    current = cameFrom.get(key(current))!;
    path.unshift(current);
  }
  return path;
}
