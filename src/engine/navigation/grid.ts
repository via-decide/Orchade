export type GridPoint = { x: number; y: number };
export type Terrain = 'plain' | 'road' | 'bridge' | 'water' | 'mountain' | 'blocked';
export type GridCell = { terrain: Terrain; cost: number; blocked?: boolean; dynamicBlocked?: boolean };
export class NavigationGrid {
  constructor(readonly width: number, readonly height: number, private cells: GridCell[] = []) {
    if (!cells.length) this.cells = Array.from({ length: width * height }, () => ({ terrain: 'plain', cost: 1 }));
  }
  inBounds(p: GridPoint): boolean { return p.x >= 0 && p.y >= 0 && p.x < this.width && p.y < this.height; }
  index(p: GridPoint): number { return p.y * this.width + p.x; }
  cell(p: GridPoint): GridCell | undefined { return this.inBounds(p) ? this.cells[this.index(p)] : undefined; }
  setCell(p: GridPoint, cell: GridCell): void { if (this.inBounds(p)) this.cells[this.index(p)] = cell; }
  neighbors(p: GridPoint): GridPoint[] { return [{x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1}].filter(n => { const c = this.cell(n); return c && !c.blocked && !c.dynamicBlocked && c.terrain !== 'blocked'; }); }
}
