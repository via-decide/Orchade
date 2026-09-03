/**
 * EquipmentTwin v1 (Parts 5-13 of ORCHADE P0).
 *
 * EquipmentTwinDefinition describes a specific model/revision of equipment.
 * It is never the same object as PropertyEquipmentInstance (propertyEquipment.ts),
 * which describes one placement of one exact twin revision inside one
 * property revision. Updating a twin definition must never rewrite a
 * historical property or simulation run -- callers pin exact revisions.
 *
 * Reuses PR #53 contracts rather than inventing parallel ones:
 * ParameterOrigin (provenance.ts), ModelCapabilityStatus (modelCapabilities.ts),
 * ActuatorCommandType (control.ts).
 */
import type { ActuatorCommandType } from '../simulation/homestead/control';
import type { ModelCapabilityStatus } from '../simulation/homestead/modelCapabilities';
import type { ParameterOrigin } from '../simulation/homestead/provenance';

export type EquipmentClass =
  | 'WATER_PUMP'
  | 'WATER_TANK'
  | 'IRRIGATION_CONTROLLER'
  | 'IRRIGATION_DISTRIBUTION'
  | 'SOIL_SENSOR'
  | 'WEATHER_STATION'
  | 'FLOW_METER'
  | 'ENERGY_METER'
  | 'SOLAR_ARRAY'
  | 'BATTERY'
  | 'INVERTER'
  | 'GREENHOUSE_SYSTEM'
  | 'VENTILATION'
  | 'LIGHTING'
  | 'COMPOST_SYSTEM'
  | 'OTHER';

export type EquipmentTwinSourceType = 'LOGICHUB' | 'DAXINI' | 'EXTERNAL' | 'USER_DEFINED';

export interface EquipmentTwinSource {
  type: EquipmentTwinSourceType;
  logicHubProjectRef?: string;
  /**
   * Set when this twin came through the real KUP-STACK-001D import adapter
   * (src/property/logicHubImport.ts): the exact LogicHub Revision id and
   * EngineeringArtifactExport contentHash the import was pinned to, so a
   * later LogicHub revision can never be mistaken for the one this twin was
   * actually built from. Absent on twins created any other way (including
   * fixtures that only set logicHubProjectRef by hand).
   */
  logicHubRevisionId?: string;
  logicHubContentHash?: string;
  daxiniProductRef?: string;
  externalProductRef?: string;
  manufacturer?: string;
  model?: string;
  sourceRevision?: string;
}

export type EquipmentCapability =
  | 'MOVE_WATER'
  | 'STORE_WATER'
  | 'MEASURE_WATER'
  | 'MEASURE_SOIL'
  | 'GENERATE_ENERGY'
  | 'STORE_ENERGY'
  | 'CONVERT_ENERGY'
  | 'CONTROL_IRRIGATION'
  | 'VENTILATE'
  | 'ILLUMINATE'
  | 'PROCESS_BIOMASS'
  | 'REPORT_TELEMETRY';

export type EquipmentResourceType = 'WATER' | 'ENERGY' | 'DATA' | 'BIOMASS' | 'FEED' | 'NUTRIENTS' | 'AIR' | 'MATERIAL';

export interface EquipmentResourcePort {
  portId: string;
  resourceType: EquipmentResourceType;
  direction: 'INPUT' | 'OUTPUT' | 'BIDIRECTIONAL';
  required: boolean;
  canonicalUnit?: string;
  capacity?: {
    minimum?: number;
    nominal?: number;
    maximum?: number;
  };
  provenanceRefs: string[];
}

export interface EquipmentConstraint {
  description: string;
  parameterRef?: string;
}

export interface EquipmentOperatingEnvelope {
  temperatureC?: { min?: number; max?: number };
  humidityPercent?: { min?: number; max?: number };
  inputVoltageV?: { min?: number; nominal?: number; max?: number };
  ratedPowerW?: number;
  maximumContinuousRuntimeMinutes?: number;
  dutyCyclePercent?: number;
  additionalConstraints: EquipmentConstraint[];
  provenanceRefs: string[];
}

export type EquipmentPerformanceModelType = 'CONSTANT' | 'LOOKUP' | 'EQUATION' | 'EXTERNAL_ADAPTER' | 'NOT_MODELED';

export interface EquipmentPerformanceModel {
  modelId: string;
  modelVersion: string;
  modelType: EquipmentPerformanceModelType;
  inputs: string[];
  outputs: string[];
  parameterRefs: string[];
  evidenceRefs: string[];
  limitations: string[];
}

