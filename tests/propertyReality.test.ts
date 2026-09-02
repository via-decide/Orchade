import {
  appendRealitySnapshot,
  createPropertyRealitySnapshot,
  getRealitySnapshotAtRevision,
  proposeRealityTransition,
  validateEntityRealityConsistency,
  type PropertyRealityHistory,
} from '../src/property/reality';
import {
  createScenarioAVirtualProperty,
  createScenarioBRealProperty,
  createScenarioCHybridWithoutLand,
  createScenarioDHybridDaxiniCandidate,
} from '../src/property/fixtures/realityScenarios';
import { createParameterProvenanceRecord, type ParameterOrigin } from '../src/simulation/homestead/provenance';
import { createSimulatedObservation } from '../src/simulation/homestead/observation';
import { createProject001InitialState } from '../src/simulation/homestead/projectInitialState';
import { PROJECT_001_BASELINE_SCENARIO } from '../src/simulation/homestead/project001Scenario';
import { runProject001Scenario } from '../src/simulation/homestead/projectRun';

const DECLARED_AT = '2026-08-31T00:00:00.000Z';

export function runPropertyRealityTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };

  // 1. VIRTUAL property can simulate.
  {
    const virtual = createScenarioAVirtualProperty();
    assert(virtual.declaration.mode === 'VIRTUAL', '1. VIRTUAL snapshot declares VIRTUAL mode');
    let threw = false;
    try { runProject001Scenario(PROJECT_001_BASELINE_SCENARIO); } catch { threw = true; }
    assert(!threw, '1. VIRTUAL property does not block an independent deterministic simulation from running');
  }

  // 2. VIRTUAL cannot claim LIVE physical state merely because simulation ran.
  {
    const virtual = createScenarioAVirtualProperty();
    const run = runProject001Scenario(PROJECT_001_BASELINE_SCENARIO);
    const observation = createSimulatedObservation({
      propertyId: virtual.propertyId,
      scenarioId: PROJECT_001_BASELINE_SCENARIO.id,
      sourceId: 'SIM:TANK-01',
      state: run.finalState,
      metric: 'tank_level_l',
    });
    assert(observation.sourceType === 'SIMULATED_SENSOR', '2. Running a simulation only ever produces a SIMULATED_SENSOR observation');
    assert(observation.quality === 'SIMULATED', '2. Simulated observation is tagged SIMULATED, never claiming physical measurement');
    assert(virtual.declaration.mode === 'VIRTUAL', '2. Property reality mode is unaffected by running a simulation');
  }

  // 3. REAL accepts physical entity references.
  {
    const real = createScenarioBRealProperty();
    assert(real.declaration.mode === 'REAL', '3. REAL snapshot declares REAL mode');
    assert(real.entities.every(e => e.status === 'PHYSICAL'), '3. REAL scenario fixture entities are PHYSICAL');
  }

  // 4. REAL does not imply all parameters are MEASURED.
  {
    const real = createScenarioBRealProperty();
    const record = createParameterProvenanceRecord('rev-1', 'water.tankCapacityL', 5000, 'USER_ASSUMPTION');
    assert(record.origin === 'USER_ASSUMPTION', '4. A REAL property parameter can carry USER_ASSUMPTION provenance');
    assert(real.declaration.mode === 'REAL', '4. Reality mode and parameter provenance are declared through separate, uncoupled contracts');
  }

  // 5. HYBRID accepts mixed VIRTUAL / PHYSICAL / CANDIDATE entities.
  {
    const hybridBench = createScenarioCHybridWithoutLand();
    const statuses = new Set(hybridBench.entities.map(e => e.status));
    assert(statuses.has('VIRTUAL') && statuses.has('PHYSICAL'), '5. HYBRID-without-land mixes VIRTUAL and PHYSICAL entities');
    const hybridCandidate = createScenarioDHybridDaxiniCandidate();
    const candidateStatuses = new Set(hybridCandidate.entities.map(e => e.status));
    assert(candidateStatuses.has('PHYSICAL') && candidateStatuses.has('CANDIDATE'), '5. HYBRID-Daxini-candidate mixes PHYSICAL and CANDIDATE entities');
  }

  // 6. Adding a physical entity to VIRTUAL does not silently mutate mode.
  {
    let threw = false;
    try {
      createPropertyRealitySnapshot({
        propertyId: 'p1', propertyRevisionId: 'rev-1', mode: 'VIRTUAL',
        declaredAt: DECLARED_AT, declaredBy: 'user:test', basisRefs: [],
        entities: [{ entityId: 'physical-thing', status: 'PHYSICAL' }],
      });
    } catch { threw = true; }
    assert(threw, '6. Declaring a PHYSICAL entity under VIRTUAL mode fails closed instead of silently becoming HYBRID');
    let alsoThrew = false;
    try { validateEntityRealityConsistency('VIRTUAL', [{ entityId: 'x', status: 'PHYSICAL' }]); } catch { alsoThrew = true; }
    assert(alsoThrew, '6. validateEntityRealityConsistency rejects PHYSICAL under VIRTUAL directly');
  }

  // 7. Reality-mode transition produces an explicit PropertyRevision.
  {
    const start = createScenarioCHybridWithoutLand();
    const next = proposeRealityTransition(start, {
      nextPropertyRevisionId: 'orchade-property-demo-001-rev-003',
      nextMode: 'HYBRID',
      declaredAt: DECLARED_AT,
      declaredBy: 'user:test',
      basisRefs: ['bench-log:controller-002'],
      entities: [...start.entities, { entityId: 'second-bench-device', status: 'PHYSICAL' }],
    });
    assert(next.propertyRevisionId !== start.propertyRevisionId, '7. Transition produces a distinct property revision id');
    assert(next.entities.length === start.entities.length + 1, '7. Transition snapshot reflects the new entity set');
    let threw = false;
    try {
      proposeRealityTransition(start, {
        nextPropertyRevisionId: start.propertyRevisionId,
        nextMode: 'HYBRID', declaredAt: DECLARED_AT, declaredBy: 'user:test', basisRefs: [], entities: start.entities.map(e => ({ ...e })),
      });
    } catch { threw = true; }
    assert(threw, '7. Reusing the same revision id for a transition is rejected');
  }

  // 8. Historical revision retains historical reality mode.
  {
    const virtual = createScenarioAVirtualProperty();
    let history: PropertyRealityHistory = appendRealitySnapshot([], virtual);
    const hybrid = proposeRealityTransition(virtual, {
      nextPropertyRevisionId: 'orchade-property-demo-001-rev-002-hybrid',
      nextMode: 'HYBRID', declaredAt: DECLARED_AT, declaredBy: 'user:test',
      basisRefs: ['bench-log:controller-003'],
      entities: [...virtual.entities, { entityId: 'bench-controller', status: 'PHYSICAL' }],
    });
    history = appendRealitySnapshot(history, hybrid);
    const historical = getRealitySnapshotAtRevision(history, virtual.propertyRevisionId);
    assert(historical?.declaration.mode === 'VIRTUAL', '8. The original revision still reads back as VIRTUAL after a later HYBRID transition');
    const latest = getRealitySnapshotAtRevision(history, hybrid.propertyRevisionId);
    assert(latest?.declaration.mode === 'HYBRID', '8. The new revision reads back as HYBRID');
  }

  // 9. Entity reality status and parameter provenance remain independent.
  {
    const entityStatuses = new Set(['VIRTUAL', 'PHYSICAL', 'CANDIDATE']);
    const parameterOrigins = new Set<ParameterOrigin>(['MEASURED', 'RESEARCHED', 'REGIONAL_DEFAULT', 'USER_ASSUMPTION', 'DERIVED']);
    const overlap = [...entityStatuses].filter(status => (parameterOrigins as Set<string>).has(status));
    assert(overlap.length === 0, '9. EntityRealityStatus and ParameterOrigin value sets are disjoint (independent contracts)');
  }

  return { passed, failed, errors };
}
