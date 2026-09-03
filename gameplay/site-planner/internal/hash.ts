import { checksum } from '../../../src/engine/replay/checksum';
import type { SiteGeometry, SiteModuleDefinition, SiteProject, SiteResourceConnection } from '../public';

export function geometryHash(geometry: SiteGeometry): string {
  return checksum(geometry);
}

export function moduleHash(modules: SiteModuleDefinition[]): string {
  return checksum([...modules].sort((a, b) => a.moduleId.localeCompare(b.moduleId)));
}

export function resourceGraphHash(connections: SiteResourceConnection[]): string {
  return checksum([...connections].sort((a, b) => a.id.localeCompare(b.id)));
}

/** Deterministic identity for an entire site project state (used as siteHash in run receipts). */
export function siteHash(project: SiteProject): string {
  return checksum({
    geometry: geometryHash(project.geometry),
    modules: moduleHash(project.modules),
    connections: resourceGraphHash(project.connections),
    revisionId: project.revision.revisionId,
  });
}
