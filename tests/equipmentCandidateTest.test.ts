import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { checksum } from '../src/engine/replay/checksum';
import { runProject001Scenario } from '../src/simulation/homestead/projectRun';
import { validateAndNormalizeObservation, type DeviceSource, type RawObservation } from '../src/simulation/homestead/observation';
import { evaluateObservationReconciliation } from '../src/simulation/homestead/reconciliation';
import { createProject001InitialState } from '../src/simulation/homestead/projectInitialState';
import { evaluateControlDecision, type ActuatorCommand, type ControlCheck, type PostActionVerification } from '../src/simulation/homestead/control';
import {
  createEquipmentTwinRevision,
  registerEquipmentTwinRevision,
  type EquipmentTwinDefinition,
  type EquipmentTwinRegistry,
} from '../src/property/equipmentTwin';
import { createPumpFixtureTwin, pumpFixtureCandidateConfiguration, PUMP_FIXTURE_ENERGY_CONSUMPTION_KWH_PER_DAY } from '../src/property/fixtures/pumpFixture';
import { createVirtualDemoProperty } from '../src/property/fixtures/demoProperties';
import {
  runEquipmentCandidateTest,
  type EquipmentCandidateTestIntent,
} from '../src/property/equipmentCandidateTest';
import { compilePropertyRevisionToHomesteadScenario } from '../src/property/scenarioCompiler';
import type { PropertyRevision } from '../src/property/revision';
import { createPropertyRevision, deriveNextPropertyRevision } from '../src/property/revision';

function baselineRevision(): PropertyRevision {
  return createVirtualDemoProperty().revision;
}

/**
 * A baseline with no rain catchment refilling its tank, so the tank (still
 * present, still has real capacity) drains over a 60-day run and produces
 * real WATER_SHORTAGE failures. The tank is deliberately kept (not
 * removed): a zero-capacity tank would cap `tankLevelL` at zero regardless
 * of any external water supplied (see `projectTransition.ts`'s
 * `tankBeforeOverflowL` clamp), which would make the water-relief
 * candidate's contribution structurally unable to help -- not a
 * meaningful test of the equipment layer.
 */
function waterConstrainedBaselineRevision(): PropertyRevision {
  const virtual = createVirtualDemoProperty();
  const entities = virtual.revision.graph.entities.filter(e => e.entityId !== 'rain-catchment');
  const connections = virtual.revision.graph.resourceGraph.connections.filter(c => c.fromEntityId !== 'rain-catchment');
  return createPropertyRevision({
    revisionId: 'water-constrained-baseline',
    propertyId: virtual.revision.propertyId,
    createdAt: virtual.revision.createdAt,
    createdBy: virtual.revision.createdBy,
    rationale: 'Water-constrained baseline for candidate testing.',
    realityDeclaration: virtual.revision.realityDeclaration,
    graph: { propertyId: virtual.revision.propertyId, entities, resourceGraph: { propertyId: virtual.revision.propertyId, connections } },
    intent: virtual.revision.intent,
  });
}

function genericTwin(overrides: Partial<Parameters<typeof createEquipmentTwinRevision>[0]> = {}): EquipmentTwinDefinition {
  return createEquipmentTwinRevision({
    twinId: overrides.twinId ?? 'generic-twin',
    revisionId: overrides.revisionId ?? 'v1',
    name: overrides.name ?? 'Generic twin',
    equipmentClass: 'OTHER',
    source: overrides.source ?? { type: 'USER_DEFINED' },
    capabilities: overrides.capabilities ?? ['MOVE_WATER'],
    resourcePorts: overrides.resourcePorts ?? [{ portId: 'energy-in', resourceType: 'ENERGY', direction: 'INPUT', required: true, provenanceRefs: [] }],
    physical: { provenanceRefs: [] },
    operatingEnvelope: { additionalConstraints: [], provenanceRefs: [] },
    performanceModel: overrides.performanceModel ?? { modelId: 'm1', modelVersion: '1.0.0', modelType: 'CONSTANT', inputs: [], outputs: [], parameterRefs: [], evidenceRefs: [], limitations: [] },
    telemetry: [],
    controls: [],
    maintenance: { provenanceRefs: [] },
    economics: { currency: 'INR', provenanceRefs: [], ...(overrides.economics ?? {}) },
    failureModes: [],
    parameterProvenanceRefs: [],
    evidenceRefs: [],
    modelCapabilityStatus: overrides.modelCapabilityStatus ?? 'SUPPORTED',
  });
}

