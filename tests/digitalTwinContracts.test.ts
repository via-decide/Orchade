import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  BROADACRE_FARM_PROFILE,
  PROJECT_001_BASELINE_SCENARIO,
  PROJECT_001_MODEL_CAPABILITIES,
  SMALL_MIXED_FARM_PROFILE,
  acreToM2,
  comparePredictionToObservation,
  createCalibrationCandidate,
  createModelIdentity,
  createModelParameterRevision,
  createParameterProvenanceRecord,
  createPrediction,
  createProject001DeviceSources,
  createScenarioParameterProvenanceRegistry,
  createSimulatedObservation,
  createScenarioFromFarmProfile,
  evaluateControlDecision,
  evaluateObservationReconciliation,
  lToUsGallon,
  m2ToAcre,
  m2ToSqft,
  runDigitalTwinFixtureDemonstration,
  runFarmProfile,
  runProject001Scenario,
  runProject001TrueNumberDemonstration,
  setCalibrationCandidateStatus,
  sqftToM2,
  usGallonToL,
  validateAndNormalizeObservation,
  validateHomesteadScenario,
  type ActuatorCommand,
  type ControlCheck,
  type ParameterOrigin,
  type RawObservation,
} from '../src/simulation/homestead';

const clone = <T>(value: T): T => structuredClone(value);

