/**
 * PropertyRevision (section 12 of ORCHADE P0 master task).
 *
 * Immutable and hashable. Material changes create a new revision;
 * historical revisions never mutate (section 13, section 59 tests 2-5).
 * This is a *property*-level revision -- distinct from and one layer above
 * `ScenarioRevisionDefinition` in `src/simulation/homestead/scenario.ts`,
 * which stays a narrower scenario-editing mechanism (see
 * docs/PROPERTY_MODEL_MIGRATION.md).
 */
import { checksum } from '../engine/replay/checksum';
import { validatePropertyGraph, type PropertyGraph } from './graph';
import { validatePropertyIntent, type PropertyIntent } from './intent';
import { validatePropertyRealityDeclaration, type PropertyRealityDeclaration } from './reality';

export interface PropertyChangeDescription {
  description: string;
  entityRefs: string[];
}

export interface PropertyRevision {
  revisionId: string;
  propertyId: string;
  parentRevisionId?: string;
  createdAt: string;
  createdBy: string;
  realityDeclaration: PropertyRealityDeclaration;
  graph: PropertyGraph;
  intent: PropertyIntent;
  changeSet: PropertyChangeDescription[];
  rationale: string;
  entityHashes: Record<string, string>;
  resourceGraphHash: string;
  /** Deferred: Wave 8 (Expert Knowledge) is not implemented in this PR. Always empty here. */
  knowledgeBundleRefs: string[];
  evidenceRefs: string[];
  revisionHash: string;
}

export interface CreatePropertyRevisionInput {
  revisionId: string;
  propertyId: string;
  parentRevisionId?: string;
  createdAt: string;
  createdBy: string;
  realityDeclaration: PropertyRealityDeclaration;
  graph: PropertyGraph;
  intent: PropertyIntent;
  changeSet?: PropertyChangeDescription[];
  rationale: string;
  knowledgeBundleRefs?: string[];
  evidenceRefs?: string[];
}

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`PropertyRevision requires ${field}.`);
}

/**
 * The only sanctioned way to create a PropertyRevision. Validates the
 * reality declaration, intent, and full entity/resource graph, then
 * freezes an independent deep copy before hashing -- later mutation of the
 * caller's own objects can never leak into a created revision.
 */
export function createPropertyRevision(input: CreatePropertyRevisionInput): PropertyRevision {
  requireNonEmpty(input.revisionId, 'revisionId');
  requireNonEmpty(input.propertyId, 'propertyId');
  requireNonEmpty(input.rationale, 'rationale');
  requireNonEmpty(input.createdAt, 'createdAt');
  requireNonEmpty(input.createdBy, 'createdBy');
  if (input.parentRevisionId === input.revisionId) throw new Error('PropertyRevision revisionId must differ from parentRevisionId.');
  if (input.realityDeclaration.propertyId !== input.propertyId) throw new Error('PropertyRevision realityDeclaration.propertyId must match propertyId.');
  if (input.graph.propertyId !== input.propertyId) throw new Error('PropertyRevision graph.propertyId must match propertyId.');
  if (input.intent.propertyId !== input.propertyId) throw new Error('PropertyRevision intent.propertyId must match propertyId.');

  validatePropertyRealityDeclaration(input.realityDeclaration);
  validatePropertyIntent(input.intent);
  validatePropertyGraph(input.graph, input.realityDeclaration.mode);

  const frozenGraph: PropertyGraph = structuredClone(input.graph);
  const frozenIntent: PropertyIntent = structuredClone(input.intent);
  const frozenRealityDeclaration: PropertyRealityDeclaration = structuredClone(input.realityDeclaration);

  const entityHashes: Record<string, string> = {};
  frozenGraph.entities.forEach(entity => { entityHashes[entity.entityId] = checksum(entity); });
  const resourceGraphHash = checksum(frozenGraph.resourceGraph);

  const unhashed: Omit<PropertyRevision, 'revisionHash'> = {
    revisionId: input.revisionId,
    propertyId: input.propertyId,
    parentRevisionId: input.parentRevisionId,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    realityDeclaration: frozenRealityDeclaration,
    graph: frozenGraph,
    intent: frozenIntent,
    changeSet: [...(input.changeSet ?? [])],
    rationale: input.rationale,
    entityHashes,
    resourceGraphHash,
    knowledgeBundleRefs: [...(input.knowledgeBundleRefs ?? [])],
    evidenceRefs: [...(input.evidenceRefs ?? [])],
  };

  return { ...unhashed, revisionHash: checksum(unhashed) };
}

/**
 * Derives a new revision from a parent by supplying a replacement graph
 * (and optionally intent/reality declaration). The parent object itself is
 * never touched -- this always returns a brand-new PropertyRevision.
 */
export function deriveNextPropertyRevision(
  parent: PropertyRevision,
  input: {
    revisionId: string;
    createdAt: string;
    createdBy: string;
    rationale: string;
    graph?: PropertyGraph;
    intent?: PropertyIntent;
    realityDeclaration?: PropertyRealityDeclaration;
    changeSet?: PropertyChangeDescription[];
    evidenceRefs?: string[];
  },
): PropertyRevision {
  return createPropertyRevision({
    revisionId: input.revisionId,
    propertyId: parent.propertyId,
    parentRevisionId: parent.revisionId,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    realityDeclaration: input.realityDeclaration ?? parent.realityDeclaration,
    graph: input.graph ?? parent.graph,
    intent: input.intent ?? parent.intent,
    changeSet: input.changeSet ?? [],
    rationale: input.rationale,
    knowledgeBundleRefs: parent.knowledgeBundleRefs,
    evidenceRefs: input.evidenceRefs ?? [],
  });
}
