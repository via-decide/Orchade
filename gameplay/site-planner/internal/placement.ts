import type { SiteEvent, SiteModuleDefinition, SitePlacementIntent, SitePlacementResult, SiteProject, SiteValidationFailure } from '../public';
import { FATAL_SITE_FAILURE_TYPES } from '../public';
import { createSiteModule } from './factory';
import { validateSiteProject } from './validation';

function findModule(project: SiteProject, moduleId: string): SiteModuleDefinition | undefined {
  return project.modules.find(m => m.moduleId === moduleId);
}

function rejected(project: SiteProject, intent: SitePlacementIntent, reason: string): SitePlacementResult {
  const failure: SiteValidationFailure = { type: 'INVALID_INTENT', moduleId: intent.moduleId, reason, evidence: { intent } };
  const event: SiteEvent = { type: 'INTENT_REJECTED', moduleId: intent.moduleId, payload: { intentType: intent.type, reason } };
  return { project, accepted: false, failures: [failure], events: [event] };
}

function buildCandidateModules(project: SiteProject, intent: SitePlacementIntent): SiteModuleDefinition[] | { structuralError: string } {
  const existing = findModule(project, intent.moduleId);

  switch (intent.type) {
    case 'PLACE_MODULE': {
      if (!intent.moduleType) return { structuralError: 'PLACE_MODULE requires moduleType.' };
      if (!intent.anchor) return { structuralError: 'PLACE_MODULE requires an anchor point.' };
      if (existing) return { structuralError: `Module id ${intent.moduleId} already exists.` };
      const created = createSiteModule({
        moduleId: intent.moduleId,
        moduleType: intent.moduleType,
        anchor: intent.anchor,
        widthM: intent.widthM,
        depthM: intent.depthM,
        rotationDegrees: intent.rotationDegrees,
        capacity: intent.capacity,
      });
      return [...project.modules, created];
    }
    case 'MOVE_MODULE': {
      if (!existing) return { structuralError: `Module ${intent.moduleId} does not exist.` };
      if (!intent.anchor) return { structuralError: 'MOVE_MODULE requires an anchor point.' };
      return project.modules.map(m => m.moduleId === intent.moduleId ? { ...m, geometry: { ...m.geometry, anchor: intent.anchor! } } : m);
    }
    case 'ROTATE_MODULE': {
      if (!existing) return { structuralError: `Module ${intent.moduleId} does not exist.` };
      if (intent.rotationDegrees === undefined) return { structuralError: 'ROTATE_MODULE requires rotationDegrees.' };
      return project.modules.map(m => m.moduleId === intent.moduleId ? { ...m, rotationDegrees: intent.rotationDegrees! } : m);
    }
    case 'RESIZE_MODULE': {
      if (!existing) return { structuralError: `Module ${intent.moduleId} does not exist.` };
      const widthM = intent.widthM ?? existing.geometry.widthM;
      const depthM = intent.depthM ?? existing.geometry.depthM;
      const capacity = intent.capacity ?? existing.capacity;
      return project.modules.map(m => m.moduleId === intent.moduleId
        ? { ...m, geometry: { ...m.geometry, widthM, depthM }, footprintM2: widthM * depthM, capacity }
        : m);
    }
    case 'REMOVE_MODULE': {
      if (!existing) return { structuralError: `Module ${intent.moduleId} does not exist.` };
      return project.modules.filter(m => m.moduleId !== intent.moduleId);
    }
    case 'ENABLE_MODULE': {
      if (!existing) return { structuralError: `Module ${intent.moduleId} does not exist.` };
      return project.modules.map(m => m.moduleId === intent.moduleId ? { ...m, enabled: true } : m);
    }
    case 'DISABLE_MODULE': {
      if (!existing) return { structuralError: `Module ${intent.moduleId} does not exist.` };
      return project.modules.map(m => m.moduleId === intent.moduleId ? { ...m, enabled: false } : m);
    }
    default:
      return { structuralError: `Unknown intent type: ${String((intent as { type: string }).type)}.` };
  }
}

/**
 * The only sanctioned way to mutate a SiteProject's modules. Deterministic and
 * pure: builds a candidate, validates it, and either accepts (returning the new
 * project) or rejects (returning the original project unchanged). React must
 * never mutate `project.modules` directly (test: "no React component directly
 * mutates canonical simulation state").
 */
export function applySitePlacementIntent(project: SiteProject, intent: SitePlacementIntent): SitePlacementResult {
  const candidateModules = buildCandidateModules(project, intent);
  if ('structuralError' in candidateModules) return rejected(project, intent, candidateModules.structuralError);

  const candidateProject: SiteProject = { ...project, modules: candidateModules };
  const failures = validateSiteProject(candidateProject);
  const fatalFailures = failures.filter(f => FATAL_SITE_FAILURE_TYPES.includes(f.type));
  if (fatalFailures.length > 0) {
    return {
      project,
      accepted: false,
      failures: fatalFailures,
      events: [{ type: 'INTENT_REJECTED', moduleId: intent.moduleId, payload: { intentType: intent.type, failureTypes: fatalFailures.map(f => f.type) } }],
    };
  }

  const eventTypeByIntent: Record<SitePlacementIntent['type'], SiteEvent['type']> = {
    PLACE_MODULE: 'MODULE_PLACED',
    MOVE_MODULE: 'MODULE_MOVED',
    ROTATE_MODULE: 'MODULE_ROTATED',
    RESIZE_MODULE: 'MODULE_RESIZED',
    REMOVE_MODULE: 'MODULE_REMOVED',
    ENABLE_MODULE: 'MODULE_ENABLED',
    DISABLE_MODULE: 'MODULE_DISABLED',
  };

  return {
    project: candidateProject,
    accepted: true,
    failures: failures.filter(f => !FATAL_SITE_FAILURE_TYPES.includes(f.type)),
    events: [{ type: eventTypeByIntent[intent.type], moduleId: intent.moduleId, payload: { intentType: intent.type } }],
  };
}
