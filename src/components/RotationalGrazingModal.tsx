import React, { useState } from 'react';
import { LIVESTOCK_BREEDS, PaddockState, LivestockBreed } from '../data/livestockData';

interface RotationalGrazingModalProps {
  isOpen: boolean;
  onClose: () => void;
  paddocks: PaddockState[];
  zones: any[];
  credits: number;
  onAdoptBreed: (zoneId: number, breedId: string) => void;
  onRotatePaddock: (paddockId: string, targetZoneId: number) => void;
  onHarvestLivestockYield: (paddockId: string) => void;
}

export function RotationalGrazingModal({
  isOpen,
  onClose,
  paddocks,
  zones,
  credits,
  onAdoptBreed,
  onRotatePaddock,
  onHarvestLivestockYield
}: RotationalGrazingModalProps) {
  const [selectedBreedId, setSelectedBreedId] = useState<string>('heritage_chickens');
  const [targetZoneId, setTargetZoneId] = useState<number>(zones[0]?.id || 1);
  const [selectedPaddockToMove, setSelectedPaddockToMove] = useState<string>(paddocks[0]?.id || '');
  const [destinationZoneId, setDestinationZoneId] = useState<number>(zones[1]?.id || 2);

  if (!isOpen) return null;

  const currentSelectedBreed = LIVESTOCK_BREEDS[selectedBreedId];
  const canAfford = credits >= currentSelectedBreed.cost;

  // Potential zones suitable for animals
  const eligibleZones = zones.filter(z => z.type === 'crop' || z.type === 'livestock');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1c1813] border-2 border-[#8a6f1c] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-[#f4ecd8]">
        
        {/* Header */}
        <div className="p-4 bg-[#262016] border-b border-[#3d3323] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐑</span>
            <div>
              <h2 className="text-lg font-bold text-[#f4ecd8] font-mono flex items-center gap-2">
                Holistic Rotational Grazing & Silvopasture Hub
                <span className="text-xs bg-[#c9a227]/20 text-[#e9c46a] px-2 py-0.5 rounded font-mono">
                  ANIMAL INTEGRATION & SOIL BIOLOGY
                </span>
              </h2>
              <p className="text-xs text-[#b8ab8e]">
                Deploy mobile livestock tractors to cycle fertility, suppress weeds, and harvest protein & honey.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#332c22] hover:bg-[#4a3f31] text-[#b8ab8e] hover:text-[#f4ecd8] flex items-center justify-center text-lg font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Treasury Status */}
        <div className="p-3 bg-[#171410] border-b border-[#332c22] flex items-center justify-between text-xs font-mono">
          <span className="text-[#8a7f68]">Active Mobile Herds & Colonies: {paddocks.length}</span>
          <span className="text-[#c9a227] font-bold">Homestead Treasury: {credits.toLocaleString()} 🪙</span>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          
          {/* Active Paddock Flocks & Herds */}
          <div>
            <h3 className="text-xs font-mono font-bold text-[#e9c46a] mb-2 uppercase tracking-wider flex items-center justify-between">
              <span>1. Active Livestock Paddocks on Homestead Grid</span>
              <span className="text-[10px] text-[#8a7f68]">Rotational rest prevents overgrazing</span>
            </h3>

            {paddocks.length === 0 ? (
              <div className="p-6 text-center bg-[#1e1913] border border-dashed border-[#332c22] rounded-lg text-xs text-[#8a7f68]">
                No livestock herds established yet. Choose a species below to integrate pasture animals.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {paddocks.map(p => {
                  const breed = LIVESTOCK_BREEDS[p.breedId] || LIVESTOCK_BREEDS.heritage_chickens;
                  const currentZone = zones.find(z => z.id === p.zoneId);
                  const isReadyToHarvest = p.cycleProgress >= breed.outputs.cycleDays;
                  const isOvergrazed = p.daysInPaddock > breed.rotationalDays;

                  return (
                    <div
                      key={p.id}
                      className="bg-[#1e1913] border border-[#332c22] p-3 rounded-lg flex flex-col justify-between hover:border-[#8a6f1c] transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{breed.icon}</span>
                            <div>
                              <div className="text-xs font-bold text-[#f4ecd8]">{breed.name}</div>
                              <div className="text-[10px] text-[#8a7f68] font-mono">
                                In Zone #{p.zoneId} ({currentZone?.name || 'Pasture'})
                              </div>
                            </div>
                          </div>

                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            isOvergrazed ? 'bg-[#c62828]/20 text-[#ef5350]' : 'bg-[#2e7d32]/20 text-[#81c784]'
                          }`}>
                            {p.daysInPaddock} / {breed.rotationalDays} Days Grazed
                          </span>
                        </div>

                        {/* Pasture Metrics */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-[#171410] p-2 rounded border border-[#2a241b] mb-2">
                          <div>
                            <span className="text-[#8a7f68]">Pasture Forage:</span>
                            <span className="text-[#81c784] font-bold ml-1">{Math.round(p.pastureBiomass)}%</span>
                          </div>
                          <div>
                            <span className="text-[#8a7f68]">Manure NPK Load:</span>
                            <span className="text-[#e9c46a] font-bold ml-1">+{p.manureAccumulation} pts</span>
                          </div>
                          <div>
                            <span className="text-[#8a7f68]">Flock Health:</span>
                            <span className="text-[#64b5f6] font-bold ml-1">{p.health}%</span>
                          </div>
                          <div>
                            <span className="text-[#8a7f68]">Yield Cycle:</span>
                            <span className="text-[#c9a227] font-bold ml-1">
                              {p.cycleProgress} / {breed.outputs.cycleDays} d
                            </span>
                          </div>
                        </div>

                        {isOvergrazed && (
                          <div className="text-[10px] text-[#ef5350] bg-[#261614] p-1.5 rounded border border-[#4d2621] mb-2 font-mono">
                            ⚠️ Overgrazing warning! Move animals to a fresh paddock to allow pasture roots to regenerate.
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 border-t border-[#332c22]">
                        {isReadyToHarvest && (
                          <button
                            onClick={() => onHarvestLivestockYield(p.id)}
                            className="flex-1 py-1.5 rounded bg-[#c9a227] hover:bg-[#e0b738] text-[#171410] text-xs font-mono font-bold transition-all cursor-pointer animate-pulse"
                          >
                            🧺 Collect {breed.outputs.name}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rotate Paddock Tractor Controls */}
          {paddocks.length > 0 && (
            <div className="p-3 bg-[#1e1913] border border-[#3d3323] rounded-lg space-y-2">
              <h4 className="text-xs font-mono font-bold text-[#81c784] uppercase">
                🔄 Shift Mobile Tractor to Fresh Zone Paddock
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-[#8a7f68]">Move Flock:</span>
                <select
                  value={selectedPaddockToMove}
                  onChange={(e) => setSelectedPaddockToMove(e.target.value)}
                  className="bg-[#171410] border border-[#3d3323] text-[#f4ecd8] rounded px-2.5 py-1 text-xs"
                >
                  {paddocks.map(p => {
                    const breed = LIVESTOCK_BREEDS[p.breedId];
                    return (
                      <option key={p.id} value={p.id}>
                        {breed?.name} (Currently Zone #{p.zoneId})
                      </option>
                    );
                  })}
                </select>

                <span className="text-[#8a7f68]">Destination:</span>
                <select
                  value={destinationZoneId}
                  onChange={(e) => setDestinationZoneId(Number(e.target.value))}
                  className="bg-[#171410] border border-[#3d3323] text-[#f4ecd8] rounded px-2.5 py-1 text-xs"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>
                      Zone #{z.id}: {z.name} ({Math.round(z.sqft).toLocaleString()} sq ft)
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => onRotatePaddock(selectedPaddockToMove || paddocks[0].id, destinationZoneId)}
                  className="px-3 py-1 rounded bg-[#2e7d32] hover:bg-[#388e3c] text-[#f4ecd8] font-bold cursor-pointer transition-all"
                >
                  Move Electric Fencing & Animals
                </button>
              </div>
            </div>
          )}

          {/* Introduce New Livestock Species */}
          <div>
            <h3 className="text-xs font-mono font-bold text-[#e9c46a] mb-2 uppercase tracking-wider">
              2. Acquire New Livestock / Apiary Guild Species
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(LIVESTOCK_BREEDS).map(breed => {
                const isSelected = selectedBreedId === breed.id;
                const canAffordBreed = credits >= breed.cost;

                return (
                  <div
                    key={breed.id}
                    onClick={() => setSelectedBreedId(breed.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#2a2417] border-[#c9a227] shadow-lg'
                        : 'bg-[#1e1913] border-[#332c22] hover:border-[#554734]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{breed.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-[#f4ecd8]">{breed.name}</div>
                            <div className="text-[10px] text-[#8a7f68] font-mono capitalize">
                              {breed.species} · Capacity: {breed.carryingCapacitySqftPerUnit} sq ft/head
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-mono font-bold text-[#c9a227]">
                          {breed.cost} 🪙
                        </span>
                      </div>

                      <p className="text-[10.5px] text-[#b8ab8e] leading-snug mb-2">
                        {breed.description}
                      </p>

                      <div className="text-[9.5px] font-mono text-[#81c784] bg-black/40 p-1.5 rounded space-y-0.5">
                        <div>• Output: {breed.outputs.name} (every {breed.outputs.cycleDays} days)</div>
                        <div>• Manure NPK: +{breed.outputs.manureNpk.n}N / +{breed.outputs.manureNpk.p}P / +{breed.outputs.manureNpk.k}K</div>
                        <div>• Weed Suppression: +{breed.grazingImpact.weedSuppression}%</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#332c22] flex items-center justify-between text-xs">
                      <span className="text-[10px] text-[#8a7f68] font-mono">
                        Rotational Max: {breed.rotationalDays} days
                      </span>
                      <button
                        disabled={!canAffordBreed}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdoptBreed(targetZoneId, breed.id);
                        }}
                        className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                          canAffordBreed
                            ? 'bg-[#c9a227] text-[#171410] hover:bg-[#e0b738] cursor-pointer'
                            : 'bg-[#332c22] text-[#8a7f68] opacity-50 cursor-not-allowed'
                        }`}
                      >
                        Acquire ({breed.cost} 🪙)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#171410] border-t border-[#332c22] flex items-center justify-between text-xs font-mono">
          <span className="text-[#8a7f68]">Holistic Grazing Framework: Alan Savory & Joel Salatin Methodology</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#c9a227] text-[#171410] font-bold hover:bg-[#e0b738] transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
