import React from 'react';
import { CropDefinition } from '../data/cropCatalog';
import { LIVESTOCK_BREEDS, PaddockState, LivestockBreed } from '../data/livestockData';
import { SoilNutrientPanel } from './SoilNutrientPanel';
import { HarvestCellarPanel, PantryItem } from './HarvestCellarPanel';
import type { ZoneData } from './PlotPlanner';

export type OperateSubView = 'details' | 'soil' | 'grazing' | 'cellar';

interface Synergy {
  type: 'bonus' | 'penalty' | 'info';
  title: string;
  desc: string;
  source: string;
}

interface PlannerOperatePanelProps {
  activeSubView: OperateSubView;
  setActiveSubView: (view: OperateSubView) => void;
  selectedZone: ZoneData;
  selectedCrop: CropDefinition | null;
  selectedSynergies: Synergy[];
  activePaddockOnSelected: PaddockState | undefined;
  paddockBreed: LivestockBreed | null | undefined;
  onHydrateZone: (zoneId: number) => void;
  onTendZone: (zoneId: number) => void;
  onHarvestZone: (zoneId: number) => void;
  onZoomMicroGrid: () => void;
  credits: number;
  onApplyAmendment: (amendmentId: string) => void;
  paddocks: PaddockState[];
  zones: ZoneData[];
  onOpenGrazingModal: () => void;
  pantry: PantryItem[];
  currentSeason: 'spring' | 'summer' | 'autumn' | 'winter';
  onSellItem: (itemId: string, qty: number, pricePerUnit: number) => void;
  onPreserveItem: (itemId: string, method: 'cold_cellar' | 'dry' | 'canned') => void;
}

const SUB_VIEWS: Array<{ id: OperateSubView; label: string }> = [
  { id: 'details', label: '📊 Zone' },
  { id: 'soil', label: '🧪 Soil' },
  { id: 'grazing', label: '🐑 Grazing' },
  { id: 'cellar', label: '🛖 Cellar' },
];

