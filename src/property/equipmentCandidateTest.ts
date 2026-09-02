/**
 * Equipment candidate test workflow (Parts 15, 16, 18, 19 / sections 40-41
 * of ORCHADE P0).
 *
 * "Test before buy / build" (section 40's mandated flow):
 *
 *   BASELINE REVISION -> CLONE CANDIDATE REVISION -> ADD CANDIDATE EQUIPMENT
 *   INSTANCE -> CONNECT RESOURCE PORTS -> VALIDATE -> CAPABILITY CHECK ->
 *   SCENARIO COMPILER -> SAME PROJECT 001 ENGINE -> SAME SEED -> COMPARE
 *
 * The candidate is a brand-new PropertyRevision derived from the baseline
 * (same entity graph, same intent/seed) plus one extra PropertyEquipmentInstance
 * folded in by the scenario compiler -- never a second simulation path, and
 * the baseline PropertyRevision is never mutated. Commerce (Daxini) and
 * engineering provenance (LogicHub) never receive privileged physics: the
 * compiler reads only `instance.configuration`'s resource/labour/cost
 * numbers, never the twin's descriptive/commercial fields.
 */
import { checksum } from '../engine/replay/checksum';
import {
  compareProject001Scenarios,
  runProject001Scenario,
  type Project001Comparison,
} from '../simulation/homestead/projectRun';
import type { HomesteadScenarioDefinition } from '../simulation/homestead/scenario';
import type { HomesteadFailureType } from '../simulation/homestead/projectState';
import type { EquipmentTwinDefinition, EquipmentTwinRegistry } from './equipmentTwin';
import { getEquipmentTwinRevision } from './equipmentTwin';
import { createPropertyEquipmentInstance } from './propertyEquipment';
import type { PropertyRevision } from './revision';
import { deriveNextPropertyRevision } from './revision';
import { compilePropertyRevisionToHomesteadScenario } from './scenarioCompiler';

export interface EquipmentCandidateTestIntent {
  propertyId: string;
  baselineRevisionId: string;
  equipmentTwinId: string;
  equipmentTwinRevisionId: string;
  quantity: number;
  targetEntityRefs: string[];
  /**
   * Numeric resource deltas this instance contributes, scaled by quantity.
   * A generic, documented set of levers -- not equipment-specific fields
   * hardcoded into this engine. Any key not present contributes zero.
   * See docs/EQUIPMENT_TEST_WORKFLOW.md for the full list and units.
   */
  configuration: Record<string, unknown>;
  /** portIds from the twin's resourcePorts that this test declares connected. A required port absent here fails the test closed as INFEASIBLE. */
  connectedPortIds: string[];
  simulationDurationDays: number;
  seedPolicy: 'SAME_AS_BASELINE';
}

export interface EquipmentImpactMetric {
  metricId: string;
  label: string;
  unit: string;
  baselineValue: number;
  candidateValue: number;
  delta: number;
  direction: 'IMPROVED' | 'WORSENED' | 'UNCHANGED';
}

export interface FailureDelta {
  type: HomesteadFailureType;
  baselineCount: number;
  candidateCount: number;
  delta: number;
}

export interface EvidenceCoverage {
  measured: number;
  researched: number;
  assumed: number;
  derived: number;
  unsupported: number;
}

export type EquipmentCandidateTestOutcome = 'BENEFICIAL' | 'NO_MEANINGFUL_CHANGE' | 'HARMFUL' | 'INFEASIBLE' | 'UNKNOWN';

export interface EquipmentCandidateTestResult {
  baselineRunRef: string;
  candidateRunRef: string;
  equipmentInstanceRef: string;
  candidateRevisionId: string;
  changedMetrics: EquipmentImpactMetric[];
  changedFailures: FailureDelta[];
  unresolvedCapabilities: string[];
  evidenceCoverage: EvidenceCoverage;
  result: EquipmentCandidateTestOutcome;
}

const EPSILON = 1e-9;

/** metricId -> { label, unit, higherIsBetter } for every SelfSufficiencyMetrics field this engine reports on. */
const METRIC_DEFINITIONS: Record<string, { label: string; unit: string; higherIsBetter: boolean }> = {
  foodSelfSufficiency: { label: 'Food self-sufficiency', unit: 'ratio', higherIsBetter: true },
  waterIndependence: { label: 'Water independence', unit: 'ratio', higherIsBetter: true },
  energyIndependence: { label: 'Energy independence', unit: 'ratio', higherIsBetter: true },
  nutrientCircularity: { label: 'Nutrient circularity', unit: 'ratio', higherIsBetter: true },
  propertyCostCoverage: { label: 'Property cost coverage', unit: 'ratio', higherIsBetter: true },
  householdEconomicCoverage: { label: 'Household economic coverage', unit: 'ratio', higherIsBetter: true },
  labourFeasibility: { label: 'Labour feasibility', unit: 'ratio', higherIsBetter: true },
};

