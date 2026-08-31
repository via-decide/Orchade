import React, { useEffect, useMemo, useState } from 'react';
import {
  LEVEL_NAMES,
  type ProgressionInputs,
} from '../../gameplay/progression/api';
import {
  UNLOCK_REGISTRY,
  canUnlock,
  isUnlocked,
  type UnlockError,
} from '../../gameplay/research-credits/api';
import {
  applyHomesteadPlanningIntent,
  createInitialHomesteadPlanningState,
  type HomesteadPlanningIntent,
  type HomesteadSimulationEvent,
  type HomesteadSeasonName,
} from '../simulation/homestead';

interface ProgressionPanelProps {
  scenarioId: string;
  currentDay: number;
  season: HomesteadSeasonName;
  availableAreaM2: number;
  levelInputs: ProgressionInputs;
}

const reasonLabel: Record<UnlockError, string> = {
  'unknown-content': 'Unknown',
  'already-unlocked': 'Unlocked',
  'level-required': 'Higher level',
  'wrong-season': 'Wrong season',
  'missing-prerequisite': 'Prerequisite',
  insufficient: 'Need credits',
};

export function ProgressionPanel({
  scenarioId,
  currentDay,
  season,
  availableAreaM2,
  levelInputs,
}: ProgressionPanelProps) {
  const initial = useMemo(
    () => createInitialHomesteadPlanningState(scenarioId, availableAreaM2),
    [availableAreaM2, scenarioId],
  );
  const [view, setView] = useState<{ state: typeof initial; events: HomesteadSimulationEvent[] }>({
    state: initial,
    events: [],
  });

  useEffect(() => setView({ state: initial, events: [] }), [initial]);

  const dispatch = (intent: HomesteadPlanningIntent) => {
    setView(current => {
      const result = applyHomesteadPlanningIntent(current.state, intent, {
        day: Math.max(0, currentDay),
        season,
        levelInputs,
      });
      return { state: result.state, events: [...current.events, ...result.events].slice(-20) };
    });
  };

  const paidUnlocks = view.state.research.unlocks.filter(item => item.cost > 0).length;
  const lastEvent = view.events[view.events.length - 1];

  return (
    <div className="bg-[#1f1b15] border border-[#332c22] rounded-lg p-2.5 space-y-2" aria-label="Deterministic progression">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase text-[#8a7f68] font-mono">Progression · gates capability, never physics</div>
          <div className="text-xs font-mono text-[#f4ecd8]">
            Level {view.state.progression.level} · {LEVEL_NAMES[view.state.progression.level]}
          </div>
        </div>
        <div className="text-right text-[10px] font-mono">
          <div className="text-[#c9a227]">{view.state.research.balance} research credits</div>
          <div className="text-[#8a7f68]">{paidUnlocks} paid unlocks · {view.state.occupiedAreaM2.toFixed(0)} m² planned</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {UNLOCK_REGISTRY.slice(0, 12).map(content => {
          const unlocked = isUnlocked(view.state.research, content.contentId);
          const gate = canUnlock(view.state.research, content.contentId, view.state.progression.level, season);
          const action = unlocked ? 'Place' : 'Unlock';
          const gateText = gate === true ? content.cost + ' credits' : reasonLabel[gate.error];
          return (
            <button
              key={content.contentId}
              onClick={() => dispatch(unlocked
                ? { type: 'PLACE_COMPONENT', placementId: content.contentId + '-' + (view.state.placements.length + 1), contentId: content.contentId, areaM2: 10 }
                : { type: 'UNLOCK_CONTENT', contentId: content.contentId })}
              className="text-left rounded border border-[#3d3323] bg-[#211c16] px-2 py-1.5 text-[10px] font-mono hover:border-[#8a7f68] cursor-pointer"
              title={unlocked ? 'Submit deterministic placement intent' : gateText}
            >
              <span className={unlocked ? 'text-[#81c784]' : 'text-[#f4ecd8]'}>{content.displayName}</span>
              <span className="block text-[#8a7f68]">{action} · {unlocked ? content.validSeasons?.join('/') ?? 'any season' : gateText}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
        <button
          onClick={() => dispatch({ type: 'EVALUATE_LEVEL' })}
          className="px-2 py-1 rounded bg-[#332c22] text-[#f4ecd8] cursor-pointer"
        >
          Evaluate level
        </button>
        <div className="text-right text-[#8a7f68]">
          {lastEvent ? <span><b className={lastEvent.type.includes('REJECTED') ? 'text-[#e57373]' : 'text-[#81c784]'}>{lastEvent.type}</b> · Day {lastEvent.day}</span> : 'Submit an unlock or placement intent'}
        </div>
      </div>
    </div>
  );
}
