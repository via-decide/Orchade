import { checksum } from '../../engine/replay/checksum';
import { ReplayRecorder } from '../../engine/replay/recorder';
import type { ReplayFrame } from '../../engine/replay/timeline';
import { advanceHomesteadDay } from './advanceDay';
import type { HomesteadSimulationEvent } from './events';
import { validateHomesteadScenario, type HomesteadScenarioDefinition } from './scenario';
import type { HomesteadSimulationState, HomesteadZoneState } from './state';

export interface HomesteadScenarioRun<TZone extends HomesteadZoneState> {
  scenarioId: string;
  schemaVersion: number;
  seed: string;
  startDay: number;
  endDay: number;
  events: HomesteadSimulationEvent[];
  replayFrames: readonly ReplayFrame[];
  finalState: HomesteadSimulationState<TZone>;
  finalStateChecksum: string;
}

export function runHomesteadScenario<TZone extends HomesteadZoneState>(
  scenario: HomesteadScenarioDefinition,
  initialState: HomesteadSimulationState<TZone>,
  durationDays = scenario.durationDays,
): HomesteadScenarioRun<TZone> {
  validateHomesteadScenario(scenario);
  if (!Number.isInteger(durationDays) || (durationDays ?? 0) < 1) {
    throw new Error('Homestead scenario run duration must be a positive integer.');
  }

  let state = initialState;
  const events: HomesteadSimulationEvent[] = [];
  const replay = new ReplayRecorder(1);
  for (let elapsedDay = 0; elapsedDay < durationDays!; elapsedDay += 1) {
    const result = advanceHomesteadDay({ scenario, state });
    state = result.state;
    events.push(...result.events);
    const frameChecksum = checksum({ state, events: result.events });
    replay.record({
      tick: state.day,
      input: [],
      commands: [],
      events: result.events,
      randomSeed: String(state.rngState),
      checksum: frameChecksum,
    }, state);
  }

  return {
    scenarioId: scenario.id,
    schemaVersion: scenario.schemaVersion,
    seed: scenario.seed,
    startDay: initialState.day,
    endDay: state.day,
    events,
    replayFrames: replay.export(),
    finalState: state,
    finalStateChecksum: checksum(state),
  };
}
