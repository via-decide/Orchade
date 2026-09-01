import type { SiteAccessPoint, SiteGeometry, SitePoint2D, SiteProject } from './public';
import { SITE_GEOMETRY_SCHEMA_VERSION, SITE_PROJECT_SCHEMA_VERSION } from './public';
import { validateSiteGeometry } from './internal/geometry';

export interface CreateRectangularSiteGeometryOptions {
  siteGeometryId: string;
  widthM: number;
  depthM: number;
  northBearingDegrees?: number;
  accessPoints?: SiteAccessPoint[];
  excludedZones?: SiteGeometry['excludedZones'];
  existingStructures?: SiteGeometry['existingStructures'];
  revision?: string;
}

/**
 * Convenience constructor for the rectangular demo fixture (Part H says the
 * *reference* site may be simple rectangular geometry; the engine itself
 * stays polygon-capable via SiteGeometry.boundaryPolygon).
 */
export function createRectangularSiteGeometry(options: CreateRectangularSiteGeometryOptions): SiteGeometry {
  const polygon: SitePoint2D[] = [
    { xM: 0, yM: 0 },
    { xM: options.widthM, yM: 0 },
    { xM: options.widthM, yM: options.depthM },
    { xM: 0, yM: options.depthM },
  ];
  const geometry: SiteGeometry = {
    siteGeometryId: options.siteGeometryId,
    schemaVersion: SITE_GEOMETRY_SCHEMA_VERSION,
    revision: options.revision ?? 'geometry-rev-001',
    measurementSystem: 'metric',
    boundaryPolygon: polygon,
    northBearingDegrees: options.northBearingDegrees ?? 0,
    accessPoints: options.accessPoints ?? [{ id: 'main-gate', type: 'main-gate', position: { xM: options.widthM / 2, yM: 0 } }],
    excludedZones: options.excludedZones ?? [],
    existingStructures: options.existingStructures ?? [],
  };
  validateSiteGeometry(geometry);
  return geometry;
}

export interface CreateBlankSiteProjectOptions {
  siteProjectId?: string;
  title?: string;
  geometry: SiteGeometry;
  householdSize?: number;
  planningHorizonDays?: number;
  seed?: string;
  revisionId?: string;
  createdAt?: string;
}

/** Part Q: empty boundary + gate + household + climate, and nothing else. */
export function createBlankSiteProject(options: CreateBlankSiteProjectOptions): SiteProject {
  return {
    siteProjectId: options.siteProjectId ?? 'site-planner-blank',
    schemaVersion: SITE_PROJECT_SCHEMA_VERSION,
    title: options.title ?? 'Blank site',
    measurementSystem: options.geometry.measurementSystem,
    householdSize: options.householdSize ?? 4,
    planningHorizonDays: options.planningHorizonDays ?? 365,
    seed: options.seed ?? 'site-planner-blank-fixed',
    geometry: options.geometry,
    modules: [],
    connections: [],
    revision: {
      revisionId: options.revisionId ?? 'site-rev-001',
      changes: [],
      rationale: 'Blank site: empty boundary, gate, household, and climate only.',
      evidenceRefs: [],
      createdAt: options.createdAt ?? '2026-08-31T00:00:00.000Z',
    },
  };
}
