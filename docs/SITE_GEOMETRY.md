# Site Geometry (Part A)

`gameplay/site-planner/internal/geometry.ts`, types in `public.ts`.

## Canonical representation

`SiteGeometry` always stores its `boundaryPolygon` as a list of `SitePoint2D`
(`{ xM, yM }`) in metres, relative to a stable site-local origin. Internal
geometry is always SI, regardless of `measurementSystem` (which is a
display-only concern -- see below).

```ts
interface SiteGeometry {
  siteGeometryId: string;
  schemaVersion: number;
  revision: string;
  measurementSystem: 'metric' | 'imperial';
  boundaryPolygon: SitePoint2D[];
  northBearingDegrees: number;
  accessPoints: SiteAccessPoint[];
  excludedZones: SiteExcludedZone[];
  existingStructures: SiteExistingStructure[];
}
```

The boundary is never assumed to be rectangular or convex. It supports any
simple (non-self-intersecting) polygon.

## Area is always derived, never accepted as input

`siteAreaM2(geometry)` computes area from `boundaryPolygon` via the
shoelace formula (`computePolygonAreaM2`). There is no field on
`SiteGeometry` for area -- a caller cannot override the calculated value.
`describeSiteArea(areaM2)` converts that one canonical number into m²,
acre, sq ft, and guntha for display.

## Rejection rules

`validateSiteGeometry(geometry)` throws when:

- the boundary has fewer than 3 points,
- the boundary self-intersects (`isPolygonSelfIntersecting`, an O(n²)
  segment-intersection sweep),
- the boundary's area is not strictly positive,
- any excluded zone or existing-structure polygon is degenerate or
  self-intersecting.

Unit conversion failures throw at the `convertPhysicalUnit` /
`gunthaToM2` / `acreToM2` / `sqftToM2` layer in
`src/simulation/homestead/units.ts` (non-finite input).

## Units

Vigha is deliberately not a supported unit: its size varies by region, so
treating it as canonical would silently misrepresent area. Supported
conversions: m², acre, sq ft, guntha (1 acre = 40 guntha).

## Module footprints and overlap

A module's footprint is a rectangle (`SiteModuleGeometry`: anchor corner +
width + depth), rotated about its anchor (`moduleFootprintPolygon`).
`polygonFullyInside` checks every corner is inside the boundary
(`OUTSIDE_BOUNDARY`). `polygonsOverlap` is a standard separating-axis test
between two rectangles, and treats an exactly-touching edge as overlapping
(no epsilon tolerance) -- placements need a real gap, not a shared edge.

`estimateUnionFootprintAreaM2` rasterizes the union of a set of footprints
on a fixed-resolution grid (0.5 m, capped at 40,000 cells for large sites)
so that legally-overlapping modules (e.g. rooftop solar) are never
double-counted when checking total placed footprint against parcel area.
It is deliberately *not* clipped to the boundary polygon: a module hanging
outside the parcel still counts its full area here, keeping
`INSUFFICIENT_AREA` a distinct signal from `OUTSIDE_BOUNDARY` rather than
something that can never fire independently.
