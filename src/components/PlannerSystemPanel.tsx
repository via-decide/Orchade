import React from 'react';
import { WaterHydrologyState, SolarMicrogridState } from '../data/homesteadEngineering';
import { Project001Panel } from './Project001Panel';

interface PlannerSystemPanelProps {
  totalAcreage: number;
  waterState: WaterHydrologyState;
  solarState: SolarMicrogridState;
  onOpenEngineeringModal: () => void;
}

export function PlannerSystemPanel({ totalAcreage, waterState, solarState, onOpenEngineeringModal }: PlannerSystemPanelProps) {
  return (
    <div className="space-y-3 font-sans text-[#f4ecd8]">
      <div className="bg-[#171410] border border-[#332c22] p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between border-b border-[#332c22] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="text-sm font-bold font-mono text-[#f4ecd8]">Off-Grid Utilities: Water & Solar Telemetry</h3>
              <span className="text-[11px] text-[#8a7f68]">Resilience calculations for cistern storage and LiFePO4 battery balance</span>
            </div>
          </div>
          <button
            onClick={onOpenEngineeringModal}
            className="px-3 py-2 rounded bg-[#c9a227] text-[#171410] font-mono font-bold text-xs cursor-pointer"
            style={{ minHeight: '44px' }}
          >
            + Upgrade Utilities Infrastructure
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-[#1e1913] p-3 rounded-lg border border-[#2a241b]">
            <div className="text-[#8a7f68] text-[10px]">Cistern Reservoir</div>
            <div className="text-sm font-bold text-[#64b5f6] mt-0.5">{Math.round(waterState.currentStoredGallons)} gal</div>
            <div className="text-[9.5px] text-[#8a7f68] mt-1">Capacity: {waterState.maxCisternCapacityGallons} gal</div>
          </div>
          <div className="bg-[#1e1913] p-3 rounded-lg border border-[#2a241b]">
            <div className="text-[#8a7f68] text-[10px]">Daily Irrigation Demand</div>
            <div className="text-sm font-bold text-[#f4ecd8] mt-0.5">{Math.round(waterState.dailyConsumptionGallons)} gal/d</div>
            <div className="text-[9.5px] text-[#81c784] mt-1">Type: {waterState.irrigationType.toUpperCase()}</div>
          </div>
          <div className="bg-[#1e1913] p-3 rounded-lg border border-[#2a241b]">
            <div className="text-[#8a7f68] text-[10px]">PV Solar Microgrid</div>
            <div className="text-sm font-bold text-[#e9c46a] mt-0.5">{(solarState.solarArrayWatts / 1000).toFixed(1)} kW Array</div>
            <div className="text-[9.5px] text-[#8a7f68] mt-1">Daily Gen: +{solarState.dailyGenerationKwh.toFixed(1)} kWh</div>
          </div>
          <div className="bg-[#1e1913] p-3 rounded-lg border border-[#2a241b]">
            <div className="text-[#8a7f68] text-[10px]">LiFePO4 Storage Bank</div>
            <div className="text-sm font-bold text-[#81c784] mt-0.5">{solarState.currentBatteryStorageKwh.toFixed(1)} / {solarState.maxBatteryStorageKwh.toFixed(1)} kWh</div>
            <div className="text-[9.5px] text-[#8a7f68] mt-1">Load: {solarState.dailyLoadKwh.toFixed(1)} kWh/d</div>
          </div>
        </div>
      </div>

      <Project001Panel totalAcreage={totalAcreage} />
    </div>
  );
}