function direction(delta: number, higherIsBetter: boolean): EquipmentImpactMetric['direction'] {
  if (Math.abs(delta) < EPSILON) return 'UNCHANGED';
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  return improved ? 'IMPROVED' : 'WORSENED';
}

function buildImpactMetrics(comparison: Project001Comparison): EquipmentImpactMetric[] {
  return Object.entries(METRIC_DEFINITIONS).map(([metricId, def]) => {
    const baselineValue = comparison.baseline.finalMetrics[metricId as keyof typeof comparison.baseline.finalMetrics];
    const delta = comparison.metricDelta[metricId as keyof typeof comparison.metricDelta];
    return {
      metricId,
      label: def.label,
      unit: def.unit,
      baselineValue,
      candidateValue: baselineValue + delta,
      delta,
      direction: direction(delta, def.higherIsBetter),
    };
  });
}

function buildFailureDeltas(comparison: Project001Comparison): FailureDelta[] {
  return Object.entries(comparison.failureDelta)
    .filter(([, delta]) => delta !== 0)
    .map(([type, delta]) => ({
      type: type as HomesteadFailureType,
      baselineCount: comparison.baseline.failureSummary[type as HomesteadFailureType] ?? 0,
      candidateCount: comparison.intervention.failureSummary[type as HomesteadFailureType] ?? 0,
      delta: delta ?? 0,
    }));
}

function computeEvidenceCoverage(twin: EquipmentTwinDefinition): EvidenceCoverage {
  const origins = Object.values(twin.parameterOrigins);
  const counts = { measured: 0, researched: 0, assumed: 0, derived: 0, unsupported: 0 };
  origins.forEach(origin => {
    if (origin === 'MEASURED') counts.measured += 1;
    else if (origin === 'RESEARCHED') counts.researched += 1;
    else if (origin === 'USER_ASSUMPTION') counts.assumed += 1;
    else if (origin === 'DERIVED') counts.derived += 1;
  });
  if (twin.performanceModel.modelType === 'NOT_MODELED') counts.unsupported += 1;
  const total = counts.measured + counts.researched + counts.assumed + counts.derived + counts.unsupported;
  if (total === 0) return { measured: 0, researched: 0, assumed: 0, derived: 0, unsupported: 0 };
  return {
    measured: counts.measured / total,
    researched: counts.researched / total,
    assumed: counts.assumed / total,
    derived: counts.derived / total,
    unsupported: counts.unsupported / total,
  };
}

/** Overrides only the run-length knob for this one test; never mutates the property's own planningHorizonDays. */
function withTestDuration(scenario: HomesteadScenarioDefinition, simulationDurationDays: number): HomesteadScenarioDefinition {
  return { ...scenario, durationDays: simulationDurationDays };
}

/**
 * Runs the full candidate-test pipeline (section 40) and returns a
 * trade-off report (section 41) -- never a single "recommended" score.
 * `result` is derived only from measured metric/failure deltas:
 *
 * - INFEASIBLE: a required resource port is left unconnected, or compiling
 *   the candidate revision fails (e.g. cannot afford the purchase, or
 *   consumes more labour than the household has).
 * - UNKNOWN: the twin's performance model is NOT_MODELED, so no claim
 *   about physical effect can be made.
 * - BENEFICIAL: failures (shortage days) net decrease. This wins even if a
 *   self-sufficiency ratio metric dips -- e.g. buying in external water to
 *   clear a shortage is a real, reportable trade-off, not a reason to call
 *   the fix harmful.
 * - HARMFUL: failures net increase, or (when failures are unchanged) more
 *   metrics worsen than improve.
 * - NO_MEANINGFUL_CHANGE: failures unchanged and metrics wash out.
 */
