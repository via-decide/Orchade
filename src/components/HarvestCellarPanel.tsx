import React, { useState } from 'react';
import { EXPANDED_CROP_CATALOG, SEASON_METADATA } from '../data/cropCatalog';

export interface PantryItem {
  id: string;
  cropId: string;
  name: string;
  qty: number;
  unit: string;
  preservation: 'fresh' | 'cold_cellar' | 'dry' | 'canned';
  quality: number; // 1.0 - 1.5
  basePrice: number;
  harvestDay: number;
}

interface HarvestCellarPanelProps {
  pantry: PantryItem[];
  currentSeason: 'spring' | 'summer' | 'autumn' | 'winter';
  credits: number;
  onSellItem: (itemId: string, qty: number, pricePerUnit: number) => void;
  onPreserveItem: (itemId: string, method: 'cold_cellar' | 'dry' | 'canned') => void;
}

export function HarvestCellarPanel({
  pantry,
  currentSeason,
  credits,
  onSellItem,
  onPreserveItem
}: HarvestCellarPanelProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const seasonInfo = SEASON_METADATA[currentSeason];

  const getSeasonalMultiplier = (cropId: string, method: string) => {
    // In winter, fresh goods and cold storage goods command higher value
    if (currentSeason === 'winter') {
      if (cropId === 'apple' || cropId === 'potato') return 1.5;
      if (method === 'canned' || method === 'dry') return 1.35;
      return 1.2;
    }
    if (currentSeason === 'spring' && (cropId === 'garlic' || method === 'canned')) {
      return 1.3;
    }
    return 1.0;
  };

  const filteredPantry = pantry.filter(item => {
    if (filterType === 'all') return true;
    return item.preservation === filterType;
  });

  const totalMarketValue = pantry.reduce((sum, item) => {
    const mult = getSeasonalMultiplier(item.cropId, item.preservation);
    return sum + (item.qty * item.basePrice * mult * item.quality);
  }, 0);

  return (
    <div className="bg-[#171410] border border-[#332c22] rounded-xl p-4 font-sans text-[#f4ecd8] space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#332c22] pb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛖</span>
          <div>
            <h3 className="text-sm font-bold font-mono text-[#f4ecd8] flex items-center gap-2">
              Homestead Root Cellar, Pantry & Market
              <span className="text-xs bg-[#c9a227]/20 text-[#e9c46a] px-2 py-0.5 rounded font-mono">
                {seasonInfo.icon} {seasonInfo.name.toUpperCase()} ECONOMY
              </span>
            </h3>
            <span className="text-[11px] text-[#8a7f68] font-mono">
              Preserve harvests, prevent spoilage, and trade at seasonal market peaks.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-[#221c15] px-3 py-1.5 rounded border border-[#3d3323]">
            <span className="text-[#8a7f68]">Pantry Valuation: </span>
            <span className="text-[#c9a227] font-bold">~{Math.round(totalMarketValue).toLocaleString()} 🪙</span>
          </div>
          <div className="bg-[#221c15] px-3 py-1.5 rounded border border-[#3d3323]">
            <span className="text-[#8a7f68]">Credits: </span>
            <span className="text-[#81c784] font-bold">{credits.toLocaleString()} 🪙</span>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex gap-1.5">
          {['all', 'fresh', 'cold_cellar', 'dry', 'canned'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-[#c9a227] text-[#171410] font-bold'
                  : 'bg-[#221c15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
              }`}
            >
              {t === 'all' && '📦 All Stored Stores'}
              {t === 'fresh' && '🥗 Fresh Baskets'}
              {t === 'cold_cellar' && '🥔 Cold Cellar'}
              {t === 'dry' && '🌾 Dried & Herbs'}
              {t === 'canned' && '🥫 Canned / Preserved'}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-[#8a7f68]">
          Winter Scarcity Boost Active on Preserved Stores!
        </span>
      </div>

      {/* Pantry Inventory List */}
      {filteredPantry.length === 0 ? (
        <div className="p-8 text-center bg-[#1e1913] border border-dashed border-[#332c22] rounded-xl">
          <span className="text-3xl block mb-2">🧺</span>
          <div className="text-sm font-bold text-[#b8ab8e]">The homestead pantry is currently empty.</div>
          <p className="text-xs text-[#8a7f68] mt-1">
            Tend and harvest crops from your zones on the plot planner grid to store food here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
          {filteredPantry.map(item => {
            const crop = EXPANDED_CROP_CATALOG[item.cropId];
            const seasonMult = getSeasonalMultiplier(item.cropId, item.preservation);
            const unitPrice = Math.round(item.basePrice * seasonMult * item.quality);
            const totalItemValue = unitPrice * item.qty;

            return (
              <div
                key={item.id}
                className="bg-[#1e1913] border border-[#332c22] p-3 rounded-lg flex flex-col justify-between hover:border-[#8a6f1c] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{crop?.growthStages[crop.growthStages.length - 1]?.icon || '🌾'}</span>
                      <div>
                        <div className="text-xs font-bold text-[#f4ecd8] leading-tight">{item.name}</div>
                        <div className="text-[10px] text-[#8a7f68] font-mono">
                          {item.qty} {item.unit} · Quality {(item.quality * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      item.preservation === 'fresh' ? 'bg-[#43a047]/20 text-[#81c784]' :
                      item.preservation === 'cold_cellar' ? 'bg-[#1976d2]/20 text-[#64b5f6]' :
                      item.preservation === 'dry' ? 'bg-[#f57c00]/20 text-[#ffb74d]' :
                      'bg-[#7b1fa2]/20 text-[#ba68c8]'
                    }`}>
                      {item.preservation.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="text-[10.5px] text-[#b8ab8e] space-y-0.5 bg-[#171410] p-2 rounded border border-[#2a241b] my-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#8a7f68]">Seasonal Unit Price:</span>
                      <span className="text-[#c9a227] font-bold">{unitPrice} 🪙</span>
                    </div>
                    {seasonMult > 1.0 && (
                      <div className="flex justify-between text-[#81c784] text-[9.5px]">
                        <span>{seasonInfo.name} Demand Bonus:</span>
                        <span>+{Math.round((seasonMult - 1) * 100)}% premium</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#332c22]">
                  {/* Preservation action if fresh */}
                  {item.preservation === 'fresh' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onPreserveItem(item.id, 'cold_cellar')}
                        className="flex-1 text-[10px] font-mono bg-[#1976d2]/20 hover:bg-[#1976d2]/30 text-[#64b5f6] py-1 rounded border border-[#1976d2]/40 transition-all cursor-pointer"
                        title="Move to dark, cool root cellar for 6-month winter storage"
                      >
                        ❄️ Cold Cellar
                      </button>
                      <button
                        onClick={() => onPreserveItem(item.id, 'canned')}
                        className="flex-1 text-[10px] font-mono bg-[#7b1fa2]/20 hover:bg-[#7b1fa2]/30 text-[#ba68c8] py-1 rounded border border-[#7b1fa2]/40 transition-all cursor-pointer"
                        title="Can / Ferment in glass jars for multi-year stability"
                      >
                        🥫 Can / Pickle
                      </button>
                    </div>
                  )}

                  {/* Sell to Market Actions */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onSellItem(item.id, 1, unitPrice)}
                      className="flex-1 text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#f4ecd8] py-1.5 rounded border border-[#3d3323] transition-all cursor-pointer"
                    >
                      Sell 1 ({unitPrice} 🪙)
                    </button>
                    {item.qty > 1 && (
                      <button
                        onClick={() => onSellItem(item.id, item.qty, unitPrice)}
                        className="flex-1 text-xs font-mono font-bold bg-[#c9a227] hover:bg-[#e0b738] text-[#171410] py-1.5 rounded transition-all cursor-pointer"
                      >
                        Sell All ({totalItemValue} 🪙)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
