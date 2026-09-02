import { validateFeatureDefinition, type FeatureDefinition } from '../src/property/featureContract';

function baseFeature(overrides: Partial<FeatureDefinition> = {}): FeatureDefinition {
  return {
    featureId: 'feature-water-overlay',
    name: 'Water Resilience Overlay',
    readEntityTypes: ['WATER_TANK'],
    writeEntityTypes: [],
    readCapabilities: ['REPORT_LEVEL'],
    writeCapabilities: [],
    createsEntities: false,
    createsObservations: false,
    createsExperiments: false,
    usesKnowledgeTypes: [],
    simulationImpact: 'READS_ONLY',
    liveImpact: 'NONE',
    evidenceImpact: 'NONE',
    ...overrides,
  };
}

export function runFeatureContractTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };
  const assertThrows = (fn: () => void, message: string) => {
    let threw = false;
    try { fn(); } catch { threw = true; }
    assert(threw, message);
  };

  // 1. A well-formed, read-only feature validates cleanly.
  {
    let threw = false;
    try { validateFeatureDefinition(baseFeature()); } catch { threw = true; }
    assert(!threw, '1. A well-formed read-only FeatureDefinition validates without throwing');
  }

  // 2. featureId is required.
  assertThrows(() => validateFeatureDefinition(baseFeature({ featureId: '' })), '2. Empty featureId is rejected');

  // 3. name is required.
  assertThrows(() => validateFeatureDefinition(baseFeature({ name: '  ' })), '3. Blank name is rejected');

  // 4. Writing an entity type never declared as read is rejected.
  assertThrows(
    () => validateFeatureDefinition(baseFeature({ writeEntityTypes: ['WATER_TANK'], readEntityTypes: [] })),
    '4. Writing an entity type not in readEntityTypes is rejected',
  );

  // 5. Writing an entity type that IS also declared read is accepted.
  {
    let threw = false;
    try {
      validateFeatureDefinition(baseFeature({
        readEntityTypes: ['WATER_TANK'], writeEntityTypes: ['WATER_TANK'],
        liveImpact: 'ISSUES_CONTROL_COMMANDS', simulationImpact: 'AFFECTS_COMPILATION',
      }));
    } catch { threw = true; }
    assert(!threw, '5. Writing an entity type also declared as read is accepted');
  }

  // 6. ISSUES_CONTROL_COMMANDS with no writeEntityTypes is rejected.
  assertThrows(
    () => validateFeatureDefinition(baseFeature({ liveImpact: 'ISSUES_CONTROL_COMMANDS', writeEntityTypes: [] })),
    '6. liveImpact ISSUES_CONTROL_COMMANDS with empty writeEntityTypes is rejected',
  );

  // 7. createsObservations with liveImpact NONE is rejected.
  assertThrows(
    () => validateFeatureDefinition(baseFeature({ createsObservations: true, liveImpact: 'NONE' })),
    '7. createsObservations with liveImpact NONE is rejected',
  );

  // 8. createsObservations with a real liveImpact is accepted.
  {
    let threw = false;
    try { validateFeatureDefinition(baseFeature({ createsObservations: true, liveImpact: 'WRITES_OBSERVATIONS' })); } catch { threw = true; }
    assert(!threw, '8. createsObservations with liveImpact WRITES_OBSERVATIONS is accepted');
  }

  // 9. createsExperiments with simulationImpact NONE is rejected.
  assertThrows(
    () => validateFeatureDefinition(baseFeature({ createsExperiments: true, simulationImpact: 'NONE' })),
    '9. createsExperiments with simulationImpact NONE is rejected',
  );

  // 10. evidenceImpact PRODUCES_EVIDENCE with neither observations nor experiments is rejected.
  assertThrows(
    () => validateFeatureDefinition(baseFeature({ evidenceImpact: 'PRODUCES_EVIDENCE' })),
    '10. evidenceImpact PRODUCES_EVIDENCE with no observation/experiment source is rejected',
  );

  // 11. evidenceImpact PRODUCES_EVIDENCE backed by createsObservations is accepted.
  {
    let threw = false;
    try {
      validateFeatureDefinition(baseFeature({
        evidenceImpact: 'PRODUCES_EVIDENCE', createsObservations: true, liveImpact: 'WRITES_OBSERVATIONS',
      }));
    } catch { threw = true; }
    assert(!threw, '11. evidenceImpact PRODUCES_EVIDENCE backed by createsObservations is accepted');
  }

  return { passed, failed, errors };
}
