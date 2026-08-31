import React from 'react';
import { EXPANDED_CROP_CATALOG, SOIL_AMENDMENTS } from '../data/cropCatalog';

export interface SoilState {
  nitrogen: number;      // 0 - 100
  phosphorus: number;    // 0 - 100
  potassium: number;     // 0 - 100
  ph: number;            // 4.0 - 8.5
  organicMatter: number; // 1% - 15%
}

interface SoilNutrientPanelProps {
  zone: any;
  soil: SoilState;
  credits: number;
  onApplyAmendment: (amendmentId: string) => void;
  onClose?: () => void;
}

export function SoilNutrientPanel({ zone, soil, credits, onApplyAmendment }: SoilNutrientPanelProps) {
  const crop = zone?.plant?.cropId ? EXPANDED_CROP_CATALOG[zone.plant.cropId] : null;

  // Evaluate suitability
  const isPhIdeal = crop ? soil.ph >= crop.preferredPh.min && soil.ph <= crop.preferredPh.max : true;
  const isNitrogenAdequate = crop ? (crop.nutrientDemand.n === 'heavy' ? soil.nitrogen >= 60 : soil.nitrogen >= 30) : true;

  const getPhColor = (ph: number) => {
    if (ph < 5.5) return 'text-[#ffb74d]'; // Acidic
    if (ph > 7.3) return 'text-[#64b5f6]'; // Alkaline
    return 'text-[#81c784]';               // Optimal Loam
  };

  const getPhLabel = (ph: number) => {
    if (ph < 5.0) return 'Strongly Acidic (Peat / Blueberry Soil)';
    if (ph < 6.0) return 'Moderately Acidic (Potato / Carrot Friendly)';
    if (ph <= 7.0) return 'Neutral Ideal Loam (Most Vegetables)';
    if (ph <= 7.5) return 'Slightly Alkaline (Brassica & Herb Sweet)';
    return 'Alkaline (Needs Sulfur Acidification)';
  };

  return (
    <div className="bg-[#171410] border border-[#332c22] rounded-xl p-4 font-sans text-[#f4ecd8] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#332c22] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🧪</span>
          <div>
            <h3 className="text-sm font-bold font-mono text-[#f4ecd8]">
              Soil Pedology & Chemistry Analysis
            </h3>
            <span className="text-[11px] text-[#8a7f68] font-mono">
              Zone #{zone.id}: {zone.name} ({Math.round(zone.sqft).toLocaleString()} sq ft)
            </span>
          </div>
        </div>

        {crop && (
          <div className="flex items-center gap-1.5 bg-[#221c15] px-2.5 py-1 rounded border border-[#3d3323] text-xs font-mono">
            <span>{crop.growthStages[crop.growthStages.length - 1]?.icon}</span>
            <span className="text-[#e9c46a] font-bold">{crop.displayName}</span>
          </div>
        )}
      </div>

      {/* Main Chemical Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Nitrogen */}
        <div className="bg-[#1e1913] border border-[#332c22] p-2.5 rounded-lg">
          <div className="flex justify-between items-center text-[10.5px] text-[#8a7f68] font-mono uppercase">
            <span>Nitrogen (N)</span>
            <span className="font-bold text-[#81c784]">{Math.round(soil.nitrogen)}%</span>
          </div>
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden my-1.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-yellow-700 via-emerald-600 to-green-400 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, soil.nitrogen))}%` }}
            />
          </div>
          <div className="text-[9.5px] text-[#b8ab8e] truncate">
            {crop ? `Target: ${crop.nutrientDemand.n.toUpperCase()} demand` : 'General vegetative energy'}
          </div>
        </div>

        {/* Phosphorus */}
        <div className="bg-[#1e1913] border border-[#332c22] p-2.5 rounded-lg">
          <div className="flex justify-between items-center text-[10.5px] text-[#8a7f68] font-mono uppercase">
            <span>Phosphorus (P)</span>
            <span className="font-bold text-[#64b5f6]">{Math.round(soil.phosphorus)}%</span>
          </div>
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden my-1.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-900 via-blue-600 to-cyan-400 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, soil.phosphorus))}%` }}
            />
          </div>
          <div className="text-[9.5px] text-[#b8ab8e] truncate">
            {crop ? `Target: ${crop.nutrientDemand.p.toUpperCase()} demand` : 'Root & flower development'}
          </div>
        </div>

        {/* Potassium */}
        <div className="bg-[#1e1913] border border-[#332c22] p-2.5 rounded-lg">
          <div className="flex justify-between items-center text-[10.5px] text-[#8a7f68] font-mono uppercase">
            <span>Potassium (K)</span>
            <span className="font-bold text-[#ffb74d]">{Math.round(soil.potassium)}%</span>
          </div>
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden my-1.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-amber-900 via-orange-600 to-yellow-400 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, soil.potassium))}%` }}
            />
          </div>
          <div className="text-[9.5px] text-[#b8ab8e] truncate">
            {crop ? `Target: ${crop.nutrientDemand.k.toUpperCase()} demand` : 'Disease & drought defense'}
          </div>
        </div>

        {/* pH & OM */}
        <div className="bg-[#1e1913] border border-[#332c22] p-2.5 rounded-lg">
          <div className="flex justify-between items-center text-[10.5px] text-[#8a7f68] font-mono uppercase">
            <span>pH Balance</span>
            <span className={`font-bold font-mono ${getPhColor(soil.ph)}`}>{soil.ph.toFixed(1)} pH</span>
          </div>
          <div className="text-[10px] font-mono text-[#f4ecd8] mt-1 truncate">
            OM: <span className="text-[#81c784]">{soil.organicMatter.toFixed(1)}%</span> organic matter
          </div>
          <div className="text-[9px] text-[#b8ab8e] truncate mt-0.5" title={getPhLabel(soil.ph)}>
            {getPhLabel(soil.ph).split('(')[0]}
          </div>
        </div>
      </div>

      {/* Agronomic Compatibility Status */}
      {crop && (
        <div className={`p-2.5 rounded-lg text-xs border flex items-center justify-between ${
          isPhIdeal && isNitrogenAdequate
            ? 'bg-[#182315] border-[#2e4726] text-[#c8e6c9]'
            : 'bg-[#261e12] border-[#554022] text-[#ffe082]'
        }`}>
          <div className="flex items-center gap-2">
            <span>{isPhIdeal && isNitrogenAdequate ? '✅' : '⚠️'}</span>
            <div>
              <span className="font-bold font-mono">
                {isPhIdeal && isNitrogenAdequate ? 'Optimal Soil Chemistry Match' : 'Soil Chemistry Sub-Optimal'}
              </span>
              <div className="text-[10.5px] opacity-90">
                {crop.displayName} prefers pH {crop.preferredPh.min}–{crop.preferredPh.max}. Current pH is {soil.ph.toFixed(1)}.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#e9c46a] hidden sm:block">
            Target N-P-K: {crop.nutrientDemand.n.toUpperCase()} / {crop.nutrientDemand.p.toUpperCase()} / {crop.nutrientDemand.k.toUpperCase()}
          </span>
        </div>
      )}

      {/* Soil Amendments Application */}
      <div>
        <div className="text-xs font-mono font-bold text-[#e9c46a] mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Apply Targeted Organic Amendments:</span>
          <span className="text-[11px] text-[#8a7f68] font-mono">Homestead Balance: {credits} 🪙</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SOIL_AMENDMENTS.map(am => {
            const canAfford = credits >= am.cost;
            return (
              <button
                key={am.id}
                disabled={!canAfford}
                onClick={() => onApplyAmendment(am.id)}
                className={`text-left p-2.5 rounded-lg border transition-all flex flex-col justify-between ${
                  canAfford
                    ? 'bg-[#1e1913] hover:bg-[#2a231b] border-[#3d3323] hover:border-[#8a6f1c] cursor-pointer'
                    : 'bg-[#171410] border-[#28221a] opacity-50 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-[#f4ecd8] mb-0.5">
                    <span>{am.name}</span>
                    <span className="text-[#c9a227] font-mono text-[11px]">{am.cost} 🪙</span>
                  </div>
                  <p className="text-[10px] text-[#8a7f68] leading-tight mb-1.5">{am.desc}</p>
                </div>

                <div className="flex items-center justify-between text-[9.5px] font-mono text-[#81c784] border-t border-[#332c22] pt-1">
                  <span>
                    {am.npk.n > 0 && `+${am.npk.n}N `}
                    {am.npk.p > 0 && `+${am.npk.p}P `}
                    {am.npk.k > 0 && `+${am.npk.k}K `}
                    {am.phShift !== 0 && `${am.phShift > 0 ? '+' : ''}${am.phShift}pH `}
                    {am.om > 0 && `+${am.om}% OM`}
                  </span>
                  <span className="text-[#b8ab8e] underline">Apply</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
