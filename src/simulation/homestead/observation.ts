import type {
  EvidenceRecord,
  ObservationQuality,
  ObservationRecord,
  ObservationSourceTrust,
  ObservationSourceType,
  ObservationValidationStatus,
  ProjectHomesteadState,
} from './projectState';
import { convertPhysicalUnit, normalizeUnitToken } from './units';

export type ObservationMetric =
  | 'tank_level_l'
  | 'pond_level_l'
  | 'rainfall_mm'
  | 'soil_moisture_percent'
  | 'temperature_c'
  | 'battery_energy_kwh'
  | 'battery_soc_percent'
  | 'solar_generation_kwh'
  | 'grid_import_kwh'
  | 'pump_load_kwh'
  | 'flow_rate_lpm';

export type DeviceKind =
  | 'SOIL_PROBE'
  | 'WEATHER_STATION'
  | 'RAIN_GAUGE'
  | 'TANK_LEVEL'
  | 'POND_LEVEL'
  | 'FLOW_METER'
  | 'ENERGY_METER'
  | 'SOLAR_INVERTER'
  | 'BATTERY_BMS'
  | 'PUMP_MONITOR'
  | 'GREENHOUSE_NODE'
  | 'LOAD_CELL'
  | 'CAMERA'
  | 'SIMULATED_SOURCE';

