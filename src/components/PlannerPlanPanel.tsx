import React from 'react';
import { HomesteadPreset } from '../data/homesteadPresets';

const SCALE_OPTIONS = [0.5, 0.75, 1.0, 3.5, 5.0];

interface PlannerPlanPanelProps {
  totalAcreage: number;
  setTotalAcreage: (acreage: number) => void;
  presets: HomesteadPreset[];
  onLoadPreset: (preset: HomesteadPreset) => void;
  showSynergyLines: boolean;
  setShowSynergyLines: (value: boolean) => void;
  showTopography: boolean;
  setShowTopography: (value: boolean) => void;
  onOpenCompanion: () => void;
  onOpenRotation: () => void;
}

export function PlannerPlanPanel({
  totalAcreage,
  setTotalAcreage,
  presets,
  onLoadPreset,
  showSynergyLines,
  setShowSynergyLines,
  showTopography,
  setShowTopography,
  onOpenCompanion,
  onOpenRotation,
}: PlannerPlanPanelProps) {
  return (
    <div className="space-y-3 font-sans text-[#f4ecd8]">
      {/* Land Scale */}
      <div className="bg-[#171410] border border-[#332c22] p-3 rounded-xl space-y-2">
        <div className="text-xs font-mono font-bold text-[#e9c46a] uppercase tracking-wider">Land Scale</div>
        <div className="flex gap-1.5 flex-wrap">
          {SCALE_OPTIONS.map(ac => (
            <button
              key={ac}
              onClick={() => setTotalAcreage(ac)}
              className={`px-3 py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                totalAcreage === ac
                  ? 'bg-[#c9a227] text-[#171410]'
                  : 'bg-[#221c15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
              }`}
              style={{ minHeight: '44px' }}
            >
              {ac} ac
            </button>
          ))}
        </div>
      </div>

      {/* Permaculture Templates */}
      <div className="bg-[#171410] border border-[#332c22] p-3 rounded-xl space-y-2">
        <div className="text-xs font-mono font-bold text-[#e9c46a] uppercase tracking-wider">Permaculture Templates</div>
        <div className="flex gap-1.5 flex-wrap">
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => onLoadPreset(p)}
              className="px-3 py-2 rounded bg-[#221c15] hover:bg-[#332c22] border border-[#3d3323] text-[#f4ecd8] text-[11px] font-mono transition-all cursor-pointer flex items-center gap-1"
              style={{ minHeight: '44px' }}
            >
              <span>📐 {p.name.split('-Acre')[0]}-Acre</span>
              <span className="text-[9px] text-[#c9a227]">({p.badge})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overlay Toggles */}
      <div className="bg-[#171410] border border-[#332c22] p-3 rounded-xl space-y-2">
        <div className="text-xs font-mono font-bold text-[#e9c46a] uppercase tracking-wider">Overlays</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSynergyLines(!showSynergyLines)}
            className={`px-3 py-2 rounded text-[11px] font-mono transition-all cursor-pointer ${
              showSynergyLines ? 'bg-[#81c784]/20 text-[#81c784] border border-[#81c784]/40' : 'bg-[#221c15] text-[#8a7f68] border border-[#332c22]'
            }`}
            style={{ minHeight: '44px' }}
          >
            {showSynergyLines ? '✨ Synergies ON' : '✨ Synergies OFF'}
          </button>

          <button
            onClick={() => setShowTopography(!showTopography)}
            className={`px-3 py-2 rounded text-[11px] font-mono transition-all cursor-pointer ${
              showTopography ? 'bg-[#64b5f6]/20 text-[#64b5f6] border border-[#64b5f6]/40' : 'bg-[#221c15] text-[#8a7f68] border border-[#332c22]'
            }`}
            style={{ minHeight: '44px' }}
          >
            {showTopography ? '⛰️ Topography ON' : '⛰️ Topography OFF'}
          </button>
        </div>
      </div>

      {/* Reference & Rotation Planning */}
      <div className="bg-[#171410] border border-[#332c22] p-3 rounded-xl space-y-2">
        <div className="text-xs font-mono font-bold text-[#e9c46a] uppercase tracking-wider">Placement Reference</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenCompanion}
            className="px-3 py-2 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#e9c46a] border border-[#8a6f1c]/40 flex items-center gap-1.5 transition-all cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <span>🌿 Companion Matrix</span>
          </button>

          <button
            onClick={onOpenRotation}
            className="px-3 py-2 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#81c784] border border-[#2e4726] flex items-center gap-1.5 transition-all cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            <span>🔄 4-Year Rotation Planner</span>
          </button>
        </div>
      </div>
    </div>
  );
}
