import { gunthaToM2 } from '../../../src/simulation/homestead/units';
import type { SiteProject, SiteResourceConnection } from '../public';
import { createSiteModule } from '../internal/factory';
import { createBlankSiteProject, createRectangularSiteGeometry } from '../state';

/**
 * ORCHADE-SITE-001 (Part H): the canonical 10-guntha reference homestead.
 * A simple rectangular boundary is used only because this is the demo
 * fixture -- SiteGeometry itself stays polygon-capable.
 *
 * Module selection mirrors "Final Acceptance Demo / Revision A": residence,
 * workshop, greenhouse, vegetable beds, orchard, chickens, compost, a
 * 5,000 L tank, solar, and battery, plus a rooftop rain catchment feeding
 * the tank. This is not tuned to force a successful 365-day run -- the
 * chicken coop's FEED input is deliberately left unconnected (no staple
 * field is placed) so the compiler's advisory RESOURCE_CONNECTION_MISSING
 * evidence has something real to report, matching Part H: "the first
 * checked-in scenario is allowed to fail."
 */
export const REFERENCE_10_GUNTHA_AREA_M2 = gunthaToM2(10);

const SITE_WIDTH_M = 31.81;
const SITE_DEPTH_M = REFERENCE_10_GUNTHA_AREA_M2 / SITE_WIDTH_M;

export function createReference10GunthaSiteProject(): SiteProject {
  const geometry = createRectangularSiteGeometry({
    siteGeometryId: 'orchade-site-001-geometry',
    widthM: SITE_WIDTH_M,
    depthM: SITE_DEPTH_M,
  });

  const project = createBlankSiteProject({
    siteProjectId: 'orchade-site-001',
    title: '10-Guntha Sovereign Homestead',
    geometry,
    householdSize: 4,
    planningHorizonDays: 365,
    seed: 'orchade-site-001-fixed',
    revisionId: 'orchade-site-001-rev-a',
  });

  const modules = [
    createSiteModule({ moduleId: 'residence', moduleType: 'RESIDENCE', anchor: { xM: 2, yM: 2 }, widthM: 10, depthM: 8 }),
    createSiteModule({ moduleId: 'rooftop-rain-catchment', moduleType: 'RAIN_CATCHMENT', anchor: { xM: 2, yM: 2 }, widthM: 8, depthM: 6 }),
    createSiteModule({ moduleId: 'rooftop-solar', moduleType: 'SOLAR_ARRAY', anchor: { xM: 3, yM: 3 }, widthM: 4, depthM: 3, capacity: 3 }),
    createSiteModule({ moduleId: 'battery-bank', moduleType: 'BATTERY', anchor: { xM: 8, yM: 3 }, widthM: 1, depthM: 1, capacity: 10 }),
    createSiteModule({ moduleId: 'workshop', moduleType: 'WORKSHOP', anchor: { xM: 14, yM: 2 }, widthM: 5, depthM: 4 }),
    createSiteModule({ moduleId: 'greenhouse', moduleType: 'GREENHOUSE', anchor: { xM: 2, yM: 12 }, widthM: 6, depthM: 4 }),
    createSiteModule({ moduleId: 'vegetable-bed-1', moduleType: 'VEGETABLE_BED', anchor: { xM: 9, yM: 12 }, widthM: 5, depthM: 4 }),
    createSiteModule({ moduleId: 'vegetable-bed-2', moduleType: 'VEGETABLE_BED', anchor: { xM: 15, yM: 12 }, widthM: 5, depthM: 4 }),
    createSiteModule({ moduleId: 'orchard', moduleType: 'ORCHARD', anchor: { xM: 2, yM: 18 }, widthM: 10, depthM: 8 }),
    createSiteModule({ moduleId: 'chicken-coop', moduleType: 'CHICKEN_COOP', anchor: { xM: 13, yM: 18 }, widthM: 3, depthM: 2.5, capacity: 10 }),
    createSiteModule({ moduleId: 'compost', moduleType: 'COMPOST', anchor: { xM: 17, yM: 18 }, widthM: 2, depthM: 2 }),
    createSiteModule({ moduleId: 'water-tank', moduleType: 'WATER_TANK', anchor: { xM: 20, yM: 18 }, widthM: 2, depthM: 2, capacity: 5000 }),
  ];

  const connections: SiteResourceConnection[] = [
    { id: 'conn-catchment-tank', fromModuleId: 'rooftop-rain-catchment', toModuleId: 'water-tank', resourceClass: 'WATER' },
    { id: 'conn-tank-residence', fromModuleId: 'water-tank', toModuleId: 'residence', resourceClass: 'WATER' },
    { id: 'conn-tank-greenhouse', fromModuleId: 'water-tank', toModuleId: 'greenhouse', resourceClass: 'WATER' },
    { id: 'conn-tank-veg1', fromModuleId: 'water-tank', toModuleId: 'vegetable-bed-1', resourceClass: 'WATER' },
    { id: 'conn-tank-veg2', fromModuleId: 'water-tank', toModuleId: 'vegetable-bed-2', resourceClass: 'WATER' },
    { id: 'conn-tank-orchard', fromModuleId: 'water-tank', toModuleId: 'orchard', resourceClass: 'WATER' },
    { id: 'conn-tank-chickens', fromModuleId: 'water-tank', toModuleId: 'chicken-coop', resourceClass: 'WATER' },
    { id: 'conn-solar-battery', fromModuleId: 'rooftop-solar', toModuleId: 'battery-bank', resourceClass: 'ENERGY' },
    { id: 'conn-battery-residence', fromModuleId: 'battery-bank', toModuleId: 'residence', resourceClass: 'ENERGY' },
    { id: 'conn-battery-workshop', fromModuleId: 'battery-bank', toModuleId: 'workshop', resourceClass: 'ENERGY' },
    { id: 'conn-greenhouse-compost', fromModuleId: 'greenhouse', toModuleId: 'compost', resourceClass: 'BIOMASS' },
  ];

  return { ...project, modules, connections };
}