export function runEquipmentCandidateTest(
  baselineRevision: PropertyRevision,
  twinRegistry: EquipmentTwinRegistry,
  intent: EquipmentCandidateTestIntent,
): EquipmentCandidateTestResult {
  if (intent.propertyId !== baselineRevision.propertyId) throw new Error('Equipment candidate test propertyId must match the baseline revision propertyId.');
  if (intent.baselineRevisionId !== baselineRevision.revisionId) throw new Error('Equipment candidate test baselineRevisionId must match the baseline revision id.');
  if (intent.seedPolicy !== 'SAME_AS_BASELINE') throw new Error('Equipment candidate tests currently only support SAME_AS_BASELINE seed policy.');
  if (!Number.isInteger(intent.simulationDurationDays) || intent.simulationDurationDays < 1) {
    throw new Error('Equipment candidate test requires a positive integer simulationDurationDays.');
  }

  const twin = getEquipmentTwinRevision(twinRegistry, intent.equipmentTwinId, intent.equipmentTwinRevisionId);
  if (!twin) throw new Error(`Unknown equipment twin revision: ${intent.equipmentTwinId}@${intent.equipmentTwinRevisionId}.`);

  const candidateRevisionId = `${baselineRevision.revisionId}:candidate:${twin.twinId}:${twin.revisionId}`;
  // Clone candidate revision: same graph/intent/reality declaration as baseline (same seed by construction), new id.
  const candidateRevision = deriveNextPropertyRevision(baselineRevision, {
    revisionId: candidateRevisionId,
    createdAt: baselineRevision.createdAt,
    createdBy: 'system:equipment-candidate-test',
    rationale: `Equipment candidate test: ${twin.twinId}@${twin.revisionId} x${intent.quantity}`,
    changeSet: [{ description: `Candidate equipment ${twin.twinId}@${twin.revisionId}`, entityRefs: intent.targetEntityRefs }],
  });

  const instance = createPropertyEquipmentInstance({
    instanceId: `instance:${candidateRevisionId}`,
    propertyId: intent.propertyId,
    propertyRevisionId: candidateRevisionId,
    equipmentTwinId: twin.twinId,
    equipmentTwinRevisionId: twin.revisionId,
    realityStatus: 'CANDIDATE',
    quantity: intent.quantity,
    configuration: intent.configuration as Record<string, string | number | boolean>,
    active: true,
  }, twinRegistry);

  const requiredPorts = twin.resourcePorts.filter(port => port.required);
  const unresolvedCapabilities: string[] = requiredPorts
    .filter(port => !intent.connectedPortIds.includes(port.portId))
    .map(port => `Required resource port not connected: ${port.portId} (${port.resourceType})`);

  const evidenceCoverage = computeEvidenceCoverage(twin);

  const emptyResult = (result: EquipmentCandidateTestOutcome, capabilities: string[]): EquipmentCandidateTestResult => {
    const baselineRun = runProject001Scenario(withTestDuration(compilePropertyRevisionToHomesteadScenario(baselineRevision).scenario, intent.simulationDurationDays));
    return {
      baselineRunRef: baselineRun.finalStateHash,
      candidateRunRef: '',
      equipmentInstanceRef: instance.instanceId,
      candidateRevisionId,
      changedMetrics: [],
      changedFailures: [],
      unresolvedCapabilities: capabilities,
      evidenceCoverage,
      result,
    };
  };

  if (unresolvedCapabilities.length > 0) return emptyResult('INFEASIBLE', unresolvedCapabilities);
  if (twin.performanceModel.modelType === 'NOT_MODELED') {
    return emptyResult('UNKNOWN', [`Performance model NOT_MODELED for ${twin.twinId}@${twin.revisionId}: ${twin.performanceModel.limitations.join('; ')}`]);
  }

  const effectiveBaselineScenario = withTestDuration(compilePropertyRevisionToHomesteadScenario(baselineRevision).scenario, intent.simulationDurationDays);

  let candidateScenario: HomesteadScenarioDefinition;
  try {
    candidateScenario = withTestDuration(
      compilePropertyRevisionToHomesteadScenario(candidateRevision, { equipmentInstances: [instance] }).scenario,
      intent.simulationDurationDays,
    );
  } catch (error) {
    return emptyResult('INFEASIBLE', [`Candidate revision is infeasible: ${error instanceof Error ? error.message : String(error)}`]);
  }

  const comparison = compareProject001Scenarios(effectiveBaselineScenario, candidateScenario);
  const changedMetrics = buildImpactMetrics(comparison);
  const changedFailures = buildFailureDeltas(comparison);

  const failureNetDelta = changedFailures.reduce((sum, item) => sum + item.delta, 0);
  const improvedCount = changedMetrics.filter(m => m.direction === 'IMPROVED').length;
  const worsenedCount = changedMetrics.filter(m => m.direction === 'WORSENED').length;

  // Failure-day count (did anyone actually go without water/food/energy/cash?) is
  // the dominant signal -- it is what a household experiences directly. The
  // self-sufficiency-ratio metrics are a secondary, real trade-off (e.g. buying
  // in external water resolves a shortage but can still read as "less
  // independent"), so they only break ties when the failure count is unchanged.
  let result: EquipmentCandidateTestOutcome;
  if (failureNetDelta < 0) result = 'BENEFICIAL';
  else if (failureNetDelta > 0) result = 'HARMFUL';
  else if (worsenedCount > improvedCount) result = 'HARMFUL';
  else if (improvedCount > worsenedCount) result = 'BENEFICIAL';
  else result = 'NO_MEANINGFUL_CHANGE';

  return {
    baselineRunRef: checksum({ scenarioHash: comparison.baseline.scenarioHash, finalStateHash: comparison.baseline.finalStateHash }),
    candidateRunRef: checksum({ scenarioHash: comparison.intervention.scenarioHash, finalStateHash: comparison.intervention.finalStateHash }),
    equipmentInstanceRef: instance.instanceId,
    candidateRevisionId,
    changedMetrics,
    changedFailures,
    unresolvedCapabilities,
    evidenceCoverage,
    result,
  };
}