export interface EquipmentTelemetryDefinition {
  /** Human-readable label for what this telemetry channel reports (e.g. "tank level"). */
  label: string;
  /** When this telemetry maps onto an existing PR #53 canonical metric, name it here so DeviceSource attachment can validate against it. Free text otherwise. */
  observationMetric?: string;
  canonicalUnit?: string;
  provenanceRefs: string[];
}

export interface EquipmentControlDefinition {
  actuatorCommandType: ActuatorCommandType;
  description: string;
  safetyEnvelopeRef: string;
  provenanceRefs: string[];
}

export interface EquipmentMaintenanceModel {
  recommendedIntervalDays?: number;
  estimatedMinutesPerService?: number;
  costPerServiceEstimate?: number;
  provenanceRefs: string[];
}

export interface EquipmentEconomicModel {
  currency: 'INR';
  purchaseCostEstimate?: number;
  installCostEstimate?: number;
  dailyOperatingCostEstimate?: number;
  provenanceRefs: string[];
}

export type EquipmentFailureModeSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EquipmentFailureMode {
  id: string;
  description: string;
  severity: EquipmentFailureModeSeverity;
  detectable: boolean;
  relatedTelemetryLabels: string[];
  provenanceRefs: string[];
}

export interface EquipmentPhysicalSpecification {
  weightKg?: number;
  dimensionsM?: { widthM: number; depthM: number; heightM: number };
  provenanceRefs: string[];
}

export type EquipmentTwinLifecycleStatus = 'DRAFT' | 'SIMULATION_READY' | 'BENCH_VERIFIED' | 'FIELD_VERIFIED' | 'RETIRED';

export const EQUIPMENT_TWIN_SCHEMA_VERSION = '1.0.0' as const;

export interface EquipmentTwinDefinition {
  twinId: string;
  schemaVersion: typeof EQUIPMENT_TWIN_SCHEMA_VERSION;
  revisionId: string;
  parentRevisionId?: string;
  name: string;
  equipmentClass: EquipmentClass;
  source: EquipmentTwinSource;
  capabilities: EquipmentCapability[];
  resourcePorts: EquipmentResourcePort[];
  physical: EquipmentPhysicalSpecification;
  operatingEnvelope: EquipmentOperatingEnvelope;
  performanceModel: EquipmentPerformanceModel;
  telemetry: EquipmentTelemetryDefinition[];
  controls: EquipmentControlDefinition[];
  maintenance: EquipmentMaintenanceModel;
  economics: EquipmentEconomicModel;
  failureModes: EquipmentFailureMode[];
  parameterProvenanceRefs: string[];
  /**
   * Per-field provenance for this twin's key numeric assumptions (Part 12),
   * e.g. { ratedPowerW: 'MEASURED', dailyWaterMovementCapacityL: 'RESEARCHED' }.
   * Reuses PR #53's ParameterOrigin -- not a second provenance enum. A key
   * absent here means its origin has not been recorded, not that it is
   * MEASURED by default.
   */
  parameterOrigins: Partial<Record<string, ParameterOrigin>>;
  evidenceRefs: string[];
  modelCapabilityStatus: ModelCapabilityStatus;
  lifecycleStatus: EquipmentTwinLifecycleStatus;
}

/** Closed whitelist, not a second conversion system -- just a validity guard for port/telemetry units. */
const KNOWN_EQUIPMENT_UNITS = new Set([
  'L', 'L/min', 'L/day', 'kWh', 'kWh/day', 'kW', 'W', 'm2', 'm3', 'kg', 'kg/day',
  'ratio', 'percent', 'degC', 'min', 'day', 'INR', 'count', 'V',
]);

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`EquipmentTwinDefinition requires ${field}.`);
}

function requireFiniteIfPresent(value: number | undefined, field: string): void {
  if (value !== undefined && !Number.isFinite(value)) throw new Error(`EquipmentTwinDefinition field ${field} must be finite (got ${String(value)}).`);
}

function requireNonNegativeIfPresent(value: number | undefined, field: string): void {
  requireFiniteIfPresent(value, field);
  if (value !== undefined && value < 0) throw new Error(`EquipmentTwinDefinition field ${field} must not be negative (got ${value}).`);
}

