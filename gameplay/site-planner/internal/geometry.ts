import { acreToM2, gunthaToM2, m2ToAcre, m2ToGuntha, m2ToSqft, sqftToM2 } from '../../../src/simulation/homestead/units';
import type { SiteGeometry, SitePoint2D } from '../public';

/** Shoelace formula. Deterministic, works for any simple (non-self-intersecting) polygon, convex or not. */
export function computePolygonAreaM2(polygon: SitePoint2D[]): number {
  if (polygon.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    sum += a.xM * b.yM - b.xM * a.yM;
  }
  return Math.abs(sum) / 2;
}

function segmentsIntersect(p1: SitePoint2D, p2: SitePoint2D, p3: SitePoint2D, p4: SitePoint2D): boolean {
  const direction = (a: SitePoint2D, b: SitePoint2D, c: SitePoint2D) =>
    (c.xM - a.xM) * (b.yM - a.yM) - (b.xM - a.xM) * (c.yM - a.yM);
  const onSegment = (a: SitePoint2D, b: SitePoint2D, c: SitePoint2D) =>
    Math.min(a.xM, b.xM) - 1e-9 <= c.xM && c.xM <= Math.max(a.xM, b.xM) + 1e-9 &&
    Math.min(a.yM, b.yM) - 1e-9 <= c.yM && c.yM <= Math.max(a.yM, b.yM) + 1e-9;

  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;
  return false;
}

