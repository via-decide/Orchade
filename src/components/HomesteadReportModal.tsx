import React, { useState } from 'react';
import { EXPANDED_CROP_CATALOG } from '../data/cropCatalog';

interface HomesteadReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  acreage: number;
  zones: any[];
  currentSeason: string;
  cycleDay: number;
  credits: number;
}

export function HomesteadReportModal({
  isOpen,
  onClose,
  acreage,
  zones,
  currentSeason,
  cycleDay,
  credits
}: HomesteadReportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalSqft = acreage * 43560;
  const totalZoneSqft = zones.reduce((sum, z) => sum + z.sqft, 0);
  const unallocatedSqft = Math.max(0, totalSqft - totalZoneSqft);

  // Generate plant inventory
  const cropInventory: Record<string, { count: number; totalPlants: number; totalSqft: number }> = {};
  zones.forEach(z => {
    if (z.plant && z.plant.cropId) {
      const cropId = z.plant.cropId;
      const crop = EXPANDED_CROP_CATALOG[cropId];
      const spacingSqft = crop?.spacing.sqft || 4.0;
      const plantCount = Math.max(1, Math.round(z.sqft / spacingSqft));

      if (!cropInventory[cropId]) {
        cropInventory[cropId] = { count: 0, totalPlants: 0, totalSqft: 0 };
      }
      cropInventory[cropId].count += 1;
      cropInventory[cropId].totalPlants += plantCount;
      cropInventory[cropId].totalSqft += z.sqft;
    }
  });

  const handleCopyJSON = () => {
    const reportData = {
      homesteadReportDate: new Date().toISOString(),
      temporalCycleDay: cycleDay,
      season: currentSeason,
      acreage,
      totalSquareFeet: totalSqft,
      zones: zones.map(z => ({
        id: z.id,
        name: z.name,
        type: z.type,
        dimensions: `${z.w}x${z.h} (${Math.round(z.sqft)} sq ft)`,
        crop: z.plant?.cropId || null,
        soil: z.soil || null
      })),
      plantSummary: cropInventory
    };
    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1c1813] border-2 border-[#8a6f1c] rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-[#f4ecd8]">
        
        {/* Header */}
        <div className="p-4 bg-[#262016] border-b border-[#3d3323] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="text-lg font-bold text-[#f4ecd8] font-mono flex items-center gap-2">
                Orchade Property / Homestead Simulation Report
              </h2>
              <p className="text-xs text-[#b8ab8e]">
                A snapshot of this plan's current zones and plant assignments under the active simulation model.
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

        {/* Action Toolbar */}
        <div className="p-3 bg-[#171410] border-b border-[#332c22] flex items-center justify-between text-xs font-mono">
          <div className="flex gap-2">
            <button
              onClick={handleCopyJSON}
              className="px-3 py-1.5 rounded bg-[#221c15] hover:bg-[#332c22] border border-[#3d3323] text-[#f4ecd8] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{copied ? '✅ Copied JSON!' : '📄 Copy Blueprint JSON'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-[#221c15] hover:bg-[#332c22] border border-[#3d3323] text-[#f4ecd8] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>🖨️ Print Report</span>
            </button>
          </div>

          <span className="text-[#8a7f68]">
            Survey Date: Cycle Day {cycleDay} · {currentSeason.toUpperCase()}
          </span>
        </div>

        {/* Printable Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-xs text-[#b8ab8e] print:text-black print:bg-white">
          
          {/* Executive Summary */}
          <div className="p-4 bg-[#221c15] border border-[#3d3323] rounded-lg">
            <h3 className="text-sm font-bold font-mono text-[#e9c46a] mb-2 uppercase tracking-wider">
              1. Executive Land Survey
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-[#171410] p-2.5 rounded border border-[#2a241b]">
                <div className="text-[#8a7f68]">Total Land Area</div>
                <div className="text-sm font-bold text-[#f4ecd8] mt-0.5">{acreage} Acres</div>
                <div className="text-[10px] text-[#8a7f68]">{Math.round(totalSqft).toLocaleString()} sq ft</div>
              </div>
              <div className="bg-[#171410] p-2.5 rounded border border-[#2a241b]">
                <div className="text-[#8a7f68]">Allocated Footprint</div>
                <div className="text-sm font-bold text-[#81c784] mt-0.5">{Math.round(totalZoneSqft).toLocaleString()} sq ft</div>
                <div className="text-[10px] text-[#8a7f68]">{((totalZoneSqft / totalSqft) * 100).toFixed(1)}% density</div>
              </div>
              <div className="bg-[#171410] p-2.5 rounded border border-[#2a241b]">
                <div className="text-[#8a7f68]">Open Swales / Buffer</div>
                <div className="text-sm font-bold text-[#64b5f6] mt-0.5">{Math.round(unallocatedSqft).toLocaleString()} sq ft</div>
                <div className="text-[10px] text-[#8a7f68]">Wildlife corridors</div>
              </div>
              <div className="bg-[#171410] p-2.5 rounded border border-[#2a241b]">
                <div className="text-[#8a7f68]">Liquid Capital</div>
                <div className="text-sm font-bold text-[#c9a227] mt-0.5">{credits.toLocaleString()} 🪙</div>
                <div className="text-[10px] text-[#8a7f68]">Operational reserves</div>
              </div>
            </div>
          </div>

          {/* Botanical Density & Plant Count Matrix */}
          <div className="p-4 bg-[#221c15] border border-[#3d3323] rounded-lg">
            <h3 className="text-sm font-bold font-mono text-[#e9c46a] mb-2 uppercase tracking-wider">
              2. Plant Population & Agronomic Density Inventory
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#3d3323] text-[#8a7f68] text-left">
                    <th className="pb-2">Botanical Cultivar</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Zone Footprint</th>
                    <th className="pb-2">Assumed Spacing</th>
                    <th className="pb-2 text-right">Estimated Plants</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2e261a]">
                  {Object.entries(cropInventory).map(([cropId, data]) => {
                    const crop = EXPANDED_CROP_CATALOG[cropId];
                    return (
                      <tr key={cropId} className="hover:bg-[#1a1611]">
                        <td className="py-2 flex items-center gap-2 text-[#f4ecd8]">
                          <span>{crop?.growthStages[crop.growthStages.length - 1]?.icon || '🌱'}</span>
                          <span className="font-bold">{crop?.displayName || cropId}</span>
                        </td>
                        <td className="py-2 text-[#8a7f68] capitalize">{crop?.category || 'Crop'}</td>
                        <td className="py-2 text-[#b8ab8e]">{Math.round(data.totalSqft).toLocaleString()} sq ft ({data.count} zones)</td>
                        <td className="py-2 text-[#8a7f68]">{crop?.spacing.label}</td>
                        <td className="py-2 text-right font-bold text-[#81c784]">{data.totalPlants.toLocaleString()} units</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Zone Spatial Breakdown */}
          <div className="p-4 bg-[#221c15] border border-[#3d3323] rounded-lg">
            <h3 className="text-sm font-bold font-mono text-[#e9c46a] mb-2 uppercase tracking-wider">
              3. Spatial Zone Ledger ({zones.length} Active Zones)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {zones.map(z => (
                <div key={z.id} className="bg-[#171410] p-2.5 rounded border border-[#2a241b] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#f4ecd8]">
                      #{z.id} {z.name}
                    </div>
                    <div className="text-[10px] text-[#8a7f68] font-mono">
                      Grid Col {z.col}, Row {z.row} · {z.w}×{z.h} tiles · {Math.round(z.sqft).toLocaleString()} sq ft
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#221c15] border border-[#3d3323] text-[#c9a227]">
                      {z.type.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Boundary */}
          <div className="p-4 bg-[#221c15] border border-[#3d3323] rounded-lg">
            <h3 className="text-sm font-bold font-mono text-[#e9c46a] mb-2 uppercase tracking-wider">
              Model Boundary
            </h3>
            <div className="text-[11px] text-[#8a7f68] font-mono space-y-1">
              <div>Simulation day: {cycleDay} · Season: {currentSeason}</div>
              <div>Scientifically certified: NO</div>
              <div>Engineering certified: NO</div>
              <div>Agronomic/legal/commercial certification: NO</div>
            </div>
            <p className="text-[11px] text-[#8a7f68] mt-2 leading-relaxed">
              This report reflects zone assignments and plant data entered into this plan, under
              the crop/harvest models Orchade currently simulates. It is not a survey, an
              agronomic assessment, or a certification of any kind. Reproducibility of a
              simulation run does not establish agronomic, engineering, structural, legal, or
              commercial certification.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#171410] border-t border-[#332c22] flex items-center justify-between text-xs text-[#8a7f68] font-mono">
          <span>Orchade Homestead Simulation · Not a certified report</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#c9a227] text-[#171410] font-bold hover:bg-[#e0b738] transition-all cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
