import React, { useState } from 'react';
import { EXPANDED_CROP_CATALOG } from '../data/cropCatalog';

interface RotationPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  zones: any[];
  onApplyRotationPlan: (zoneId: number, sequence: string[]) => void;
}

export function RotationPlannerModal({ isOpen, onClose, zones, onApplyRotationPlan }: RotationPlannerModalProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<number>(zones[0]?.id || 1);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('4_field_classic');
  const [customSequence, setCustomSequence] = useState<string[]>(['clover', 'lettuce', 'tomato', 'potato']);

  if (!isOpen) return null;

  const currentZone = zones.find(z => z.id === selectedZoneId) || zones[0];
  const cropList = Object.values(EXPANDED_CROP_CATALOG);

  const ROTATION_TEMPLATES = [
    {
      id: '4_field_classic',
      name: 'Classic 4-Course Regenerative Rotation',
      description: 'The golden standard of permaculture: Legume (N-Fix) → Heavy Leaf Feeder → Heavy Fruit Feeder → Deep Root Feeder.',
      sequence: ['clover', 'lettuce', 'tomato', 'carrot'],
      soilImpact: '+25% Organic Matter, 0% Blight Build-up, Balanced N-P-K cycle'
    },
    {
      id: 'grain_staple',
      name: 'Staple Grain & Root Sustainable Loop',
      description: 'Large-scale rotation for self-sufficiency: Green Manure → Spring Wheat → Russet Potato → Winter Garlic.',
      sequence: ['clover', 'wheat', 'potato', 'garlic'],
      soilImpact: 'Restores subsoil structure, naturally eliminates root pests'
    },
    {
      id: 'market_intensive',
      name: 'High-Value Market Garden Rotation',
      description: 'Maximum cash-crop velocity with bio-sanitation: French Marigolds → Heirloom Tomato & Basil → Crisphead Salad → Carrots.',
      sequence: ['marigold', 'tomato', 'lettuce', 'carrot'],
      soilImpact: 'Nematode suppression, high revenue per square foot'
    }
  ];

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = ROTATION_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setCustomSequence([...tmpl.sequence]);
    }
  };

  const handleApply = () => {
    onApplyRotationPlan(selectedZoneId, customSequence);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1c1813] border-2 border-[#8a6f1c] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-[#f4ecd8]">
        
        {/* Header */}
        <div className="p-4 bg-[#262016] border-b border-[#3d3323] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <h2 className="text-lg font-bold text-[#f4ecd8] font-mono flex items-center gap-2">
                4-Year Agronomic Crop Rotation Scheduler
                <span className="text-xs bg-[#8a6f1c]/30 text-[#e9c46a] px-2 py-0.5 rounded font-mono">SOIL HEALTH REGULATION</span>
              </h2>
              <p className="text-xs text-[#b8ab8e]">
                Prevent soil pathogen accumulation and nutrient exhaustion through cyclical agronomic succession.
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

        {/* Zone Selector */}
        <div className="p-3 bg-[#171410] border-b border-[#332c22] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#8a7f68] font-mono">Apply Plan To Zone:</span>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(Number(e.target.value))}
              className="bg-[#221c15] border border-[#3d3323] text-[#f4ecd8] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#c9a227]"
            >
              {zones.map(z => (
                <option key={z.id} value={z.id}>
                  Zone #{z.id}: {z.name} ({Math.round(z.sqft).toLocaleString()} sq ft)
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] font-mono text-[#81c784]">
            Current Crop: {currentZone?.plant?.cropId ? EXPANDED_CROP_CATALOG[currentZone.plant.cropId]?.displayName : 'None'}
          </span>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Preset Templates */}
          <div>
            <div className="text-xs font-mono font-bold text-[#e9c46a] mb-2 uppercase tracking-wider">
              1. Choose an Agronomic Rotation Strategy:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {ROTATION_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateSelect(t.id)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedTemplate === t.id
                      ? 'bg-[#2a2417] border-[#c9a227] shadow-md'
                      : 'bg-[#1e1913] border-[#332c22] hover:border-[#554734]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#f4ecd8] mb-1">{t.name}</div>
                  <div className="text-[10.5px] text-[#b8ab8e] leading-snug mb-2">{t.description}</div>
                  <div className="text-[9.5px] font-mono text-[#81c784] bg-black/30 p-1 rounded">
                    {t.soilImpact}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4-Year Sequence Timeline */}
          <div>
            <div className="text-xs font-mono font-bold text-[#e9c46a] mb-2 uppercase tracking-wider flex items-center justify-between">
              <span>2. 4-Year Cyclical Timeline & Succession Sequence:</span>
              <span className="text-[10px] text-[#8a7f68]">Customizable dropdowns below</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              {customSequence.map((cropId, index) => {
                const crop = EXPANDED_CROP_CATALOG[cropId] || EXPANDED_CROP_CATALOG['clover'];
                const yearNumber = index + 1;
                const roleDescription = 
                  index === 0 ? 'Year 1: Nitrogen Fixer / Soil Restorer' :
                  index === 1 ? 'Year 2: Leafy / Heavy Nitrogen Feeder' :
                  index === 2 ? 'Year 3: Fruiting / High Phosphorus & Potassium' :
                  'Year 4: Root Tuber / Deep Feeder & Soil Breaker';

                return (
                  <div key={index} className="bg-[#221c15] border border-[#3d3323] p-3 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono text-[#c9a227] font-bold mb-1">
                        <span>Year {yearNumber}</span>
                        <span>{crop.growthStages[crop.growthStages.length - 1]?.icon}</span>
                      </div>
                      <div className="text-[10px] text-[#8a7f68] font-mono mb-2">{roleDescription}</div>

                      <select
                        value={cropId}
                        onChange={(e) => {
                          const updated = [...customSequence];
                          updated[index] = e.target.value;
                          setCustomSequence(updated);
                          setSelectedTemplate('custom');
                        }}
                        className="w-full bg-[#171410] border border-[#3d3323] text-[#f4ecd8] rounded p-1.5 text-xs font-mono focus:outline-none focus:border-[#c9a227]"
                      >
                        {cropList.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#332c22] text-[10px] space-y-0.5">
                      <div className="text-[#8a7f68]">Demand: <span className="text-[#f4ecd8] uppercase font-mono">{crop.nutrientDemand.n} N / {crop.nutrientDemand.p} P</span></div>
                      <div className="text-[#8a7f68]">Ideal pH: <span className="text-[#f4ecd8] font-mono">{crop.preferredPh.min} - {crop.preferredPh.max}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biological Checks & Warnings */}
          <div className="p-3 bg-[#182315] border border-[#2e4726] rounded-lg text-xs space-y-1.5">
            <div className="font-bold text-[#81c784] font-mono flex items-center gap-1.5">
              <span>✅ Agronomic Succession Evaluation:</span>
            </div>
            <div className="text-[11px] text-[#c8e6c9] leading-relaxed">
              • <b>Legume Restoration:</b> Contains clover/nitrogen-fixing buffer before heavy leafy/fruiting feeders.<br />
              • <b>Pathogen Break:</b> Interrupts continuous Solanaceae hosting, preventing fungal resting sclerotia (Verticillium & Late Blight) from surviving in the soil bed.<br />
              • <b>Nutrient Strata Balancing:</b> Alternates shallow root feeders with deep taproot miners for even soil mineral extraction.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#171410] border-t border-[#332c22] flex items-center justify-between text-xs font-mono">
          <span className="text-[#8a7f68]">Applies sequence rules to zone simulation telemetry.</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#332c22] text-[#b8ab8e] hover:text-[#f4ecd8] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded bg-[#c9a227] text-[#171410] font-bold hover:bg-[#e0b738] transition-all cursor-pointer"
            >
              Commit 4-Year Rotation Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