function validateResourcePort(port: EquipmentResourcePort): void {
  requireNonEmpty(port.portId, 'resourcePorts[].portId');
  if (port.canonicalUnit && !KNOWN_EQUIPMENT_UNITS.has(port.canonicalUnit)) {
    throw new Error(`Unsupported physical unit for resource port ${port.portId}: ${port.canonicalUnit}.`);
  }
  if (port.capacity) {
    requireNonNegativeIfPresent(port.capacity.minimum, `resourcePorts[${port.portId}].capacity.minimum`);
    requireNonNegativeIfPresent(port.capacity.nominal, `resourcePorts[${port.portId}].capacity.nominal`);
    requireNonNegativeIfPresent(port.capacity.maximum, `resourcePorts[${port.portId}].capacity.maximum`);
    const { minimum, nominal, maximum } = port.capacity;
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      throw new Error(`Resource port ${port.portId} has minimum capacity greater than maximum.`);
    }
    if (nominal !== undefined && minimum !== undefined && nominal < minimum) {
      throw new Error(`Resource port ${port.portId} has nominal capacity below minimum.`);
    }
    if (nominal !== undefined && maximum !== undefined && nominal > maximum) {
      throw new Error(`Resource port ${port.portId} has nominal capacity above maximum.`);
    }
  }
}

function validateOperatingEnvelope(envelope: EquipmentOperatingEnvelope): void {
  requireFiniteIfPresent(envelope.temperatureC?.min, 'operatingEnvelope.temperatureC.min');
  requireFiniteIfPresent(envelope.temperatureC?.max, 'operatingEnvelope.temperatureC.max');
  requireNonNegativeIfPresent(envelope.humidityPercent?.min, 'operatingEnvelope.humidityPercent.min');
  requireNonNegativeIfPresent(envelope.humidityPercent?.max, 'operatingEnvelope.humidityPercent.max');
  requireNonNegativeIfPresent(envelope.inputVoltageV?.min, 'operatingEnvelope.inputVoltageV.min');
  requireNonNegativeIfPresent(envelope.inputVoltageV?.nominal, 'operatingEnvelope.inputVoltageV.nominal');
  requireNonNegativeIfPresent(envelope.inputVoltageV?.max, 'operatingEnvelope.inputVoltageV.max');
  requireNonNegativeIfPresent(envelope.ratedPowerW, 'operatingEnvelope.ratedPowerW');
  requireNonNegativeIfPresent(envelope.maximumContinuousRuntimeMinutes, 'operatingEnvelope.maximumContinuousRuntimeMinutes');
  requireNonNegativeIfPresent(envelope.dutyCyclePercent, 'operatingEnvelope.dutyCyclePercent');
  if (envelope.temperatureC?.min !== undefined && envelope.temperatureC?.max !== undefined && envelope.temperatureC.min > envelope.temperatureC.max) {
    throw new Error('operatingEnvelope.temperatureC.min must not exceed max.');
  }
}

function validatePerformanceModel(model: EquipmentPerformanceModel): void {
  requireNonEmpty(model.modelId, 'performanceModel.modelId');
  requireNonEmpty(model.modelVersion, 'performanceModel.modelVersion');
  if (!(['CONSTANT', 'LOOKUP', 'EQUATION', 'EXTERNAL_ADAPTER', 'NOT_MODELED'] as const).includes(model.modelType)) {
    throw new Error(`Unsupported equipment performance model type: ${String(model.modelType)}.`);
  }
}

/**
 * Validates a twin definition. Deliberately does NOT check that missing
 * optional fields get filled in -- Part 10/11's rule is that missing data
 * stays missing (undefined), never silently defaulted or guessed.
 */
