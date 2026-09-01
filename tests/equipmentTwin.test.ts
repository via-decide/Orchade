import {
  createEquipmentTwinRevision,
  getEquipmentTwinRevision,
  promoteEquipmentTwinLifecycle,
  registerEquipmentTwinRevision,
  type EquipmentTwinDefinition,
  type EquipmentTwinRegistry,
} from '../src/property/equipmentTwin';
import {
  createPropertyEquipmentInstance,
  removePropertyEquipmentInstance,
  type PropertyEquipmentInstance,
} from '../src/property/propertyEquipment';
import { createPumpFixtureTwin } from '../src/property/fixtures/pumpFixture';
import { checksum } from '../src/engine/replay/checksum';

function minimalTwinInput(overrides: Partial<Parameters<typeof createEquipmentTwinRevision>[0]> = {}) {
  return {
    twinId: 'twin-under-test',
    revisionId: 'v1',
    name: 'Test twin',
    equipmentClass: 'OTHER' as const,
    source: { type: 'USER_DEFINED' as const },
    capabilities: [],
    resourcePorts: [],
    physical: { provenanceRefs: [] },
    operatingEnvelope: { additionalConstraints: [], provenanceRefs: [] },
    performanceModel: { modelId: 'm1', modelVersion: '1.0.0', modelType: 'NOT_MODELED' as const, inputs: [], outputs: [], parameterRefs: [], evidenceRefs: [], limitations: [] },
    telemetry: [],
    controls: [],
    maintenance: { provenanceRefs: [] },
    economics: { currency: 'INR' as const, provenanceRefs: [] },
    failureModes: [],
    parameterProvenanceRefs: [],
    evidenceRefs: [],
    modelCapabilityStatus: 'NOT_MODELED' as const,
    ...overrides,
  };
}

