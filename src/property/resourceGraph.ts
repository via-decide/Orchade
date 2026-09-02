/**
 * PropertyResourceGraph (section 11 of ORCHADE P0 master task).
 *
 * The one hard rule: PROXIMITY != CONNECTION. A tank drawn next to a
 * greenhouse does not automatically supply it -- a connection must be
 * explicit (or explicitly operator-approved), matching the same rule the
 * Site Planner resource graph already enforces.
 */
import type { PropertyEntity, PropertyResourceType } from './entity';

export type PropertyResourceConnectionMode = 'CONTINUOUS' | 'SCHEDULED' | 'ON_DEMAND';

export interface PropertyResourceConnection {
  connectionId: string;
  propertyId: string;
  resourceType: PropertyResourceType;
  fromEntityId: string;
  toEntityId: string;
  mode: PropertyResourceConnectionMode;
  enabled: boolean;
  constraints: string[];
  evidenceRefs: string[];
}

export interface PropertyResourceGraph {
  propertyId: string;
  connections: PropertyResourceConnection[];
}

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`PropertyResourceConnection requires ${field}.`);
}

/**
 * Validates connection identity/shape and that every endpoint resolves to
 * an entity that actually exists on this property (Section 11: "Resource
 * connection requires valid endpoints"). Does not check resourceType
 * compatibility against entity capabilities -- that is the scenario
 * compiler's job (it already needs entity-level resource profiles to do
 * anything useful with a connection).
 */
export function validatePropertyResourceGraph(graph: PropertyResourceGraph, entities: readonly PropertyEntity[]): void {
  const entityIds = new Set(entities.map(entity => entity.entityId));
  const seenIds = new Set<string>();
  graph.connections.forEach(connection => {
    requireNonEmpty(connection.connectionId, 'connectionId');
    if (seenIds.has(connection.connectionId)) throw new Error(`Duplicate resource connection id: ${connection.connectionId}.`);
    seenIds.add(connection.connectionId);
    requireNonEmpty(connection.fromEntityId, 'fromEntityId');
    requireNonEmpty(connection.toEntityId, 'toEntityId');
    if (connection.fromEntityId === connection.toEntityId) {
      throw new Error(`Resource connection ${connection.connectionId} cannot connect an entity to itself.`);
    }
    if (!entityIds.has(connection.fromEntityId)) {
      throw new Error(`Resource connection ${connection.connectionId} references unknown fromEntityId ${connection.fromEntityId}.`);
    }
    if (!entityIds.has(connection.toEntityId)) {
      throw new Error(`Resource connection ${connection.connectionId} references unknown toEntityId ${connection.toEntityId}.`);
    }
    if (!(['CONTINUOUS', 'SCHEDULED', 'ON_DEMAND'] as const).includes(connection.mode)) {
      throw new Error(`Resource connection ${connection.connectionId} has an unsupported mode: ${String(connection.mode)}.`);
    }
  });
}
