import type { SiteAccessPoint, SiteAccessRequirement, SiteGeometry, SiteModuleDefinition, SitePoint2D } from '../public';
import { isPointInPolygon, moduleFootprintPolygon } from './geometry';
import { moduleTemplate } from './moduleCatalog';

/**
 * Deterministic grid/graph reachability (Part D). This is intentionally simple:
 * a fixed-resolution grid flood fill from access points across non-blocked,
 * in-boundary cells. It is not vehicle simulation or road engineering.
 */
const GRID_RESOLUTION_M = 0.5;
const MAX_GRID_CELLS = 40_000;

const COMPATIBLE_ACCESS_POINTS: Record<SiteAccessRequirement, SiteAccessPoint['type'][]> = {
  pedestrian: ['pedestrian', 'main-gate'],
  operator: ['pedestrian', 'main-gate', 'service-access'],
  maintenance: ['pedestrian', 'main-gate', 'service-access'],
  service: ['service-access', 'main-gate', 'vehicle'],
  vehicle: ['vehicle', 'main-gate'],
};

interface GridBounds {
  minX: number;
  minY: number;
  cols: number;
  rows: number;
  resolutionM: number;
}

function computeGridBounds(geometry: SiteGeometry): GridBounds {
  const xs = geometry.boundaryPolygon.map(p => p.xM);
  const ys = geometry.boundaryPolygon.map(p => p.yM);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let resolutionM = GRID_RESOLUTION_M;
  let cols = Math.ceil((maxX - minX) / resolutionM) + 1;
  let rows = Math.ceil((maxY - minY) / resolutionM) + 1;
  while (cols * rows > MAX_GRID_CELLS) {
    resolutionM *= 2;
    cols = Math.ceil((maxX - minX) / resolutionM) + 1;
    rows = Math.ceil((maxY - minY) / resolutionM) + 1;
  }
  return { minX, minY, cols, rows, resolutionM };
}

function cellCenter(bounds: GridBounds, col: number, row: number): SitePoint2D {
  return { xM: bounds.minX + (col + 0.5) * bounds.resolutionM, yM: bounds.minY + (row + 0.5) * bounds.resolutionM };
}

function cellOf(bounds: GridBounds, point: SitePoint2D): { col: number; row: number } {
  const col = Math.min(bounds.cols - 1, Math.max(0, Math.floor((point.xM - bounds.minX) / bounds.resolutionM)));
  const row = Math.min(bounds.rows - 1, Math.max(0, Math.floor((point.yM - bounds.minY) / bounds.resolutionM)));
  return { col, row };
}

/**
 * True if `module` can be reached by walking/driving from at least one access point
 * whose type is compatible with the module's access requirement, without crossing
 * a non-traversable enabled module footprint or leaving the site boundary.
 * Modules with no access requirement are always considered reachable.
 */
export function isModuleReachable(
  geometry: SiteGeometry,
  modules: SiteModuleDefinition[],
  target: SiteModuleDefinition,
): boolean {
  const requirement = moduleTemplate(target.moduleType).accessRequirement;
  if (!requirement) return true;
  const compatibleTypes = COMPATIBLE_ACCESS_POINTS[requirement];
  const accessPoints = geometry.accessPoints.filter(point => compatibleTypes.includes(point.type));
  if (accessPoints.length === 0) return false;

  const bounds = computeGridBounds(geometry);
  const blocked = new Set<string>();
  modules
    .filter(module => module.enabled && module.moduleId !== target.moduleId && !moduleTemplate(module.moduleType).isTraversable)
    .forEach(module => {
      const footprint = moduleFootprintPolygon(module.geometry, module.rotationDegrees);
      for (let row = 0; row < bounds.rows; row += 1) {
        for (let col = 0; col < bounds.cols; col += 1) {
          const key = `${col},${row}`;
          if (blocked.has(key)) continue;
          if (isPointInPolygon(cellCenter(bounds, col, row), footprint)) blocked.add(key);
        }
      }
    });

  const insideBoundary = (col: number, row: number): boolean => isPointInPolygon(cellCenter(bounds, col, row), geometry.boundaryPolygon);
  const targetFootprint = moduleFootprintPolygon(target.geometry, target.rotationDegrees);
  const isAdjacentToTarget = (col: number, row: number): boolean => {
    const center = cellCenter(bounds, col, row);
    return isPointInPolygon(center, targetFootprint) || targetFootprint.some(corner => {
      const dx = corner.xM - center.xM;
      const dy = corner.yM - center.yM;
      return Math.sqrt(dx * dx + dy * dy) <= bounds.resolutionM * 1.5;
    });
  };

  const visited = new Set<string>();
  const queue: Array<{ col: number; row: number }> = [];
  accessPoints.forEach(point => {
    const start = cellOf(bounds, point.position);
    const key = `${start.col},${start.row}`;
    if (!visited.has(key)) { visited.add(key); queue.push(start); }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (isAdjacentToTarget(current.col, current.row)) return true;
    const neighbors = [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ];
    for (const neighbor of neighbors) {
      if (neighbor.col < 0 || neighbor.row < 0 || neighbor.col >= bounds.cols || neighbor.row >= bounds.rows) continue;
      const key = `${neighbor.col},${neighbor.row}`;
      if (visited.has(key)) continue;
      if (blocked.has(key)) continue;
      if (!insideBoundary(neighbor.col, neighbor.row)) continue;
      visited.add(key);
      queue.push(neighbor);
    }
  }
  return false;
}
