import type { Project001SimulationRun } from './projectRun';
import type { LearnedRule } from './projectState';

export interface LearnedRuleInput {
  id: string;
  condition: string;
  outcome: string;
  evidenceRefs: string[];
  status: LearnedRule['status'];
}

export function createEvidenceBackedLearnedRule(
  run: Project001SimulationRun,
  input: LearnedRuleInput,
): LearnedRule {
  if (!input.id.trim() || !input.condition.trim() || !input.outcome.trim() || input.evidenceRefs.length === 0) {
    throw new Error('Learned rule requires identity, condition, outcome, and evidence.');
  }
  const validRefs = new Set([
    ...run.events.map(event => event.id),
    ...run.finalState.knowledge.failures.map(failure => failure.id),
    ...run.finalState.knowledge.evidence.map(evidence => evidence.id),
    ...run.dailyChecksums,
  ]);
  const missing = input.evidenceRefs.filter(ref => !validRefs.has(ref));
  if (missing.length > 0) throw new Error(`Learned rule references inconsistent evidence: ${missing.join(', ')}.`);
  return { ...input };
}

export interface ExperimentSummary {
  question: string;
  baseline: string;
  change: string;
  controlledVariables: string[];
  result: Record<string, { baseline: number; intervention: number; delta: number }>;
  interpretation: string;
  evidence: { baselineRunHash: string; interventionRunHash: string; scenarioHashes: string[]; eventRefs: string[] };
  status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'REFUTED' | 'INCONCLUSIVE';
}

export function createWaterStorageExperimentSummary(
  baseline: Project001SimulationRun,
  intervention: Project001SimulationRun,
): ExperimentSummary {
  if (baseline.seed !== intervention.seed) throw new Error('Experiment summary requires a shared climate seed.');
  const baselineShortages = baseline.failureSummary.WATER_SHORTAGE ?? 0;
  const interventionShortages = intervention.failureSummary.WATER_SHORTAGE ?? 0;
  const improved = interventionShortages < baselineShortages;
  return {
    question: 'Does increasing rainwater storage reduce water-constrained operating days?',
    baseline: `${baseline.scenario.water.tankCapacityL.toLocaleString()} L tank`,
    change: `${intervention.scenario.water.tankCapacityL.toLocaleString()} L tank`,
    controlledVariables: ['climate seed', 'household', 'crop plan', 'livestock', 'energy system', 'operating policy'],
    result: {
      waterShortageFailures: { baseline: baselineShortages, intervention: interventionShortages, delta: interventionShortages - baselineShortages },
      waterIndependence: { baseline: baseline.finalMetrics.waterIndependence, intervention: intervention.finalMetrics.waterIndependence, delta: intervention.finalMetrics.waterIndependence - baseline.finalMetrics.waterIndependence },
      foodSelfSufficiency: { baseline: baseline.finalMetrics.foodSelfSufficiency, intervention: intervention.finalMetrics.foodSelfSufficiency, delta: intervention.finalMetrics.foodSelfSufficiency - baseline.finalMetrics.foodSelfSufficiency },
    },
    interpretation: improved
      ? 'Storage reduced shortage events under the controlled weather sequence; remaining failures identify constraints beyond storage.'
      : 'Storage alone did not reduce shortage events under the controlled weather sequence.',
    evidence: {
      baselineRunHash: baseline.finalStateHash,
      interventionRunHash: intervention.finalStateHash,
      scenarioHashes: [baseline.scenarioHash, intervention.scenarioHash],
      eventRefs: [
        ...baseline.events.filter(event => event.type === 'WATER_SHORTAGE').slice(0, 3).map(event => event.id),
        ...intervention.events.filter(event => event.type === 'WATER_SHORTAGE').slice(0, 3).map(event => event.id),
      ],
    },
    status: improved ? 'SUPPORTED' : 'REFUTED',
  };
}
