/**
 * Property Reality contract (Parts 2-4 of ORCHADE P0).
 *
 * This answers "what relationship does this property have to physical
 * reality?" -- a question orthogonal to PR #53's PLAN / SIMULATE / LIVE /
 * COMPARE / CALIBRATE, which answer "what is Orchade doing with this
 * property right now?" The two must never be merged into one enum.
 *
 * There is no separate "Property" aggregate type in this codebase yet, and
 * this task does not introduce one: `HomesteadScenarioDefinition.id` is
 * already the stable identity that survives across revisions (see
 * `createScenarioRevision` in `src/simulation/homestead/revision.ts`,
 * which clones a scenario and only replaces `.revision`), and
 * `scenario.revision.id` is already the per-revision identity. This module
 * treats those two existing fields as `propertyId` / `propertyRevisionId`
 * rather than inventing a parallel Property wrapper.
 */

export type PropertyRealityMode = 'VIRTUAL' | 'REAL' | 'HYBRID';

export type EntityRealityStatus = 'VIRTUAL' | 'PHYSICAL' | 'CANDIDATE';

/**
 * Which EntityRealityStatus values a property's DECLARED, committed reality
 * snapshot may contain while in a given mode. VIRTUAL and REAL are "pure"
 * states: a VIRTUAL property cannot silently contain a PHYSICAL entity, and
 * a REAL property cannot silently contain a VIRTUAL (future/hypothetical)
 * entity -- either would be an undeclared HYBRID transition. A declared
 * CANDIDATE entity (a proposed purchase/build being tracked openly on the
 * property) always means the property is, by definition, in a transitional
 * state, so it is only legal under HYBRID (Part 2's own Case 3 -- "REAL
 * property + candidate Daxini pump" -- is itself listed as a HYBRID case).
 *
 * This is unrelated to running an ephemeral EquipmentCandidateTest
 * (equipmentCandidateTest.ts): that workflow clones a disposable scenario
 * revision purely to compare simulation outcomes and never touches, reads,
 * or writes a PropertyRealitySnapshot. A VIRTUAL or REAL property can
 * freely test candidates without ever declaring them here.
 */
export const ALLOWED_ENTITY_STATUSES_BY_MODE: Readonly<Record<PropertyRealityMode, readonly EntityRealityStatus[]>> = {
  VIRTUAL: ['VIRTUAL'],
  REAL: ['PHYSICAL'],
  HYBRID: ['VIRTUAL', 'PHYSICAL', 'CANDIDATE'],
};

export interface PropertyRealityDeclaration {
  propertyId: string;
  mode: PropertyRealityMode;
  declaredAt: string;
  declaredBy: string;
  basisRefs: string[];
  notes?: string;
}

export interface PropertyEntityRealityRecord {
  entityId: string;
  status: EntityRealityStatus;
}

/** One immutable, revision-pinned reality state for a property. */
export interface PropertyRealitySnapshot {
  propertyId: string;
  propertyRevisionId: string;
  declaration: PropertyRealityDeclaration;
  entities: PropertyEntityRealityRecord[];
}

/** An append-only history of snapshots for one property, oldest first. */
export type PropertyRealityHistory = readonly PropertyRealitySnapshot[];

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`Property reality declaration requires ${field}.`);
}

export function validatePropertyRealityDeclaration(declaration: PropertyRealityDeclaration): void {
  requireNonEmpty(declaration.propertyId, 'propertyId');
  requireNonEmpty(declaration.declaredAt, 'declaredAt');
  requireNonEmpty(declaration.declaredBy, 'declaredBy');
  if (!Number.isFinite(Date.parse(declaration.declaredAt))) throw new Error('Property reality declaration requires a valid ISO declaredAt timestamp.');
  if (!(['VIRTUAL', 'REAL', 'HYBRID'] as const).includes(declaration.mode)) throw new Error(`Unsupported property reality mode: ${String(declaration.mode)}.`);
}

/**
 * Enforces the one hard rule: an entity's reality status must be legal for
 * the property's declared mode. Never called implicitly by a mutation --
 * callers must invoke this explicitly, so an illegal combination fails
 * closed instead of silently promoting the property's mode.
 */
