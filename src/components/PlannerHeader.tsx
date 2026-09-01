import React from 'react';

interface SeasonInfo {
  icon: string;
  name: string;
  avgTempF: number;
  sunlightHours: number;
}

interface PlannerHeaderProps {
  seasonInfo: SeasonInfo;
  cycleDay: number;
  waterGallons: number;
  batteryKwh: number;
  credits: number;
  totalAcreage: number;
  selectedZoneLabel: string;
  selectedZoneType: string;
  onAdvanceDay: () => void;
}

export function PlannerHeader({
  seasonInfo,
  cycleDay,
  waterGallons,
  batteryKwh,
  credits,
  totalAcreage,
  selectedZoneLabel,
  selectedZoneType,
  onAdvanceDay,
}: PlannerHeaderProps) {
  return (
    <div className="orchade-header bg-[#1f1b15] border border-[#332c22] p-2.5 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-2 font-sans text-[#f4ecd8]">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-1.5 bg-[#171410] px-2.5 py-1.5 rounded-lg border border-[#332c22] shrink-0">
          <span className="text-lg">{seasonInfo.icon}</span>
          <div>
            <div className="text-[9px] text-[#8a7f68] font-mono uppercase tracking-wider leading-none">Season</div>
            <div className="text-xs font-bold font-mono text-[#f4ecd8] leading-tight">{seasonInfo.name.toUpperCase()}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#171410] px-2.5 py-1.5 rounded-lg border border-[#332c22] shrink-0">
          <div>
            <div className="text-[9px] text-[#8a7f68] font-mono uppercase tracking-wider leading-none">Day</div>
            <div className="text-xs font-bold font-mono text-[#81c784] leading-tight">{cycleDay}</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2.5 bg-[#171410] px-2.5 py-1.5 rounded-lg border border-[#332c22] text-xs font-mono shrink-0">
          <div>
            <div className="text-[9px] text-[#8a7f68] uppercase leading-none">💧 Water</div>
            <div className="text-[#64b5f6] font-bold leading-tight">{Math.round(waterGallons)} gal</div>
          </div>
          <div className="border-l border-[#332c22] pl-2.5">
            <div className="text-[9px] text-[#8a7f68] uppercase leading-none">⚡ Battery</div>
            <div className="text-[#e9c46a] font-bold leading-tight">{batteryKwh.toFixed(1)} kWh</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#171410] px-2.5 py-1.5 rounded-lg border border-[#332c22] shrink-0">
          <div>
            <div className="text-[9px] text-[#8a7f68] font-mono uppercase tracking-wider leading-none">Treasury</div>
            <div className="text-xs font-bold font-mono text-[#c9a227] leading-tight">{credits.toLocaleString()} 🪙</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 bg-[#171410] px-2.5 py-1.5 rounded-lg border border-[#332c22] shrink-0">
          <div>
            <div className="text-[9px] text-[#8a7f68] font-mono uppercase tracking-wider leading-none">Land</div>
            <div className="text-xs font-bold font-mono text-[#f4ecd8] leading-tight">{totalAcreage} ac</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#171410] px-2.5 py-1.5 rounded-lg border border-[#332c22] min-w-0">
          <div className="min-w-0">
            <div className="text-[9px] text-[#8a7f68] font-mono uppercase tracking-wider leading-none">Selected</div>
            <div className="text-xs font-bold font-mono text-[#f4ecd8] truncate max-w-[9rem] leading-tight" title={selectedZoneLabel}>
              {selectedZoneLabel} <span className="text-[#8a7f68]">({selectedZoneType})</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onAdvanceDay}
        className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-[#c9a227] hover:bg-[#e0b738] text-[#171410] shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
        style={{ minHeight: '44px' }}
      >
        <span>⏩ Next Day</span>
      </button>
    </div>
  );
}
