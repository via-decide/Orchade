import React from 'react';
import { EXPANDED_CROP_CATALOG } from '../data/cropCatalog';
import { LIVESTOCK_BREEDS, PaddockState } from '../data/livestockData';
import type { ZoneData } from './PlotPlanner';

interface PersistentPlotBoardProps {
  cols: number;
  rows: number;
  zones: ZoneData[];
  paddocks: PaddockState[];
  selectedZoneId: number;
  draggingZoneId: number | null;
  dragPreviewPos: { col: number; row: number } | null;
  dragHasCollision: boolean;
  zoneEffect: { zoneId: number; text: string; icon: string; color: string } | null;
  toolMode: 'select' | 'tend' | 'water' | 'harvest';
  setToolMode: (mode: 'select' | 'tend' | 'water' | 'harvest') => void;
  showTopography: boolean;
  themeBg: string;
  gridContainerRef: React.RefObject<HTMLDivElement>;
  onZoneMouseDown: (e: React.MouseEvent, zone: ZoneData) => void;
  onZoneMouseEnter: (zone: ZoneData) => void;
  onZoneTouchStart?: (e: React.TouchEvent, zone: ZoneData) => void;
}

export function PersistentPlotBoard({
  cols,
  rows,
  zones,
  paddocks,
  selectedZoneId,
  draggingZoneId,
  dragPreviewPos,
  dragHasCollision,
  zoneEffect,
  toolMode,
  setToolMode,
  showTopography,
  themeBg,
  gridContainerRef,
  onZoneMouseDown,
  onZoneMouseEnter,
  onZoneTouchStart,
}: PersistentPlotBoardProps) {
  return (
    <div className="orchade-board bg-[#1f1b15] border border-[#332c22] p-2.5 rounded-xl shadow-lg relative font-sans text-[#f4ecd8]">
      {/* Header & Tool Mode Palette */}
      <div className="flex flex-wrap justify-between items-center mb-2 px-1 gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[#171410] p-1 rounded-lg border border-[#332c22]">
            <button
              onClick={() => setToolMode('select')}
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'select'
                  ? 'bg-[#c9a227] text-[#171410] shadow'
                  : 'text-[#b8ab8e] hover:text-white hover:bg-[#262016]'
              }`}
              title="Select and drag zones to reorganize layout"
              style={{ minHeight: '38px' }}
            >
              <span>🖐️ Move</span>
            </button>

            <button
              onClick={() => setToolMode('tend')}
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'tend'
                  ? 'bg-[#388e3c] text-white shadow'
                  : 'text-[#81c784] hover:text-white hover:bg-[#262016]'
              }`}
              title="Click any zone on the grid to weed & cultivate with synergy boost"
              style={{ minHeight: '38px' }}
            >
              <span>🌿 Tend</span>
            </button>

            <button
              onClick={() => setToolMode('water')}
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'water'
                  ? 'bg-[#1976d2] text-white shadow'
                  : 'text-[#64b5f6] hover:text-white hover:bg-[#262016]'
              }`}
              title="Click any zone on the grid to irrigate"
              style={{ minHeight: '38px' }}
            >
              <span>💧 Water</span>
            </button>

            <button
              onClick={() => setToolMode('harvest')}
              className={`px-2.5 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                toolMode === 'harvest'
                  ? 'bg-[#f57c00] text-white shadow'
                  : 'text-[#ffb74d] hover:text-white hover:bg-[#262016]'
              }`}
              title="Click ready crops to harvest directly from the grid"
              style={{ minHeight: '38px' }}
            >
              <span>🌾 Harvest</span>
            </button>
          </div>
        </div>

        <div className="hidden sm:block text-[11px] text-[#b8ab8e] font-mono">
          {toolMode === 'select' && <span>🖐️ Drag zones to move · Click to inspect</span>}
          {toolMode === 'tend' && <span className="text-[#81c784]">🌿 Click any zone to weed & tend</span>}
          {toolMode === 'water' && <span className="text-[#64b5f6]">💧 Click any zone to irrigate</span>}
          {toolMode === 'harvest' && <span className="text-[#ffb74d]">🌾 Click ripe zones to harvest</span>}
        </div>
      </div>

      {/* Grid Container */}
      <div
        ref={gridContainerRef}
        style={{ backgroundColor: themeBg, touchAction: 'none' }}
        className={`orchade-board-grid border-2 border-[#3d3323] rounded-lg relative overflow-hidden select-none shadow-inner mx-auto ${
          toolMode === 'select' ? 'cursor-default' : 'cursor-crosshair'
        }`}
      >
        {/* Background Grid Lines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #8a7f68 1px, transparent 1px),
              linear-gradient(to bottom, #8a7f68 1px, transparent 1px)
            `,
            backgroundSize: `${100 / cols}% ${100 / rows}%`,
          }}
        />

        {/* Topography Contours if active */}
        {showTopography && (
          <div className="absolute inset-0 pointer-events-none opacity-25 flex flex-col justify-between p-2 text-[9px] font-mono text-[#64b5f6]">
            <div>▲ High Elevation Ridge (North Keyline Swale)</div>
            <div>— Mid-Slope Fertile Loam & Pasture —</div>
            <div>▼ Lowland Water Catchment & Irrigation Pond</div>
          </div>
        )}

        {/* Render Zones */}
        {zones.map(z => {
          const isSelected = z.id === selectedZoneId;
          const isDragging = z.id === draggingZoneId;
          const crop = z.plant?.cropId ? EXPANDED_CROP_CATALOG[z.plant.cropId] : null;
          const stage = crop ? crop.growthStages[z.plant.stageIndex] || crop.growthStages[0] : null;

          const zonePaddock = paddocks.find(p => p.zoneId === z.id);
          const zoneBreed = zonePaddock ? LIVESTOCK_BREEDS[zonePaddock.breedId] : null;

          const leftPct = ((z.col - 1) / cols) * 100;
          const topPct = ((z.row - 1) / rows) * 100;
          const widthPct = (z.w / cols) * 100;
          const heightPct = (z.h / rows) * 100;

          const hasActiveEffect = zoneEffect?.zoneId === z.id;

          return (
            <div
              key={z.id}
              onMouseDown={(e) => onZoneMouseDown(e, z)}
              onMouseEnter={() => onZoneMouseEnter(z)}
              onTouchStart={onZoneTouchStart ? (e) => onZoneTouchStart(e, z) : undefined}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
                backgroundColor: z.color,
              }}
              className={`absolute rounded transition-shadow flex flex-col justify-between p-1.5 border-2 ${
                toolMode === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:brightness-110'
              } ${
                isSelected
                  ? 'border-[#f4ecd8] shadow-[0_0_15px_rgba(201,162,39,0.5)] z-20 ring-2 ring-[#c9a227]'
                  : 'border-black/40 hover:border-white/50 z-10'
              } ${isDragging ? 'opacity-30' : 'opacity-95'}`}
            >
              {hasActiveEffect && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-white shadow-xl z-40 animate-bounce flex items-center gap-1 whitespace-nowrap border border-white/40"
                  style={{ backgroundColor: zoneEffect!.color }}
                >
                  <span>{zoneEffect!.icon}</span>
                  <span>{zoneEffect!.text}</span>
                </div>
              )}

              <div className="flex justify-between items-start leading-none pointer-events-none">
                <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-black/60 rounded text-[#f4ecd8]">
                  #{z.id}
                </span>
                <div className="flex gap-1 items-center">
                  {zoneBreed && (
                    <span className="text-xs bg-black/60 px-1 py-0.5 rounded" title={zoneBreed.name}>
                      {zoneBreed.icon}
                    </span>
                  )}
                  {crop && <span className="text-xs">{stage?.icon || '🌱'}</span>}
                  {z.type === 'water' && <span className="text-xs">💧</span>}
                  {z.type === 'compost' && <span className="text-xs">🍂</span>}
                  {z.type === 'livestock' && !zoneBreed && <span className="text-xs">🐑</span>}
                  {z.type === 'building' && <span className="text-xs">🏡</span>}
                </div>
              </div>

              <div className="pointer-events-none">
                <div className="text-[10px] font-bold text-[#f4ecd8] truncate leading-tight drop-shadow">
                  {z.name}
                </div>
                <div className="text-[8.5px] text-[#f4ecd8]/80 font-mono leading-none mt-0.5">
                  {Math.round(z.sqft).toLocaleString()} sq ft
                </div>
              </div>

              {z.plant && z.plant.cropId && (
                <div className="w-full space-y-0.5 pointer-events-none">
                  <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#64b5f6] h-full transition-all duration-300" style={{ width: `${z.plant.water}%` }} />
                  </div>
                  <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#81c784] h-full transition-all duration-300" style={{ width: `${z.plant.health}%` }} />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Drag Preview Outline with Collision Feedback */}
        {dragPreviewPos && draggingZoneId && (
          <div
            style={{
              left: `${((dragPreviewPos.col - 1) / cols) * 100}%`,
              top: `${((dragPreviewPos.row - 1) / rows) * 100}%`,
              width: `${((zones.find(z => z.id === draggingZoneId)?.w || 1) / cols) * 100}%`,
              height: `${((zones.find(z => z.id === draggingZoneId)?.h || 1) / rows) * 100}%`,
            }}
            className={`absolute border-2 border-dashed pointer-events-none z-30 rounded transition-colors duration-100 flex items-center justify-center ${
              dragHasCollision
                ? 'border-[#e57373] bg-[#e57373]/30 text-[#ffcdd2]'
                : 'border-[#81c784] bg-[#81c784]/25 text-[#c8e6c9]'
            }`}
          >
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-black/70 rounded">
              {dragHasCollision ? '⚠️ Blocked' : '✓ Drop Here'}
            </span>
          </div>
        )}
      </div>

      <div className="hidden sm:flex justify-between items-center mt-1.5 px-1 text-[10px] font-mono text-[#8a7f68]">
        <span>Snap-to-grid collision detection active</span>
        <span className="text-[#81c784]">Click or drag any zone</span>
      </div>
    </div>
  );
}
