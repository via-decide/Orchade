/**
 * Property (section 3 of ORCHADE P0 master task): the top-level, long-lived
 * identity a user creates once. Every future Orchade capability attaches
 * to this same graph -- "features grow around the Property, properties do
 * not get copied into features."
 *
 * Property is persistent world/user state; HomesteadScenarioDefinition
 * (src/simulation/homestead/scenario.ts) is immutable simulation input.
 * They are never collapsed into one mutable object -- see
 * scenarioCompiler.ts for the one hard boundary between them.
 */
import type { PropertyIntent } from './intent';
import { validatePropertyIntent } from './intent';
import type { PropertyRealityDeclaration } from './reality';
import { validatePropertyRealityDeclaration } from './reality';
import type { PropertyRevision } from './revision';

export const PROPERTY_SCHEMA_VERSION = 1;

export interface Property {
  propertyId: string;
  schemaVersion: number;
  name: string;
  intent: PropertyIntent;
  realityDeclaration: PropertyRealityDeclaration;
  currentRevisionId: string;
  /** Every revision id this property has ever had, oldest first. Never shrinks. */
  revisionRefs: string[];
  createdAt: string;
  createdBy: string;
}

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`Property requires ${field}.`);
}

/** Creates a Property pinned to its first revision. `initialRevision.propertyId` must match. */
export function createProperty(input: {
  propertyId: string;
  name: string;
  createdAt: string;
  createdBy: string;
}, initialRevision: PropertyRevision): Property {
  requireNonEmpty(input.propertyId, 'propertyId');
  requireNonEmpty(input.name, 'name');
  if (initialRevision.propertyId !== input.propertyId) {
    throw new Error(`Initial revision propertyId ${initialRevision.propertyId} does not match Property ${input.propertyId}.`);
  }
  if (initialRevision.parentRevisionId) {
    throw new Error('A Property\'s initial revision must not declare a parentRevisionId.');
  }
  validatePropertyIntent(initialRevision.intent);
  validatePropertyRealityDeclaration(initialRevision.realityDeclaration);
  return {
    propertyId: input.propertyId,
    schemaVersion: PROPERTY_SCHEMA_VERSION,
    name: input.name,
    intent: initialRevision.intent,
    realityDeclaration: initialRevision.realityDeclaration,
    currentRevisionId: initialRevision.revisionId,
    revisionRefs: [initialRevision.revisionId],
    createdAt: input.createdAt,
    createdBy: input.createdBy,
  };
}

/**
 * Moves a Property's "current" pointer to a new revision. Never mutates
 * the input Property; returns a new one. The new revision must chain from
 * the property's current revision (its parentRevisionId must match).
 */
export function advancePropertyToRevision(property: Property, nextRevision: PropertyRevision): Property {
  if (nextRevision.propertyId !== property.propertyId) {
    throw new Error(`Revision ${nextRevision.revisionId} belongs to property ${nextRevision.propertyId}, not ${property.propertyId}.`);
  }
  if (nextRevision.parentRevisionId !== property.currentRevisionId) {
    throw new Error(`Revision ${nextRevision.revisionId} does not chain from the property's current revision (${property.currentRevisionId}).`);
  }
  if (property.revisionRefs.includes(nextRevision.revisionId)) {
    throw new Error(`Revision ${nextRevision.revisionId} has already been recorded on this property.`);
  }
  return {
    ...property,
    intent: nextRevision.intent,
    realityDeclaration: nextRevision.realityDeclaration,
    currentRevisionId: nextRevision.revisionId,
    revisionRefs: [...property.revisionRefs, nextRevision.revisionId],
  };
}

/** Append-only store of every revision ever created, across every property. Mirrors EquipmentTwinRegistry's shape. */
export type PropertyRevisionStore = Readonly<Record<string, PropertyRevision>>;

export function registerPropertyRevision(store: PropertyRevisionStore, revision: PropertyRevision): PropertyRevisionStore {
  if (store[revision.revisionId]) throw new Error(`Revision id ${revision.revisionId} is already registered.`);
  return { ...store, [revision.revisionId]: revision };
}

export function getPropertyRevision(store: PropertyRevisionStore, revisionId: string): PropertyRevision | undefined {
  return store[revisionId];
}