export function validateEntityRealityConsistency(mode: PropertyRealityMode, entities: PropertyEntityRealityRecord[]): void {
  const allowed = ALLOWED_ENTITY_STATUSES_BY_MODE[mode];
  const ids = new Set<string>();
  entities.forEach(entity => {
    requireNonEmpty(entity.entityId, 'entityId');
    if (ids.has(entity.entityId)) throw new Error(`Duplicate entity id in reality snapshot: ${entity.entityId}.`);
    ids.add(entity.entityId);
    if (!allowed.includes(entity.status)) {
      throw new Error(
        `Entity ${entity.entityId} has reality status ${entity.status}, which is not permitted under ${mode} mode. ` +
        `Propose an explicit reality-mode transition instead of adding this entity to the current property revision.`,
      );
    }
  });
}

export interface CreatePropertyRealitySnapshotInput {
  propertyId: string;
  propertyRevisionId: string;
  mode: PropertyRealityMode;
  declaredAt: string;
  declaredBy: string;
  basisRefs: string[];
  notes?: string;
  entities: PropertyEntityRealityRecord[];
}

/** The only sanctioned way to create a PropertyRealitySnapshot. Validates both invariants above. */
export function createPropertyRealitySnapshot(input: CreatePropertyRealitySnapshotInput): PropertyRealitySnapshot {
  requireNonEmpty(input.propertyRevisionId, 'propertyRevisionId');
  const declaration: PropertyRealityDeclaration = {
    propertyId: input.propertyId,
    mode: input.mode,
    declaredAt: input.declaredAt,
    declaredBy: input.declaredBy,
    basisRefs: [...input.basisRefs],
    notes: input.notes,
  };
  validatePropertyRealityDeclaration(declaration);
  const entities = input.entities.map(entity => ({ ...entity }));
  validateEntityRealityConsistency(input.mode, entities);
  return {
    propertyId: input.propertyId,
    propertyRevisionId: input.propertyRevisionId,
    declaration,
    entities,
  };
}

export interface ProposeRealityTransitionInput {
  nextPropertyRevisionId: string;
  nextMode: PropertyRealityMode;
  declaredAt: string;
  declaredBy: string;
  basisRefs: string[];
  notes?: string;
  /** The full entity set for the new revision (not a diff) -- callers decide what changed and why. */
  entities: PropertyEntityRealityRecord[];
}

/**
 * The only sanctioned way to change a property's reality mode. Always
 * produces a brand-new, independent snapshot pinned to a new revision id;
 * never mutates the current snapshot. The current snapshot -- and every
 * snapshot before it -- remains exactly as it was (Part 3: "Historical
 * property revisions retain their original reality mode").
 */
export function proposeRealityTransition(
  current: PropertyRealitySnapshot,
  input: ProposeRealityTransitionInput,
): PropertyRealitySnapshot {
  if (input.nextPropertyRevisionId === current.propertyRevisionId) {
    throw new Error('A reality-mode transition requires a new property revision id.');
  }
  return createPropertyRealitySnapshot({
    propertyId: current.propertyId,
    propertyRevisionId: input.nextPropertyRevisionId,
    mode: input.nextMode,
    declaredAt: input.declaredAt,
    declaredBy: input.declaredBy,
    basisRefs: input.basisRefs,
    notes: input.notes,
    entities: input.entities,
  });
}

export function appendRealitySnapshot(history: PropertyRealityHistory, snapshot: PropertyRealitySnapshot): PropertyRealityHistory {
  const existingPropertyId = history[0]?.propertyId;
  if (existingPropertyId !== undefined && existingPropertyId !== snapshot.propertyId) {
    throw new Error(`Cannot append a snapshot for property ${snapshot.propertyId} to a history belonging to property ${existingPropertyId}.`);
  }
  if (history.some(item => item.propertyRevisionId === snapshot.propertyRevisionId)) {
    throw new Error(`Property revision ${snapshot.propertyRevisionId} already has a recorded reality snapshot.`);
  }
  return [...history, snapshot];
}

export function getRealitySnapshotAtRevision(history: PropertyRealityHistory, propertyRevisionId: string): PropertyRealitySnapshot | undefined {
  return history.find(item => item.propertyRevisionId === propertyRevisionId);
}

export function latestRealitySnapshot(history: PropertyRealityHistory): PropertyRealitySnapshot | undefined {
  return history[history.length - 1];
}
