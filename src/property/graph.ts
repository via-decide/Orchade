/**
 * PropertyGraph: the entity + resource-graph snapshot frozen into each
 * PropertyRevision (section 3's conceptual graph, minus the layers --
 * identity, intent, reality, revisions -- that live on Property/
 * PropertyRevision directly).
 */
import type { PropertyEntity } from './entity';
import { validatePropertyEntity } from './entity';
import { validateEntityRealityConsistency, type PropertyRealityMode } from './reality';
import { validatePropertyResourceGraph, type PropertyResourceGraph } from './resourceGraph';

export interface PropertyGraph {
  propertyId: string;
  entities: PropertyEntity[];
  resourceGraph: PropertyResourceGraph;
}

/**
 * Validates the whole graph: no duplicate entity ids, no entity claiming a
 * different propertyId (a cross-property reference), every entity's
 * reality status legal for the given mode, and every resource connection
 * resolves to a real entity. Fails closed -- never silently drops or
 * repairs an invalid entity/connection.
 */
export function validatePropertyGraph(graph: PropertyGraph, mode: PropertyRealityMode): void {
  const seenIds = new Set<string>();
  graph.entities.forEach(entity => {
    if (seenIds.has(entity.entityId)) throw new Error(`Duplicate PropertyEntity id: ${entity.entityId}.`);
    seenIds.add(entity.entityId);
    if (entity.propertyId !== graph.propertyId) {
      throw new Error(`PropertyEntity ${entity.entityId} references propertyId ${entity.propertyId}, which does not match this property (${graph.propertyId}).`);
    }
    validatePropertyEntity(entity);
  });
  validateEntityRealityConsistency(
    mode,
    graph.entities
      .filter(entity => entity.status !== 'REMOVED' && entity.status !== 'HISTORICAL')
      .map(entity => ({ entityId: entity.entityId, status: entity.realityStatus })),
  );
  if (graph.resourceGraph.propertyId !== graph.propertyId) {
    throw new Error(`PropertyResourceGraph propertyId ${graph.resourceGraph.propertyId} does not match this property (${graph.propertyId}).`);
  }
  validatePropertyResourceGraph(graph.resourceGraph, graph.entities);
}

export function findPropertyEntity(graph: PropertyGraph, entityId: string): PropertyEntity | undefined {
  return graph.entities.find(entity => entity.entityId === entityId);
}

/** Removing an entity keeps it addressable historically (section 7): mark REMOVED, never delete outright. */
export function markPropertyEntityRemoved(graph: PropertyGraph, entityId: string): PropertyGraph {
  const entity = findPropertyEntity(graph, entityId);
  if (!entity) throw new Error(`Cannot remove unknown PropertyEntity: ${entityId}.`);
  return {
    ...graph,
    entities: graph.entities.map(item => item.entityId === entityId ? { ...item, status: 'REMOVED' } : item),
  };
}
