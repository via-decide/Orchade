import { checksum } from '../src/engine/replay/checksum';
import { createPropertyEntity, type PropertyEntity } from '../src/property/entity';
import { validatePropertyGraph, type PropertyGraph } from '../src/property/graph';
import { advancePropertyToRevision, createProperty, type Property } from '../src/property/property';
import { createSimulatedObservation } from '../src/simulation/homestead/observation';
import { createProject001InitialState } from '../src/simulation/homestead/projectInitialState';
import { runProject001Scenario } from '../src/simulation/homestead/projectRun';
import {
  createHybridBenchDemoProperty,
  createHybridDaxiniCandidateProperty,
  createRealDemoProperty,
  createVirtualDemoProperty,
} from '../src/property/fixtures/demoProperties';
import { createPropertyRevision, deriveNextPropertyRevision, type PropertyRevision } from '../src/property/revision';
import { compilePropertyRevisionToHomesteadScenario } from '../src/property/scenarioCompiler';

const CREATED_AT = '2026-08-31T00:00:00.000Z';

function baseIntent(propertyId: string) {
  return {
    propertyId,
    name: 'Test Property',
    purpose: 'HOMESTEAD' as const,
    measurementSystem: 'metric' as const,
    householdIntent: { size: 4 },
    goals: { foodSelfSufficiency: true, waterIndependence: true, energyIndependence: true, nutrientCircularity: true, labourFeasibility: true, economicCoverage: true },
    planningHorizonDays: 60,
    seed: 'test-property-seed',
  };
}

function baseGraph(propertyId: string, entities: PropertyEntity[] = []): PropertyGraph {
  const parcel = createPropertyEntity({ entityId: 'parcel', propertyId, entityType: 'PARCEL', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 500 } });
  return { propertyId, entities: [parcel, ...entities], resourceGraph: { propertyId, connections: [] } };
}

function baseRevision(propertyId: string, revisionId: string, entities: PropertyEntity[] = []): PropertyRevision {
  return createPropertyRevision({
    revisionId,
    propertyId,
    createdAt: CREATED_AT,
    createdBy: 'test',
    rationale: 'Test revision.',
    realityDeclaration: { propertyId, mode: 'VIRTUAL', declaredAt: CREATED_AT, declaredBy: 'test', basisRefs: [] },
    graph: baseGraph(propertyId, entities),
    intent: baseIntent(propertyId),
  });
}

