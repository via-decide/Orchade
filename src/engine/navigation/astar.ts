import type { GridPoint } from './grid';
import { NavigationGrid } from './grid';
const key = (p: GridPoint) => `${p.x},${p.y}`;
const h = (a: GridPoint, b: GridPoint) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function findAStarPath(grid: NavigationGrid, start: GridPoint, goal: GridPoint): GridPoint[] {
  const open = new Set([key(start)]), came = new Map<string, GridPoint>(), g = new Map([[key(start), 0]]), points = new Map([[key(start), start]]);
  while (open.size) {
    const currentKey = [...open].sort((a,b)=>(g.get(a)??Infinity)+h(points.get(a)!,goal)-(g.get(b)??Infinity)-h(points.get(b)!,goal))[0];
    const current = points.get(currentKey)!; if (currentKey === key(goal)) return reconstruct(came, current);
    open.delete(currentKey);
    for (const next of grid.neighbors(current)) { const nk=key(next), cost=(g.get(currentKey)??0)+(grid.cell(next)?.cost??1); points.set(nk,next); if (cost < (g.get(nk)??Infinity)) { came.set(nk,current); g.set(nk,cost); open.add(nk); } }
  }
  return [];
}
function reconstruct(came: Map<string, GridPoint>, current: GridPoint): GridPoint[] { const path=[current]; while(came.has(key(current))){ current=came.get(key(current))!; path.unshift(current);} return path; }