export function PlannerOperatePanel({
  activeSubView,
  setActiveSubView,
  selectedZone,
  selectedCrop,
  selectedSynergies,
  activePaddockOnSelected,
  paddockBreed,
  onHydrateZone,
  onTendZone,
  onHarvestZone,
  onZoomMicroGrid,
  credits,
  onApplyAmendment,
  paddocks,
  zones,
  onOpenGrazingModal,
  pantry,
  currentSeason,
  onSellItem,
  onPreserveItem,
}: PlannerOperatePanelProps) {
  return (
    <div className="space-y-3 font-sans text-[#f4ecd8]">
      {/* Sub-view chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SUB_VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveSubView(view.id)}
            className={`px-3 py-2 rounded-lg font-bold shrink-0 transition-all cursor-pointer text-xs font-mono ${
              activeSubView === view.id
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
            style={{ minHeight: '44px' }}
          >
            {view.label}
          </button>
        ))}
      </div>

      {activeSubView === 'details' && (
        <div className="bg-[#1f1b15] border border-[#332c22] p-4 rounded-xl shadow-lg space-y-4">
          <div className="flex justify-between items-start border-b border-[#332c22] pb-3">
            <div>
              <div className="text-[10px] text-[#8a7f68] font-mono uppercase tracking-wider">
                Zone Inspector (Col {selectedZone.col}, Row {selectedZone.row})
              </div>
              <h3 className="text-base font-bold text-[#f4ecd8] font-mono">
                #{selectedZone.id} {selectedZone.name}
              </h3>
              <div className="text-xs text-[#81c784] font-mono mt-0.5">
                {Math.round(selectedZone.sqft).toLocaleString()} sq ft ({selectedZone.w}×{selectedZone.h} tiles)
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-[#262016] border border-[#3d3323] text-[#c9a227]">
                {selectedZone.type.toUpperCase()}
              </span>
            </div>
          </div>

          {activePaddockOnSelected && paddockBreed && (
            <div className="bg-[#261f14] border border-[#8a6f1c] p-2.5 rounded-lg text-xs font-mono space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#f4ecd8] font-bold">
                  <span>{paddockBreed.icon}</span>
                  <span>{paddockBreed.name}</span>
                </div>
                <span className="text-[10px] text-[#81c784] bg-[#2e7d32]/20 px-1.5 py-0.5 rounded">
                  Day {activePaddockOnSelected.daysInPaddock}/{paddockBreed.rotationalDays}
                </span>
              </div>
              <div className="text-[10.5px] text-[#b8ab8e]">
                Pasture Forage: <b>{Math.round(activePaddockOnSelected.pastureBiomass)}%</b> · Yield in <b>{Math.max(0, paddockBreed.outputs.cycleDays - activePaddockOnSelected.cycleProgress)} days</b>
              </div>
            </div>
          )}

          {selectedCrop ? (
            <div className="space-y-3">
              <div className="bg-[#171410] border border-[#332c22] p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{selectedCrop.growthStages[selectedZone.plant.stageIndex]?.icon || '🌱'}</span>
                  <div>
                    <div className="text-xs font-bold text-[#f4ecd8]">{selectedCrop.displayName}</div>
                    <div className="text-[10px] text-[#8a7f68] font-mono italic">{selectedCrop.scientificName}</div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="text-[#81c784] font-bold">
                    {selectedCrop.growthStages[selectedZone.plant.stageIndex]?.name}
                  </div>
                  <div className="text-[10px] text-[#8a7f68]">
                    Stage {selectedZone.plant.stageIndex + 1}/{selectedCrop.growthStages.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#171410] p-2 rounded border border-[#2a241b]">
                  <div className="flex justify-between text-[#8a7f68] text-[10px]">
                    <span>Hydration</span>
                    <span className="text-[#64b5f6] font-bold">{Math.round(selectedZone.plant.water)}%</span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-[#64b5f6] h-full" style={{ width: `${selectedZone.plant.water}%` }} />
                  </div>
                </div>

                <div className="bg-[#171410] p-2 rounded border border-[#2a241b]">
                  <div className="flex justify-between text-[#8a7f68] text-[10px]">
                    <span>Vigor / Health</span>
                    <span className="text-[#81c784] font-bold">{Math.round(selectedZone.plant.health)}%</span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-[#81c784] h-full" style={{ width: `${selectedZone.plant.health}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onHydrateZone(selectedZone.id)}
                  className="p-2.5 rounded bg-[#1976d2]/20 hover:bg-[#1976d2]/30 border border-[#1976d2]/40 text-[#64b5f6] text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  style={{ minHeight: '44px' }}
                >
                  <span>💧 Water Zone</span>
                </button>

                <button
                  onClick={() => onTendZone(selectedZone.id)}
                  className="p-2.5 rounded bg-[#388e3c]/20 hover:bg-[#388e3c]/30 border border-[#388e3c]/40 text-[#81c784] text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  style={{ minHeight: '44px' }}
                >
                  <span>🌿 Weed & Tend</span>
                </button>
              </div>

              {selectedZone.plant.isHarvestable && (
                <button
                  onClick={() => onHarvestZone(selectedZone.id)}
                  className="w-full p-2.5 rounded bg-[#c9a227] hover:bg-[#e0b738] text-[#171410] text-xs font-mono font-bold shadow-lg animate-pulse transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={{ minHeight: '44px' }}
                >
                  <span>🌾 Harvest Crop Yield</span>
                </button>
              )}

              <button
                onClick={onZoomMicroGrid}
                className="w-full p-2 rounded bg-[#221c15] hover:bg-[#2e261d] border border-[#3d3323] text-[#b8ab8e] hover:text-[#f4ecd8] text-xs font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5"
                style={{ minHeight: '44px' }}
              >
                <span>🔍 Zoom Micro-Grid Plant Matrix</span>
              </button>
            </div>
          ) : (
            <div className="p-4 bg-[#171410] border border-dashed border-[#332c22] rounded-lg text-center text-xs text-[#8a7f68]">
              <span>Building / Utility Zone. Powers and stores resources for adjacent agroecological guilds.</span>
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-[#332c22]">
            <div className="text-xs font-mono font-bold text-[#e9c46a] uppercase tracking-wider flex items-center justify-between">
              <span>Neighbor Synergies ({selectedSynergies.length})</span>
              <span className="text-[10px] text-[#8a7f68]">Active Grid Guilds</span>
            </div>

            {selectedSynergies.length === 0 ? (
              <div className="text-[11px] text-[#8a7f68] italic">No active adjacent guild bonuses.</div>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {selectedSynergies.map((syn, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-[11px] border leading-tight ${
                      syn.type === 'bonus'
                        ? 'bg-[#182315] border-[#2e4726] text-[#c8e6c9]'
                        : 'bg-[#261614] border-[#4d2621] text-[#ffcdd2]'
                    }`}
                  >
                    <div className="font-bold flex justify-between">
                      <span>{syn.title}</span>
                      <span className="text-[9px] opacity-70 font-mono">{syn.source}</span>
                    </div>
                    <div className="text-[10px] opacity-90 mt-0.5">{syn.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubView === 'soil' && (
        <SoilNutrientPanel zone={selectedZone} soil={selectedZone.soil} credits={credits} onApplyAmendment={onApplyAmendment} />
      )}

      {activeSubView === 'grazing' && (
        <div className="bg-[#171410] border border-[#332c22] p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-[#332c22] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐑</span>
              <div>
                <h3 className="text-sm font-bold font-mono text-[#f4ecd8]">Active Livestock Herds & Silvopasture</h3>
                <span className="text-[11px] text-[#8a7f68]">Rotational animal tractors cycle fertility into soil beds</span>
              </div>
            </div>
            <button
              onClick={onOpenGrazingModal}
              className="px-3 py-2 rounded bg-[#c9a227] text-[#171410] font-mono font-bold text-xs cursor-pointer"
              style={{ minHeight: '44px' }}
            >
              + Manage Herds & Paddocks
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {paddocks.map(p => {
              const breed = LIVESTOCK_BREEDS[p.breedId];
              const zone = zones.find(z => z.id === p.zoneId);
              return (
                <div key={p.id} className="bg-[#1e1913] border border-[#332c22] p-3 rounded-lg flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#f4ecd8]">
                        <span>{breed?.icon}</span>
                        <span>{breed?.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#81c784]">Zone #{p.zoneId}</span>
                    </div>
                    <div className="text-[10px] text-[#8a7f68] font-mono">Location: {zone?.name}</div>
                    <div className="text-[10.5px] text-[#b8ab8e] mt-1">
                      Forage: <b>{Math.round(p.pastureBiomass)}%</b> · Days Grazed: <b>{p.daysInPaddock}/{breed?.rotationalDays}</b>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-[#332c22] flex justify-between items-center text-[10px] font-mono">
                    <span className="text-[#e9c46a]">Output: {breed?.outputs.name}</span>
                    <button onClick={onOpenGrazingModal} className="text-[#64b5f6] hover:underline cursor-pointer">
                      Shift Paddock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSubView === 'cellar' && (
        <HarvestCellarPanel
          pantry={pantry}
          currentSeason={currentSeason}
          credits={credits}
          onSellItem={onSellItem}
          onPreserveItem={onPreserveItem}
        />
      )}
    </div>
  );
}