export interface DeviceSource {
  deviceId: string;
  propertyId: string;
  entityId?: string;
  kind: DeviceKind;
  protocol?: string;
  metrics: string[];
  calibrationRef?: string;
  calibrationRequired?: boolean;
  enabled: boolean;
  trust: ObservationSourceTrust;
  verificationRef?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface RawObservation {
  id: string;
  propertyId: string;
  scenarioId?: string;
  entityId?: string;
  tick?: number;
  simulationTick?: number;
  observedAt?: string;
  receivedAt?: string;
  metric: string;
  value: number;
  unit: string;
  sourceType: ObservationSourceType;
  sourceId: string;
  quality?: ObservationQuality;
  calibrationRef?: string;
  provenanceRef?: string;
  sequence?: number;
  evidenceRefs?: string[];
  verificationRef?: string;
}

export type ObservationValidationReasonCode =
  | 'UNSUPPORTED_METRIC'
  | 'NON_FINITE_VALUE'
  | 'UNSUPPORTED_UNIT'
  | 'UNKNOWN_SOURCE'
  | 'SOURCE_DISABLED'
  | 'SOURCE_REVOKED'
  | 'SOURCE_UNVERIFIED'
  | 'SOURCE_METRIC_UNSUPPORTED'
  | 'SOURCE_PROPERTY_MISMATCH'
  | 'SOURCE_ENTITY_MISMATCH'
  | 'UNKNOWN_ENTITY'
  | 'DUPLICATE_ID'
  | 'DUPLICATE_SEQUENCE'
  | 'SIMULATION_TICK_REQUIRED'
  | 'OBSERVED_AT_REQUIRED'
  | 'REFERENCE_TIME_REQUIRED'
  | 'INVALID_TIMESTAMP'
  | 'STALE_OBSERVATION'
  | 'FUTURE_OBSERVATION'
  | 'CALIBRATION_REQUIRED'
  | 'INVALID_CALIBRATION_REF'
  | 'IMPOSSIBLE_VALUE'
  | 'ABOVE_PHYSICAL_CAPACITY';

export interface ObservationValidationContext {
  propertyId: string;
  scenarioId?: string;
  state: ProjectHomesteadState;
  devices: DeviceSource[];
  knownNonDeviceSources?: string[];
  knownObservationIds?: string[];
  seenDeviceSequences?: Array<{ sourceId: string; sequence: number }>;
  calibrationRefs?: string[];
  knownEntityIds?: string[];
  referenceTimeIso?: string;
  staleAfterMs?: number;
  futureToleranceMs?: number;
}

export interface ObservationValidationResult {
  status: ObservationValidationStatus;
  reasonCodes: ObservationValidationReasonCode[];
  observation?: ObservationRecord;
}

interface ObservationMetricDefinition {
  metric: ObservationMetric;
  canonicalUnit: string;
  inputUnits: string[];
  minimum?: number;
  maximum?: (state: ProjectHomesteadState, entityId?: string) => number | undefined;
  aboveMaximumPolicy?: 'REJECT' | 'SUSPECT';
}

const metricDefinitions: Record<ObservationMetric, ObservationMetricDefinition> = {
  tank_level_l: { metric: 'tank_level_l', canonicalUnit: 'L', inputUnits: ['L', 'gal_us'], minimum: 0, maximum: state => state.water.tankCapacityL, aboveMaximumPolicy: 'SUSPECT' },
  pond_level_l: { metric: 'pond_level_l', canonicalUnit: 'L', inputUnits: ['L', 'gal_us'], minimum: 0, maximum: state => state.water.pondCapacityL, aboveMaximumPolicy: 'SUSPECT' },
  rainfall_mm: { metric: 'rainfall_mm', canonicalUnit: 'mm', inputUnits: ['mm', 'in'], minimum: 0 },
  soil_moisture_percent: { metric: 'soil_moisture_percent', canonicalUnit: 'percent', inputUnits: ['percent'], minimum: 0, maximum: () => 100, aboveMaximumPolicy: 'REJECT' },
  temperature_c: { metric: 'temperature_c', canonicalUnit: 'degC', inputUnits: ['degC'] },
  battery_energy_kwh: { metric: 'battery_energy_kwh', canonicalUnit: 'kWh', inputUnits: ['kWh', 'Wh'], minimum: 0, maximum: state => state.energy.batteryCapacityKwh, aboveMaximumPolicy: 'SUSPECT' },
  battery_soc_percent: { metric: 'battery_soc_percent', canonicalUnit: 'percent', inputUnits: ['percent'], minimum: 0, maximum: () => 100, aboveMaximumPolicy: 'REJECT' },
  solar_generation_kwh: { metric: 'solar_generation_kwh', canonicalUnit: 'kWh', inputUnits: ['kWh', 'Wh'], minimum: 0 },
  grid_import_kwh: { metric: 'grid_import_kwh', canonicalUnit: 'kWh', inputUnits: ['kWh', 'Wh'], minimum: 0 },
  pump_load_kwh: { metric: 'pump_load_kwh', canonicalUnit: 'kWh', inputUnits: ['kWh', 'Wh'], minimum: 0 },
  flow_rate_lpm: { metric: 'flow_rate_lpm', canonicalUnit: 'L/min', inputUnits: ['L/min', 'gal_us/min'], minimum: 0 },
};

const rejectionReasons = new Set<ObservationValidationReasonCode>([
  'UNSUPPORTED_METRIC',
  'NON_FINITE_VALUE',
  'UNSUPPORTED_UNIT',
  'UNKNOWN_SOURCE',
  'SOURCE_DISABLED',
  'SOURCE_REVOKED',
  'SOURCE_METRIC_UNSUPPORTED',
  'SOURCE_PROPERTY_MISMATCH',
  'SOURCE_ENTITY_MISMATCH',
  'UNKNOWN_ENTITY',
  'SIMULATION_TICK_REQUIRED',
  'OBSERVED_AT_REQUIRED',
  'REFERENCE_TIME_REQUIRED',
  'INVALID_TIMESTAMP',
  'STALE_OBSERVATION',
  'FUTURE_OBSERVATION',
  'CALIBRATION_REQUIRED',
  'INVALID_CALIBRATION_REF',
  'IMPOSSIBLE_VALUE',
]);

const knownEntityIdsFromState = (state: ProjectHomesteadState): Set<string> => new Set([
  'household',
  'water-tank',
  'water-pond',
  'microgrid',
  ...state.land.acceptedPlacementIds,
  ...state.foodProducers.map(item => item.id),
  ...state.livestock.map(item => item.id),
]);

const parseIso = (value: string): number | undefined => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function normalizeMetricValue(metric: ObservationMetric, value: number, unit: string): { value: number; unit: string } {
  const definition = metricDefinitions[metric];
  const normalizedUnit = normalizeUnitToken(unit);
  if (!definition.inputUnits.includes(String(normalizedUnit))) throw new Error('UNSUPPORTED_UNIT');
  const normalizedValue = normalizedUnit === definition.canonicalUnit
    ? value
    : convertPhysicalUnit(value, normalizedUnit, definition.canonicalUnit);
  return { value: normalizedValue, unit: definition.canonicalUnit };
}

function rawQuality(raw: RawObservation, status: ObservationValidationStatus): ObservationQuality {
  if (status === 'SUSPECT') return 'SUSPECT';
  if (status === 'REJECTED') return 'INVALID';
  if (raw.sourceType === 'SIMULATED_SENSOR') return 'SIMULATED';
  if (raw.sourceType === 'PHYSICAL_SENSOR') return 'VALIDATED';
  return raw.quality ?? (raw.sourceType === 'MANUAL' ? 'MEASURED' : 'ESTIMATED');
}

export function validateAndNormalizeObservation(
  raw: RawObservation,
  context: ObservationValidationContext,
): ObservationValidationResult {
  const reasonCodes: ObservationValidationReasonCode[] = [];

  if ((context.knownObservationIds ?? []).includes(raw.id)) {
    return { status: 'DUPLICATE', reasonCodes: ['DUPLICATE_ID'] };
  }
  if (raw.sequence !== undefined && (context.seenDeviceSequences ?? []).some(item => item.sourceId === raw.sourceId && item.sequence === raw.sequence)) {
    return { status: 'DUPLICATE', reasonCodes: ['DUPLICATE_SEQUENCE'] };
  }

  const definition = metricDefinitions[raw.metric as ObservationMetric];
  if (!definition) reasonCodes.push('UNSUPPORTED_METRIC');
  if (!Number.isFinite(raw.value)) reasonCodes.push('NON_FINITE_VALUE');

  let normalizedValue = raw.value;
  let normalizedUnit = raw.unit;
  if (definition && Number.isFinite(raw.value)) {
    try {
      const normalized = normalizeMetricValue(definition.metric, raw.value, raw.unit);
      normalizedValue = normalized.value;
      normalizedUnit = normalized.unit;
    } catch {
      reasonCodes.push('UNSUPPORTED_UNIT');
    }
  }

  const device = context.devices.find(item => item.deviceId === raw.sourceId);
  if (raw.sourceType === 'SIMULATED_SENSOR' || raw.sourceType === 'PHYSICAL_SENSOR') {
    if (!device) reasonCodes.push('UNKNOWN_SOURCE');
    if (device && !device.enabled) reasonCodes.push('SOURCE_DISABLED');
    if (device?.trust === 'REVOKED') reasonCodes.push('SOURCE_REVOKED');
    if (device?.trust === 'UNVERIFIED') reasonCodes.push('SOURCE_UNVERIFIED');
    if (device && !device.metrics.includes(raw.metric)) reasonCodes.push('SOURCE_METRIC_UNSUPPORTED');
    if (device && device.propertyId !== raw.propertyId) reasonCodes.push('SOURCE_PROPERTY_MISMATCH');
    if (device?.entityId && raw.entityId && device.entityId !== raw.entityId) reasonCodes.push('SOURCE_ENTITY_MISMATCH');
    if (device?.calibrationRequired && !raw.calibrationRef) reasonCodes.push('CALIBRATION_REQUIRED');
    if (raw.calibrationRef && !(context.calibrationRefs ?? []).includes(raw.calibrationRef)) reasonCodes.push('INVALID_CALIBRATION_REF');
    if (device?.calibrationRef && raw.calibrationRef && raw.calibrationRef !== device.calibrationRef) reasonCodes.push('INVALID_CALIBRATION_REF');
  } else if (!(context.knownNonDeviceSources ?? []).includes(raw.sourceId)) {
    reasonCodes.push('UNKNOWN_SOURCE');
  }

  if (raw.propertyId !== context.propertyId) reasonCodes.push('SOURCE_PROPERTY_MISMATCH');
  if (context.scenarioId && raw.scenarioId && raw.scenarioId !== context.scenarioId) reasonCodes.push('SOURCE_PROPERTY_MISMATCH');

  const knownEntities = knownEntityIdsFromState(context.state);
  (context.knownEntityIds ?? []).forEach(id => knownEntities.add(id));
  if (raw.entityId && !knownEntities.has(raw.entityId)) reasonCodes.push('UNKNOWN_ENTITY');

  const simulationTick = raw.simulationTick ?? raw.tick;
  if (raw.sourceType === 'SIMULATED_SENSOR') {
    if (!Number.isInteger(simulationTick) || (simulationTick ?? 0) < 0) reasonCodes.push('SIMULATION_TICK_REQUIRED');
  }

  if (raw.sourceType === 'PHYSICAL_SENSOR') {
    if (!raw.observedAt) reasonCodes.push('OBSERVED_AT_REQUIRED');
    if (!context.referenceTimeIso) reasonCodes.push('REFERENCE_TIME_REQUIRED');
    const observedAt = raw.observedAt ? parseIso(raw.observedAt) : undefined;
    const referenceTime = context.referenceTimeIso ? parseIso(context.referenceTimeIso) : undefined;
    if (raw.observedAt && observedAt === undefined) reasonCodes.push('INVALID_TIMESTAMP');
    if (context.referenceTimeIso && referenceTime === undefined) reasonCodes.push('INVALID_TIMESTAMP');
    if (observedAt !== undefined && referenceTime !== undefined) {
      const staleAfterMs = context.staleAfterMs ?? 24 * 60 * 60 * 1000;
      const futureToleranceMs = context.futureToleranceMs ?? 5 * 60 * 1000;
      if (referenceTime - observedAt > staleAfterMs) reasonCodes.push('STALE_OBSERVATION');
      if (observedAt - referenceTime > futureToleranceMs) reasonCodes.push('FUTURE_OBSERVATION');
    }
  }

  if (definition && Number.isFinite(normalizedValue) && !reasonCodes.includes('UNSUPPORTED_UNIT')) {
    if (definition.minimum !== undefined && normalizedValue < definition.minimum) reasonCodes.push('IMPOSSIBLE_VALUE');
    const maximum = definition.maximum?.(context.state, raw.entityId);
    if (maximum !== undefined && normalizedValue > maximum) {
      if (definition.aboveMaximumPolicy === 'SUSPECT') reasonCodes.push('ABOVE_PHYSICAL_CAPACITY');
      else reasonCodes.push('IMPOSSIBLE_VALUE');
    }
  }

  const hasRejectReason = reasonCodes.some(code => rejectionReasons.has(code));
  const isSuspect = !hasRejectReason && reasonCodes.some(code => code === 'ABOVE_PHYSICAL_CAPACITY' || code === 'SOURCE_UNVERIFIED');
  const status: ObservationValidationStatus = hasRejectReason ? 'REJECTED' : isSuspect ? 'SUSPECT' : 'ACCEPTED';
  if (status === 'REJECTED') return { status, reasonCodes };

  const observation: ObservationRecord = {
    id: raw.id,
    tick: simulationTick,
    propertyId: raw.propertyId,
    scenarioId: raw.scenarioId,
    entityId: raw.entityId,
    simulationTick,
    observedAt: raw.observedAt,
    receivedAt: raw.receivedAt,
    metric: raw.metric,
    value: normalizedValue,
    unit: normalizedUnit,
    sourceType: raw.sourceType,
    sourceId: raw.sourceId,
    quality: rawQuality(raw, status),
    relatedEntity: raw.entityId,
    calibrationRef: raw.calibrationRef,
    provenanceRef: raw.provenanceRef,
    sequence: raw.sequence,
    evidenceRefs: [...(raw.evidenceRefs ?? [])],
    validationResult: { status, reasonCodes: [...reasonCodes], normalizedUnit },
    sourceTrust: device?.trust ?? 'TRUSTED',
    verificationRef: raw.verificationRef ?? device?.verificationRef,
  };
  return { status, reasonCodes, observation };
}

export function readObservationMetricFromState(
  state: ProjectHomesteadState,
  metric: ObservationMetric,
  entityId?: string,
): { value: number; unit: string } {
  switch (metric) {
    case 'tank_level_l': return { value: state.water.tankLevelL, unit: 'L' };
    case 'pond_level_l': return { value: state.water.pondLevelL, unit: 'L' };
    case 'rainfall_mm': return { value: state.climate.rainfallMm, unit: 'mm' };
    case 'temperature_c': return { value: state.climate.temperatureC, unit: 'degC' };
    case 'soil_moisture_percent': {
      const producer = state.foodProducers.find(item => item.id === entityId);
      if (!producer) throw new Error(`Cannot emit soil moisture observation for unknown producer: ${String(entityId)}.`);
      return { value: producer.soilMoisture, unit: 'percent' };
    }
    case 'battery_energy_kwh': return { value: state.energy.batteryKwh, unit: 'kWh' };
    case 'battery_soc_percent': return { value: state.energy.batteryCapacityKwh > 0 ? state.energy.batteryKwh / state.energy.batteryCapacityKwh * 100 : 0, unit: 'percent' };
    case 'solar_generation_kwh': return { value: state.energy.solarGeneratedTodayKwh, unit: 'kWh' };
    case 'grid_import_kwh': return { value: state.energy.gridImportedTodayKwh, unit: 'kWh' };
    case 'pump_load_kwh': return { value: state.energy.pumpLoadTodayKwh, unit: 'kWh' };
    case 'flow_rate_lpm': throw new Error('Project 001 does not currently model sub-day flow rate telemetry.');
  }
}

export function createSimulatedObservation(input: {
  propertyId: string;
  scenarioId: string;
  sourceId: string;
  state: ProjectHomesteadState;
  metric: ObservationMetric;
  entityId?: string;
  provenanceRef?: string;
  evidenceRefs?: string[];
  sequence?: number;
}): ObservationRecord {
  const reading = readObservationMetricFromState(input.state, input.metric, input.entityId);
  const id = `${input.scenarioId}:${input.state.day}:observation:${input.metric}:${input.sourceId}:${input.entityId ?? 'none'}`;
  return {
    id,
    tick: input.state.day,
    propertyId: input.propertyId,
    scenarioId: input.scenarioId,
    entityId: input.entityId,
    simulationTick: input.state.day,
    metric: input.metric,
    value: reading.value,
    unit: reading.unit,
    sourceType: 'SIMULATED_SENSOR',
    sourceId: input.sourceId,
    quality: 'SIMULATED',
    relatedEntity: input.entityId,
    provenanceRef: input.provenanceRef,
    sequence: input.sequence,
    evidenceRefs: [...(input.evidenceRefs ?? [])],
    validationResult: { status: 'ACCEPTED', reasonCodes: [], normalizedUnit: reading.unit },
    sourceTrust: 'TRUSTED',
  };
}

export function createObservationEvidence(
  observation: ObservationRecord,
  scenarioRevisionId: string,
  evidenceTick: number,
): EvidenceRecord {
  if (!Number.isInteger(evidenceTick) || evidenceTick < 0) throw new Error('Observation evidence requires a non-negative integer tick.');
  return {
    id: `evidence:observation:${observation.id}`,
    tick: evidenceTick,
    kind: 'METRIC',
    ref: observation.id,
    scenarioRevisionId,
  };
}

export function createProject001DeviceSources(propertyId: string): DeviceSource[] {
  return [
    {
      deviceId: 'SIM:TANK-01',
      propertyId,
      entityId: 'water-tank',
      kind: 'SIMULATED_SOURCE',
      protocol: 'SIMULATED',
      metrics: ['tank_level_l'],
      enabled: true,
      trust: 'TRUSTED',
    },
    {
      deviceId: 'SIM:ENERGY-01',
      propertyId,
      entityId: 'microgrid',
      kind: 'SIMULATED_SOURCE',
      protocol: 'SIMULATED',
      metrics: ['battery_energy_kwh', 'battery_soc_percent', 'solar_generation_kwh', 'grid_import_kwh', 'pump_load_kwh'],
      enabled: true,
      trust: 'TRUSTED',
    },
    {
      deviceId: 'RS485:TANK-01',
      propertyId,
      entityId: 'water-tank',
      kind: 'TANK_LEVEL',
      protocol: 'RS-485/Modbus-future',
      metrics: ['tank_level_l'],
      calibrationRef: 'cal:tank-01:v1',
      calibrationRequired: true,
      enabled: true,
      trust: 'TRUSTED',
      verificationRef: 'device-verification:tank-01',
      metadata: { fixture: true },
    },
  ];
}
