import { createProject001DeviceSources, validateAndNormalizeObservation, type RawObservation } from './observation';
import { createCalibrationCandidate, createPrediction, comparePredictionToObservation, type CalibrationCandidate, type PredictionComparison, type PredictionRecord } from './prediction';
import { createModelIdentity } from './provenance';
import { PROJECT_001_BASELINE_SCENARIO } from './project001Scenario';
import { runProject001Scenario, type Project001SimulationRun } from './projectRun';
import { evaluateObservationReconciliation, type ReconciliationDecision } from './reconciliation';
import type { ObservationRecord } from './projectState';
import type { HomesteadScenarioDefinition } from './scenario';

export interface DigitalTwinFixtureDemonstration {
  run: Project001SimulationRun;
  prediction: PredictionRecord;
  rawObservation: RawObservation;
  observation: ObservationRecord;
  reconciliation: ReconciliationDecision;
  comparison: PredictionComparison;
  calibrationCandidate: CalibrationCandidate;
  canonicalStateWasNotMutated: boolean;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function runDigitalTwinFixtureDemonstration(): DigitalTwinFixtureDemonstration {
  const scenario: HomesteadScenarioDefinition = clone(PROJECT_001_BASELINE_SCENARIO);
  scenario.durationDays = 1;
  const run = runProject001Scenario(scenario, 1);
  const propertyId = 'project-001-property';
  const modelIdentity = createModelIdentity(run.scenario);
  const predictedForAt = `${run.finalState.date}T18:00:00.000Z`;
  const prediction = createPrediction({
    propertyId,
    scenarioId: run.scenarioId,
    entityId: 'water-tank',
    metric: 'tank_level_l',
    predictedValue: run.finalState.water.tankLevelL,
    unit: 'L',
    predictionTick: run.finalState.day,
    predictedForAt,
    stateHash: run.finalStateHash,
    derivationRef: 'PROJECT001_WATER_BALANCE_V1',
    modelIdentity,
  });

  const rawObservation: RawObservation = {
    id: 'fixture:physical:tank-01:reading-0001',
    propertyId,
    scenarioId: run.scenarioId,
    entityId: 'water-tank',
    observedAt: predictedForAt,
    receivedAt: predictedForAt,
    metric: 'tank_level_l',
    value: Math.max(0, prediction.predictedValue - 240),
    unit: 'L',
    sourceType: 'PHYSICAL_SENSOR',
    sourceId: 'RS485:TANK-01',
    quality: 'MEASURED',
    calibrationRef: 'cal:tank-01:v1',
    sequence: 1,
    evidenceRefs: ['fixture:physical-observation'],
  };

  const beforeState = JSON.stringify(run.finalState);
  const validation = validateAndNormalizeObservation(rawObservation, {
    propertyId,
    scenarioId: run.scenarioId,
    state: run.finalState,
    devices: createProject001DeviceSources(propertyId),
    calibrationRefs: ['cal:tank-01:v1'],
    referenceTimeIso: predictedForAt,
    staleAfterMs: 24 * 60 * 60 * 1000,
    futureToleranceMs: 5 * 60 * 1000,
  });
  if (!validation.observation || validation.status !== 'ACCEPTED') {
    throw new Error(`Digital twin fixture observation failed validation: ${validation.reasonCodes.join(', ')}.`);
  }
  const reconciliation = evaluateObservationReconciliation(validation, run.finalState);
  const comparison = comparePredictionToObservation(prediction, validation.observation);
  const calibrationCandidate = createCalibrationCandidate({
    possibleParameterRefs: [
      'water.captureEfficiency',
      'water.leakageFractionPerDay',
      'household.waterLitresPerPersonDay',
    ],
    reason: 'Prediction-to-observation error warrants investigation; this fixture does not identify or claim a root cause.',
    comparisonRefs: [comparison.id],
    evidenceRefs: [prediction.id, validation.observation.id, comparison.id],
  });

  return {
    run,
    prediction,
    rawObservation,
    observation: validation.observation,
    reconciliation,
    comparison,
    calibrationCandidate,
    canonicalStateWasNotMutated: beforeState === JSON.stringify(run.finalState),
  };
}
