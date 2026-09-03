export type {
  MeasurementSystem,
  SitePoint2D,
  SiteAccessPointType,
  SiteAccessPoint,
  SiteExcludedZone,
  SiteExistingStructure,
  SiteGeometry,
  SiteModuleType,
  SiteResourceClass,
  SiteAccessRequirement,
  SiteEvidenceLevel,
  SiteModuleGeometry,
  SiteLabourProfile,
  SiteEnergyProfile,
  SiteWaterProfile,
  SiteEconomicProfile,
  SiteResourceProfile,
  SiteModuleDefinition,
  SiteResourceConnection,
  SiteRevisionMetadata,
  SiteProject,
  SitePlacementIntentType,
  SitePlacementIntent,
  SiteValidationFailureType,
  SiteValidationFailure,
  SiteEvent,
  SitePlacementResult,
  SiteCropModuleType,
  SiteLivestockModuleType,
  SiteCropAssumptionProfile,
  SiteLivestockAssumptionProfile,
  SiteScenarioAssumptions,
  CompiledSiteScenario,
} from './public';
export { SITE_GEOMETRY_SCHEMA_VERSION, SITE_PROJECT_SCHEMA_VERSION, FATAL_SITE_FAILURE_TYPES, ADVISORY_SITE_FAILURE_TYPES } from './public';

export { createRectangularSiteGeometry, createBlankSiteProject, type CreateRectangularSiteGeometryOptions, type CreateBlankSiteProjectOptions } from './state';

export {
  computePolygonAreaM2,
  isPolygonSelfIntersecting,
  validateSiteGeometry,
  siteAreaM2,
  describeSiteArea,
  gunthaToCanonicalM2,
  acreToCanonicalM2,
  sqftToCanonicalM2,
  isPointInPolygon,
  moduleFootprintPolygon,
  polygonsOverlap,
  polygonFullyInside,
  estimateUnionFootprintAreaM2,
  type SiteAreaDisplay,
} from './internal/geometry';

export { SITE_MODULE_CATALOG, moduleTemplate, overlapIsAllowed, type SiteModuleTemplate } from './internal/moduleCatalog';
export { createSiteModule, type CreateSiteModuleOptions } from './internal/factory';
export { isModuleReachable } from './internal/access';
export { validateSiteProject } from './internal/validation';
export { applySitePlacementIntent } from './internal/placement';
export { compileSiteProjectToHomesteadScenario } from './internal/compiler';
export { DEFAULT_SITE_SCENARIO_ASSUMPTIONS } from './internal/scenarioAssumptions';
export { geometryHash, moduleHash, resourceGraphHash, siteHash } from './internal/hash';
export { createReference10GunthaSiteProject, REFERENCE_10_GUNTHA_AREA_M2 } from './fixtures/reference10Guntha';
