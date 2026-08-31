import React from 'react';
import {
  WaterHydrologyState,
  SolarMicrogridState,
  WATER_INFRASTRUCTURE_UPGRADES,
  ENERGY_INFRASTRUCTURE_UPGRADES
} from '../data/homesteadEngineering';

interface HomesteadEngineeringModalProps {
  isOpen: boolean;
  onClose: () => void;
  water: WaterHydrologyState;
  solar: SolarMicrogridState;
  credits: number;
  currentSeason: string;
  onUpgradeWater: (upgradeId: string) => void;
  onUpgradeSolar: (upgradeId: string) => void;
  onToggleGenerator: () => void;
}

export function HomesteadEngineeringModal({
  isOpen,
  onClose,
  water,
  solar,
  credits,
  currentSeason,
  onUpgradeWater,
  onUpgradeSolar,
  onToggleGenerator
}: HomesteadEngineeringModalProps) {
  if (!isOpen) return null;

  // Water calculations
  const totalStoragePct = Math.min(100, Math.round((water.currentStoredGallons / water.maxCisternCapacityGallons) * 100));
  const daysWaterAutonomy = water.dailyConsumptionGallons > 0 ? (water.currentStoredGallons / water.dailyConsumptionGallons).toFixed(1) : '∞';

  // Solar calculations
  const batteryPct = Math.min(100, Math.round((solar.currentBatteryStorageKwh / solar.maxBatteryStorageKwh) * 100));
  const netEnergyKwh = (solar.dailyGenerationKwh - solar.dailyLoadKwh).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1c1813] border-2 border-[#8a6f1c] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-[#f4ecd8]">
        
        {/* Header */}
        <div className="p-4 bg-[#262016] border-b border-[#3d3323] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h2 className="text-lg font-bold text-[#f4ecd8] font-mono flex items-center gap-2">
                Off-Grid Engineering: Hydrology & Solar Microgrid
                <span className="text-xs bg-[#1976d2]/30 text-[#64b5f6] px-2 py-0.5 rounded font-mono">
                  RESILIENT UTILITIES ENGINE
                </span>
              </h2>
              <p className="text-xs text-[#b8ab8e]">
                Model water catchment, cistern storage, contour swales, and PV solar battery balance.
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
          <span className="text-[#8a7f68]">Active Season: {currentSeason.toUpperCase()}</span>
          <span className="text-[#c9a227] font-bold">Homestead Treasury: {credits.toLocaleString()} 🪙</span>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          
          {/* 1. Water & Hydrology Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-[#64b5f6] uppercase tracking-wider flex items-center gap-1.5">
                <span>💧 1. Catchment Hydrology & Cistern Storage</span>
              </h3>
              <span className="text-[11px] font-mono text-[#81c784]">
                Autonomy Buffer: ~{daysWaterAutonomy} Days
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#171410] p-3 rounded-lg border border-[#2a241b]">
                <div className="text-[10px] text-[#8a7f68] font-mono">Cistern Storage</div>
                <div className="text-sm font-bold text-[#64b5f6] font-mono mt-0.5">
                  {Math.round(water.currentStoredGallons).toLocaleString()} / {water.maxCisternCapacityGallons.toLocaleString()} gal
                </div>
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-[#64b5f6] h-full" style={{ width: `${totalStoragePct}%` }} />
                </div>
              </div>

              <div className="bg-[#171410] p-3 rounded-lg border border-[#2a241b]">
                <div className="text-[10px] text-[#8a7f68] font-mono">Daily Water Demand</div>
                <div className="text-sm font-bold text-[#f4ecd8] font-mono mt-0.5">
                  {Math.round(water.dailyConsumptionGallons)} gal/day
                </div>
                <div className="text-[9px] text-[#8a7f68] mt-1">Crops, stock & wash</div>
              </div>

              <div className="bg-[#171410] p-3 rounded-lg border border-[#2a241b]">
                <div className="text-[10px] text-[#8a7f68] font-mono">Groundwater Infiltration</div>
                <div className="text-sm font-bold text-[#81c784] font-mono mt-0.5">
                  +{water.swaleInfiltrationRate} gal/event
                </div>
                <div className="text-[9px] text-[#8a7f68] mt-1">Via contour swales</div>
              </div>

              <div className="bg-[#171410] p-3 rounded-lg border border-[#2a241b]">
                <div className="text-[10px] text-[#8a7f68] font-mono">Irrigation Efficiency</div>
                <div className="text-sm font-bold text-[#e9c46a] font-mono mt-0.5 capitalize">
                  {water.irrigationType.replace('_', ' ')}
                </div>
                <div className="text-[9px] text-[#8a7f68] mt-1">Pressure regulated</div>
              </div>
            </div>

            {/* Water Upgrades */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WATER_INFRASTRUCTURE_UPGRADES.map(up => {
                const canAfford = credits >= up.cost;
                return (
                  <div
                    key={up.id}
                    className="p-2.5 rounded-lg bg-[#1e1913] border border-[#332c22] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#f4ecd8]">{up.name}</div>
                      <div className="text-[10px] text-[#8a7f68]">{up.desc}</div>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => onUpgradeWater(up.id)}
                      className={`ml-2 px-3 py-1.5 rounded text-xs font-mono font-bold shrink-0 transition-all ${
                        canAfford
                          ? 'bg-[#1976d2]/30 text-[#64b5f6] hover:bg-[#1976d2]/50 border border-[#1976d2]/50 cursor-pointer'
                          : 'bg-[#221c15] text-[#8a7f68] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {up.cost} 🪙
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Solar Microgrid & Energy Balance */}
          <div className="space-y-3 pt-2 border-t border-[#332c22]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-[#e9c46a] uppercase tracking-wider flex items-center gap-1.5">
                <span>☀️ 2. Solar Microgrid & LiFePO4 Battery Bank</span>
              </h3>
              <span className={`text-[11px] font-mono ${Number(netEnergyKwh) >= 0 ? 'text-[#81c784]' : 'text-[#ef5350]'}`}>
                Daily Net: {Number(netEnergyKwh) >= 0 ? `+${netEnergyKwh}` : netEnergyKwh} kWh
              </span>
            </div>

            {/* Solar Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#171410] p-3 rounded-lg border border-[#2a241b]">
                <div className="text-[10px] text-[#8a7f68] font-mono">Battery Bank Storage</div>
                <div className="text-sm font-bold text-[#e9c46a] font-mono mt-0.5">
                  {solar.currentBatteryStorageKwh.toFixed(1)} / {solar.maxBatteryStorageKwh.toFixed(1)} kWh
                </div>
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-[#e9c46a] h-full" style={{ width: `${batteryPct}%` }} />
                </div>
              </div>

              <div className="bg-[#171410] p-3 rounded-lg border border-[#2a241b]">
                <div className="text-[10px] text-[#8a7f68] font-mono">Solar Array Rating</div>
                <div className="text-sm font-bold text-[#81c784] font-mono mt-0.5">
                  {(solar.solarArrayWatts / 1000).toFixed(1)} kW PV Array
                </div>
                <div className="text-[9px] text-[#8a7f68] mt-1">Bifacial monocrystalline</div>
              </div>

              <div className="bg-[#171410] p-3 rounded-lg border border-[#2a241b]">
                <div className="text-[10px] text-[#8a7f68] font-mono">Daily Solar Generation</div>
                <div className="text-sm font-bold text-[#64b5f6] font-mono mt-0.5">
                  +{solar.dailyGenerationKwh.toFixed(1)} kWh/day
                </div>
                <div className="text-[9px] text-[#8a7f68] mt-1">Based on season irradiance</div>
              </div>

              <div className="bg-[#171410] p-3 rounded-lg border border-[#2a241b]">
                <div className="text-[10px] text-[#8a7f68] font-mono">Backup Biomass Inverter</div>
                <button
                  onClick={onToggleGenerator}
                  className={`mt-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    solar.backupBiomassGenActive
                      ? 'bg-[#2e7d32] text-white animate-pulse'
                      : 'bg-[#262016] text-[#8a7f68] border border-[#3d3323]'
                  }`}
                >
                  {solar.backupBiomassGenActive ? '⚡ Woodgas ONLINE' : '⚪ Woodgas STANDBY'}
                </button>
              </div>
            </div>

            {/* Solar Upgrades */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ENERGY_INFRASTRUCTURE_UPGRADES.map(up => {
                const canAfford = credits >= up.cost;
                return (
                  <div
                    key={up.id}
                    className="p-2.5 rounded-lg bg-[#1e1913] border border-[#332c22] flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#f4ecd8]">{up.name}</div>
                      <div className="text-[10px] text-[#8a7f68]">{up.desc}</div>
                    </div>
                    <button
                      disabled={!canAfford}
                      onClick={() => onUpgradeSolar(up.id)}
                      className={`ml-2 px-3 py-1.5 rounded text-xs font-mono font-bold shrink-0 transition-all ${
                        canAfford
                          ? 'bg-[#c9a227]/30 text-[#e9c46a] hover:bg-[#c9a227]/50 border border-[#c9a227]/50 cursor-pointer'
                          : 'bg-[#221c15] text-[#8a7f68] opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {up.cost} 🪙
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#171410] border-t border-[#332c22] flex items-center justify-between text-xs font-mono">
          <span className="text-[#8a7f68]">P.A. Yeomans Keyline Scale of Permanence Framework</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#c9a227] text-[#171410] font-bold hover:bg-[#e0b738] transition-all cursor-pointer"
          >
            Close Engineering Hub
          </button>
        </div>
      </div>
    </div>
  );
}
