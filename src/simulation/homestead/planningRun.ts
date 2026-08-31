import { checksum } from '../../engine/replay/checksum';
import { ReplayRecorder } from '../../engine/replay/recorder';
import type { ReplayFrame } from '../../engine/replay/timeline';
import type { HomesteadSimulationEvent } from './events';
import {
  applyHomesteadPlanningIntent,
  type HomesteadPlanningContext,
  type HomesteadPlanningIntent,
  type HomesteadPlanningState,
} from './planningTransition';

export interface HomesteadPlanningStep {
  intent: HomesteadPlanningIntent;
  context: HomesteadPlanningContext;
}

export interface HomesteadPlanningReplay {
  initialStateHash: string;
  finalStateHash: string;
  checksums: string[];
  events: HomesteadSimulationEvent[];
  replayFrames: readonly ReplayFrame[];
  finalState: HomesteadPlanningState;
}

export function runHomesteadPlanningReplay(
  initialState: HomesteadPlanningState,
  steps: HomesteadPlanningStep[],
): HomesteadPlanningReplay {
  let state = initialState;
  const events: HomesteadSimulationEvent[] = [];
  const checksums: string[] = [];
  const replay = new ReplayRecorder(1);
  const initialStateHash = checksum(initialState);
  steps.forEach(step => {
    const result = applyHomesteadPlanningIntent(state, step.intent, step.context);
    state = result.state;
    events.push(...result.events);
    const frameChecksum = checksum({ state, events: result.events });
    checksums.push(frameChecksum);
    replay.record({
      tick: step.context.day,
      input: [],
      commands: [],
      events: result.events,
      randomSeed: 'planning:no-rng',
      checksum: frameChecksum,
    }, state);
  });
  return {
    initialStateHash,
    finalStateHash: checksum(state),
    checksums,
    events,
    replayFrames: replay.export(),
    finalState: state,
  };
}
