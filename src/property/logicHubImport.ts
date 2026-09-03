/**
 * KUP-STACK-001D: LogicHub -> Orchade import adapter (spec Part 8).
 *
 * Real import sequence:
 *   FETCH -> SCHEMA VALIDATE -> HASH VERIFY -> SNAPSHOT/PIN ->
 *   MAP INTO ORCHADE CONTRACT -> USER ACCEPTS IMPORT -> CREATE CANDIDATE
 *
 * "FETCH" here means "read the already-received envelope" -- per spec
 * Part 4, v1 interop ships as fixtures/files/tests first, not a live HTTP
 * fetch. This module never reaches the network.
 *
 * The types below are a hand-authored mirror of via-decide/kup-program's
 * contracts/stack/v1 EngineeringArtifactExport / KupCanonicalRef (source of
 * truth: interop/generated/*.schema.json, pinned in
 * interop/contract-lock.json). Orchade's Property Model v1 uses no schema
 * library anywhere -- validateEquipmentTwinDefinition, validatePropertyGraph
 * etc. are all hand-rolled -- so this mirrors that convention instead of
 * introducing Zod for one file.
 *
 * This adapter stops at producing a validated EquipmentTwinDefinition and a
 * CANDIDATE PropertyEquipmentInstance. It does not create a PropertyRevision
 * itself -- which property/revision a candidate instance belongs to is a
 * decision for whoever owns that property (deriveNextPropertyRevision in
 * revision.ts, unchanged), not something a generic LogicHub handoff can know.
 */
import {
  createEquipmentTwinRevision,
  type EquipmentTwinDefinition,
  type EquipmentClass,
  type EquipmentCapability,
} from './equipmentTwin';
import {
  createPropertyEquipmentInstance,
  type PropertyEquipmentInstance,
  type CreatePropertyEquipmentInstanceInput,
} from './propertyEquipment';
import type { EquipmentTwinRegistry } from './equipmentTwin';

export type KupSystem = 'KUP' | 'LOGICHUB' | 'ORCHADE' | 'VIADECIDE';

export interface KupCanonicalRef {
  system: KupSystem;
  entityType: string;
  entityId: string;
  revisionId?: string;
  contentHash?: string;
  schemaVersion: string;
}

export type ModelCapabilityStatus = 'SUPPORTED' | 'ESTIMATE_ONLY' | 'NOT_MODELED';

export interface EngineeringArtifactExport {
  engineeringProjectRef: KupCanonicalRef;
  engineeringRevisionRef: KupCanonicalRef;
  artifactType: string;
  capabilities: string[];
  interfaces: unknown[];
  physicalParameters?: Record<string, number>;
  operatingEnvelope?: Record<string, number>;
  resourceRequirements?: Record<string, number>;
  modelCapabilityStatus: ModelCapabilityStatus;
  evidenceRefs: KupCanonicalRef[];
  limitations: string[];
  contentHash: string;
}

// ---------------------------------------------------------------------------
// HASH VERIFY
// ---------------------------------------------------------------------------

export class IntegrityFailureError extends Error {
  readonly code = 'INTEGRITY_FAILURE';
  constructor(expectedHash: string, actualHash: string) {
    super(`INTEGRITY_FAILURE: expected contentHash ${expectedHash}, computed ${actualHash}`);
    this.name = 'IntegrityFailureError';
  }
}

/**
 * SHA-256 via the Web Crypto API (globalThis.crypto.subtle) -- available
 * identically in the browser bundle and in Node test runs, unlike
 * node:crypto which would break the browser build. Orchade's existing
 * checksum() (engine/replay/checksum.ts) is a 32-bit rolling hash for
 * *local determinism/replay* checks only, not a real cryptographic hash --
 * it is the wrong tool for cross-system integrity verification against a
 * real LogicHub SHA-256 value, so this does not reuse it.
 */