export function validateEquipmentTwinDefinition(twin: EquipmentTwinDefinition): void {
  requireNonEmpty(twin.twinId, 'twinId');
  requireNonEmpty(twin.revisionId, 'revisionId');
  requireNonEmpty(twin.name, 'name');
  if (twin.schemaVersion !== EQUIPMENT_TWIN_SCHEMA_VERSION) throw new Error(`Unsupported EquipmentTwinDefinition schema version: ${String(twin.schemaVersion)}.`);
  if (twin.parentRevisionId === twin.revisionId) throw new Error('EquipmentTwinDefinition revisionId must differ from parentRevisionId.');

  const source = twin.source;
  if (source.type === 'LOGICHUB' && !source.logicHubProjectRef?.trim()) throw new Error('A LOGICHUB-sourced twin requires logicHubProjectRef.');
  if (source.type === 'DAXINI' && !source.daxiniProductRef?.trim()) throw new Error('A DAXINI-sourced twin requires daxiniProductRef.');
  if (source.type === 'EXTERNAL' && !source.externalProductRef?.trim()) throw new Error('An EXTERNAL-sourced twin requires externalProductRef.');

  const portIds = new Set<string>();
  twin.resourcePorts.forEach(port => {
    if (portIds.has(port.portId)) throw new Error(`Duplicate resource port id: ${port.portId}.`);
    portIds.add(port.portId);
    validateResourcePort(port);
  });

  validateOperatingEnvelope(twin.operatingEnvelope);
  validatePerformanceModel(twin.performanceModel);

  const failureModeIds = new Set<string>();
  twin.failureModes.forEach(mode => {
    requireNonEmpty(mode.id, 'failureModes[].id');
    if (failureModeIds.has(mode.id)) throw new Error(`Duplicate failure mode id: ${mode.id}.`);
    failureModeIds.add(mode.id);
  });

  if (!(['SUPPORTED', 'ESTIMATE_ONLY', 'NOT_MODELED'] as const).includes(twin.modelCapabilityStatus)) {
    throw new Error(`Unsupported model capability status: ${String(twin.modelCapabilityStatus)}.`);
  }
  if (!(['DRAFT', 'SIMULATION_READY', 'BENCH_VERIFIED', 'FIELD_VERIFIED', 'RETIRED'] as const).includes(twin.lifecycleStatus)) {
    throw new Error(`Unsupported equipment twin lifecycle status: ${String(twin.lifecycleStatus)}.`);
  }
}

export interface CreateEquipmentTwinRevisionInput {
  twinId: string;
  revisionId: string;
  parentRevisionId?: string;
  name: string;
  equipmentClass: EquipmentClass;
  source: EquipmentTwinSource;
  capabilities: EquipmentCapability[];
  resourcePorts: EquipmentResourcePort[];
  physical: EquipmentPhysicalSpecification;
  operatingEnvelope: EquipmentOperatingEnvelope;
  performanceModel: EquipmentPerformanceModel;
  telemetry: EquipmentTelemetryDefinition[];
  controls: EquipmentControlDefinition[];
  maintenance: EquipmentMaintenanceModel;
  economics: EquipmentEconomicModel;
  failureModes: EquipmentFailureMode[];
  parameterProvenanceRefs: string[];
  parameterOrigins?: Partial<Record<string, ParameterOrigin>>;
  evidenceRefs: string[];
  modelCapabilityStatus: ModelCapabilityStatus;
  /** Defaults to DRAFT: a LogicHub/Daxini source never implies verification (Part 7, Part 13). */
  lifecycleStatus?: EquipmentTwinLifecycleStatus;
}

/**
 * The only sanctioned way to create or revise an EquipmentTwinDefinition.
 * Always returns a brand-new object; never mutates a parent revision passed
 * elsewhere in the caller's code.
 */
export function createEquipmentTwinRevision(input: CreateEquipmentTwinRevisionInput): EquipmentTwinDefinition {
  const twin: EquipmentTwinDefinition = {
    twinId: input.twinId,
    schemaVersion: EQUIPMENT_TWIN_SCHEMA_VERSION,
    revisionId: input.revisionId,
    parentRevisionId: input.parentRevisionId,
    name: input.name,
    equipmentClass: input.equipmentClass,
    source: { ...input.source },
    capabilities: [...input.capabilities],
    resourcePorts: input.resourcePorts.map(port => ({ ...port, capacity: port.capacity ? { ...port.capacity } : undefined, provenanceRefs: [...port.provenanceRefs] })),
    physical: { ...input.physical, provenanceRefs: [...input.physical.provenanceRefs] },
    operatingEnvelope: { ...input.operatingEnvelope, additionalConstraints: [...input.operatingEnvelope.additionalConstraints], provenanceRefs: [...input.operatingEnvelope.provenanceRefs] },
    performanceModel: { ...input.performanceModel, inputs: [...input.performanceModel.inputs], outputs: [...input.performanceModel.outputs], parameterRefs: [...input.performanceModel.parameterRefs], evidenceRefs: [...input.performanceModel.evidenceRefs], limitations: [...input.performanceModel.limitations] },
    telemetry: input.telemetry.map(item => ({ ...item, provenanceRefs: [...item.provenanceRefs] })),
    controls: input.controls.map(item => ({ ...item, provenanceRefs: [...item.provenanceRefs] })),
    maintenance: { ...input.maintenance, provenanceRefs: [...input.maintenance.provenanceRefs] },
    economics: { ...input.economics, provenanceRefs: [...input.economics.provenanceRefs] },
    failureModes: input.failureModes.map(mode => ({ ...mode, relatedTelemetryLabels: [...mode.relatedTelemetryLabels], provenanceRefs: [...mode.provenanceRefs] })),
    parameterProvenanceRefs: [...input.parameterProvenanceRefs],
    parameterOrigins: { ...(input.parameterOrigins ?? {}) },
    evidenceRefs: [...input.evidenceRefs],
    modelCapabilityStatus: input.modelCapabilityStatus,
    lifecycleStatus: input.lifecycleStatus ?? 'DRAFT',
  };
  validateEquipmentTwinDefinition(twin);
  return twin;
}

