/**
 * LH-PUMP-001-R1 (spec Part 22, Step A/B) -- the shared cross-repo pump
 * fixture. This file defines Orchade's side: the EngineeringArtifactExport
 * payload standing in for what via-decide/LogicHub's real export adapter
 * would produce (engineering/packages/kup-export, not built in this repo).
 *
 * Deliberately a DIFFERENT, independent fixture from
 * src/property/fixtures/pumpFixture.ts's ORCHADE-PUMP-FIXTURE-001 -- that
 * fixture represents an already-accepted, SIMULATION_READY,
 * ESTIMATE_ONLY twin (the end state after import + bench testing +
 * promotion). This fixture represents the raw, freshly-received LogicHub
 * export -- the *input* to logicHubImport.ts, not its eventual output.
 * Numbers below are fixture data (not a real product claim), chosen in the
 * same plausible range as ORCHADE-PUMP-FIXTURE-001 so the two make sense
 * side by side.
 */
import type { EngineeringArtifactExport } from '../logicHubImport';
import { sha256Hex } from '../logicHubImport';

const LH_PUMP_001_PROJECT_ID = 'proj-lh-pump-001';
const LH_PUMP_001_REVISION_ID = 'rev-001';

/** The export payload with contentHash left unset -- this is what gets hashed. */
function unhashedExport(): Omit<EngineeringArtifactExport, 'contentHash'> {
  return {
    engineeringProjectRef: {
      system: 'LOGICHUB',
      entityType: 'PROJECT',
      entityId: LH_PUMP_001_PROJECT_ID,
      schemaVersion: '1',
    },
    engineeringRevisionRef: {
      system: 'LOGICHUB',
      entityType: 'REVISION',
      entityId: LH_PUMP_001_REVISION_ID,
      revisionId: LH_PUMP_001_REVISION_ID,
      schemaVersion: '1',
    },
    artifactType: 'pump-module',
    // MOVE_WATER and REPORT_TELEMETRY are in Orchade's known vocabulary;
    // SUBMERSIBLE_RATED is not -- included deliberately so the import
    // adapter's "unrecognized capability" path has a real fixture to
    // exercise, not just a synthetic test-only string.
    capabilities: ['MOVE_WATER', 'REPORT_TELEMETRY', 'SUBMERSIBLE_RATED'],
    interfaces: [],
    physicalParameters: { weightKg: 8 },
    operatingEnvelope: { ratedPowerW: 550, maximumContinuousRuntimeMinutes: 240 },
    resourceRequirements: { flowLPerMin: 35 },
    modelCapabilityStatus: 'ESTIMATE_ONLY',
    evidenceRefs: [],
    limitations: [
      'No pump curve or head-loss hydraulic model in the source LogicHub project.',
      'Dynamic head at installation site not yet known.',
    ],
  };
}

export interface LhPump001Fixture {
  artifact: EngineeringArtifactExport;
  /** Exact bytes artifact.contentHash was computed over -- pass to verifyContentHash(). */
  rawJson: string;
}

/** Builds the fixture with a real, internally-consistent contentHash (async: uses Web Crypto). */
export async function buildLhPump001Fixture(): Promise<LhPump001Fixture> {
  const unhashed = unhashedExport();
  const rawJson = JSON.stringify(unhashed);
  const contentHash = await sha256Hex(rawJson);
  return { artifact: { ...unhashed, contentHash }, rawJson };
}
