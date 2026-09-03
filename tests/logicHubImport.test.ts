import {
  importLogicHubArtifact,
  acceptLogicHubImport,
  validateEngineeringArtifactExport,
  verifyContentHash,
  sha256Hex,
  IntegrityFailureError,
  type EngineeringArtifactExport,
} from '../src/property/logicHubImport';
import { registerEquipmentTwinRevision, type EquipmentTwinRegistry } from '../src/property/equipmentTwin';
import { buildLhPump001Fixture } from '../src/property/fixtures/lhPump001Export';

function baseArtifact(overrides: Partial<EngineeringArtifactExport> = {}, refOverrides: Partial<EngineeringArtifactExport['engineeringRevisionRef']> = {}): EngineeringArtifactExport {
  return {
    engineeringProjectRef: { system: 'LOGICHUB', entityType: 'PROJECT', entityId: 'proj-x', schemaVersion: '1' },
    engineeringRevisionRef: { system: 'LOGICHUB', entityType: 'REVISION', entityId: 'rev-x', revisionId: 'rev-x', schemaVersion: '1', ...refOverrides },
    artifactType: 'test-module',
    capabilities: ['MOVE_WATER'],
    interfaces: [],
    modelCapabilityStatus: 'ESTIMATE_ONLY',
    evidenceRefs: [],
    limitations: [],
    contentHash: 'sha256:' + 'a'.repeat(64),
    ...overrides,
  };
}

