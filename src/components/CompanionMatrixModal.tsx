import React, { useState } from 'react';
import { EXPANDED_CROP_CATALOG, CropDefinition } from '../data/cropCatalog';

interface CompanionMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCropId?: string | null;
}

export function CompanionMatrixModal({ isOpen, onClose, selectedCropId }: CompanionMatrixModalProps) {
  const [filterCrop, setFilterCrop] = useState<string>(selectedCropId || 'all');
  const [activeTab, setActiveTab] = useState<'matrix' | 'science' | 'combos'>('matrix');

  if (!isOpen) return null;

  const cropList = Object.values(EXPANDED_CROP_CATALOG);
  const currentCrop = filterCrop !== 'all' ? EXPANDED_CROP_CATALOG[filterCrop] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#1c1813] border-2 border-[#8a6f1c] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-[#f4ecd8]">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#262016] border-b border-[#3d3323] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>
              <h2 className="text-lg font-bold text-[#f4ecd8] font-mono flex items-center gap-2">
                Companion Planting & Allelopathy Synergy Matrix
                <span className="text-xs bg-[#8a6f1c]/30 text-[#e9c46a] px-2 py-0.5 rounded font-mono">PHASE 2 SCIENTIFIC GUILDS</span>
              </h2>
              <p className="text-xs text-[#b8ab8e]">
                Intercropping synergies, volatile pest deterrents, rhizosphere interactions, and disease vulnerability links.
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

        {/* Tab Navigation & Crop Filter */}
        <div className="p-3 bg-[#171410] border-b border-[#332c22] flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'matrix' ? 'bg-[#c9a227] text-[#171410]' : 'bg-[#221c15] text-[#b8ab8e] hover:text-white'
              }`}
            >
              📊 Full Synergy Grid
            </button>
            <button
              onClick={() => setActiveTab('combos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'combos' ? 'bg-[#c9a227] text-[#171410]' : 'bg-[#221c15] text-[#b8ab8e] hover:text-white'
              }`}
            >
              🤝 Tested Permaculture Guilds
            </button>
            <button
              onClick={() => setActiveTab('science')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                activeTab === 'science' ? 'bg-[#c9a227] text-[#171410]' : 'bg-[#221c15] text-[#b8ab8e] hover:text-white'
              }`}
            >
              🔬 Agronomic Mechanisms
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8a7f68] font-mono">Highlight Crop:</span>
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
              className="bg-[#221c15] border border-[#3d3323] text-[#f4ecd8] rounded px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#c9a227]"
            >
              <option value="all">Show All 12 Researched Crops</option>
              {cropList.map(c => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="text-xs text-[#b8ab8e] flex items-center justify-between">
                <span>Legend: <span className="text-[#81c784] font-bold">🟢 Beneficial Companion (+15% to +30% bonus)</span> | <span className="text-[#e07a5f] font-bold">🔴 Antagonistic / Blight Risk (-20% to -35% penalty)</span> | <span className="text-[#8a7f68]">⚪ Neutral</span></span>
                <span className="font-mono text-[11px] text-[#8a7f68]">Hover/click any cell for scientific explanation</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left bg-[#221c15] border border-[#332c22] font-mono text-[#8a7f68] sticky left-0 z-10">Crop</th>
                      {cropList.map(c => (
                        <th key={c.id} className="p-2 text-center bg-[#221c15] border border-[#332c22] font-mono text-[#f4ecd8] min-w-[75px]">
                          <div className="truncate max-w-[70px]" title={c.displayName}>{c.displayName.split(' ')[0]}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cropList.map(cRow => {
                      const isHighlighted = filterCrop === cRow.id;
                      return (
                        <tr key={cRow.id} className={isHighlighted ? 'bg-[#c9a227]/10' : ''}>
                          <td className="p-2 font-mono font-bold bg-[#1d1812] border border-[#332c22] text-[#f4ecd8] sticky left-0 z-10 flex items-center gap-1.5">
                            <span>{cRow.growthStages[cRow.growthStages.length - 1]?.icon || '🌱'}</span>
                            <span className="truncate max-w-[120px]">{cRow.displayName}</span>
                          </td>
                          {cropList.map(cCol => {
                            if (cRow.id === cCol.id) {
                              return (
                                <td key={cCol.id} className="p-2 text-center bg-[#171410] border border-[#332c22] text-[#554c3c] font-mono text-[10px]">
                                  Self
                                </td>
                              );
                            }
                            const isBeneficial = cRow.companions.beneficial.includes(cCol.id);
                            const isAntagonistic = cRow.companions.antagonistic.includes(cCol.id);
                            const effect = cRow.companions.effects.find(e => e.cropId === cCol.id);

                            return (
                              <td
                                key={cCol.id}
                                title={effect?.description || (isBeneficial ? 'Beneficial partner' : isAntagonistic ? 'Antagonistic partner' : 'Neutral neighbor')}
                                className={`p-2 text-center border border-[#332c22] transition-colors cursor-pointer text-xs font-mono font-bold ${
                                  isBeneficial
                                    ? 'bg-[#2a4422]/60 text-[#a5d6a7] hover:bg-[#345c2a]'
                                    : isAntagonistic
                                    ? 'bg-[#4a1c18]/60 text-[#ef9a9a] hover:bg-[#68241e]'
                                    : 'bg-[#1a1611] text-[#6d614e] hover:bg-[#252019]'
                                }`}
                              >
                                {isBeneficial ? '🟢 +' : isAntagonistic ? '🔴 -' : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Highlighted Crop Detailed Report */}
              {currentCrop && (
                <div className="p-3.5 bg-[#221c15] border border-[#3d3323] rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#e9c46a] font-mono flex items-center gap-2">
                      <span>{currentCrop.growthStages[currentCrop.growthStages.length - 1]?.icon}</span>
                      {currentCrop.displayName} ({currentCrop.scientificName})
                    </h3>
                    <span className="text-[11px] font-mono text-[#8a7f68] uppercase">pH {currentCrop.preferredPh.min} - {currentCrop.preferredPh.max}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#182315] border border-[#2e4726] p-2.5 rounded">
                      <div className="font-bold text-[#81c784] mb-1.5 flex items-center gap-1.5">
                        <span>🟢 Ideal Companion Partners:</span>
                      </div>
                      {currentCrop.companions.beneficial.length > 0 ? (
                        <div className="space-y-1 text-[#c8e6c9]">
                          {currentCrop.companions.beneficial.map(id => {
                            const partner = EXPANDED_CROP_CATALOG[id];
                            const effect = currentCrop.companions.effects.find(e => e.cropId === id);
                            return (
                              <div key={id} className="text-[11.5px]">
                                • <b>{partner?.displayName || id}:</b> {effect?.description || 'Enhances vigor & nutrient absorption.'}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[#8a7f68] italic text-[11px]">No specific positive companion interactions cataloged.</div>
                      )}
                    </div>

                    <div className="bg-[#261614] border border-[#4d2621] p-2.5 rounded">
                      <div className="font-bold text-[#e57373] mb-1.5 flex items-center gap-1.5">
                        <span>🔴 Incompatible / Prohibited Neighbors:</span>
                      </div>
                      {currentCrop.companions.antagonistic.length > 0 ? (
                        <div className="space-y-1 text-[#ffcdd2]">
                          {currentCrop.companions.antagonistic.map(id => {
                            const partner = EXPANDED_CROP_CATALOG[id];
                            const effect = currentCrop.companions.effects.find(e => e.cropId === id);
                            return (
                              <div key={id} className="text-[11.5px]">
                                • ⚠️ <b>{partner?.displayName || id}:</b> {effect?.description || 'Inhibits root development or spreads disease.'}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[#8a7f68] italic text-[11px]">No antagonistic crop clashes cataloged.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'combos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-[#221c15] border border-[#3d3323] rounded-lg">
                <div className="text-sm font-bold text-[#e9c46a] font-mono flex items-center gap-2 mb-1">
                  <span>🍅</span> The Mediterranean Nightshade Guild
                </div>
                <div className="text-xs text-[#8a7f68] font-mono mb-2">Tomato + Sweet Basil + French Marigold</div>
                <p className="text-xs text-[#b8ab8e] leading-relaxed mb-2">
                  Sweet Basil secretes volatile monoterpenes and repellent terpenes that disorient tomato hornworms (<i>Manduca quinquemaculata</i>). French Marigolds produce alpha-terthienyl root exudates that eliminate root-knot nematodes in the soil.
                </p>
                <div className="text-[11px] font-mono text-[#81c784] bg-[#182315] p-2 rounded border border-[#2e4726]">
                  Yield Bonus: +25% fruit sugar accumulation & +35% pest survivability.
                </div>
              </div>

              <div className="p-3.5 bg-[#221c15] border border-[#3d3323] rounded-lg">
                <div className="text-sm font-bold text-[#e9c46a] font-mono flex items-center gap-2 mb-1">
                  <span>🍎</span> The Orchard Understory Guild
                </div>
                <div className="text-xs text-[#8a7f68] font-mono mb-2">Dwarf Apple + Crimson Clover + Porcelain Garlic</div>
                <p className="text-xs text-[#b8ab8e] leading-relaxed mb-2">
                  Crimson clover living mulch hosts symbiotic <i>Rhizobium leguminosarum</i> bacteria, pumping 75 lbs of bioavailable nitrogen per acre into the shallow apple root zone. Garlic bulbs produce sulfur diallyl sulfides that inhibit apple scab fungal germination.
                </p>
                <div className="text-[11px] font-mono text-[#81c784] bg-[#182315] p-2 rounded border border-[#2e4726]">
                  Synergy: Reduces fertilizer input needs by 60% and scab incidence by 45%.
                </div>
              </div>

              <div className="p-3.5 bg-[#221c15] border border-[#3d3323] rounded-lg">
                <div className="text-sm font-bold text-[#e9c46a] font-mono flex items-center gap-2 mb-1">
                  <span>🥕</span> The Root & Foliage Deconfliction Guild
                </div>
                <div className="text-xs text-[#8a7f68] font-mono mb-2">Danvers Carrot + Crisphead Lettuce + Porcelain Garlic</div>
                <p className="text-xs text-[#b8ab8e] leading-relaxed mb-2">
                  Carrots mine deep potassium and phosphorus with deep taproots without competing with lettuce’s shallow fibrous feeder roots. Garlic repels the carrot rust fly (<i>Psila rosae</i>).
                </p>
                <div className="text-[11px] font-mono text-[#81c784] bg-[#182315] p-2 rounded border border-[#2e4726]">
                  Spatial Density: +50% higher harvest per square foot bed area.
                </div>
              </div>

              <div className="p-3.5 bg-[#221c15] border border-[#3d3323] rounded-lg">
                <div className="text-sm font-bold text-[#e9c46a] font-mono flex items-center gap-2 mb-1">
                  <span>🌽</span> The Heavy Grain & Legume Duo
                </div>
                <div className="text-xs text-[#8a7f68] font-mono mb-2">Sweet Corn / Spring Wheat + Crimson Clover</div>
                <p className="text-xs text-[#b8ab8e] leading-relaxed mb-2">
                  Grains are notoriously heavy nitrogen extractors. Underseeding crimson clover establishes an emerald carpet that retains soil moisture during midsummer heat and deposits root nitrogen upon autumn termination.
                </p>
                <div className="text-[11px] font-mono text-[#81c784] bg-[#182315] p-2 rounded border border-[#2e4726]">
                  Ecology: Prevents soil erosion and maintains long-term organic matter (OM).
                </div>
              </div>
            </div>
          )}

          {activeTab === 'science' && (
            <div className="space-y-3 text-xs text-[#b8ab8e] leading-relaxed">
              <div className="p-3.5 bg-[#221c15] border border-[#3d3323] rounded-lg">
                <h4 className="font-bold text-[#e9c46a] text-sm mb-1 font-mono">1. Allelopathy & Biochemical Defense</h4>
                <p>
                  Allelopathy is the chemical inhibition or stimulation of one plant by another through the release of secondary metabolites (phenolics, terpenoids, alkaloids, glucosinolates) into the rhizosphere or atmosphere. In the Orchade Plot Planner, planting marigolds or alliums actively secretes biocidal compounds that protect neighboring nightshades.
                </p>
              </div>

              <div className="p-3.5 bg-[#221c15] border border-[#3d3323] rounded-lg">
                <h4 className="font-bold text-[#e9c46a] text-sm mb-1 font-mono">2. Symbiotic Rhizobial Nitrogen Fixation</h4>
                <p>
                  Leguminous crops like Crimson Clover form root nodules infected with <i>Rhizobium</i> bacteria. These bacteria break the strong triple bond of atmospheric dinitrogen (N₂) to produce bioavailable ammonium (NH₄⁺), replenishing nitrogen for heavy feeders like Corn, Lettuce, and Wheat.
                </p>
              </div>

              <div className="p-3.5 bg-[#221c15] border border-[#3d3323] rounded-lg">
                <h4 className="font-bold text-[#e9c46a] text-sm mb-1 font-mono">3. Pathogen Cross-Contamination Vectors</h4>
                <p>
                  Placing Solanaceous crops (Tomatoes and Potatoes) in directly adjacent plots allows motile zoospores of <i>Phytophthora infestans</i> (Late Blight) and <i>Alternaria solani</i> to spread effortlessly across canopies. The system penalizes adjacent nightshade placement with an active disease alert.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#171410] border-t border-[#332c22] flex items-center justify-between text-xs text-[#8a7f68] font-mono">
          <span>Orchade Agronomic Engine · Scientific Companion Dataset v2.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#c9a227] text-[#171410] font-bold hover:bg-[#e0b738] transition-all cursor-pointer"
          >
            Close Encyclopedia
          </button>
        </div>
      </div>
    </div>
  );
}
