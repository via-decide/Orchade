/**
 * Equipment candidate test workflow (Parts 15, 16, 18, 19 of ORCHADE P0).
 *
 * "Test before buy / build": clones the baseline scenario, adds one
 * candidate PropertyEquipmentInstance, and reruns the SAME existing
 * Project 001 engine under the SAME seed. Never a second simulation path.
 * The baseline is never mutated. Commerce (Daxini) and engineering
 * provenance (LogicHub) never receive privileged physics -- the only
 * inputs that affect the result are the twin's declared resource/labour/
 * cost numbers, applied through the same scenario fields any other
 * equipment would use.
 */
import { checksum } from '../engine/replay/checksum';
import {
  compareProject001Scenarios,
  runProject001Scenario,
  type Project001Comparison,
} from '../simulation/homestead/projectRun';
import { validateHomesteadScenario, type HomesteadScenarioDefinition } from '../simulation/homestead/scenario';
import type { HomesteadFailureType } from '../simulation/homestead/projectState';
import type { EquipmentTwinDefinition, EquipmentTwinRegistry } from './equipmentTwin';
import { getEquipmentTwinRevision } from './equipmentTwin';
import { createPropertyEquipmentInstance, type PropertyEquipmentInstance } from './propertyEquipment';

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

function numericConfig(configuration: Record<string, unknown>, key: string): number {
  const value = configuration[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Additively applies one equipment instance's declared resource/labour/cost
 * deltas onto a cloned scenario. Pure: never mutates `baseline`. This is
 * intentionally generic (reads named configuration keys, not
 * equipment-class-specific fields) so no equipment source or class ever
 * receives special-cased physics.
 */
export function applyEquipmentInstanceToScenario(
  baseline: HomesteadScenarioDefinition,
  instance: PropertyEquipmentInstance,
  candidateRevisionId: string,
): HomesteadScenarioDefinition {
  const quantity = instance.quantity;
  const cfg = instance.configuration;
  // farmBaseLoadKwhPerDay is a DEMAND quantity: consumption adds to it, production offsets it.
  const netEnergyKwhPerDay = (numericConfig(cfg, 'energyConsumptionKwhPerDay') - numericConfig(cfg, 'energyProductionKwhPerDay')) * quantity;
  // externalWaterLPerDay is a SUPPLY quantity: production adds to it, consumption offsets it (opposite convention from energy).
  const netWaterSupplyLPerDay = (numericConfig(cfg, 'waterProductionLitresPerDay') - numericConfig(cfg, 'waterConsumptionLitresPerDay')) * quantity;
  const netLabourMinutesPerDay = numericConfig(cfg, 'labourMinutesPerDay') * quantity;
  const purchaseCostINR = numericConfig(cfg, 'purchaseCostINR') * quantity;
  const dailyOperatingCostINR = numericConfig(cfg, 'dailyOperatingCostINR') * quantity;

  const candidate: HomesteadScenarioDefinition = {
    ...baseline,
    revision: {
      id: candidateRevisionId,
      parentRevisionId: baseline.revision.id,
      changeSet: [],
      reason: `Equipment candidate test: ${instance.equipmentTwinId}@${instance.equipmentTwinRevisionId} x${quantity}`,
      evidenceRefs: [...instance.evidenceRefs],
      createdAt: baseline.revision.createdAt,
    },
    energy: { ...baseline.energy, farmBaseLoadKwhPerDay: baseline.energy.farmBaseLoadKwhPerDay + netEnergyKwhPerDay },
    water: { ...baseline.water, externalWaterLPerDay: Math.max(0, baseline.water.externalWaterLPerDay + netWaterSupplyLPerDay) },
    household: { ...baseline.household, labourMinutesAvailablePerDay: baseline.household.labourMinutesAvailablePerDay - netLabourMinutesPerDay },
    economy: {
      ...baseline.economy,
      initialCash: baseline.economy.initialCash - purchaseCostINR,
      dailyPropertyOperatingCost: baseline.economy.dailyPropertyOperatingCost + dailyOperatingCostINR,
    },
  };
  validateHomesteadScenario(candidate);
  return candidate;
}

/**
 * Runs the full candidate-test pipeline (Part 18) and returns a trade-off
 * report (Part 19) -- never a single "recommended" score. `result` is
 * derived only from measured metric/failure deltas:
 *
 * - INFEASIBLE: a required resource port is left unconnected, or applying
 *   the equipment makes the scenario invalid (e.g. cannot afford the
 *   purchase, or consumes more labour than the household has).
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
  baselineScenario: HomesteadScenarioDefinition,
  twinRegistry: EquipmentTwinRegistry,
  intent: EquipmentCandidateTestIntent,
): EquipmentCandidateTestResult {
  if (intent.propertyId !== baselineScenario.id) throw new Error('Equipment candidate test propertyId must match the baseline scenario id.');
  if (intent.baselineRevisionId !== baselineScenario.revision.id) throw new Error('Equipment candidate test baselineRevisionId must match the baseline scenario revision id.');
  if (intent.seedPolicy !== 'SAME_AS_BASELINE') throw new Error('Equipment candidate tests currently only support SAME_AS_BASELINE seed policy.');

  if (!Number.isInteger(intent.simulationDurationDays) || intent.simulationDurationDays < 1) {
    throw new Error('Equipment candidate test requires a positive integer simulationDurationDays.');
  }

  const twin = getEquipmentTwinRevision(twinRegistry, intent.equipmentTwinId, intent.equipmentTwinRevisionId);
  if (!twin) throw new Error(`Unknown equipment twin revision: ${intent.equipmentTwinId}@${intent.equipmentTwinRevisionId}.`);

  // Pin the run duration explicitly so the baseline run used for a
  // short-circuit result (below) and the baseline run inside the full
  // comparison (further below) are always identical in duration.
  const effectiveBaselineScenario: HomesteadScenarioDefinition = { ...baselineScenario, durationDays: intent.simulationDurationDays };

  const candidateRevisionId = `${baselineScenario.revision.id}:candidate:${twin.twinId}:${twin.revisionId}`;
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

  if (unresolvedCapabilities.length > 0) {
    const baselineRun = runProject001Scenario(effectiveBaselineScenario);
    return {
      baselineRunRef: baselineRun.finalStateHash,
      candidateRunRef: '',
      equipmentInstanceRef: instance.instanceId,
      changedMetrics: [],
      changedFailures: [],
      unresolvedCapabilities,
      evidenceCoverage,
      result: 'INFEASIBLE',
    };
  }

  if (twin.performanceModel.modelType === 'NOT_MODELED') {
    const baselineRun = runProject001Scenario(effectiveBaselineScenario);
    return {
      baselineRunRef: baselineRun.finalStateHash,
      candidateRunRef: '',
      equipmentInstanceRef: instance.instanceId,
      changedMetrics: [],
      changedFailures: [],
      unresolvedCapabilities: [`Performance model NOT_MODELED for ${twin.twinId}@${twin.revisionId}: ${twin.performanceModel.limitations.join('; ')}`],
      evidenceCoverage,
      result: 'UNKNOWN',
    };
  }

  let candidateScenario: HomesteadScenarioDefinition;
  try {
    candidateScenario = applyEquipmentInstanceToScenario(effectiveBaselineScenario, instance, candidateRevisionId);
  } catch (error) {
    const baselineRun = runProject001Scenario(effectiveBaselineScenario);
    return {
      baselineRunRef: baselineRun.finalStateHash,
      candidateRunRef: '',
      equipmentInstanceRef: instance.instanceId,
      changedMetrics: [],
      changedFailures: [],
      unresolvedCapabilities: [`Candidate scenario is infeasible: ${error instanceof Error ? error.message : String(error)}`],
      evidenceCoverage,
      result: 'INFEASIBLE',
    };
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
    changedMetrics,
    changedFailures,
    unresolvedCapabilities,
    evidenceCoverage,
    result,
  };
}
