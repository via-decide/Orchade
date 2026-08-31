import { checksum } from '../../engine/replay/checksum';
import type { ObservationRecord } from './projectState';
import type { ModelIdentity } from './provenance';

export interface PredictionRecord {
  id: string;
  propertyId: string;
  scenarioId: string;
  entityId?: string;
  metric: string;
  predictedValue: number;
  unit: string;
  predictionTick?: number;
  predictedForTick?: number;
  predictedForAt?: string;
  stateHash?: string;
  derivationRef?: string;
  modelIdentity: ModelIdentity;
}

export interface PredictionComparison {
  id: string;
  metric: string;
  entityId?: string;
  predicted: number;
  observed: number;
  error: number;
  absoluteError: number;
  relativeErrorPercent?: number;
  unit: string;
  predictionRef: string;
  observationRef: string;
  modelIdentity: ModelIdentity;
}

export type CalibrationCandidateStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

export interface ProposedParameterChange {
  modelParameterRef: string;
  currentValue: number;
  proposedValue: number;
  unit?: string;
}

export interface CalibrationCandidate {
  id: string;
  possibleParameterRefs: string[];
  proposedChange?: ProposedParameterChange;
  reason: string;
  comparisonRefs: string[];
  evidenceRefs: string[];
  status: CalibrationCandidateStatus;
}

export interface ModelParameterRevision {
  id: string;
  parentRevisionId: string;
  calibrationCandidateId: string;
  proposedChange: ProposedParameterChange;
  comparisonRefs: string[];
  evidenceRefs: string[];
}

export function createPrediction(input: Omit<PredictionRecord, 'id'> & { id?: string }): PredictionRecord {
  if (!Number.isFinite(input.predictedValue)) throw new Error('Prediction value must be finite.');
  if (!input.metric.trim() || !input.unit.trim() || !input.propertyId.trim() || !input.scenarioId.trim()) throw new Error('Prediction identity, metric, and unit are required.');
  const id = input.id ?? `prediction:${checksum({
    propertyId: input.propertyId,
    scenarioId: input.scenarioId,
    entityId: input.entityId,
    metric: input.metric,
    predictedValue: input.predictedValue,
    unit: input.unit,
    predictionTick: input.predictionTick,
    predictedForTick: input.predictedForTick,
    predictedForAt: input.predictedForAt,
    modelIdentity: input.modelIdentity,
  })}`;
  return { ...input, id };
}

export function comparePredictionToObservation(
  prediction: PredictionRecord,
  observation: ObservationRecord,
): PredictionComparison {
  if (prediction.metric !== observation.metric) throw new Error('Prediction comparison requires the same metric.');
  if (prediction.unit !== observation.unit) throw new Error('Prediction comparison requires normalized units.');
  if (prediction.entityId && observation.entityId && prediction.entityId !== observation.entityId) throw new Error('Prediction comparison requires the same entity.');
  if (!Number.isFinite(prediction.predictedValue) || !Number.isFinite(observation.value)) throw new Error('Prediction comparison requires finite values.');
  const error = observation.value - prediction.predictedValue;
  const relativeErrorPercent = prediction.predictedValue !== 0 ? error / prediction.predictedValue * 100 : undefined;
  const id = `comparison:${checksum({ prediction: prediction.id, observation: observation.id, error })}`;
  return {
    id,
    metric: prediction.metric,
    entityId: observation.entityId ?? prediction.entityId,
    predicted: prediction.predictedValue,
    observed: observation.value,
    error,
    absoluteError: Math.abs(error),
    relativeErrorPercent,
    unit: prediction.unit,
    predictionRef: prediction.id,
    observationRef: observation.id,
    modelIdentity: prediction.modelIdentity,
  };
}

export function createCalibrationCandidate(input: {
  possibleParameterRefs: string[];
  reason: string;
  comparisonRefs: string[];
  evidenceRefs: string[];
  proposedChange?: ProposedParameterChange;
}): CalibrationCandidate {
  if (!input.reason.trim() || input.comparisonRefs.length === 0 || input.evidenceRefs.length === 0) {
    throw new Error('Calibration candidate requires a reason plus comparison and evidence references.');
  }
  const normalizedRefs = [...new Set(input.possibleParameterRefs)].sort();
  const id = `calibration:${checksum({
    possibleParameterRefs: normalizedRefs,
    reason: input.reason,
    comparisonRefs: input.comparisonRefs,
    evidenceRefs: input.evidenceRefs,
    proposedChange: input.proposedChange,
  })}`;
  return {
    id,
    possibleParameterRefs: normalizedRefs,
    proposedChange: input.proposedChange,
    reason: input.reason,
    comparisonRefs: [...input.comparisonRefs],
    evidenceRefs: [...input.evidenceRefs],
    status: 'PROPOSED',
  };
}

export function setCalibrationCandidateStatus(
  candidate: CalibrationCandidate,
  status: CalibrationCandidateStatus,
): CalibrationCandidate {
  return {
    ...candidate,
    possibleParameterRefs: [...candidate.possibleParameterRefs],
    comparisonRefs: [...candidate.comparisonRefs],
    evidenceRefs: [...candidate.evidenceRefs],
    proposedChange: candidate.proposedChange ? { ...candidate.proposedChange } : undefined,
    status,
  };
}

export function createModelParameterRevision(
  candidate: CalibrationCandidate,
  currentRevisionId: string,
  nextRevisionId: string,
): ModelParameterRevision {
  if (candidate.status !== 'ACCEPTED') throw new Error('Only an explicitly accepted calibration candidate can create a model parameter revision.');
  if (!candidate.proposedChange) throw new Error('Accepted calibration requires an explicit parameter change before a model revision can be created.');
  if (!currentRevisionId.trim() || !nextRevisionId.trim() || currentRevisionId === nextRevisionId) throw new Error('Model parameter revision ids must be distinct and non-empty.');
  return {
    id: nextRevisionId,
    parentRevisionId: currentRevisionId,
    calibrationCandidateId: candidate.id,
    proposedChange: { ...candidate.proposedChange },
    comparisonRefs: [...candidate.comparisonRefs],
    evidenceRefs: [...candidate.evidenceRefs],
  };
}