export function runDigitalTwinContractTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error(`❌ Test failed: ${message}`); }
  };
  const assertThrows = (callback: () => void, message: string) => {
    try { callback(); assert(false, message); } catch { assert(true, message); }
  };

  const scenario = clone(PROJECT_001_BASELINE_SCENARIO);
  scenario.durationDays = 2;
  const run = runProject001Scenario(scenario, 2);
  const state = run.finalState;
  const propertyId = 'project-001-property';
  const scenarioId = run.scenarioId;
  const devices = createProject001DeviceSources(propertyId);
  const referenceTimeIso = `${state.date}T12:00:00.000Z`;
  const stateBeforeObservationTests = JSON.stringify(state);

  const rawPhysical = (overrides: Partial<RawObservation> = {}): RawObservation => ({
    id: 'physical:tank:0001',
    propertyId,
    scenarioId,
    entityId: 'water-tank',
    observedAt: referenceTimeIso,
    receivedAt: referenceTimeIso,
    metric: 'tank_level_l',
    value: Math.max(0, state.water.tankLevelL - 10),
    unit: 'L',
    sourceType: 'PHYSICAL_SENSOR',
    sourceId: 'RS485:TANK-01',
    quality: 'MEASURED',
    calibrationRef: 'cal:tank-01:v1',
    sequence: 1,
    evidenceRefs: ['fixture:evidence'],
    ...overrides,
  });

  const validationContext = {
    propertyId,
    scenarioId,
    state,
    devices,
    calibrationRefs: ['cal:tank-01:v1'],
    referenceTimeIso,
    staleAfterMs: 24 * 60 * 60 * 1000,
    futureToleranceMs: 5 * 60 * 1000,
  };

  const unsupportedMetric = validateAndNormalizeObservation(rawPhysical({ id: 'negative:unsupported-metric', metric: 'mystery_points' }), validationContext);
  assert(unsupportedMetric.status === 'REJECTED' && unsupportedMetric.reasonCodes.includes('UNSUPPORTED_METRIC'), 'Unsupported observation metric is rejected');

  const nanReading = validateAndNormalizeObservation(rawPhysical({ id: 'negative:nan', value: Number.NaN }), validationContext);
  assert(nanReading.status === 'REJECTED' && nanReading.reasonCodes.includes('NON_FINITE_VALUE'), 'NaN observation is rejected');

  const infinityReading = validateAndNormalizeObservation(rawPhysical({ id: 'negative:infinity', value: Number.POSITIVE_INFINITY }), validationContext);
  assert(infinityReading.status === 'REJECTED' && infinityReading.reasonCodes.includes('NON_FINITE_VALUE'), 'Infinity observation is rejected');

  const unsupportedUnit = validateAndNormalizeObservation(rawPhysical({ id: 'negative:unit', unit: 'points' }), validationContext);
  assert(unsupportedUnit.status === 'REJECTED' && unsupportedUnit.reasonCodes.includes('UNSUPPORTED_UNIT'), 'Unsupported observation unit is rejected');

  const negativeTank = validateAndNormalizeObservation(rawPhysical({ id: 'negative:tank-volume', value: -1 }), validationContext);
  assert(negativeTank.status === 'REJECTED' && negativeTank.reasonCodes.includes('IMPOSSIBLE_VALUE'), 'Negative tank volume is rejected');

  const overCapacityTank = validateAndNormalizeObservation(rawPhysical({ id: 'suspect:tank-capacity', value: state.water.tankCapacityL + 1 }), validationContext);
  assert(overCapacityTank.status === 'SUSPECT' && overCapacityTank.reasonCodes.includes('ABOVE_PHYSICAL_CAPACITY'), 'Tank reading above physical capacity is marked suspect');

  const duplicateId = validateAndNormalizeObservation(rawPhysical({ id: 'duplicate:id' }), {
    ...validationContext,
    knownObservationIds: ['duplicate:id'],
  });
  assert(duplicateId.status === 'DUPLICATE' && duplicateId.reasonCodes.includes('DUPLICATE_ID'), 'Duplicate observation id is idempotent');

  const duplicateSequence = validateAndNormalizeObservation(rawPhysical({ id: 'duplicate:sequence', sequence: 77 }), {
    ...validationContext,
    seenDeviceSequences: [{ sourceId: 'RS485:TANK-01', sequence: 77 }],
  });
  assert(duplicateSequence.status === 'DUPLICATE' && duplicateSequence.reasonCodes.includes('DUPLICATE_SEQUENCE'), 'Duplicate device sequence is idempotent');

  const staleObservation = validateAndNormalizeObservation(rawPhysical({
    id: 'negative:stale',
    observedAt: '2026-01-01T00:00:00.000Z',
  }), validationContext);
  assert(staleObservation.status === 'REJECTED' && staleObservation.reasonCodes.includes('STALE_OBSERVATION'), 'Stale physical sensor observation fails closed');

  const futureObservation = validateAndNormalizeObservation(rawPhysical({
    id: 'negative:future',
    observedAt: '2026-01-03T13:00:00.000Z',
  }), validationContext);
  assert(futureObservation.status === 'REJECTED' && futureObservation.reasonCodes.includes('FUTURE_OBSERVATION'), 'Future physical sensor observation beyond tolerance fails closed');

  const unknownSensor = validateAndNormalizeObservation(rawPhysical({ id: 'negative:unknown-source', sourceId: 'RS485:UNKNOWN' }), validationContext);
  assert(unknownSensor.status === 'REJECTED' && unknownSensor.reasonCodes.includes('UNKNOWN_SOURCE'), 'Unknown physical sensor cannot update live state');

  const invalidCalibration = validateAndNormalizeObservation(rawPhysical({ id: 'negative:calibration', calibrationRef: 'cal:wrong' }), validationContext);
  assert(invalidCalibration.status === 'REJECTED' && invalidCalibration.reasonCodes.includes('INVALID_CALIBRATION_REF'), 'Invalid calibration reference fails closed');

  const simulatedA = createSimulatedObservation({
    propertyId,
    scenarioId,
    sourceId: 'SIM:TANK-01',
    state,
    metric: 'tank_level_l',
    entityId: 'water-tank',
    sequence: 1,
  });
  const simulatedB = createSimulatedObservation({
    propertyId,
    scenarioId,
    sourceId: 'SIM:TANK-01',
    state,
    metric: 'tank_level_l',
    entityId: 'water-tank',
    sequence: 1,
  });
  assert(JSON.stringify(simulatedA) === JSON.stringify(simulatedB), 'Simulated observation is deterministic for the same canonical state and source');

  const physicalAccepted = validateAndNormalizeObservation(rawPhysical({ id: 'physical:accepted', sequence: 2 }), validationContext);
  assert(physicalAccepted.status === 'ACCEPTED' && physicalAccepted.observation?.sourceType === 'PHYSICAL_SENSOR', 'Valid calibrated physical observation reaches canonical evidence form');
  assert(JSON.stringify(state) === stateBeforeObservationTests, 'Physical observation validation does not mutate ProjectHomesteadState');

  const reconciliation = evaluateObservationReconciliation(physicalAccepted, state);
  assert(reconciliation.decision === 'ACCEPT' && reconciliation.targetStatePath === 'water.tankLevelL' && reconciliation.proposedValue === physicalAccepted.observation?.value, 'Reconciliation produces an explicit proposed state change');
  assert(JSON.stringify(state) === stateBeforeObservationTests, 'Accepted reconciliation decision still does not mutate canonical state');

  const rejectedReconciliation = evaluateObservationReconciliation(negativeTank, state);
  assert(rejectedReconciliation.decision === 'REJECT' && JSON.stringify(state) === stateBeforeObservationTests, 'Rejected observation creates no partial canonical-state update');

  const manualObservation = validateAndNormalizeObservation({
    id: 'manual:rainfall:001',
    propertyId,
    scenarioId,
    metric: 'rainfall_mm',
    value: 4.5,
    unit: 'mm',
    sourceType: 'MANUAL',
    sourceId: 'operator:field-log',
    quality: 'MEASURED',
    evidenceRefs: ['field-log:001'],
  }, {
    ...validationContext,
    knownNonDeviceSources: ['operator:field-log'],
  });
  assert(manualObservation.status === 'ACCEPTED' && manualObservation.observation?.sourceType === 'MANUAL', 'Manual observations use the same canonical observation contract');

  const importedObservation = validateAndNormalizeObservation({
    id: 'import:rainfall:001',
    propertyId,
    scenarioId,
    metric: 'rainfall_mm',
    value: 0.5,
    unit: 'in',
    sourceType: 'IMPORT',
    sourceId: 'import:regional-fixture',
    quality: 'ESTIMATED',
    evidenceRefs: ['import-file:001'],
  }, {
    ...validationContext,
    knownNonDeviceSources: ['import:regional-fixture'],
  });
  assert(importedObservation.status === 'ACCEPTED' && importedObservation.observation?.unit === 'mm' && importedObservation.observation.value === 12.7, 'Imported observations normalize into the same metric/unit contract');
  assert(simulatedA.metric === physicalAccepted.observation?.metric, 'Simulated and physical tank telemetry use the same metric name');

  const smallScenario = createScenarioFromFarmProfile(SMALL_MIXED_FARM_PROFILE);
  const broadacreScenario = createScenarioFromFarmProfile(BROADACRE_FARM_PROFILE);
  validateHomesteadScenario(smallScenario);
  validateHomesteadScenario(broadacreScenario);
  assert(true, 'Small mixed and broadacre farm profile scenarios both validate through the canonical scenario contract');
  assert(broadacreScenario.land.totalAreaM2 > smallScenario.land.totalAreaM2 && broadacreScenario.foodProducers.length < smallScenario.foodProducers.length, 'Farm profiles change explicit scenario parameters rather than selecting alternate formulas');

  const smallRun = runFarmProfile(SMALL_MIXED_FARM_PROFILE, 2);
  const broadacreRun = runFarmProfile(BROADACRE_FARM_PROFILE, 2);
  assert(smallRun.simulationVersion === broadacreRun.simulationVersion && smallRun.replayFrames.length === 2 && broadacreRun.replayFrames.length === 2, 'Both contrasting farm profiles execute through the same Project 001 simulation/replay contract');
  assert(BROADACRE_FARM_PROFILE.mechanizationProfile.status === 'NOT_MODELED' && PROJECT_001_MODEL_CAPABILITIES.fuelCombustion.status === 'NOT_MODELED', 'Broadacre fixture declares machinery/fuel limitations instead of fabricating precision');

  const farmProfileSource = readFileSync(fileURLToPath(new URL('../src/simulation/homestead/farmProfiles.ts', import.meta.url)), 'utf8');
  assert(!/profile\.id\s*===|profile\.id\s*==/.test(farmProfileSource), 'Farm profile id never selects special-case physics');
  assert(/return runProject001Scenario\(createScenarioFromFarmProfile\(profile\)/.test(farmProfileSource), 'Farm profiles explicitly enter the canonical Project 001 run path');

  const registry = createScenarioParameterProvenanceRegistry(PROJECT_001_BASELINE_SCENARIO, {
    'water.captureEfficiency': {
      origin: 'RESEARCHED',
      sourceRef: 'research:rain-capture-fixture',
      methodologyRef: 'method:source-review',
      confidence: 'HIGH',
    },
    'land.totalAreaM2': {
      origin: 'MEASURED',
      sourceRef: 'survey:property-area-fixture',
    },
    'climate.seasons.summer.meanTemperatureC': {
      origin: 'REGIONAL_DEFAULT',
      sourceRef: 'regional:climate-fixture',
    },
  });
  assert(registry.records['land.totalAreaM2']?.origin === 'MEASURED' && registry.records['water.captureEfficiency']?.origin === 'RESEARCHED' && registry.records['climate.seasons.summer.meanTemperatureC']?.origin === 'REGIONAL_DEFAULT', 'Provenance registry distinguishes measured, researched, and regional parameter origins');
  assert(registry.records['household.members']?.origin === 'USER_ASSUMPTION', 'Unsourced checked-in scenario parameters remain explicit user assumptions');

  const origins: ParameterOrigin[] = ['MEASURED', 'RESEARCHED', 'REGIONAL_DEFAULT', 'USER_ASSUMPTION', 'DERIVED'];
  assert(origins.every(origin => createParameterProvenanceRecord('rev-test', `path.${origin}`, 1, origin).origin === origin), 'All required provenance origin categories are representable');

  const trueNumberDemo = runProject001TrueNumberDemonstration();
  const requiredDisplayUnits = new Set(trueNumberDemo.readModel.values.map(value => value.unit));
  assert(requiredDisplayUnits.has('m2') && requiredDisplayUnits.has('kg') && requiredDisplayUnits.has('L') && requiredDisplayUnits.has('kWh') && requiredDisplayUnits.has('min') && requiredDisplayUnits.has('INR'), 'Project 001 true-number demonstration exposes area, food, water, energy, labour, and real currency units');
  assert(trueNumberDemo.readModel.values.every(value => Boolean(value.provenanceRef || value.derivationRef) && value.canonicalStatePath.length > 0), 'Every true-number demonstration value is traceable to provenance or derivation and a canonical state path');
  assert(trueNumberDemo.readModel.derivations.every(item => item.modelId.length > 0 && item.modelVersion.length > 0 && item.inputParameterRefs.length > 0), 'Derived true-number values identify model/version and input lineage');
  assert(trueNumberDemo.run.finalStateHash === 'e9b4b178' && trueNumberDemo.run.dailyChecksums.length === 365, 'Project 001 365-day final checksum and daily replay evidence remain unchanged');

  const prediction = createPrediction({
    propertyId,
    scenarioId,
    entityId: 'water-tank',
    metric: 'tank_level_l',
    predictedValue: 3420,
    unit: 'L',
    predictionTick: state.day,
    predictedForAt: referenceTimeIso,
    stateHash: run.finalStateHash,
    derivationRef: 'PROJECT001_WATER_BALANCE_V1',
    modelIdentity: createModelIdentity(run.scenario),
  });
  const observedForComparison = validateAndNormalizeObservation(rawPhysical({
    id: 'physical:comparison',
    value: 3180,
    sequence: 3,
  }), validationContext).observation;
  if (!observedForComparison) {
    assert(false, 'Fixture comparison observation validates');
  } else {
    const comparisonA = comparePredictionToObservation(prediction, observedForComparison);
    const comparisonB = comparePredictionToObservation(prediction, observedForComparison);
    assert(JSON.stringify(comparisonA) === JSON.stringify(comparisonB), 'PredictionComparison is deterministic for fixed prediction and observation');
    assert(comparisonA.error === -240 && comparisonA.absoluteError === 240 && Math.abs((comparisonA.relativeErrorPercent ?? 0) + 7.017543859649122) < 1e-12, 'PredictionComparison preserves signed, absolute, and relative physical error');

    const candidate = createCalibrationCandidate({
      possibleParameterRefs: ['water.captureEfficiency', 'water.leakageFractionPerDay'],
      reason: 'Fixture discrepancy requires diagnosis; no cause is automatically claimed.',
      comparisonRefs: [comparisonA.id],
      evidenceRefs: [prediction.id, observedForComparison.id],
    });
    assert(candidate.status === 'PROPOSED', 'Calibration candidate starts as PROPOSED and cannot auto-edit the model');
    assertThrows(() => createModelParameterRevision(candidate, 'params-v1', 'params-v2'), 'PROPOSED calibration cannot create a model revision');

    const acceptedWithChange = setCalibrationCandidateStatus({
      ...candidate,
      proposedChange: {
        modelParameterRef: 'water.captureEfficiency',
        currentValue: 0.8,
        proposedValue: 0.78,
        unit: 'ratio',
      },
    }, 'ACCEPTED');
    const revision = createModelParameterRevision(acceptedWithChange, 'params-v1', 'params-v2');
    assert(revision.parentRevisionId === 'params-v1' && revision.id === 'params-v2' && revision.proposedChange.proposedValue === 0.78, 'Only explicit acceptance plus an explicit parameter change creates a new model revision contract');
    assert(run.finalStateHash === runProject001Scenario(scenario, 2).finalStateHash, 'Calibration evidence does not rewrite historical simulation results');
  }

  const digitalTwinDemoA = runDigitalTwinFixtureDemonstration();
  const digitalTwinDemoB = runDigitalTwinFixtureDemonstration();
  assert(digitalTwinDemoA.canonicalStateWasNotMutated && digitalTwinDemoA.reconciliation.decision === 'ACCEPT', 'Digital-twin fixture validates evidence and proposes reconciliation without mutating canonical state');
  assert(digitalTwinDemoA.calibrationCandidate.status === 'PROPOSED' && /does not identify or claim a root cause/.test(digitalTwinDemoA.calibrationCandidate.reason), 'Digital-twin fixture creates diagnostic calibration evidence without claiming causality');
  assert(JSON.stringify(digitalTwinDemoA.comparison) === JSON.stringify(digitalTwinDemoB.comparison), 'Digital-twin prediction/observation comparison is deterministic');

  const area = 3.25;
  const sqft = 1234.5;
  const gallons = 321.25;
  assert(Math.abs(m2ToAcre(acreToM2(area)) - area) < 1e-12, 'Acre to square-metre conversion round-trips deterministically');
  assert(Math.abs(m2ToSqft(sqftToM2(sqft)) - sqft) < 1e-9, 'Square-foot to square-metre conversion round-trips deterministically');
  assert(Math.abs(lToUsGallon(usGallonToL(gallons)) - gallons) < 1e-12, 'US-gallon to litre conversion round-trips deterministically');

  const command: ActuatorCommand = {
    commandId: 'command:pump:001',
    propertyId,
    entityId: 'water-tank',
    actuatorId: 'pump-01',
    type: 'START_PUMP',
    requestedBy: 'operator',
    requestedTick: state.day,
    parameters: { maximumRuntimeMinutes: 15 },
    preconditions: ['fresh-water-level', 'pump-healthy', 'energy-available'],
    safetyEnvelopeRef: 'safety:pump:v1',
  };
  const passChecks: ControlCheck[] = [
    { name: 'sensorFreshness', status: 'PASS', reasonCode: 'FRESH', evidenceRefs: ['obs:fresh'] },
    { name: 'tankAvailability', status: 'PASS', reasonCode: 'AVAILABLE', evidenceRefs: ['obs:tank'] },
    { name: 'pumpHealth', status: 'PASS', reasonCode: 'HEALTHY', evidenceRefs: ['obs:pump'] },
    { name: 'valveHealth', status: 'PASS', reasonCode: 'HEALTHY', evidenceRefs: ['obs:valve'] },
    { name: 'energyAvailability', status: 'PASS', reasonCode: 'AVAILABLE', evidenceRefs: ['obs:energy'] },
    { name: 'runtimeLimit', status: 'PASS', reasonCode: 'WITHIN_LIMIT', evidenceRefs: ['policy:runtime'] },
  ];
  assert(evaluateControlDecision(command, passChecks).result === 'AUTHORIZED', 'Control command is authorized only when every required deterministic safety check passes');
  assert(evaluateControlDecision(command, passChecks.slice(0, -1)).result === 'DEFERRED', 'Missing control safety check defers rather than authorizes');
  assert(evaluateControlDecision(command, passChecks.map(check => check.name === 'tankAvailability' ? { ...check, status: 'FAIL' as const } : check)).result === 'REJECTED', 'Failed control safety check rejects the command');

  const contractFiles = [
    'observation.ts',
    'reconciliation.ts',
    'prediction.ts',
    'control.ts',
    'provenance.ts',
    'farmProfiles.ts',
    'trueNumber.ts',
    'digitalTwinDemonstration.ts',
  ];
  const contractSources = contractFiles.map(file => readFileSync(fileURLToPath(new URL(`../src/simulation/homestead/${file}`, import.meta.url)), 'utf8')).join('\n');
  assert(!/Math\.random\s*\(|Date\.now\s*\(|crypto\.randomUUID\s*\(/.test(contractSources), 'True-number/digital-twin contracts contain no ambient randomness, wall-clock now, or random UUIDs');
  assert(!/\bXP\b|\bcoins?\b/i.test(contractSources), 'True-number/digital-twin runtime contracts introduce no XP or coin reward semantics');

  return { passed, failed, errors };
}
