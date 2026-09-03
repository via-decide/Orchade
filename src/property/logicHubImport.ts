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
 * The types below come from `interop/generated/engineering-artifact-export.ts`
 * -- a generated, import-free snapshot produced by kup-program's
 * `npm run generate:consumer-types` and committed verbatim, pinned by
 * `interop/contract-lock.json` (spec #54/Part 6). This used to be a
 * hand-authored mirror of the same shapes; the risk with that (found in
 * independent review) is silent drift the moment kup-program's source
 * schema changes and nobody remembers to update the hand-copy here.
 * Orchade's Property Model v1 still uses no schema library anywhere
 * (validateEquipmentTwinDefinition, validatePropertyGraph etc. are all
 * hand-rolled) -- the runtime validation below stays hand-rolled to match
 * that convention; only the *type declarations* are generated now, not the
 * validation logic.
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
import type {
  KupCanonicalRef,
  EngineeringArtifactExport,
  EngineeringInterface,
  PhysicalQuantity,
} from '../../interop/generated/engineering-artifact-export';

export type {
  KupCanonicalRef,
  EngineeringArtifactExport,
  EngineeringInterface,
  PhysicalQuantity,
} from '../../interop/generated/engineering-artifact-export';
export type KupSystem = KupCanonicalRef['system'];
export type ModelCapabilityStatus = EngineeringArtifactExport['modelCapabilityStatus'];

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
 * Deterministic JSON serialization: object keys sorted recursively. Two
 * byte-different JSON serializations of the same object ({"a":1,"b":2} vs
 * {"b":2,"a":1}) are semantically identical but hash differently under a
 * naive JSON.stringify() -- kup-program's contracts/stack/v1/src/hash.ts
 * freezes this as the required contentHash computation for every
 * structured KUP payload (`sha256OfCanonicalJson`, same algorithm). This is
 * that same reference algorithm reimplemented against Web Crypto instead of
 * node:crypto, since this module runs in the browser bundle -- not a
 * divergent hand-copy, a required platform-specific port of one frozen
 * algorithm. Must key-sort identically to kup-program's implementation or
 * cross-system hash comparison silently breaks.
 */
export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortKeysDeep(source[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Spec Part 25: hash mismatch -> INTEGRITY_FAILURE, no silent fallback.
 * `rawJson` must be the exact bytes the producer's contentHash was computed
 * over -- verifying against a re-serialized copy of the parsed object would
 * not actually prove the bytes are untampered. Callers that construct
 * `rawJson` themselves (rather than receiving it as-is over the wire) must
 * build it with `canonicalJsonStringify`, matching how the hash was
 * produced -- see LhPump001Fixture.
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
const KNOWN_INTERFACE_CATEGORIES: readonly EngineeringInterface['category'][] = [
  'ELECTRICAL', 'MECHANICAL', 'FLUID', 'THERMAL', 'DATA', 'UNKNOWN',
];
const KNOWN_QUANTITY_METRICS: readonly PhysicalQuantity['metric'][] = [
  'MASS', 'POWER', 'FLOW_RATE', 'RUNTIME', 'DUTY_CYCLE', 'PRESSURE', 'HEAD',
  'ENERGY', 'TEMPERATURE', 'VOLTAGE', 'CURRENT', 'EFFICIENCY', 'AREA', 'CAPACITY',
];
const KNOWN_QUANTITY_UNITS: readonly PhysicalQuantity['unit'][] = [
  'KG', 'W', 'KW', 'L_PER_MIN', 'M3_PER_HOUR', 'MINUTES', 'HOURS', 'PERCENT',
  'BAR', 'PA', 'M', 'KWH', 'J', 'CELSIUS', 'KELVIN', 'V', 'A', 'M2', 'L', 'DIMENSIONLESS',
];

function validateCanonicalRef(ref: KupCanonicalRef, field: string): void {
  if (!ref) throw new Error(`EngineeringArtifactExport requires ${field}.`);
  requireNonEmpty(ref.entityId, `${field}.entityId`);
  requireNonEmpty(ref.schemaVersion, `${field}.schemaVersion`);
  if (!(['KUP', 'LOGICHUB', 'ORCHADE', 'VIADECIDE'] as const).includes(ref.system)) {
    throw new Error(`CONTRACT_INCOMPATIBLE: ${field}.system is not a known KUP system: ${String(ref.system)}.`);
  }
}

/**
 * Runtime counterpart to kup-program's discriminated union: this repo has
 * no schema library to enforce it at parse time, so an untrusted/unverified
 * payload (this function's whole job) needs the same "UNKNOWN requires a
 * sourceInterfaceRef" invariant checked by hand, or a malformed export with
 * a bare, untraceable UNKNOWN interface would pass straight through.
 */
function validateInterface(iface: EngineeringInterface, field: string): void {
  if (!iface || !KNOWN_INTERFACE_CATEGORIES.includes(iface.category)) {
    throw new Error(`CONTRACT_INCOMPATIBLE: ${field}.category is not a known interface category: ${String(iface?.category)}.`);
  }
  requireNonEmpty(iface.name, `${field}.name`);
  if (iface.category === 'UNKNOWN') {
    requireNonEmpty(iface.sourceInterfaceRef, `${field}.sourceInterfaceRef`);
  }
}

function validateQuantity(q: PhysicalQuantity, field: string): void {
  if (!q) throw new Error(`EngineeringArtifactExport requires ${field}.`);
  if (!KNOWN_QUANTITY_METRICS.includes(q.metric)) {
    throw new Error(`CONTRACT_INCOMPATIBLE: ${field}.metric is not a known quantity metric: ${String(q.metric)}.`);
  }
  if (!KNOWN_QUANTITY_UNITS.includes(q.unit)) {
    throw new Error(`CONTRACT_INCOMPATIBLE: ${field}.unit is not a known quantity unit: ${String(q.unit)}.`);
  }
  if (typeof q.value !== 'number' || Number.isNaN(q.value)) {
    throw new Error(`${field}.value must be a number, got: ${String(q.value)}.`);
  }
}

function validateQuantityArray(quantities: PhysicalQuantity[] | undefined, field: string): void {
  quantities?.forEach((q, i) => validateQuantity(q, `${field}[${i}]`));
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
  artifact.interfaces.forEach((iface, i) => validateInterface(iface, `interfaces[${i}]`));
  validateQuantityArray(artifact.physicalParameters, 'physicalParameters');
  validateQuantityArray(artifact.operatingEnvelope, 'operatingEnvelope');
  validateQuantityArray(artifact.resourceRequirements, 'resourceRequirements');
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

/**
 * Looks up one typed quantity by metric (+ optional unit) rather than
 * indexing a bare Record by an assumed key name (the old
 * `artifact.physicalParameters?.weightKg` pattern this replaces) -- absence
 * returns undefined, a legitimate state Orchade's own fields already treat
 * as real UNKNOWN, not an error.
 */
function findQuantityValue(
  quantities: PhysicalQuantity[] | undefined,
  metric: PhysicalQuantity['metric'],
  unit?: PhysicalQuantity['unit'],
): number | undefined {
  return quantities?.find((q) => q.metric === metric && (unit === undefined || q.unit === unit))?.value;
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
      weightKg: findQuantityValue(artifact.physicalParameters, 'MASS', 'KG'),
      provenanceRefs: [],
    },
    operatingEnvelope: {
      ratedPowerW: findQuantityValue(artifact.operatingEnvelope, 'POWER', 'W'),
      maximumContinuousRuntimeMinutes: findQuantityValue(artifact.operatingEnvelope, 'RUNTIME', 'MINUTES'),
      dutyCyclePercent: findQuantityValue(artifact.operatingEnvelope, 'DUTY_CYCLE', 'PERCENT'),
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