const ALLOWED_LIFECYCLE_TRANSITIONS: Record<EquipmentTwinLifecycleStatus, EquipmentTwinLifecycleStatus[]> = {
  DRAFT: ['SIMULATION_READY', 'RETIRED'],
  SIMULATION_READY: ['BENCH_VERIFIED', 'RETIRED'],
  BENCH_VERIFIED: ['FIELD_VERIFIED', 'RETIRED'],
  FIELD_VERIFIED: ['RETIRED'],
  RETIRED: [],
};

const TRANSITIONS_REQUIRING_EVIDENCE = new Set<EquipmentTwinLifecycleStatus>(['BENCH_VERIFIED', 'FIELD_VERIFIED']);

/**
 * The only sanctioned way to change lifecycleStatus. Every transition is
 * explicit and one step at a time (never DRAFT -> FIELD_VERIFIED, never
 * SIMULATION_READY -> BENCH_VERIFIED without evidence).
 *
 * Always allocates a brand-new revision, chained via parentRevisionId to
 * the twin being promoted -- it never reuses the input twin's revisionId.
 * Reusing the id would either collide as a duplicate when registered
 * (`registerEquipmentTwinRevision` rejects it) or, if a caller replaced
 * the old entry in place instead, silently rewrite the exact revision
 * historical `PropertyEquipmentInstance`s are pinned to.
 */
export function promoteEquipmentTwinLifecycle(
  twin: EquipmentTwinDefinition,
  nextStatus: EquipmentTwinLifecycleStatus,
  evidenceRefs: string[],
  nextRevisionId: string,
): EquipmentTwinDefinition {
  const allowed = ALLOWED_LIFECYCLE_TRANSITIONS[twin.lifecycleStatus];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot promote equipment twin ${twin.twinId} from ${twin.lifecycleStatus} directly to ${nextStatus}.`);
  }
  if (TRANSITIONS_REQUIRING_EVIDENCE.has(nextStatus) && evidenceRefs.length === 0) {
    throw new Error(`Promoting to ${nextStatus} requires at least one evidence reference.`);
  }
  if (nextRevisionId === twin.revisionId) {
    throw new Error(`Lifecycle promotion requires a new revisionId (got the same id as the current revision: ${twin.revisionId}).`);
  }
  return {
    ...twin,
    revisionId: nextRevisionId,
    parentRevisionId: twin.revisionId,
    lifecycleStatus: nextStatus,
    evidenceRefs: [...new Set([...twin.evidenceRefs, ...evidenceRefs])],
  };
}

/** Append-only twin catalog: every revision of every twin, keyed for lookup. Never mutate in place. */
export type EquipmentTwinRegistry = Readonly<Record<string, readonly EquipmentTwinDefinition[]>>;

export function registerEquipmentTwinRevision(registry: EquipmentTwinRegistry, twin: EquipmentTwinDefinition): EquipmentTwinRegistry {
  const existing = registry[twin.twinId] ?? [];
  if (existing.some(item => item.revisionId === twin.revisionId)) {
    throw new Error(`Equipment twin ${twin.twinId} already has revision ${twin.revisionId}.`);
  }
  return { ...registry, [twin.twinId]: [...existing, twin] };
}

export function getEquipmentTwinRevision(registry: EquipmentTwinRegistry, twinId: string, revisionId: string): EquipmentTwinDefinition | undefined {
  return (registry[twinId] ?? []).find(item => item.revisionId === revisionId);
}
