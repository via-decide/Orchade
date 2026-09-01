import type { SiteModuleDefinition, SiteProject, SiteValidationFailure } from '../public';
import { isModuleReachable } from './access';
import {
  estimateUnionFootprintAreaM2,
  isPolygonSelfIntersecting,
  moduleFootprintPolygon,
  polygonFullyInside,
  polygonsOverlap,
  siteAreaM2,
} from './geometry';
import { moduleTemplate, overlapIsAllowed } from './moduleCatalog';

function invalidDimensionsFailures(modules: SiteModuleDefinition[]): SiteValidationFailure[] {
  const failures: SiteValidationFailure[] = [];
  modules.forEach(module => {
    const { widthM, depthM } = module.geometry;
    const dimensionsValid = Number.isFinite(widthM) && Number.isFinite(depthM) && widthM > 0 && depthM > 0;
    const footprintValid = Number.isFinite(module.footprintM2) && module.footprintM2 > 0 &&
      Math.abs(module.footprintM2 - widthM * depthM) < 1e-6;
    if (!dimensionsValid || !footprintValid) {
      failures.push({
        type: 'INVALID_DIMENSIONS',
        moduleId: module.moduleId,
        reason: `Module ${module.moduleId} has invalid or inconsistent dimensions.`,
        evidence: { widthM, depthM, footprintM2: module.footprintM2 },
      });
    }
  });
  return failures;
}

function duplicateModuleIdFailures(modules: SiteModuleDefinition[]): SiteValidationFailure[] {
  const seen = new Map<string, number>();
  modules.forEach(module => seen.set(module.moduleId, (seen.get(module.moduleId) ?? 0) + 1));
  return Array.from(seen.entries())
    .filter(([, count]) => count > 1)
    .map(([moduleId, count]) => ({
      type: 'DUPLICATE_MODULE_ID' as const,
      moduleId,
      reason: `Module id ${moduleId} is used ${count} times; module ids must be unique.`,
      evidence: { moduleId, count },
    }));
}

function outsideBoundaryFailures(project: SiteProject): SiteValidationFailure[] {
  const failures: SiteValidationFailure[] = [];
  project.modules.forEach(module => {
    const footprint = moduleFootprintPolygon(module.geometry, module.rotationDegrees);
    if (!polygonFullyInside(footprint, project.geometry.boundaryPolygon)) {
      failures.push({
        type: 'OUTSIDE_BOUNDARY',
        moduleId: module.moduleId,
        reason: `Module ${module.moduleId} lies partially or fully outside the parcel boundary.`,
        evidence: { footprint },
      });
    }
  });
  return failures;
}

function excludedZoneFailures(project: SiteProject): SiteValidationFailure[] {
  const failures: SiteValidationFailure[] = [];
  project.modules.forEach(module => {
    const footprint = moduleFootprintPolygon(module.geometry, module.rotationDegrees);
    project.geometry.excludedZones.forEach(zone => {
      if (polygonsOverlap(footprint, zone.polygon)) {
        failures.push({
          type: 'EXCLUDED_ZONE_COLLISION',
          moduleId: module.moduleId,
          reason: `Module ${module.moduleId} collides with excluded zone ${zone.id} (${zone.reason}).`,
          evidence: { zoneId: zone.id },
        });
      }
    });
  });
  return failures;
}

function overlapFailures(modules: SiteModuleDefinition[]): SiteValidationFailure[] {
  const failures: SiteValidationFailure[] = [];
  const enabled = modules.filter(m => m.enabled);
  for (let i = 0; i < enabled.length; i += 1) {
    for (let j = i + 1; j < enabled.length; j += 1) {
      const a = enabled[i];
      const b = enabled[j];
      if (overlapIsAllowed(a.moduleType, b.moduleType)) continue;
      const footprintA = moduleFootprintPolygon(a.geometry, a.rotationDegrees);
      const footprintB = moduleFootprintPolygon(b.geometry, b.rotationDegrees);
      if (polygonsOverlap(footprintA, footprintB)) {
        failures.push({
          type: 'MODULE_OVERLAP',
          moduleId: a.moduleId,
          reason: `Module ${a.moduleId} (${a.moduleType}) overlaps module ${b.moduleId} (${b.moduleType}) without an explicit compatible relationship.`,
          evidence: { otherModuleId: b.moduleId },
        });
      }
    }
  }
  return failures;
}

/**
 * Union ground coverage of all enabled modules must not exceed the canonical
 * parcel area. Uses the rasterized union (not a naive sum) so a legally
 * overlapping module (e.g. rooftop solar) never double-counts ground already
 * used by its host building.
 */
function insufficientAreaFailures(project: SiteProject): SiteValidationFailure[] {
  const totalAreaM2 = siteAreaM2(project.geometry);
  const footprints = project.modules.filter(m => m.enabled).map(m => moduleFootprintPolygon(m.geometry, m.rotationDegrees));
  const placedFootprintM2 = estimateUnionFootprintAreaM2(footprints);
  if (placedFootprintM2 > totalAreaM2 + 1e-6) {
    return [{
      type: 'INSUFFICIENT_AREA',
      reason: `Total placed footprint (${placedFootprintM2.toFixed(2)} m²) exceeds parcel area (${totalAreaM2.toFixed(2)} m²).`,
      evidence: { placedFootprintM2, totalAreaM2 },
    }];
  }
  return [];
}