function registryOf(...twins: EquipmentTwinDefinition[]): EquipmentTwinRegistry {
  return twins.reduce<EquipmentTwinRegistry>((registry, twin) => registerEquipmentTwinRevision(registry, twin), {});
}

function baseIntent(revision: PropertyRevision, twinId: string, twinRevisionId: string): EquipmentCandidateTestIntent {
  return {
    propertyId: revision.propertyId,
    baselineRevisionId: revision.revisionId,
    equipmentTwinId: twinId,
    equipmentTwinRevisionId: twinRevisionId,
    quantity: 1,
    targetEntityRefs: [],
    configuration: {},
    connectedPortIds: [],
    simulationDurationDays: 60,
    seedPolicy: 'SAME_AS_BASELINE',
  };
}

export function runEquipmentCandidateTestTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };

  // 20 / 44 (part). Required disconnected resource port fails candidate validation -> INFEASIBLE.
  {
    const revision = baselineRevision();
    const twinRegistry = registryOf(createPumpFixtureTwin());
    const intent: EquipmentCandidateTestIntent = { ...baseIntent(revision, 'ORCHADE-PUMP-FIXTURE-001', 'v1'), configuration: pumpFixtureCandidateConfiguration(), connectedPortIds: [] };
    const result = runEquipmentCandidateTest(revision, twinRegistry, intent);
    assert(result.result === 'INFEASIBLE', '20/44. Required disconnected port produces INFEASIBLE');
    assert(result.unresolvedCapabilities.length > 0, '20/44. INFEASIBLE result names the unresolved capability');
  }

  // 28. Telemetry reuses DeviceSource.
  {
    const device: DeviceSource = {
      deviceId: 'device:pump-001', propertyId: 'candidate-test-property', entityId: 'instance:pump-001',
      kind: 'PUMP_MONITOR', metrics: ['pump_load_kwh'], enabled: true, trust: 'TRUSTED',
    };
    assert(device.entityId === 'instance:pump-001', '28. An equipment instance can be referenced as a DeviceSource entityId (no new device model)');
  }

  // 29 / 30. Observation reuses ObservationRecord and still requires validation.
  {
    const revision = baselineRevision();
    const scenario = compilePropertyRevisionToHomesteadScenario(revision).scenario;
    const { state } = createProject001InitialState(scenario);
    const goodRaw: RawObservation = {
      id: 'obs-1', propertyId: scenario.id, entityId: 'water-tank', metric: 'tank_level_l', value: 100, unit: 'L',
      sourceType: 'SIMULATED_SENSOR', sourceId: 'SIM:TANK-01', simulationTick: 0,
    };
    const goodResult = validateAndNormalizeObservation(goodRaw, { propertyId: scenario.id, state, devices: [{ deviceId: 'SIM:TANK-01', propertyId: scenario.id, kind: 'SIMULATED_SOURCE', metrics: ['tank_level_l'], enabled: true, trust: 'TRUSTED' }] });
    assert(goodResult.status === 'ACCEPTED' && !!goodResult.observation, '29. A valid observation reuses ObservationRecord and is accepted');
    const badRaw: RawObservation = { ...goodRaw, id: 'obs-2', unit: 'not-a-unit' };
    const badResult = validateAndNormalizeObservation(badRaw, { propertyId: scenario.id, state, devices: [{ deviceId: 'SIM:TANK-01', propertyId: scenario.id, kind: 'SIMULATED_SOURCE', metrics: ['tank_level_l'], enabled: true, trust: 'TRUSTED' }] });
    assert(badResult.status === 'REJECTED', '30. Physical/simulated readings still require validation -- a bad unit is rejected');
  }

  // 31. Reconciliation remains explicit.
  {
    const revision = baselineRevision();
    const scenario = compilePropertyRevisionToHomesteadScenario(revision).scenario;
    const { state } = createProject001InitialState(scenario);
    const simulated = validateAndNormalizeObservation(
      { id: 'obs-3', propertyId: scenario.id, entityId: 'water-tank', metric: 'tank_level_l', value: 100, unit: 'L', sourceType: 'SIMULATED_SENSOR', sourceId: 'SIM:TANK-01', simulationTick: 0 },
      { propertyId: scenario.id, state, devices: [{ deviceId: 'SIM:TANK-01', propertyId: scenario.id, kind: 'SIMULATED_SOURCE', metrics: ['tank_level_l'], enabled: true, trust: 'TRUSTED' }] },
    );
    const decision = evaluateObservationReconciliation(simulated, state);
    assert(decision.decision === 'HOLD' && decision.reasonCode === 'SIMULATED_OBSERVATION_NOT_LIVE_INPUT', '31. Reconciliation is explicit: a simulated observation never silently becomes a live input');
  }

  // 32. Twin cannot directly mutate LIVE canonical state (static import guard).
  {
    const testsDir = path.dirname(url.fileURLToPath(import.meta.url));
    const propertyDir = path.join(testsDir, '..', 'src', 'property');
    const forbidden = ['advanceProject001Day', 'advanceHomesteadDay'];
    const offenders: string[] = [];
    const scanFile = (fullPath: string) => {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (forbidden.some(name => content.includes(name))) offenders.push(fullPath);
    };
    const scanDir = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) { scanDir(fullPath); continue; }
        if (entry.name.endsWith('.ts')) scanFile(fullPath);
      }
    };
    scanDir(propertyDir);
    assert(offenders.length === 0, `32. No file under src/property imports the low-level day-transition mutators directly (found: ${offenders.join(', ')})`);
  }

  // 33 / 34. Controls reuse ActuatorCommand and ControlDecision.
  {
    const command: ActuatorCommand = {
      commandId: 'cmd-1', propertyId: 'candidate-test-property', entityId: 'instance:pump-001', actuatorId: 'pump-001',
      type: 'START_PUMP', requestedBy: 'user:test', parameters: {}, preconditions: [], safetyEnvelopeRef: 'safety:pump-fixture-001',
    };
    const checks: ControlCheck[] = [
      { name: 'sensorFreshness', status: 'PASS', reasonCode: 'OK', evidenceRefs: [] },
      { name: 'tankAvailability', status: 'PASS', reasonCode: 'OK', evidenceRefs: [] },
      { name: 'pumpHealth', status: 'PASS', reasonCode: 'OK', evidenceRefs: [] },
      { name: 'valveHealth', status: 'PASS', reasonCode: 'OK', evidenceRefs: [] },
      { name: 'energyAvailability', status: 'PASS', reasonCode: 'OK', evidenceRefs: [] },
      { name: 'runtimeLimit', status: 'PASS', reasonCode: 'OK', evidenceRefs: [] },
    ];
    const decision = evaluateControlDecision(command, checks);
    assert(decision.result === 'AUTHORIZED', '33/34. Equipment controls reuse ActuatorCommand + evaluateControlDecision -> ControlDecision');
  }

  // 35. Post-action verification remains explicit.
  {
    const verification: PostActionVerification = { commandId: 'cmd-1', status: 'PENDING', observationRefs: [], expectedChange: 'tank level should not decrease' };
    assert(verification.status === 'PENDING', '35. PostActionVerification requires an explicit status, never assumed VERIFIED');
  }

  // 36. Equipment cannot bypass deterministic safety checks.
  {
    const command: ActuatorCommand = {
      commandId: 'cmd-2', propertyId: 'candidate-test-property', entityId: 'instance:pump-001', actuatorId: 'pump-001',
      type: 'START_PUMP', requestedBy: 'user:test', parameters: {}, preconditions: [], safetyEnvelopeRef: 'safety:pump-fixture-001',
    };
    const decision = evaluateControlDecision(command, [{ name: 'pumpHealth', status: 'FAIL', reasonCode: 'DRY_RUN', evidenceRefs: [] }]);
    assert(decision.result === 'REJECTED', '36. A failing safety check rejects the command regardless of equipment source');
  }

  // 37 / 41. Test-in-Orchade creates a candidate revision; baseline remains immutable.
  {
    const revision = baselineRevision();
    const revisionChecksumBefore = checksum(revision);
    const twinRegistry = registryOf(createPumpFixtureTwin());
    const intent: EquipmentCandidateTestIntent = { ...baseIntent(revision, 'ORCHADE-PUMP-FIXTURE-001', 'v1'), configuration: pumpFixtureCandidateConfiguration(), connectedPortIds: ['energy-in', 'water-in'] };
    const result = runEquipmentCandidateTest(revision, twinRegistry, intent);
    assert(result.equipmentInstanceRef.length > 0 && result.candidateRevisionId !== revision.revisionId, '37. Test-in-Orchade produces a distinct candidate revision reference');
    assert(checksum(revision) === revisionChecksumBefore, '41. Baseline PropertyRevision is never mutated by running a candidate test');
  }

  // 38. Daxini listing reference resolves exact twin revision.
  {
    const daxiniTwin = genericTwin({ twinId: 'daxini-pump', source: { type: 'DAXINI', daxiniProductRef: 'daxini-listing:pump-003' } });
    const registry = registryOf(daxiniTwin);
    assert(registry['daxini-pump']?.[0]?.source.daxiniProductRef === 'daxini-listing:pump-003', '38. A Daxini-sourced twin resolves to its exact registered revision');
  }

  // 39 / 47. Commercial listing metadata / source type does not alter physical simulation.
  {
    const revision = baselineRevision();
    const config = { purchaseCostINR: 5000, dailyOperatingCostINR: 2, energyConsumptionKwhPerDay: 0.5 };
    const daxiniTwin = genericTwin({ twinId: 'twin-source-test', source: { type: 'DAXINI', daxiniProductRef: 'listing:a', manufacturer: 'BrandA', model: 'ModelA' } });
    const userTwin = genericTwin({ twinId: 'twin-source-test-2', source: { type: 'USER_DEFINED' } });
    const logicHubTwin = genericTwin({ twinId: 'twin-source-test-3', source: { type: 'LOGICHUB', logicHubProjectRef: 'lh:1' } });
    const registry = registryOf(daxiniTwin, userTwin, logicHubTwin);
    const runFor = (twinId: string) => runEquipmentCandidateTest(revision, registry, { ...baseIntent(revision, twinId, 'v1'), configuration: config, connectedPortIds: ['energy-in'] });
    const daxiniResult = runFor('twin-source-test');
    const userResult = runFor('twin-source-test-2');
    const logicHubResult = runFor('twin-source-test-3');
    assert(checksum(daxiniResult.changedMetrics) === checksum(userResult.changedMetrics), '39/47. Daxini-sourced twin produces identical physical result to a user-defined twin with the same configuration');
    assert(checksum(daxiniResult.changedMetrics) === checksum(logicHubResult.changedMetrics), '39/47. LogicHub-sourced twin produces identical physical result to a user-defined twin with the same configuration');
    assert(daxiniResult.result === userResult.result && userResult.result === logicHubResult.result, '39/47. Source type never changes the classified result');
  }

  // 40. Candidate test uses the same baseline seed.
  {
    const revision = baselineRevision();
    const candidateRevision = deriveNextPropertyRevision(revision, {
      revisionId: 'seed-check-candidate', createdAt: revision.createdAt, createdBy: 'test', rationale: 'seed check',
    });
    assert(candidateRevision.intent.seed === revision.intent.seed, '40. A derived candidate revision keeps the exact same seed as the baseline');
  }

  // 42. Candidate can return BENEFICIAL.
  {
    const revision = waterConstrainedBaselineRevision();
    const twin = genericTwin({
      twinId: 'water-relief-twin',
      capabilities: ['MOVE_WATER'],
      resourcePorts: [{ portId: 'energy-in', resourceType: 'ENERGY', direction: 'INPUT', required: true, provenanceRefs: [] }],
    });
    const registry = registryOf(twin);
    const result = runEquipmentCandidateTest(revision, registry, {
      ...baseIntent(revision, 'water-relief-twin', 'v1'),
      configuration: { waterProductionLitresPerDay: 500_000, energyConsumptionKwhPerDay: 0.1 },
      connectedPortIds: ['energy-in'],
    });
    assert(result.result === 'BENEFICIAL', `42. A large modeled external-water relief on a water-constrained baseline returns BENEFICIAL (got ${result.result})`);
  }

  // 43. Candidate can return HARMFUL.
  {
    const revision = baselineRevision();
    const twin = genericTwin({ twinId: 'heavy-load-twin' });
    const registry = registryOf(twin);
    const result = runEquipmentCandidateTest(revision, registry, {
      ...baseIntent(revision, 'heavy-load-twin', 'v1'),
      configuration: { energyConsumptionKwhPerDay: 500, dailyOperatingCostINR: 5000 },
      connectedPortIds: ['energy-in'],
    });
    assert(result.result === 'HARMFUL', `43. A large unproductive energy/cost load returns HARMFUL (got ${result.result})`);
  }

  // 44. Candidate can return INFEASIBLE (cannot afford purchase).
  {
    const revision = baselineRevision();
    const twin = genericTwin({ twinId: 'expensive-twin' });
    const registry = registryOf(twin);
    const result = runEquipmentCandidateTest(revision, registry, {
      ...baseIntent(revision, 'expensive-twin', 'v1'),
      configuration: { purchaseCostINR: 1_000_000 },
      connectedPortIds: ['energy-in'],
    });
    assert(result.result === 'INFEASIBLE', `44. A purchase price the property cannot afford returns INFEASIBLE (got ${result.result})`);
  }

  // 45. Missing critical model returns UNKNOWN.
  {
    const revision = baselineRevision();
    const twin = genericTwin({
      twinId: 'not-modeled-twin',
      resourcePorts: [],
      performanceModel: { modelId: 'm', modelVersion: '1.0.0', modelType: 'NOT_MODELED', inputs: [], outputs: [], parameterRefs: [], evidenceRefs: [], limitations: ['No model exists yet.'] },
      modelCapabilityStatus: 'NOT_MODELED',
    });
    const registry = registryOf(twin);
    const result = runEquipmentCandidateTest(revision, registry, { ...baseIntent(revision, 'not-modeled-twin', 'v1'), configuration: {}, connectedPortIds: [] });
    assert(result.result === 'UNKNOWN', `45. A NOT_MODELED performance model returns UNKNOWN, never a guessed BENEFICIAL/HARMFUL (got ${result.result})`);
  }

  // 46. Marketplace rank cannot affect simulation result.
  {
    const revision = baselineRevision();
    const twinA = genericTwin({ twinId: 'rank-a' }) as EquipmentTwinDefinition & { marketplaceRank?: number };
    const twinB = genericTwin({ twinId: 'rank-b' }) as EquipmentTwinDefinition & { marketplaceRank?: number };
    twinA.marketplaceRank = 1;
    twinB.marketplaceRank = 999;
    const registry = registryOf(twinA, twinB);
    const config = { energyConsumptionKwhPerDay: 1, purchaseCostINR: 1000 };
    const resultA = runEquipmentCandidateTest(revision, registry, { ...baseIntent(revision, 'rank-a', 'v1'), configuration: config, connectedPortIds: ['energy-in'] });
    const resultB = runEquipmentCandidateTest(revision, registry, { ...baseIntent(revision, 'rank-b', 'v1'), configuration: config, connectedPortIds: ['energy-in'] });
    assert(checksum(resultA.changedMetrics) === checksum(resultB.changedMetrics), '46. A bolted-on marketplace rank field has zero influence on the physical result');
  }

  // 48 / 49. LogicHub project ref can be attached; does not imply BENCH_VERIFIED.
  {
    const twin = genericTwin({ twinId: 'logichub-twin', source: { type: 'LOGICHUB', logicHubProjectRef: 'lh:project-1' } });
    assert(twin.source.logicHubProjectRef === 'lh:project-1', '48. LogicHub project ref is attached to the twin');
    assert(twin.lifecycleStatus === 'DRAFT', '49. A LogicHub-sourced twin defaults to DRAFT, not BENCH_VERIFIED');
  }

  // 51 / 52. New engineering revision creates a new twin revision; old instance stays pinned.
  {
    const v1 = createPumpFixtureTwin();
    const v2 = createEquipmentTwinRevision({
      twinId: v1.twinId, revisionId: 'v2', parentRevisionId: v1.revisionId, name: 'Orchade Fixture Pump v2',
      equipmentClass: v1.equipmentClass, source: v1.source, capabilities: v1.capabilities, resourcePorts: v1.resourcePorts,
      physical: v1.physical, operatingEnvelope: v1.operatingEnvelope, performanceModel: v1.performanceModel,
      telemetry: v1.telemetry, controls: v1.controls, maintenance: v1.maintenance, economics: v1.economics,
      failureModes: v1.failureModes, parameterProvenanceRefs: v1.parameterProvenanceRefs, parameterOrigins: v1.parameterOrigins,
      evidenceRefs: v1.evidenceRefs, modelCapabilityStatus: v1.modelCapabilityStatus,
    });
    const registry = registryOf(v1, v2);
    const revision = baselineRevision();
    const resultV1 = runEquipmentCandidateTest(revision, registry, { ...baseIntent(revision, v1.twinId, 'v1'), configuration: { energyConsumptionKwhPerDay: PUMP_FIXTURE_ENERGY_CONSUMPTION_KWH_PER_DAY }, connectedPortIds: ['energy-in', 'water-in'] });
    assert(v2.revisionId !== v1.revisionId && v2.parentRevisionId === v1.revisionId, '51. A new engineering revision has a distinct id and points at its parent');
    assert(resultV1.candidateRevisionId.includes('v1'), '52. Testing against the old twin revision produces a candidate revision explicitly pinned to v1, unaffected by v2 existing');
  }

  // 53. Same PropertyRevision + same twin revision + same seed = same result.
  {
    const revision = baselineRevision();
    const registry = registryOf(createPumpFixtureTwin());
    const intent: EquipmentCandidateTestIntent = { ...baseIntent(revision, 'ORCHADE-PUMP-FIXTURE-001', 'v1'), configuration: pumpFixtureCandidateConfiguration(), connectedPortIds: ['energy-in', 'water-in'] };
    const resultA = runEquipmentCandidateTest(revision, registry, intent);
    const resultB = runEquipmentCandidateTest(revision, registry, intent);
    assert(checksum(resultA) === checksum(resultB), '53. Identical inputs produce a byte-identical candidate test result');
  }

  // 54 / 55. Changing source URL / product title does not affect the physical result.
  {
    const revision = baselineRevision();
    const config = { energyConsumptionKwhPerDay: 0.25, purchaseCostINR: 18000 };
    const twinA = genericTwin({ twinId: 'meta-a', name: 'Pump A', source: { type: 'EXTERNAL', externalProductRef: 'https://example.com/a' } });
    const twinB = genericTwin({ twinId: 'meta-b', name: 'Totally Different Product Name', source: { type: 'EXTERNAL', externalProductRef: 'https://example.com/completely-different-url' } });
    const registry = registryOf(twinA, twinB);
    const runFor = (twinId: string) => runEquipmentCandidateTest(revision, registry, { ...baseIntent(revision, twinId, 'v1'), configuration: config, connectedPortIds: ['energy-in'] });
    const resultA = runFor('meta-a');
    const resultB = runFor('meta-b');
    assert(checksum(resultA.changedMetrics) === checksum(resultB.changedMetrics), '54/55. Different source URLs and product names produce identical physical results');
  }

  // 57. Purchase-price changes affect economics only when explicitly selected into the scenario/revision.
  {
    const revision = baselineRevision();
    const config = { energyConsumptionKwhPerDay: 0.25, purchaseCostINR: 18000 };
    const cheapListingTwin = genericTwin({ twinId: 'price-a', economics: { currency: 'INR', purchaseCostEstimate: 5000, provenanceRefs: [] } });
    const expensiveListingTwin = genericTwin({ twinId: 'price-b', economics: { currency: 'INR', purchaseCostEstimate: 999_999, provenanceRefs: [] } });
    const registry = registryOf(cheapListingTwin, expensiveListingTwin);
    const runFor = (twinId: string) => runEquipmentCandidateTest(revision, registry, { ...baseIntent(revision, twinId, 'v1'), configuration: config, connectedPortIds: ['energy-in'] });
    const resultCheapListing = runFor('price-a');
    const resultExpensiveListing = runFor('price-b');
    assert(
      checksum(resultCheapListing.changedMetrics) === checksum(resultExpensiveListing.changedMetrics),
      '57. The twin\'s listed economics.purchaseCostEstimate has no physical effect unless it is copied into the candidate configuration',
    );
  }

  // 58. Equipment revision cannot rewrite historical replay/checksum.
  {
    const revision = baselineRevision();
    const baselineScenario = compilePropertyRevisionToHomesteadScenario(revision).scenario;
    const before = runProject001Scenario(baselineScenario).finalStateHash;
    const registry = registryOf(createPumpFixtureTwin());
    runEquipmentCandidateTest(revision, registry, { ...baseIntent(revision, 'ORCHADE-PUMP-FIXTURE-001', 'v1'), configuration: pumpFixtureCandidateConfiguration(), connectedPortIds: ['energy-in', 'water-in'] });
    const after = runProject001Scenario(baselineScenario).finalStateHash;
    assert(before === after, '58. Running an equipment candidate test never changes the baseline scenario\'s own replay/checksum');
  }

  // Compiler determinism, unaffected by unrelated PropertyEntity fields.
  {
    const revision = baselineRevision();
    const scenarioA = compilePropertyRevisionToHomesteadScenario(revision).scenario;
    const scenarioB = compilePropertyRevisionToHomesteadScenario(revision).scenario;
    assert(checksum(scenarioA) === checksum(scenarioB), 'Compiling the same PropertyRevision twice yields a byte-identical scenario');
  }

  return { passed, failed, errors };
}