export async function runLogicHubImportTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };

  // 1. Valid engineering artifact imports (spec Part 27 #7).
  {
    const { artifact, rawJson } = await buildLhPump001Fixture();
    const twin = await importLogicHubArtifact({
      artifact, rawJson,
      twinId: 'twin-lh-pump-001', twinRevisionId: 'v1',
      name: 'LH Pump 001 (imported)', equipmentClass: 'WATER_PUMP',
    });
    assert(twin.twinId === 'twin-lh-pump-001', '1. Valid LogicHub artifact imports into a twin');
    assert(twin.operatingEnvelope.ratedPowerW === 550, '1. Real operatingEnvelope field flows through (ratedPowerW)');
    assert(twin.physical.weightKg === 8, '1. Real physicalParameters field flows through (weightKg)');
  }

  // 2. Exact revision is pinned (spec Part 27 #8) -- unpinned revision is rejected.
  {
    const unpinned = baseArtifact({}, { revisionId: undefined });
    let threw = false;
    try { validateEngineeringArtifactExport(unpinned); } catch { threw = true; }
    assert(threw, '2. An engineeringRevisionRef with no revisionId is rejected (cannot be pinned)');
  }

  // 3. New LogicHub revision does not mutate old twin (spec Part 27 #9, adapted).
  {
    const artifactR1 = baseArtifact({}, { revisionId: 'rev-1', entityId: 'rev-1' });
    const hashR1 = await sha256Hex(JSON.stringify({ ...artifactR1, contentHash: undefined }));
    const finalR1 = { ...artifactR1, contentHash: hashR1 };
    const rawR1 = JSON.stringify({ ...artifactR1, contentHash: undefined });

    const twinV1 = await importLogicHubArtifact({
      artifact: finalR1, rawJson: rawR1,
      twinId: 'twin-revision-test', twinRevisionId: 'v1',
      name: 'Revision test twin', equipmentClass: 'OTHER',
    });

    const artifactR2 = baseArtifact({ artifactType: 'updated-module' }, { revisionId: 'rev-2', entityId: 'rev-2' });
    const rawR2 = JSON.stringify({ ...artifactR2, contentHash: undefined });
    const hashR2 = await sha256Hex(rawR2);
    const finalR2 = { ...artifactR2, contentHash: hashR2 };

    const twinV2 = await importLogicHubArtifact({
      artifact: finalR2, rawJson: rawR2,
      twinId: 'twin-revision-test', twinRevisionId: 'v2',
      name: 'Revision test twin', equipmentClass: 'OTHER',
    });

    assert(twinV1.revisionId === 'v1' && twinV1.source.logicHubRevisionId === 'rev-1', '3. First import pinned to rev-1, untouched');
    assert(twinV2.revisionId === 'v2' && twinV2.source.logicHubRevisionId === 'rev-2', '3. Second import creates a NEW twin revision pinned to rev-2');
    assert(twinV1.source.logicHubRevisionId === 'rev-1', '3. Importing rev-2 did not mutate the already-created v1 object');
  }

  // 4. Missing engineering parameter remains UNKNOWN (spec Part 27 #10) -- never defaulted to zero.
  {
    const sparse = baseArtifact({ physicalParameters: undefined, operatingEnvelope: undefined, resourceRequirements: undefined });
    const rawJson = JSON.stringify({ ...sparse, contentHash: undefined });
    const hash = await sha256Hex(rawJson);
    const twin = await importLogicHubArtifact({
      artifact: { ...sparse, contentHash: hash }, rawJson,
      twinId: 'twin-sparse', twinRevisionId: 'v1',
      name: 'Sparse twin', equipmentClass: 'OTHER',
    });
    assert(twin.physical.weightKg === undefined, '4. Absent physicalParameters.weightKg stays undefined, not 0');
    assert(twin.operatingEnvelope.ratedPowerW === undefined, '4. Absent operatingEnvelope.ratedPowerW stays undefined, not 0');
    assert(twin.performanceModel.limitations.some(l => l.includes('no physicalParameters')), '4. Absence is recorded in limitations, not silently swallowed');
  }

  // 5. LogicHub source does not imply verified (spec Part 27 #11).
  {
    const artifact = baseArtifact({ modelCapabilityStatus: 'SUPPORTED' });
    const rawJson = JSON.stringify({ ...artifact, contentHash: undefined });
    const hash = await sha256Hex(rawJson);
    const twin = await importLogicHubArtifact({
      artifact: { ...artifact, contentHash: hash }, rawJson,
      twinId: 'twin-verified-claim', twinRevisionId: 'v1',
      name: 'Verified-claim twin', equipmentClass: 'OTHER',
    });
    assert(twin.lifecycleStatus === 'DRAFT', '5. Even a SUPPORTED-status LogicHub export starts lifecycleStatus DRAFT in Orchade, never auto-promoted');
  }

  // 6. Unsupported model remains NOT_MODELED (spec Part 27 #12).
  {
    const { artifact, rawJson } = await buildLhPump001Fixture();
    const twin = await importLogicHubArtifact({
      artifact, rawJson, twinId: 'twin-model-check', twinRevisionId: 'v1',
      name: 'Model check twin', equipmentClass: 'WATER_PUMP',
    });
    assert(twin.performanceModel.modelType === 'NOT_MODELED', '6. Imported twin never claims a performance model LogicHub did not actually export');
  }

  // 7. Hash mismatch fails (INTEGRITY_FAILURE).
  {
    const artifact = baseArtifact({ contentHash: 'sha256:' + '0'.repeat(64) });
    let threw = false;
    try {
      await importLogicHubArtifact({
        artifact, rawJson: JSON.stringify({ ...artifact, contentHash: undefined }),
        twinId: 'twin-bad-hash', twinRevisionId: 'v1', name: 'x', equipmentClass: 'OTHER',
      });
    } catch (err) { threw = err instanceof IntegrityFailureError; }
    assert(threw, '7. A contentHash that does not match the actual bytes throws IntegrityFailureError');
  }

  // 8. Unknown system on a ref fails closed.
  {
    const bad = baseArtifact();
    (bad.engineeringProjectRef as { system: string }).system = 'MARS_ROVER';
    let threw = false;
    try { validateEngineeringArtifactExport(bad); } catch { threw = true; }
    assert(threw, '8. engineeringProjectRef.system outside KUP/LOGICHUB/ORCHADE/VIADECIDE is rejected');
  }

  // 9. Non-LOGICHUB source on the project/revision ref is rejected (this adapter is LogicHub-specific).
  {
    const bad = baseArtifact();
    (bad.engineeringProjectRef as { system: string }).system = 'ORCHADE';
    let threw = false;
    try { validateEngineeringArtifactExport(bad); } catch { threw = true; }
    assert(threw, '9. An export whose engineeringProjectRef.system is not LOGICHUB is rejected by this adapter');
  }

  // 10. Unrecognized capability does not fail the import -- recorded, not dropped silently or blindly cast.
  {
    const { artifact, rawJson } = await buildLhPump001Fixture();
    const twin = await importLogicHubArtifact({
      artifact, rawJson, twinId: 'twin-capability-check', twinRevisionId: 'v1',
      name: 'Capability check twin', equipmentClass: 'WATER_PUMP',
    });
    assert(!(twin.capabilities as string[]).includes('SUBMERSIBLE_RATED'), "10. Unrecognized capability 'SUBMERSIBLE_RATED' is not blindly cast into the closed EquipmentCapability list");
    assert(twin.capabilities.includes('MOVE_WATER') && twin.capabilities.includes('REPORT_TELEMETRY'), '10. Recognized capabilities still come through');
    assert(twin.performanceModel.limitations.some(l => l.includes('SUBMERSIBLE_RATED')), '10. The unrecognized capability is recorded in limitations, not silently dropped');
  }

  // 11. USER ACCEPTS IMPORT -> CREATE CANDIDATE: acceptLogicHubImport produces a CANDIDATE instance.
  {
    const { artifact, rawJson } = await buildLhPump001Fixture();
    const twin = await importLogicHubArtifact({
      artifact, rawJson, twinId: 'twin-accept-flow', twinRevisionId: 'v1',
      name: 'Accept-flow twin', equipmentClass: 'WATER_PUMP',
    });
    const registry: EquipmentTwinRegistry = registerEquipmentTwinRevision({}, twin);
    const instance = acceptLogicHubImport(twin, registry, {
      instanceId: 'inst-accept-flow', propertyId: 'prop-001', propertyRevisionId: 'rev-001', quantity: 1, active: true,
    });
    assert(instance.realityStatus === 'CANDIDATE', '11. Accepting an import creates a PropertyEquipmentInstance with realityStatus CANDIDATE');
    assert(instance.equipmentTwinId === 'twin-accept-flow' && instance.equipmentTwinRevisionId === 'v1', '11. Instance is pinned to the exact imported twin revision');
  }

  return { passed, failed, errors };
}
