import { createWaterStorageExperimentSummary, type ExperimentSummary } from './knowledge';
import { createProject001WaterIntervention, PROJECT_001_BASELINE_SCENARIO } from './project001Scenario';
import { compareProject001Runs, runProject001Scenario, type Project001Comparison, type Project001SimulationRun } from './projectRun';
import type { FailureRecord } from './projectState';

export interface Project001Demonstration {
  baseline: Project001SimulationRun;
  intervention: Project001SimulationRun;
  comparison: Project001Comparison;
  firstConstraint?: FailureRecord;
  experimentSummary: ExperimentSummary;
}

export function runProject001Demonstration(): Project001Demonstration {
  const baseline = runProject001Scenario(PROJECT_001_BASELINE_SCENARIO);
  const firstConstraint = baseline.finalState.knowledge.failures.find(failure => failure.type !== 'NUTRIENT_DEFICIT')
    ?? baseline.finalState.knowledge.failures[0];
  const interventionScenario = createProject001WaterIntervention(PROJECT_001_BASELINE_SCENARIO);
  interventionScenario.revision.evidenceRefs = firstConstraint?.evidenceRefs ?? [];
  const intervention = runProject001Scenario(interventionScenario);
  const comparison = compareProject001Runs(baseline, intervention);
  const experimentSummary = createWaterStorageExperimentSummary(baseline, intervention);
  return {
    baseline,
    intervention,
    comparison,
    firstConstraint,
    experimentSummary,
  };
}
