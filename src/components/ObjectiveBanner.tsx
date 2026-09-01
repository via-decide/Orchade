import React from 'react';
import type { PlayerObjective, PlayerAction, NewGamePhase } from '../../gameplay/director/public';

const PHASE_LABELS: Record<NewGamePhase, string> = {
  ORIENTATION: 'Getting Started',
  FIRST_BUILD: 'First Build',
  FIRST_OPERATION: 'First Operation',
  ESTABLISHED: 'Established',
};

const PHASE_COLORS: Record<NewGamePhase, string> = {
  ORIENTATION: '#64b5f6',
  FIRST_BUILD: '#81c784',
  FIRST_OPERATION: '#e9c46a',
  ESTABLISHED: '#c9a227',
};

interface ObjectiveBannerProps {
  objective: PlayerObjective;
  phase: NewGamePhase;
  completedCount: number;
  totalCount: number;
  actions: PlayerAction[];
}

export function ObjectiveBanner({ objective, phase, completedCount, totalCount, actions }: ObjectiveBannerProps) {
  const availableActions = actions.filter(a => a.availability === 'AVAILABLE');
  const phaseColor = PHASE_COLORS[phase];

  return (
    <div className="bg-[#1a1610] border border-[#332c22] rounded-lg px-3 py-2 font-sans text-[#f4ecd8]">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
            style={{ background: phaseColor + '22', color: phaseColor, border: `1px solid ${phaseColor}44` }}
          >
            {PHASE_LABELS[phase]}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold font-mono truncate" title={objective.title}>
              {objective.title}
            </div>
            <div className="text-[10px] text-[#8a7f68] font-mono truncate" title={objective.reason}>
              {objective.reason}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {availableActions.length > 0 && (
            <span className="text-[10px] font-mono text-[#81c784]">
              {availableActions.length} action{availableActions.length !== 1 ? 's' : ''} available
            </span>
          )}
          <div className="flex items-center gap-1">
            <div className="w-16 h-1.5 bg-[#262016] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`, background: phaseColor }}
              />
            </div>
            <span className="text-[9px] font-mono text-[#8a7f68]">{completedCount}/{totalCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
