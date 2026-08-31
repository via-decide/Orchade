import type { ObservationRecord, ProjectHomesteadState } from './projectState';
import type { ObservationValidationResult } from './observation';

export type ReconciliationDecisionType = 'ACCEPT' | 'REJECT' | 'HOLD' | 'SUSPECT';

export type ReconciliationReasonCode =
  | 'VALIDATED_OBSERVATION'
  | 'VALIDATION_REJECTED'
  | 'VALIDATION_SUSPECT'
  | 'DUPLICATE_OBSERVATION'
  | 'SIMULATED_OBSERVATION_NOT_LIVE_INPUT'
  | 'NO_RECONCILIATION_POLICY'
  | 'TARGET_ENTITY_MISSING';

export interface ReconciliationDecision {
  observationId: string;
  decision: ReconciliationDecisionType;
  targetStatePath?: string;
  previousValue?: number;
  proposedValue?: number;
  reasonCode: ReconciliationReasonCode;
  evidenceRefs: string[];
}

interface ReconciliationTarget {
  path: string;
  previousValue: number;
}

function resolveTarget(observation: ObservationRecord, state: ProjectHomesteadState): ReconciliationTarget | undefined {
  switch (observation.metric) {
    case 'tank_level_l': return { path: 'water.tankLevelL', previousValue: state.water.tankLevelL };
    case 'pond_level_l': return { path: 'water.pondLevelL', previousValue: state.water.pondLevelL };
    case 'rainfall_mm': return { path: 'climate.rainfallMm', previousValue: state.climate.rainfallMm };
    case 'temperature_c': return { path: 'climate.temperatureC', previousValue: state.climate.temperatureC };
    case 'battery_energy_kwh': return { path: 'energy.batteryKwh', previousValue: state.energy.batteryKwh };
    case 'soil_moisture_percent': {
      const producer = state.foodProducers.find(item => item.id === observation.entityId);
      return producer ? { path: `foodProducers.${producer.id}.soilMoisture`, previousValue: producer.soilMoisture } : undefined;
    }
    default: return undefined;
  }
}

export function evaluateObservationReconciliation(
  validation: ObservationValidationResult,
  state: ProjectHomesteadState,
): ReconciliationDecision {
  const observationId = validation.observation?.id ?? 'unresolved-observation';
  const evidenceRefs = validation.observation
    ? [validation.observation.id, ...validation.observation.evidenceRefs]
    : [];

  if (validation.status === 'DUPLICATE') {
    return { observationId, decision: 'HOLD', reasonCode: 'DUPLICATE_OBSERVATION', evidenceRefs };
  }
  if (validation.status === 'REJECTED' || !validation.observation) {
    return { observationId, decision: 'REJECT', reasonCode: 'VALIDATION_REJECTED', evidenceRefs };
  }
  if (validation.status === 'SUSPECT') {
    return { observationId, decision: 'SUSPECT', reasonCode: 'VALIDATION_SUSPECT', evidenceRefs };
  }
  if (validation.observation.sourceType === 'SIMULATED_SENSOR') {
    return {
      observationId,
      decision: 'HOLD',
      reasonCode: 'SIMULATED_OBSERVATION_NOT_LIVE_INPUT',
      evidenceRefs,
    };
  }

  const target = resolveTarget(validation.observation, state);
  if (!target) {
    return {
      observationId,
      decision: 'HOLD',
      reasonCode: validation.observation.metric === 'soil_moisture_percent' ? 'TARGET_ENTITY_MISSING' : 'NO_RECONCILIATION_POLICY',
      evidenceRefs,
    };
  }

  return {
    observationId,
    decision: 'ACCEPT',
    targetStatePath: target.path,
    previousValue: target.previousValue,
    proposedValue: validation.observation.value,
    reasonCode: 'VALIDATED_OBSERVATION',
    evidenceRefs,
  };
}