export async function sha256Hex(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

/**
 * Spec Part 25: hash mismatch -> INTEGRITY_FAILURE, no silent fallback.
 * `rawJson` must be the exact bytes the producer's contentHash was computed
 * over -- verifying against a re-serialized copy of the parsed object would
 * not actually prove the bytes are untampered.
 */
export async function verifyContentHash(rawJson: string, expectedHash: string): Promise<void> {
  const actualHash = await sha256Hex(rawJson);
  if (actualHash !== expectedHash) {
    throw new IntegrityFailureError(expectedHash, actualHash);
  }
}

// ---------------------------------------------------------------------------
// SCHEMA VALIDATE
// ---------------------------------------------------------------------------

function requireNonEmpty(value: string | undefined, field: string): void {
  if (!value || !value.trim()) throw new Error(`EngineeringArtifactExport requires ${field}.`);
}

const CONTENT_HASH_RE = /^sha256:[0-9a-f]{64}$/;
const MODEL_CAPABILITY_STATUSES: readonly ModelCapabilityStatus[] = ['SUPPORTED', 'ESTIMATE_ONLY', 'NOT_MODELED'];

function validateCanonicalRef(ref: KupCanonicalRef, field: string): void {
  if (!ref) throw new Error(`EngineeringArtifactExport requires ${field}.`);
  requireNonEmpty(ref.entityId, `${field}.entityId`);
  requireNonEmpty(ref.schemaVersion, `${field}.schemaVersion`);
  if (!(['KUP', 'LOGICHUB', 'ORCHADE', 'VIADECIDE'] as const).includes(ref.system)) {
    throw new Error(`CONTRACT_INCOMPATIBLE: ${field}.system is not a known KUP system: ${String(ref.system)}.`);
  }
}

/**
 * Fails closed exactly where the spec's own test list (Part 27 #7-12)
 * requires: unpinned revision, unknown system, malformed hash, unknown
 * modelCapabilityStatus, non-LOGICHUB source.
 */
export function validateEngineeringArtifactExport(artifact: EngineeringArtifactExport): void {
  validateCanonicalRef(artifact.engineeringProjectRef, 'engineeringProjectRef');
  validateCanonicalRef(artifact.engineeringRevisionRef, 'engineeringRevisionRef');
  if (artifact.engineeringProjectRef.system !== 'LOGICHUB') {
    throw new Error('EngineeringArtifactExport.engineeringProjectRef.system must be LOGICHUB.');
  }
  if (artifact.engineeringRevisionRef.system !== 'LOGICHUB') {
    throw new Error('EngineeringArtifactExport.engineeringRevisionRef.system must be LOGICHUB.');
  }
  // Part 8: "Exact revision is pinned" -- an export whose revision ref has
  // no revisionId cannot be snapshotted/pinned, so it is not importable.
  requireNonEmpty(artifact.engineeringRevisionRef.revisionId, 'engineeringRevisionRef.revisionId');
  requireNonEmpty(artifact.artifactType, 'artifactType');
  if (!CONTENT_HASH_RE.test(artifact.contentHash)) {
    throw new Error(`EngineeringArtifactExport.contentHash is malformed: "${artifact.contentHash}".`);
  }
  if (!MODEL_CAPABILITY_STATUSES.includes(artifact.modelCapabilityStatus)) {
    throw new Error(`EngineeringArtifactExport.modelCapabilityStatus is not recognized: "${String(artifact.modelCapabilityStatus)}".`);
  }
  artifact.evidenceRefs.forEach((ref, i) => validateCanonicalRef(ref, `evidenceRefs[${i}]`));
}

// ---------------------------------------------------------------------------
// MAP INTO ORCHADE CONTRACT
// ---------------------------------------------------------------------------

/**
 * Orchade's closed EquipmentCapability vocabulary. LogicHub's
 * EngineeringArtifactExport.capabilities is free-form strings (LogicHub
 * serves domains Orchade has no vocabulary for) -- a capability string
 * outside this set is not an error, just not translatable yet. It is
 * recorded in the resulting twin's performanceModel.limitations rather
 * than silently dropped or blindly cast past the type system.
 */
const KNOWN_EQUIPMENT_CAPABILITIES = new Set<EquipmentCapability>([
  'MOVE_WATER', 'STORE_WATER', 'MEASURE_WATER', 'MEASURE_SOIL', 'GENERATE_ENERGY',
  'STORE_ENERGY', 'CONVERT_ENERGY', 'CONTROL_IRRIGATION', 'VENTILATE', 'ILLUMINATE',
  'PROCESS_BIOMASS', 'REPORT_TELEMETRY',
]);

function splitKnownCapabilities(raw: string[]): { known: EquipmentCapability[]; unknown: string[] } {
  const known: EquipmentCapability[] = [];
  const unknown: string[] = [];
  for (const capability of raw) {
    if (KNOWN_EQUIPMENT_CAPABILITIES.has(capability as EquipmentCapability)) known.push(capability as EquipmentCapability);
    else unknown.push(capability);
  }
  return { known, unknown };
}

export interface MapEngineeringArtifactInput {
  artifact: EngineeringArtifactExport;
  twinId: string;
  twinRevisionId: string;
  name: string;
  equipmentClass: EquipmentClass;
  manufacturer?: string;
  model?: string;
}

/**
 * MAP INTO ORCHADE CONTRACT. Always produces lifecycleStatus: 'DRAFT' --
 * spec Part 8/13: "LogicHub source does not imply verified." Physical/
 * operating/resource fields not present in the export stay absent (real
 * UNKNOWN), never defaulted to zero. performanceModel.modelType is always
 * 'NOT_MODELED': LogicHub does not export a performance model today, and
 * claiming one exists here would misrepresent capability the same way
 * Part 10's "do not silently manufacture missing engineering constraints"
 * forbids.
 */
export function mapEngineeringArtifactToEquipmentTwin(input: MapEngineeringArtifactInput): EquipmentTwinDefinition {
  const { artifact } = input;
  const { known: capabilities, unknown: unrecognizedCapabilities } = splitKnownCapabilities(artifact.capabilities);

  const limitations = [...artifact.limitations];
  if (unrecognizedCapabilities.length > 0) {
    limitations.push(
      `LogicHub declared ${unrecognizedCapabilities.length} capability/capabilities Orchade does not have a vocabulary for yet: ${unrecognizedCapabilities.join(', ')}.`,
    );
  }
  if (!artifact.physicalParameters) limitations.push('LogicHub export carried no physicalParameters.');
  if (!artifact.operatingEnvelope) limitations.push('LogicHub export carried no operatingEnvelope.');
  if (!artifact.resourceRequirements) limitations.push('LogicHub export carried no resourceRequirements.');

  return createEquipmentTwinRevision({
    twinId: input.twinId,
    revisionId: input.twinRevisionId,
    name: input.name,
    equipmentClass: input.equipmentClass,
    source: {
      type: 'LOGICHUB',
      logicHubProjectRef: artifact.engineeringProjectRef.entityId,
      logicHubRevisionId: artifact.engineeringRevisionRef.revisionId,
      logicHubContentHash: artifact.contentHash,
      manufacturer: input.manufacturer,
      model: input.model,
    },
    capabilities,
    resourcePorts: [],
    physical: {
      weightKg: artifact.physicalParameters?.weightKg,
      provenanceRefs: [],
    },
    operatingEnvelope: {
      ratedPowerW: artifact.operatingEnvelope?.ratedPowerW,
      maximumContinuousRuntimeMinutes: artifact.operatingEnvelope?.maximumContinuousRuntimeMinutes,
      dutyCyclePercent: artifact.operatingEnvelope?.dutyCyclePercent,
      additionalConstraints: [],
      provenanceRefs: [],
    },
    performanceModel: {
      modelId: `${artifact.engineeringProjectRef.entityId}-imported`,
      modelVersion: artifact.engineeringRevisionRef.revisionId ?? '0',
      modelType: 'NOT_MODELED',
      inputs: [],
      outputs: [],
      parameterRefs: [],
      evidenceRefs: [],
      limitations,
    },
    telemetry: [],
    controls: [],
    maintenance: { provenanceRefs: [] },
    economics: { currency: 'INR', provenanceRefs: [] },
    failureModes: [],
    parameterProvenanceRefs: [],
    evidenceRefs: [],
    modelCapabilityStatus: artifact.modelCapabilityStatus,
    lifecycleStatus: 'DRAFT',
  });
}

// ---------------------------------------------------------------------------
// FULL PIPELINE
// ---------------------------------------------------------------------------

export interface ImportLogicHubArtifactInput {
  artifact: EngineeringArtifactExport;
  /** The exact bytes artifact.contentHash was computed over -- see verifyContentHash(). */
  rawJson: string;
  twinId: string;
  twinRevisionId: string;
  name: string;
  equipmentClass: EquipmentClass;
  manufacturer?: string;
  model?: string;
}

/**
 * FETCH -> SCHEMA VALIDATE -> HASH VERIFY -> SNAPSHOT/PIN -> MAP.
 * Stops short of "USER ACCEPTS IMPORT" -- that's a caller-side decision
 * (e.g. a UI confirmation) this function cannot make on its own. Call
 * acceptLogicHubImport() with this function's result once accepted.
 */
export async function importLogicHubArtifact(input: ImportLogicHubArtifactInput): Promise<EquipmentTwinDefinition> {
  validateEngineeringArtifactExport(input.artifact);
  await verifyContentHash(input.rawJson, input.artifact.contentHash);
  return mapEngineeringArtifactToEquipmentTwin(input);
}

/**
 * USER ACCEPTS IMPORT -> CREATE CANDIDATE. Explicit, separate call so an
 * import can be inspected before anything is added to a property -- never
 * automatic. Produces a PropertyEquipmentInstance with realityStatus
 * 'CANDIDATE', pinned to the property/revision the caller names; does not
 * create a PropertyRevision itself (see module doc).
 */
export function acceptLogicHubImport(
  twin: EquipmentTwinDefinition,
  twinRegistry: EquipmentTwinRegistry,
  instanceInput: Omit<CreatePropertyEquipmentInstanceInput, 'equipmentTwinId' | 'equipmentTwinRevisionId' | 'realityStatus'>,
): PropertyEquipmentInstance {
  return createPropertyEquipmentInstance(
    {
      ...instanceInput,
      equipmentTwinId: twin.twinId,
      equipmentTwinRevisionId: twin.revisionId,
      realityStatus: 'CANDIDATE',
    },
    twinRegistry,
  );
}