function circularDependencyFailures(modules: SiteModuleDefinition[]): SiteValidationFailure[] {
  const byId = new Map(modules.map(m => [m.moduleId, m]));
  const visiting = new Set<string>();
  const resolved = new Set<string>();
  const failures: SiteValidationFailure[] = [];

  const visit = (moduleId: string, path: string[]): void => {
    if (resolved.has(moduleId)) return;
    if (visiting.has(moduleId)) {
      failures.push({
        type: 'CIRCULAR_MODULE_DEPENDENCY',
        moduleId,
        reason: `Circular module dependency detected: ${[...path, moduleId].join(' -> ')}.`,
        evidence: { cycle: [...path, moduleId] },
      });
      return;
    }
    const module = byId.get(moduleId);
    if (!module) return;
    visiting.add(moduleId);
    module.dependencies.forEach(dependencyId => visit(dependencyId, [...path, moduleId]));
    visiting.delete(moduleId);
    resolved.add(moduleId);
  };

  modules.forEach(module => visit(module.moduleId, []));
  return failures;
}

function accessFailures(project: SiteProject): SiteValidationFailure[] {
  const failures: SiteValidationFailure[] = [];
  project.modules.filter(m => m.enabled).forEach(module => {
    if (!isModuleReachable(project.geometry, project.modules, module)) {
      failures.push({
        type: 'ACCESS_BLOCKED',
        moduleId: module.moduleId,
        reason: `Module ${module.moduleId} (${module.moduleType}) is not reachable from any compatible access point.`,
        evidence: { accessRequirement: moduleTemplate(module.moduleType).accessRequirement },
      });
    }
  });
  return failures;
}

function moduleDependencyFailures(modules: SiteModuleDefinition[]): SiteValidationFailure[] {
  const byId = new Map(modules.map(m => [m.moduleId, m]));
  const failures: SiteValidationFailure[] = [];
  modules.filter(m => m.enabled).forEach(module => {
    module.dependencies.forEach(dependencyId => {
      const dependency = byId.get(dependencyId);
      if (!dependency || !dependency.enabled) {
        failures.push({
          type: 'MODULE_DEPENDENCY_MISSING',
          moduleId: module.moduleId,
          reason: `Module ${module.moduleId} depends on ${dependencyId}, which is missing or disabled.`,
          evidence: { dependencyId },
        });
      }
    });
  });
  return failures;
}

function resourceConnectionFailures(project: SiteProject): SiteValidationFailure[] {
  const byId = new Map(project.modules.map(m => [m.moduleId, m]));
  const failures: SiteValidationFailure[] = [];
  project.modules.filter(m => m.enabled).forEach(module => {
    const requiredInputs = moduleTemplate(module.moduleType).requiredResourceInputs;
    requiredInputs.forEach(resourceClass => {
      const satisfied = project.connections.some(connection => {
        if (connection.toModuleId !== module.moduleId || connection.resourceClass !== resourceClass) return false;
        const source = byId.get(connection.fromModuleId);
        return !!source && source.enabled && moduleTemplate(source.moduleType).producesResourceOutputs.includes(resourceClass);
      });
      if (!satisfied) {
        failures.push({
          type: 'RESOURCE_CONNECTION_MISSING',
          moduleId: module.moduleId,
          reason: `Module ${module.moduleId} (${module.moduleType}) has no enabled ${resourceClass} connection.`,
          evidence: { resourceClass },
        });
      }
    });
  });
  return failures;
}

/**
 * Runs every spatial + resource-graph check and returns the full failure list.
 * FATAL_SITE_FAILURE_TYPES entries in the result block placement/compilation;
 * ADVISORY_SITE_FAILURE_TYPES entries are reported evidence only.
 */
export function validateSiteProject(project: SiteProject): SiteValidationFailure[] {
  const failures: SiteValidationFailure[] = [];
  if (isPolygonSelfIntersecting(project.geometry.boundaryPolygon) || siteAreaM2(project.geometry) <= 0) {
    failures.push({
      type: 'INVALID_SITE_GEOMETRY',
      reason: 'Site boundary polygon is self-intersecting or has non-positive area.',
      evidence: {},
    });
  }
  failures.push(...duplicateModuleIdFailures(project.modules));
  failures.push(...invalidDimensionsFailures(project.modules));
  failures.push(...outsideBoundaryFailures(project));
  failures.push(...excludedZoneFailures(project));
  failures.push(...overlapFailures(project.modules));
  failures.push(...insufficientAreaFailures(project));
  failures.push(...circularDependencyFailures(project.modules));
  failures.push(...accessFailures(project));
  failures.push(...moduleDependencyFailures(project.modules));
  failures.push(...resourceConnectionFailures(project));
  return failures;
}