/** Rejects self-intersecting polygons (Part A: "Reject geometry when: polygon self-intersects"). */
export function isPolygonSelfIntersecting(polygon: SitePoint2D[]): boolean {
  const n = polygon.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i += 1) {
    const a1 = polygon[i];
    const a2 = polygon[(i + 1) % n];
    for (let j = i + 1; j < n; j += 1) {
      const shareVertex = j === i || (j + 1) % n === i || j === (i + 1) % n;
      if (shareVertex) continue;
      const b1 = polygon[j];
      const b2 = polygon[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

export function validateSiteGeometry(geometry: SiteGeometry): void {
  if (!geometry.siteGeometryId?.trim()) throw new Error('Site geometry id must be non-empty.');
  if (geometry.boundaryPolygon.length < 3) throw new Error('Invalid site geometry: boundary polygon needs at least three points.');
  if (isPolygonSelfIntersecting(geometry.boundaryPolygon)) throw new Error('Invalid site geometry: boundary polygon self-intersects.');
  const areaM2 = computePolygonAreaM2(geometry.boundaryPolygon);
  if (!(areaM2 > 0)) throw new Error('Invalid site geometry: boundary polygon area must be greater than zero.');
  geometry.excludedZones.forEach(zone => {
    if (zone.polygon.length < 3) throw new Error(`Invalid site geometry: excluded zone ${zone.id} needs at least three points.`);
    if (isPolygonSelfIntersecting(zone.polygon)) throw new Error(`Invalid site geometry: excluded zone ${zone.id} self-intersects.`);
  });
  geometry.existingStructures.forEach(structure => {
    if (structure.polygon.length < 3) throw new Error(`Invalid site geometry: existing structure ${structure.id} needs at least three points.`);
    if (isPolygonSelfIntersecting(structure.polygon)) throw new Error(`Invalid site geometry: existing structure ${structure.id} self-intersects.`);
  });
}

/** Canonical area of the site, always derived from geometry -- never accepted as raw UI input. */
export function siteAreaM2(geometry: SiteGeometry): number {
  return computePolygonAreaM2(geometry.boundaryPolygon);
}

export interface SiteAreaDisplay {
  m2: number;
  acre: number;
  sqft: number;
  guntha: number;
}

export function describeSiteArea(areaM2: number): SiteAreaDisplay {
  return {
    m2: areaM2,
    acre: m2ToAcre(areaM2),
    sqft: m2ToSqft(areaM2),
    guntha: m2ToGuntha(areaM2),
  };
}

export function gunthaToCanonicalM2(guntha: number): number {
  return gunthaToM2(guntha);
}

export function acreToCanonicalM2(acre: number): number {
  return acreToM2(acre);
}

export function sqftToCanonicalM2(sqft: number): number {
  return sqftToM2(sqft);
}

/** Point-in-polygon via ray casting. Boundary points count as inside (inclusive). */
export function isPointInPolygon(point: SitePoint2D, polygon: SitePoint2D[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (pointOnSegment(point, a, b)) return true;
    const intersects = (a.yM > point.yM) !== (b.yM > point.yM) &&
      point.xM < ((b.xM - a.xM) * (point.yM - a.yM)) / (b.yM - a.yM) + a.xM;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointOnSegment(p: SitePoint2D, a: SitePoint2D, b: SitePoint2D): boolean {
  const cross = (b.xM - a.xM) * (p.yM - a.yM) - (b.yM - a.yM) * (p.xM - a.xM);
  if (Math.abs(cross) > 1e-9) return false;
  return Math.min(a.xM, b.xM) - 1e-9 <= p.xM && p.xM <= Math.max(a.xM, b.xM) + 1e-9 &&
    Math.min(a.yM, b.yM) - 1e-9 <= p.yM && p.yM <= Math.max(a.yM, b.yM) + 1e-9;
}

/** Returns the four corners of a module footprint rectangle, rotated about its anchor corner. */
export function moduleFootprintPolygon(geometry: { anchor: SitePoint2D; widthM: number; depthM: number }, rotationDegrees: number): SitePoint2D[] {
  const corners: SitePoint2D[] = [
    { xM: 0, yM: 0 },
    { xM: geometry.widthM, yM: 0 },
    { xM: geometry.widthM, yM: geometry.depthM },
    { xM: 0, yM: geometry.depthM },
  ];
  const radians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return corners.map(corner => ({
    xM: geometry.anchor.xM + corner.xM * cos - corner.yM * sin,
    yM: geometry.anchor.yM + corner.xM * sin + corner.yM * cos,
  }));
}

/** Separating-axis test for two convex (rectangular) polygons. */
export function polygonsOverlap(a: SitePoint2D[], b: SitePoint2D[]): boolean {
  const polygons = [a, b];
  for (const polygon of polygons) {
    for (let i = 0; i < polygon.length; i += 1) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      const axis = { xM: -(p2.yM - p1.yM), yM: p2.xM - p1.xM };
      const [minA, maxA] = projectPolygon(a, axis);
      const [minB, maxB] = projectPolygon(b, axis);
      if (maxA < minB - 1e-9 || maxB < minA - 1e-9) return false;
    }
  }
  return true;
}

function projectPolygon(polygon: SitePoint2D[], axis: SitePoint2D): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  polygon.forEach(point => {
    const dot = point.xM * axis.xM + point.yM * axis.yM;
    min = Math.min(min, dot);
    max = Math.max(max, dot);
  });
  return [min, max];
}

/**
 * True only if a footprint edge properly crosses a boundary edge -- i.e.
 * passes from one side to the other -- as opposed to merely touching it or
 * running along it collinearly. A module edge placed flush against the
 * parcel boundary (a completely legal, common placement) is collinear with
 * and overlaps the boundary edge there; that must never count as "leaving"
 * the parcel the way an edge that actually crosses a concave indentation does.
 */
function segmentsProperlyCross(p1: SitePoint2D, p2: SitePoint2D, p3: SitePoint2D, p4: SitePoint2D): boolean {
  const direction = (a: SitePoint2D, b: SitePoint2D, c: SitePoint2D) =>
    (c.xM - a.xM) * (b.yM - a.yM) - (b.xM - a.xM) * (c.yM - a.yM);
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/**
 * True only if the whole footprint -- not just its vertices -- lies inside
 * the boundary. Checking vertices alone is insufficient for a concave
 * boundary: a rectangular footprint can have all four corners inside while
 * one of its edges crosses a boundary indentation and travels outside, so
 * this also rejects any footprint edge that properly crosses a boundary
 * edge. A footprint edge that merely runs along (collinear with) a boundary
 * edge -- e.g. a module built flush against the parcel line -- is not a
 * crossing and must still be accepted.
 */
export function polygonFullyInside(footprint: SitePoint2D[], boundary: SitePoint2D[]): boolean {
  if (!footprint.every(point => isPointInPolygon(point, boundary))) return false;
  for (let i = 0; i < footprint.length; i += 1) {
    const f1 = footprint[i];
    const f2 = footprint[(i + 1) % footprint.length];
    for (let j = 0; j < boundary.length; j += 1) {
      const b1 = boundary[j];
      const b2 = boundary[(j + 1) % boundary.length];
      if (segmentsProperlyCross(f1, f2, b1, b2)) return false;
    }
  }
  return true;
}

const UNION_AREA_GRID_RESOLUTION_M = 0.5;
const UNION_AREA_GRID_MAX_CELLS = 40_000;

/**
 * Grid-rasterized estimate of the union area covered by a set of footprints.
 * Deliberately not a naive sum: two legally overlapping footprints (e.g.
 * rooftop solar mounted on a residence) must not double-count the same
 * ground twice. Deliberately NOT clipped to the site boundary either: a
 * module that hangs outside the parcel must still count its full area here,
 * so INSUFFICIENT_AREA (union footprint vs. parcel area) stays a distinct,
 * independently useful signal from OUTSIDE_BOUNDARY rather than dead code
 * that could never exceed the parcel area by construction.
 */
export function estimateUnionFootprintAreaM2(footprints: SitePoint2D[][]): number {
  if (footprints.length === 0) return 0;
  const allPoints = footprints.flat();
  const xs = allPoints.map(p => p.xM);
  const ys = allPoints.map(p => p.yM);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  let resolutionM = UNION_AREA_GRID_RESOLUTION_M;
  let cols = Math.ceil((maxX - minX) / resolutionM) + 1;
  let rows = Math.ceil((maxY - minY) / resolutionM) + 1;
  while (cols * rows > UNION_AREA_GRID_MAX_CELLS) {
    resolutionM *= 2;
    cols = Math.ceil((maxX - minX) / resolutionM) + 1;
    rows = Math.ceil((maxY - minY) / resolutionM) + 1;
  }
  let occupiedCells = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const center = { xM: minX + (col + 0.5) * resolutionM, yM: minY + (row + 0.5) * resolutionM };
      if (footprints.some(footprint => isPointInPolygon(center, footprint))) occupiedCells += 1;
    }
  }
  return occupiedCells * resolutionM * resolutionM;
}