export function runEquipmentTwinTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };

  // 10. Twin requires stable twin ID.
  {
    let threw = false;
    try { createEquipmentTwinRevision(minimalTwinInput({ twinId: '' })); } catch { threw = true; }
    assert(threw, '10. Empty twinId is rejected');
    const twin = createEquipmentTwinRevision(minimalTwinInput());
    assert(twin.twinId === 'twin-under-test', '10. Twin id is stable on the created twin');
  }

  // 11. Twin requires exact revision.
  {
    let threw = false;
    try { createEquipmentTwinRevision(minimalTwinInput({ revisionId: '' })); } catch { threw = true; }
    assert(threw, '11. Empty revisionId is rejected');
    let sameAsParent = false;
    try { createEquipmentTwinRevision(minimalTwinInput({ revisionId: 'v1', parentRevisionId: 'v1' })); } catch { sameAsParent = true; }
    assert(sameAsParent, '11. revisionId equal to parentRevisionId is rejected');
  }

  // 12. Twin accepts parameter provenance references.
  {
    const twin = createEquipmentTwinRevision(minimalTwinInput({
      parameterProvenanceRefs: ['ref-a', 'ref-b'],
      parameterOrigins: { ratedPowerW: 'MEASURED', purchaseCostINR: 'RESEARCHED' },
    }));
    assert(twin.parameterProvenanceRefs.length === 2, '12. parameterProvenanceRefs are stored');
    assert(twin.parameterOrigins.ratedPowerW === 'MEASURED', '12. Per-field parameterOrigins are stored');
  }

  // 13. Missing parameter remains missing/UNKNOWN.
  {
    const twin = createEquipmentTwinRevision(minimalTwinInput());
    assert(twin.operatingEnvelope.humidityPercent === undefined, '13. An unsupplied operating-envelope field stays undefined, not defaulted');
    assert(twin.operatingEnvelope.ratedPowerW === undefined, '13. An unsupplied ratedPowerW stays undefined, not defaulted');
    assert(twin.parameterOrigins.neverProvided === undefined, '13. An unrecorded parameter origin stays undefined (unknown), never guessed');
  }

  // 14. NOT_MODELED remains NOT_MODELED.
  {
    const twin = createEquipmentTwinRevision(minimalTwinInput({ modelCapabilityStatus: 'NOT_MODELED' }));
    assert(twin.performanceModel.modelType === 'NOT_MODELED', '14. performanceModel.modelType NOT_MODELED is preserved');
    assert(twin.modelCapabilityStatus === 'NOT_MODELED', '14. modelCapabilityStatus NOT_MODELED is preserved, never upgraded');
  }

  // 15. Twin update does not mutate previous revision.
  {
    const v1 = createEquipmentTwinRevision(minimalTwinInput());
    const v1Snapshot = checksum(v1);
    const v2 = createEquipmentTwinRevision(minimalTwinInput({ revisionId: 'v2', parentRevisionId: 'v1', name: 'Test twin v2' }));
    assert(checksum(v1) === v1Snapshot, '15. Creating a new revision does not mutate the earlier revision object');
    assert(v1.name !== v2.name && v1.revisionId !== v2.revisionId, '15. v1 and v2 are distinct objects with distinct content');
  }

  // 16. RETIRED twin remains replayable historically.
  {
    let twin = createEquipmentTwinRevision(minimalTwinInput({ lifecycleStatus: 'DRAFT' }));
    let registry: EquipmentTwinRegistry = registerEquipmentTwinRevision({}, twin);
    twin = promoteEquipmentTwinLifecycle(twin, 'SIMULATION_READY', []);
    twin = promoteEquipmentTwinLifecycle(twin, 'BENCH_VERIFIED', ['evidence:bench-1']);
    twin = promoteEquipmentTwinLifecycle(twin, 'FIELD_VERIFIED', ['evidence:field-1']);
    twin = promoteEquipmentTwinLifecycle(twin, 'RETIRED', []);
    assert(twin.lifecycleStatus === 'RETIRED', '16. Twin reaches RETIRED through explicit one-step promotions');
    registry = registerEquipmentTwinRevision(registry, { ...twin, revisionId: 'v1-retired' });
    const retrieved = getEquipmentTwinRevision(registry, twin.twinId, 'v1');
    assert(!!retrieved, '16. The original (pre-retirement) revision remains retrievable from the registry for historical replay');
  }

  // 17. Negative capacities fail.
  {
    let threw = false;
    try {
      createEquipmentTwinRevision(minimalTwinInput({
        resourcePorts: [{ portId: 'p1', resourceType: 'WATER', direction: 'INPUT', required: false, capacity: { minimum: -5 }, provenanceRefs: [] }],
      }));
    } catch { threw = true; }
    assert(threw, '17. Negative resource-port capacity is rejected');
  }

  // 18. NaN/Infinity fails.
  {
    let nanThrew = false;
    try {
      createEquipmentTwinRevision(minimalTwinInput({
        resourcePorts: [{ portId: 'p1', resourceType: 'WATER', direction: 'INPUT', required: false, capacity: { maximum: NaN }, provenanceRefs: [] }],
      }));
    } catch { nanThrew = true; }
    assert(nanThrew, '18. NaN resource-port capacity is rejected');
    let infThrew = false;
    try {
      createEquipmentTwinRevision(minimalTwinInput({
        resourcePorts: [{ portId: 'p1', resourceType: 'WATER', direction: 'INPUT', required: false, capacity: { maximum: Infinity }, provenanceRefs: [] }],
      }));
    } catch { infThrew = true; }
    assert(infThrew, '18. Infinity resource-port capacity is rejected');
  }

  // 19. Invalid units fail.
  {
    let threw = false;
    try {
      createEquipmentTwinRevision(minimalTwinInput({
        resourcePorts: [{ portId: 'p1', resourceType: 'WATER', direction: 'INPUT', required: false, canonicalUnit: 'furlongs', provenanceRefs: [] }],
      }));
    } catch { threw = true; }
    assert(threw, '19. An unsupported physical unit on a resource port is rejected');
  }

  const twinRegistry: EquipmentTwinRegistry = registerEquipmentTwinRevision({}, createPumpFixtureTwin());

  // 21. Instance pins exact twin revision.
  {
    const instance = createPropertyEquipmentInstance({
      instanceId: 'inst-1', propertyId: 'prop-1', propertyRevisionId: 'rev-1',
      equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1',
      realityStatus: 'VIRTUAL', quantity: 1, active: true,
    }, twinRegistry);
    assert(instance.equipmentTwinRevisionId === 'v1', '21. Instance pins the exact twin revision it was created against');
  }

  // 22. VIRTUAL equipment is representable.
  {
    const instance = createPropertyEquipmentInstance({
      instanceId: 'inst-virtual', propertyId: 'prop-1', propertyRevisionId: 'rev-1',
      equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1',
      realityStatus: 'VIRTUAL', quantity: 1, active: true,
    }, twinRegistry);
    assert(instance.realityStatus === 'VIRTUAL' && instance.installedAt === undefined, '22. VIRTUAL equipment instance is representable without installedAt');
  }

  // 23. PHYSICAL equipment is representable.
  {
    const instance = createPropertyEquipmentInstance({
      instanceId: 'inst-physical', propertyId: 'prop-1', propertyRevisionId: 'rev-1',
      equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1',
      realityStatus: 'PHYSICAL', quantity: 1, active: true, installedAt: '2026-01-01T00:00:00.000Z',
    }, twinRegistry);
    assert(instance.realityStatus === 'PHYSICAL' && !!instance.installedAt, '23. PHYSICAL equipment instance requires and carries installedAt');
    let threw = false;
    try {
      createPropertyEquipmentInstance({
        instanceId: 'inst-physical-bad', propertyId: 'prop-1', propertyRevisionId: 'rev-1',
        equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1',
        realityStatus: 'PHYSICAL', quantity: 1, active: true,
      }, twinRegistry);
    } catch { threw = true; }
    assert(threw, '23. A PHYSICAL instance without installedAt is rejected');
  }

  // 24. CANDIDATE equipment is representable.
  {
    const instance = createPropertyEquipmentInstance({
      instanceId: 'inst-candidate', propertyId: 'prop-1', propertyRevisionId: 'rev-1',
      equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1',
      realityStatus: 'CANDIDATE', quantity: 1, active: true,
    }, twinRegistry);
    assert(instance.realityStatus === 'CANDIDATE', '24. CANDIDATE equipment instance is representable');
    let threw = false;
    try {
      createPropertyEquipmentInstance({
        instanceId: 'inst-candidate-bad', propertyId: 'prop-1', propertyRevisionId: 'rev-1',
        equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1',
        realityStatus: 'CANDIDATE', quantity: 1, active: true, installedAt: '2026-01-01T00:00:00.000Z',
      }, twinRegistry);
    } catch { threw = true; }
    assert(threw, '24. A CANDIDATE instance may not declare installedAt (it has not been installed)');
  }

  // 25. Removing candidate does not mutate baseline.
  {
    const instances: PropertyEquipmentInstance[] = [
      createPropertyEquipmentInstance({ instanceId: 'inst-a', propertyId: 'prop-1', propertyRevisionId: 'rev-1', equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1', realityStatus: 'CANDIDATE', quantity: 1, active: true }, twinRegistry),
      createPropertyEquipmentInstance({ instanceId: 'inst-b', propertyId: 'prop-1', propertyRevisionId: 'rev-1', equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1', realityStatus: 'VIRTUAL', quantity: 1, active: true }, twinRegistry),
    ];
    const originalLength = instances.length;
    const remaining = removePropertyEquipmentInstance(instances, 'inst-a');
    assert(instances.length === originalLength, '25. The original instances array is unchanged after removal');
    assert(remaining.length === originalLength - 1 && !remaining.some(item => item.instanceId === 'inst-a'), '25. The returned array no longer contains the removed candidate');
  }

  // 26. Same twin may have multiple property instances.
  {
    const a = createPropertyEquipmentInstance({ instanceId: 'inst-multi-a', propertyId: 'prop-1', propertyRevisionId: 'rev-1', equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1', realityStatus: 'VIRTUAL', quantity: 1, active: true }, twinRegistry);
    const b = createPropertyEquipmentInstance({ instanceId: 'inst-multi-b', propertyId: 'prop-1', propertyRevisionId: 'rev-1', equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v1', realityStatus: 'VIRTUAL', quantity: 2, active: true }, twinRegistry);
    assert(a.equipmentTwinId === b.equipmentTwinId && a.instanceId !== b.instanceId, '26. Two independent instances can reference the same twin revision');
  }

  // 27. Instance cannot refer to nonexistent twin revision.
  {
    let threw = false;
    try {
      createPropertyEquipmentInstance({
        instanceId: 'inst-bad', propertyId: 'prop-1', propertyRevisionId: 'rev-1',
        equipmentTwinId: 'ORCHADE-PUMP-FIXTURE-001', equipmentTwinRevisionId: 'v999-does-not-exist',
        realityStatus: 'VIRTUAL', quantity: 1, active: true,
      }, twinRegistry);
    } catch { threw = true; }
    assert(threw, '27. Referencing a nonexistent twin revision is rejected');
  }

  return { passed, failed, errors };
}