export function runPropertyFoundationTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };

  // 1. Property has stable identity/schema.
  {
    const revision = baseRevision('prop-1', 'rev-1');
    const property = createProperty({ propertyId: 'prop-1', name: 'Test Property', createdAt: CREATED_AT, createdBy: 'test' }, revision);
    assert(property.propertyId === 'prop-1' && property.schemaVersion === 1, '1. Property has a stable propertyId and schemaVersion');
    assert(property.currentRevisionId === 'rev-1' && property.revisionRefs.includes('rev-1'), '1. Property tracks its current revision');
  }

  // 2 / 3. PropertyRevision freezes immutably; same input produces the same hash.
  {
    const revisionA = baseRevision('prop-2', 'rev-1');
    const revisionB = baseRevision('prop-2', 'rev-1');
    assert(revisionA.revisionHash === revisionB.revisionHash, '3. Same revision content produces the same revisionHash');

    const inputGraph = baseGraph('prop-2-mutation-check');
    const revisionC = createPropertyRevision({
      revisionId: 'rev-1', propertyId: 'prop-2-mutation-check', createdAt: CREATED_AT, createdBy: 'test', rationale: 'r',
      realityDeclaration: { propertyId: 'prop-2-mutation-check', mode: 'VIRTUAL', declaredAt: CREATED_AT, declaredBy: 'test', basisRefs: [] },
      graph: inputGraph, intent: baseIntent('prop-2-mutation-check'),
    });
    const hashBeforeMutation = revisionC.revisionHash;
    inputGraph.entities[0].physical.footprintM2 = 999999;
    assert(revisionC.revisionHash === hashBeforeMutation, '2. Mutating the caller\'s own input graph object after creation never leaks into the already-created revision (deep-frozen copy)');
  }

  // 4. Historical revisions survive later changes.
  {
    const revisionA = baseRevision('prop-4', 'rev-1');
    const hashBefore = revisionA.revisionHash;
    deriveNextPropertyRevision(revisionA, { revisionId: 'rev-2', createdAt: CREATED_AT, createdBy: 'test', rationale: 'change', graph: baseGraph('prop-4', [createPropertyEntity({ entityId: 'extra', propertyId: 'prop-4', entityType: 'SHED', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'ACTIVE' })]) });
    assert(revisionA.revisionHash === hashBefore, '4. Creating a later revision does not alter the earlier revision object');
  }

  // 5. Removed entity remains resolvable historically.
  {
    const shed = createPropertyEntity({ entityId: 'shed-1', propertyId: 'prop-5', entityType: 'SHED', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'ACTIVE' });
    const revisionA = baseRevision('prop-5', 'rev-1', [shed]);
    const removedGraph: PropertyGraph = { ...revisionA.graph, entities: revisionA.graph.entities.map(e => e.entityId === 'shed-1' ? { ...e, status: 'REMOVED' as const } : e) };
    const revisionB = deriveNextPropertyRevision(revisionA, { revisionId: 'rev-2', createdAt: CREATED_AT, createdBy: 'test', rationale: 'remove shed', graph: removedGraph });
    const historicalShed = revisionB.graph.entities.find(e => e.entityId === 'shed-1');
    assert(!!historicalShed && historicalShed.status === 'REMOVED', '5. A removed entity remains present (status REMOVED), addressable by id, not deleted outright');
  }

  // 6. Duplicate entity ID fails.
  {
    const dup1 = createPropertyEntity({ entityId: 'dup', propertyId: 'prop-6', entityType: 'SHED', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'ACTIVE' });
    const dup2 = createPropertyEntity({ entityId: 'dup', propertyId: 'prop-6', entityType: 'WORKSHOP', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'ACTIVE' });
    let threw = false;
    try { baseRevision('prop-6', 'rev-1', [dup1, dup2]); } catch { threw = true; }
    assert(threw, '6. Duplicate entity ids within one property graph are rejected');
  }

  // 7. Cross-property reference fails.
  {
    const foreignEntity = createPropertyEntity({ entityId: 'foreign', propertyId: 'some-other-property', entityType: 'SHED', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'ACTIVE' });
    let threw = false;
    try { baseRevision('prop-7', 'rev-1', [foreignEntity]); } catch { threw = true; }
    assert(threw, '7. An entity referencing a different propertyId is rejected');
  }

  // 8. Resource connection requires valid endpoints.
  {
    const graph = baseGraph('prop-8');
    graph.resourceGraph.connections.push({ connectionId: 'c1', propertyId: 'prop-8', resourceType: 'WATER', fromEntityId: 'parcel', toEntityId: 'does-not-exist', mode: 'CONTINUOUS', enabled: true, constraints: [], evidenceRefs: [] });
    let threw = false;
    try {
      createPropertyRevision({ revisionId: 'rev-1', propertyId: 'prop-8', createdAt: CREATED_AT, createdBy: 'test', rationale: 'r', realityDeclaration: { propertyId: 'prop-8', mode: 'VIRTUAL', declaredAt: CREATED_AT, declaredBy: 'test', basisRefs: [] }, graph, intent: baseIntent('prop-8') });
    } catch { threw = true; }
    assert(threw, '8. A resource connection to a nonexistent entity is rejected');
  }

  // 9. Required resource links are explicit -- proximity never implies connection.
  {
    const bed = createPropertyEntity({
      entityId: 'bed', propertyId: 'prop-9', entityType: 'VEGETABLE_BED', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'ACTIVE',
      physical: { footprintM2: 20 }, resourceInputs: [{ resourceType: 'WATER', ratePerDay: 10 }],
    });
    const revision = baseRevision('prop-9', 'rev-1', [bed]);
    assert(revision.graph.resourceGraph.connections.length === 0, '9. No connection is auto-created merely because entities coexist on the property');
    const compiled = compilePropertyRevisionToHomesteadScenario(revision);
    assert(compiled.notes.some(note => note.entityId === 'bed'), '9. The compiler surfaces an advisory note when a declared resource input has no connection');
  }

  // 10 / 11. VIRTUAL simulates normally; simulation never creates LIVE truth.
  {
    const { revision } = createVirtualDemoProperty();
    const compiled = compilePropertyRevisionToHomesteadScenario(revision);
    let threw = false;
    let run;
    try { run = runProject001Scenario(compiled.scenario, 60); } catch { threw = true; }
    assert(!threw && !!run, '10. A VIRTUAL property compiles and simulates 60 days without error');
    const observation = createSimulatedObservation({ propertyId: revision.propertyId, scenarioId: compiled.scenario.id, sourceId: 'SIM:TANK-01', state: run!.finalState, metric: 'tank_level_l' });
    assert(observation.sourceType === 'SIMULATED_SENSOR' && observation.quality === 'SIMULATED', '11. Simulating a VIRTUAL property never produces anything but a SIMULATED_SENSOR observation');
  }

  // 12 / 13. REAL permits PHYSICAL entities; does not imply all parameters MEASURED.
  {
    const { revision } = createRealDemoProperty();
    assert(revision.graph.entities.every(e => e.realityStatus === 'PHYSICAL'), '12. REAL property entities are PHYSICAL');
    const compiled = compilePropertyRevisionToHomesteadScenario(revision);
    assert(!!compiled.scenario, '13. REAL property still compiles even though no MEASURED provenance is attached to any parameter (REAL != fully measured)');
  }

  // 14. HYBRID permits VIRTUAL + PHYSICAL + CANDIDATE.
  {
    const { revision } = createHybridDaxiniCandidateProperty();
    const statuses = new Set(revision.graph.entities.map(e => e.realityStatus));
    assert(statuses.has('PHYSICAL') && statuses.has('CANDIDATE'), '14. HYBRID property mixes PHYSICAL and CANDIDATE entities');
    const { revision: benchRevision } = createHybridBenchDemoProperty();
    const benchStatuses = new Set(benchRevision.graph.entities.map(e => e.realityStatus));
    assert(benchStatuses.has('VIRTUAL') && benchStatuses.has('PHYSICAL'), '14. HYBRID property also mixes VIRTUAL and PHYSICAL entities');
  }

  // 15. A physical entity does not silently change the whole-property mode.
  {
    const physicalEntity = createPropertyEntity({ entityId: 'phys', propertyId: 'prop-15', entityType: 'SHED', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'PHYSICAL', status: 'ACTIVE' });
    let threw = false;
    try { baseRevision('prop-15', 'rev-1', [physicalEntity]); } catch { threw = true; }
    assert(threw, '15. Adding a PHYSICAL entity to a VIRTUAL-mode graph fails closed instead of silently becoming HYBRID');
  }

  // 16 / 17. Mode transition requires an explicit revision; historical reality mode remains frozen.
  {
    const { property: virtualProperty, revision: virtualRevision } = createVirtualDemoProperty();
    const { property: hybridProperty, revision: hybridRevision } = createHybridBenchDemoProperty();
    assert(hybridRevision.revisionId !== virtualRevision.revisionId, '16. A HYBRID transition is a brand-new PropertyRevision, not an edit of the VIRTUAL one');
    assert(virtualRevision.realityDeclaration.mode === 'VIRTUAL', '17. The original VIRTUAL revision object still reads back as VIRTUAL after the later HYBRID transition');
    assert(hybridProperty.realityDeclaration.mode === 'HYBRID' && hybridProperty.propertyId === virtualProperty.propertyId, '16/17. The property itself now points at the HYBRID revision, same identity');
  }

  // Negative: stale/mismatched parent revision is rejected when advancing a Property.
  {
    const revisionA = baseRevision('prop-stale', 'rev-1');
    const property = createProperty({ propertyId: 'prop-stale', name: 'Test', createdAt: CREATED_AT, createdBy: 'test' }, revisionA);
    const unrelatedRevision = createPropertyRevision({
      revisionId: 'rev-orphan', propertyId: 'prop-stale', parentRevisionId: 'rev-nonexistent', createdAt: CREATED_AT, createdBy: 'test', rationale: 'r',
      realityDeclaration: { propertyId: 'prop-stale', mode: 'VIRTUAL', declaredAt: CREATED_AT, declaredBy: 'test', basisRefs: [] },
      graph: baseGraph('prop-stale'), intent: baseIntent('prop-stale'),
    });
    let threw = false;
    try { advancePropertyToRevision(property, unrelatedRevision); } catch { threw = true; }
    assert(threw, 'Negative: advancing a Property to a revision whose parent does not match the current revision is rejected');
  }

  // Negative: a revision cycle (revisionId === parentRevisionId) is rejected.
  {
    let threw = false;
    try {
      createPropertyRevision({
        revisionId: 'rev-cycle', propertyId: 'prop-cycle', parentRevisionId: 'rev-cycle', createdAt: CREATED_AT, createdBy: 'test', rationale: 'r',
        realityDeclaration: { propertyId: 'prop-cycle', mode: 'VIRTUAL', declaredAt: CREATED_AT, declaredBy: 'test', basisRefs: [] },
        graph: baseGraph('prop-cycle'), intent: baseIntent('prop-cycle'),
      });
    } catch { threw = true; }
    assert(threw, 'Negative: a revision cannot declare itself as its own parent');
  }

  // 19 / 20. Same PropertyRevision compiles to the same scenario hash and the same run.
  {
    const { revision } = createVirtualDemoProperty();
    const compiledA = compilePropertyRevisionToHomesteadScenario(revision);
    const compiledB = compilePropertyRevisionToHomesteadScenario(revision);
    assert(checksum(compiledA.scenario) === checksum(compiledB.scenario), '19. Same PropertyRevision compiles to the same scenario hash');
    const runA = runProject001Scenario(compiledA.scenario, 60);
    const runB = runProject001Scenario(compiledB.scenario, 60);
    assert(runA.finalStateHash === runB.finalStateHash, '20. Same PropertyRevision + same seed produces the same run');
  }

  // 22. Invalid Property graph fails closed (empty parcel).
  {
    let threw = false;
    try {
      createPropertyRevision({
        revisionId: 'rev-1', propertyId: 'prop-22', createdAt: CREATED_AT, createdBy: 'test', rationale: 'r',
        realityDeclaration: { propertyId: 'prop-22', mode: 'VIRTUAL', declaredAt: CREATED_AT, declaredBy: 'test', basisRefs: [] },
        graph: { propertyId: 'prop-22', entities: [], resourceGraph: { propertyId: 'prop-22', connections: [] } },
        intent: baseIntent('prop-22'),
      });
      // Graph creation succeeds (no entities is a legal, if useless, graph); the compiler is where "no parcel" fails closed.
      const emptyRevision = createPropertyRevision({
        revisionId: 'rev-2', propertyId: 'prop-22', createdAt: CREATED_AT, createdBy: 'test', rationale: 'r',
        realityDeclaration: { propertyId: 'prop-22', mode: 'VIRTUAL', declaredAt: CREATED_AT, declaredBy: 'test', basisRefs: [] },
        graph: { propertyId: 'prop-22', entities: [], resourceGraph: { propertyId: 'prop-22', connections: [] } },
        intent: baseIntent('prop-22'),
      });
      compilePropertyRevisionToHomesteadScenario(emptyRevision);
    } catch { threw = true; }
    assert(threw, '22. A property with no PARCEL entity fails closed at compile time rather than defaulting to some area');
  }

  // 23. Disabled entities contribute no operational flow.
  {
    const activeBed = createPropertyEntity({ entityId: 'bed-active', propertyId: 'prop-23', entityType: 'VEGETABLE_BED', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 20 } });
    const inactiveBed = createPropertyEntity({ entityId: 'bed-inactive', propertyId: 'prop-23', entityType: 'VEGETABLE_BED', createdAt: CREATED_AT, createdBy: 'test', realityStatus: 'VIRTUAL', status: 'INACTIVE', physical: { footprintM2: 20 } });
    const revision = baseRevision('prop-23', 'rev-1', [activeBed, inactiveBed]);
    const compiled = compilePropertyRevisionToHomesteadScenario(revision);
    assert(compiled.scenario.foodProducers.length === 1 && compiled.scenario.foodProducers[0].placementId === 'bed-active', '23. An INACTIVE entity contributes no food production');
    assert(compiled.scenario.land.placements.some(p => p.id === 'bed-inactive'), '23. An INACTIVE entity still occupies its land placement (land-use accounting is unaffected by operational status)');
  }

  return { passed, failed, errors };
}
