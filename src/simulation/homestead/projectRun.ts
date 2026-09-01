import { checksum } from '../../engine/replay/checksum';
import { ReplayRecorder } from '../../engine/replay/recorder';
import type { ReplayFrame } from '../../engine/replay/timeline';
import { createDailyRecord } from './analytics';
import type { HomesteadSimulationEvent } from './events';
import { createProject001InitialState } from './projectInitialState';
import type { HomesteadFailureType, ProjectDailyRecord, ProjectHomesteadState, SelfSufficiencyMetrics } from './projectState';
import { advanceProject001Day } from './projectTransition';
import { validateHomesteadScenario, type HomesteadScenarioDefinition } from './scenario';

export interface Project001RunSession {
  scenario: HomesteadScenarioDefinition;
  scenarioHash: string;
  startStateHash: string;
  state: ProjectHomesteadState;
  events: HomesteadSimulationEvent[];
  replayFrames: readonly ReplayFrame[];
  dailyChecksums: string[];
  metricSeries: ProjectDailyRecord[];
}

export interface Project001SimulationRun {
  scenario: HomesteadScenarioDefinition;
  scenarioId: string;
  scenarioHash: string;
  simulationVersion: string;
  seed: string;
  startStateHash: string;
  eventCount: number;
  finalStateHash: string;
  dailyChecksums: string[];
  metricSeries: ProjectDailyRecord[];
  failureSummary: Partial<Record<HomesteadFailureType, number>>;
  events: HomesteadSimulationEvent[];
  replayFrames: readonly ReplayFrame[];
  finalState: ProjectHomesteadState;
  finalMetrics: SelfSufficiencyMetrics;
}

export function createProject001RunSession(scenario: HomesteadScenarioDefinition): Project001RunSession {
  validateHomesteadScenario(scenario);
  const initial = createProject001InitialState(scenario);
  return {
    scenario,
    scenarioHash: checksum(scenario),
    startStateHash: checksum(initial.state),
    state: initial.state,
    events: initial.events,
    replayFrames: [],
    dailyChecksums: [],
    metricSeries: [],
  };
}

export function advanceProject001RunSession(session: Project001RunSession, days: number): Project001RunSession {
  if (!Number.isInteger(days) || days < 0) throw new Error('Project 001 session advance days must be a non-negative integer.');
  let state = session.state;
  const events = [...session.events];
  const dailyChecksums = [...session.dailyChecksums];
  const metricSeries = [...session.metricSeries];
  const replay = new ReplayRecorder(1);
  const remainingDays = Math.max(0, session.scenario.durationDays - (state.day - session.scenario.startDay + 1));
  const daysToRun = Math.min(days, remainingDays);
  for (let index = 0; index < daysToRun; index += 1) {
    const result = advanceProject001Day(session.scenario, state);
    state = result.state;
    events.push(...result.events);
    const dailyChecksum = checksum({ state, events: result.events });
    dailyChecksums.push(dailyChecksum);
    metricSeries.push(createDailyRecord(session.scenario, state));
    replay.record({
      tick: state.day,
      input: [],
      commands: [],
      events: result.events,
      randomSeed: String(state.rngState),
      checksum: dailyChecksum,
    }, state);
  }
  return {
    ...session,
    state,
    events,
    replayFrames: [...session.replayFrames, ...replay.export()],
    dailyChecksums,
    metricSeries,
  };
}

export function finalizeProject001Run(session: Project001RunSession): Project001SimulationRun {
  const failureSummary: Partial<Record<HomesteadFailureType, number>> = {};
  session.state.knowledge.failures.forEach(failure => {
    failureSummary[failure.type] = (failureSummary[failure.type] ?? 0) + 1;
  });
  return {
    scenario: session.scenario,
    scenarioId: session.scenario.id,
    scenarioHash: session.scenarioHash,
    simulationVersion: session.scenario.simulationVersion,
    seed: session.scenario.seed,
    startStateHash: session.startStateHash,
    eventCount: session.events.length,
    finalStateHash: checksum(session.state),
    dailyChecksums: session.dailyChecksums,
    metricSeries: session.metricSeries,
    failureSummary,
    events: session.events,
    replayFrames: session.replayFrames,
    finalState: session.state,
    finalMetrics: session.state.lastMetrics,
  };
}

export function runProject001Scenario(
  scenario: HomesteadScenarioDefinition,
  durationDays = scenario.durationDays,
): Project001SimulationRun {
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > scenario.durationDays) throw new Error('Project 001 run duration must be within the scenario duration.');
  return finalizeProject001Run(advanceProject001RunSession(createProject001RunSession(scenario), durationDays));
}

export interface Project001Comparison {
  baseline: Project001SimulationRun;
  intervention: Project001SimulationRun;
  sharedSeed: string;
  metricDelta: SelfSufficiencyMetrics;
  failureDelta: Partial<Record<HomesteadFailureType, number>>;
}

export function compareProject001Scenarios(
  baselineScenario: HomesteadScenarioDefinition,
  interventionScenario: HomesteadScenarioDefinition,
): Project001Comparison {
  if (baselineScenario.seed !== interventionScenario.seed) throw new Error('Project 001 comparisons require the same deterministic seed.');
  if (baselineScenario.durationDays !== interventionScenario.durationDays) throw new Error('Project 001 comparisons require equal duration.');
  const baseline = runProject001Scenario(baselineScenario);
  const intervention = runProject001Scenario(interventionScenario);
  return compareProject001Runs(baseline, intervention);
}

export function compareProject001Runs(
  baseline: Project001SimulationRun,
  intervention: Project001SimulationRun,
): Project001Comparison {
  if (baseline.seed !== intervention.seed) throw new Error('Project 001 comparisons require the same deterministic seed.');
  const metricDelta = Object.fromEntries(
    Object.keys(baseline.finalMetrics).map(key => [key, intervention.finalMetrics[key as keyof SelfSufficiencyMetrics] - baseline.finalMetrics[key as keyof SelfSufficiencyMetrics]]),
  ) as unknown as SelfSufficiencyMetrics;
  const failureTypes = new Set([...Object.keys(baseline.failureSummary), ...Object.keys(intervention.failureSummary)] as HomesteadFailureType[]);
  const failureDelta: Partial<Record<HomesteadFailureType, number>> = {};
  failureTypes.forEach(type => { failureDelta[type] = (intervention.failureSummary[type] ?? 0) - (baseline.failureSummary[type] ?? 0); });
  return { baseline, intervention, sharedSeed: baseline.seed, metricDelta, failureDelta };
}
