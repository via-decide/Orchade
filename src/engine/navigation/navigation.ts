import { findAStarPath } from './astar';
import { NavigationGrid, type GridPoint } from './grid';
export class NavigationService {
  private cache = new Map<string, GridPoint[]>();
  constructor(private grid: NavigationGrid) {}
  path(start: GridPoint, goal: GridPoint): GridPoint[] { const id = `${start.x},${start.y}->${goal.x},${goal.y}`; if (!this.cache.has(id)) this.cache.set(id, findAStarPath(this.grid,start,goal)); return this.cache.get(id)!; }
  invalidate(): void { this.cache.clear(); }
  setDynamicObstacle(point: GridPoint, blocked: boolean): void { const cell=this.grid.cell(point); if (cell) { cell.dynamicBlocked=blocked; this.invalidate(); } }
}
