import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EXPANDED_CROP_CATALOG, SOIL_AMENDMENTS, SEASON_METADATA, CropDefinition } from '../data/cropCatalog';
import { HOMESTEAD_PRESETS, HomesteadPreset } from '../data/homesteadPresets';
import { CompanionMatrixModal } from './CompanionMatrixModal';
import { RotationPlannerModal } from './RotationPlannerModal';
import { SoilNutrientPanel, SoilState } from './SoilNutrientPanel';
import { HarvestCellarPanel, PantryItem } from './HarvestCellarPanel';
import { HomesteadReportModal } from './HomesteadReportModal';

const ACRE_SQFT = 43560;
const COLS = 24;
const ROWS = 18;

export interface ZonePlantState {
  cropId?: string | null;
  water: number;        // 0-100
  nutrients: number;    // 0-100
  pests: number;        // 0-100
  health: number;       // 0-100
  stageIndex: number;   // 0 to stages.length-1
  rootStrength: number; // days elapsed
  isHarvestable: boolean;
  yieldMultiplier: number;
}

export interface ZoneData {
  id: number;
  name: string;
  type: 'crop' | 'building' | 'water' | 'livestock' | 'compost';
  col: number;
  row: number;
  w: number;
  h: number;
  color: string;
  sqft: number;
  buildingType?: 'house' | 'shed' | 'greenhouse' | null;
  elevation?: 'high' | 'mid' | 'low';
  sunExposure?: 'full' | 'partial' | 'shade';
  soil: SoilState;
  rotationSequence?: string[];
  plant: ZonePlantState;
}

export function PlotPlanner() {
  // Core Configuration
  const [totalAcreage, setTotalAcreage] = useState<number>(3.5);
  const [currentSeason, setCurrentSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [credits, setCredits] = useState<number>(350);
  const [selectedZoneId, setSelectedZoneId] = useState<number>(2); // Default to Tomato guild

  // Modals & Panels
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState<boolean>(false);
  const [isRotationModalOpen, setIsRotationModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'details' | 'soil' | 'cellar' | 'log'>('details');
  const [zoomMicroGrid, setZoomMicroGrid] = useState<boolean>(false);

  // Overlays
  const [showSynergyLines, setShowSynergyLines] = useState<boolean>(true);
  const [showTopography, setShowTopography] = useState<boolean>(false);
  const [showWaterRadius, setShowWaterRadius] = useState<boolean>(true);

  // Notification / Activity Log
  const [activityLogs, setActivityLogs] = useState<{ id: string; time: string; message: string; type: 'info' | 'bonus' | 'alert' }[]>([
    { id: '1', time: 'Day 1 · Spring', message: 'Homestead Site Plan initialized. 3.5 Acres calculated (152,460 sq ft).', type: 'info' },
    { id: '2', time: 'Day 1 · Spring', message: 'Tomato & Basil companion guild established (+25% flavor & pest repellency).', type: 'bonus' }
  ]);

  // Pantry Storage Inventory
  const [pantry, setPantry] = useState<PantryItem[]>([
    { id: 'p1', cropId: 'apple', name: 'Bushels of Apples', qty: 25, unit: 'bushels', preservation: 'cold_cellar', quality: 1.25, basePrice: 65, harvestDay: 1 },
    { id: 'p2', cropId: 'basil', name: 'Aromatic Basil Leaves', qty: 10, unit: 'bunches', preservation: 'dry', quality: 1.2, basePrice: 15, harvestDay: 1 },
    { id: 'p3', cropId: 'garlic', name: 'Cured Hardneck Garlic Bulbs', qty: 18, unit: 'bulbs', preservation: 'dry', quality: 1.3, basePrice: 22, harvestDay: 1 }
  ]);

  // Initialize Zones from default preset
  const defaultPreset = HOMESTEAD_PRESETS[0];
  const [zones, setZones] = useState<ZoneData[]>(() => {
    const tileSqft = (3.5 * ACRE_SQFT) / (COLS * ROWS);
    return defaultPreset.zones.map((bz, index) => {
      const isCrop = bz.type === 'crop' || (bz.cropId && bz.cropId !== null);
      const crop = bz.cropId ? EXPANDED_CROP_CATALOG[bz.cropId] : null;

      return {
        id: index + 1,
        name: bz.name,
        type: bz.type as any,
        col: bz.col,
        row: bz.row,
        w: bz.w,
        h: bz.h,
        color: bz.color,
        sqft: bz.w * bz.h * tileSqft,
        buildingType: (bz.buildingType || null) as any,
        elevation: bz.elevation || (bz.row <= 5 ? 'high' : bz.row >= 12 ? 'low' : 'mid'),
        sunExposure: bz.row <= 8 ? 'full' : 'partial',
        soil: {
          nitrogen: bz.cropId === 'clover' ? 95 : 65,
          phosphorus: 60,
          potassium: 70,
          ph: bz.soilPh || 6.5,
          organicMatter: 6.2
        },
        rotationSequence: ['clover', 'lettuce', 'tomato', 'carrot'],
        plant: {
          cropId: bz.cropId || null,
          water: 65,
          nutrients: 75,
          pests: 0,
          health: 100,
          stageIndex: isCrop ? 1 : 0,
          rootStrength: 12,
          isHarvestable: false,
          yieldMultiplier: 1.0
        }
      };
    });
  });

  // Dragging State
  const [draggingZoneId, setDraggingZoneId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragPreviewPos, setDragPreviewPos] = useState<{ col: number; row: number } | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Recalculate sqft when acreage changes
  useEffect(() => {
    const totalSqft = totalAcreage * ACRE_SQFT;
    const tileSqft = totalSqft / (COLS * ROWS);
    setZones(prev => prev.map(z => ({
      ...z,
      sqft: z.w * z.h * tileSqft
    })));
  }, [totalAcreage]);

  // Log message helper
  const addLog = (message: string, type: 'info' | 'bonus' | 'alert' = 'info') => {
    setActivityLogs(prev => [
      { id: Date.now().toString(), time: `Day ${cycleDay} · ${SEASON_METADATA[currentSeason].name}`, message, type },
      ...prev.slice(0, 30)
    ]);
  };

  // Helper to test collision
  const checkCollision = (zoneId: number, col: number, row: number, w: number, h: number, currentZones: ZoneData[]) => {
    if (col < 1 || row < 1 || col + w - 1 > COLS || row + h - 1 > ROWS) {
      return true; // Out of bounds
    }
    return currentZones.some(z => {
      if (z.id === zoneId) return false;
      return !(col + w - 1 < z.col || col > z.col + z.w - 1 || row + h - 1 < z.row || row > z.row + z.h - 1);
    });
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent, zone: ZoneData) => {
    e.stopPropagation();
    setSelectedZoneId(zone.id);
    setDraggingZoneId(zone.id);

    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    const mouseCol = (e.clientX - rect.left) / cellW;
    const mouseRow = (e.clientY - rect.top) / cellH;

    setDragOffset({
      x: mouseCol - zone.col,
      y: mouseRow - zone.row
    });
    setDragPreviewPos({ col: zone.col, row: zone.row });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingZoneId === null || !gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    const mouseCol = (e.clientX - rect.left) / cellW;
    const mouseRow = (e.clientY - rect.top) / cellH;

    const targetZone = zones.find(z => z.id === draggingZoneId);
    if (!targetZone) return;

    let newCol = Math.round(mouseCol - dragOffset.x);
    let newRow = Math.round(mouseRow - dragOffset.y);

    newCol = Math.max(1, Math.min(COLS - targetZone.w + 1, newCol));
    newRow = Math.max(1, Math.min(ROWS - targetZone.h + 1, newRow));

    setDragPreviewPos({ col: newCol, row: newRow });
  }, [draggingZoneId, dragOffset, zones]);

  const handleMouseUp = useCallback(() => {
    if (draggingZoneId !== null && dragPreviewPos !== null) {
      const targetZone = zones.find(z => z.id === draggingZoneId);
      if (targetZone) {
        const hasCollision = checkCollision(
          targetZone.id,
          dragPreviewPos.col,
          dragPreviewPos.row,
          targetZone.w,
          targetZone.h,
          zones
        );

        if (!hasCollision) {
          setZones(prev => prev.map(z => {
            if (z.id === draggingZoneId) {
              return { ...z, col: dragPreviewPos.col, row: dragPreviewPos.row };
            }
            return z;
          }));
          addLog(`Zone #${targetZone.id} (${targetZone.name}) repositioned to Grid [${dragPreviewPos.col}, ${dragPreviewPos.row}].`, 'info');
        } else {
          addLog(`⚠️ Placement collision on Grid [${dragPreviewPos.col}, ${dragPreviewPos.row}]. Snapped back to original position.`, 'alert');
        }
      }
    }
    setDraggingZoneId(null);
    setDragPreviewPos(null);
  }, [draggingZoneId, dragPreviewPos, zones]);

  useEffect(() => {
    if (draggingZoneId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingZoneId, handleMouseMove, handleMouseUp]);

  // Neighbor Synergies Evaluator
  const getZoneSynergies = (zone: ZoneData) => {
    const synergies: { type: 'bonus' | 'penalty' | 'info'; title: string; desc: string; source: string }[] = [];
    const neighbors = zones.filter(other => {
      if (other.id === zone.id) return false;
      const xOverlap = !(zone.col + zone.w < other.col - 1 || zone.col - 1 > other.col + other.w);
      const yOverlap = !(zone.row + zone.h < other.row - 1 || zone.row - 1 > other.row + other.h);
      return xOverlap && yOverlap;
    });

    const crop = zone.plant?.cropId ? EXPANDED_CROP_CATALOG[zone.plant.cropId] : null;

    neighbors.forEach(n => {
      // Water proximity
      if (n.type === 'water') {
        synergies.push({
          type: 'bonus',
          title: 'Hydraulic Gravity Swale',
          desc: 'Adjacent water retention reduces daily moisture evaporation by 40%.',
          source: n.name
        });
      }

      // Compost proximity
      if (n.type === 'compost') {
        synergies.push({
          type: 'bonus',
          title: 'Microbial Soil Inoculation',
          desc: 'Organic decomposition increases soil nutrient replenishment rate by +30%.',
          source: n.name
        });
      }

      // Shed proximity
      if (n.type === 'building' && n.buildingType === 'shed') {
        synergies.push({
          type: 'bonus',
          title: 'Tool Depot Efficiency',
          desc: 'Proximity to tools reduces tending action energy and accelerates weeding.',
          source: n.name
        });
      }

      // Livestock proximity
      if (n.type === 'livestock') {
        if (crop?.category === 'leafy' || crop?.id === 'lettuce') {
          synergies.push({
            type: 'penalty',
            title: 'Foraging Pest Pressure',
            desc: 'Small livestock proximity attracts minor aphids & leaf pests.',
            source: n.name
          });
        } else {
          synergies.push({
            type: 'bonus',
            title: 'Manure Topdressing',
            desc: 'Organic manure seepage naturally boosts nitrogen levels.',
            source: n.name
          });
        }
      }

      // Crop-to-crop companion effects
      if (crop && n.plant?.cropId) {
        const neighborCrop = EXPANDED_CROP_CATALOG[n.plant.cropId];
        if (crop.companions.beneficial.includes(n.plant.cropId)) {
          const effect = crop.companions.effects.find(e => e.cropId === n.plant.cropId);
          synergies.push({
            type: 'bonus',
            title: `Guild Partner: ${neighborCrop?.displayName}`,
            desc: effect?.description || 'Beneficial companion interaction boosts yield and resistance.',
            source: n.name
          });
        }
        if (crop.companions.antagonistic.includes(n.plant.cropId)) {
          const effect = crop.companions.effects.find(e => e.cropId === n.plant.cropId);
          synergies.push({
            type: 'penalty',
            title: `Antagonistic Clash: ${neighborCrop?.displayName}`,
            desc: effect?.description || 'Cross-pathogen or nutrient competition penalty.',
            source: n.name
          });
        }
      }
    });

    return synergies;
  };

  // Advance Seasonal / Day Cycle
  const handleAdvanceDay = () => {
    const nextDay = cycleDay + 1;
    setCycleDay(nextDay);

    // 30 days per season
    const seasons: ('spring' | 'summer' | 'autumn' | 'winter')[] = ['spring', 'summer', 'autumn', 'winter'];
    const currentSeasonIdx = seasons.indexOf(currentSeason);
    let newSeason = currentSeason;
    if (nextDay % 30 === 1 && nextDay > 1) {
      newSeason = seasons[(currentSeasonIdx + 1) % 4];
      setCurrentSeason(newSeason);
      addLog(`🍂 Season shifted to ${SEASON_METADATA[newSeason].name.toUpperCase()}! Temperature and sun hours updated.`, 'bonus');
    }

    const seasonInfo = SEASON_METADATA[newSeason];

    // Simulate zones growth & soil consumption
    setZones(prev => prev.map(z => {
      if (!z.plant || !z.plant.cropId) return z;
      const crop = EXPANDED_CROP_CATALOG[z.plant.cropId];
      if (!crop) return z;

      // Seasonal frost check
      let frostDamage = 0;
      if (seasonInfo.frostRisk > 0 && !crop.frostTolerant && Math.random() < seasonInfo.frostRisk) {
        frostDamage = 15;
      }

      // Water drain
      const waterDrain = 8 + (seasonInfo.id === 'summer' ? 6 : 0);
      const newWater = Math.max(0, z.plant.water - waterDrain);

      // Nitrogen / Nutrient depletion
      const nDrain = crop.nutrientDemand.n === 'heavy' ? 4 : crop.nutrientDemand.n === 'fixer' ? -6 : 2;
      const pDrain = crop.nutrientDemand.p === 'heavy' ? 3 : 1;
      const kDrain = crop.nutrientDemand.k === 'heavy' ? 3 : 1;

      const newN = Math.min(100, Math.max(10, z.soil.nitrogen - nDrain));
      const newP = Math.min(100, Math.max(10, z.soil.phosphorus - pDrain));
      const newK = Math.min(100, Math.max(10, z.soil.potassium - kDrain));

      // Growth step
      const currentStage = crop.growthStages[z.plant.stageIndex] || crop.growthStages[0];
      const newRootStrength = z.plant.rootStrength + 1;
      let nextStageIdx = z.plant.stageIndex;

      let daysAccum = 0;
      for (let i = 0; i <= z.plant.stageIndex; i++) {
        daysAccum += crop.growthStages[i]?.days || 10;
      }

      if (newRootStrength >= daysAccum && nextStageIdx < crop.growthStages.length - 1) {
        nextStageIdx += 1;
      }

      const isReadyToHarvest = nextStageIdx === crop.growthStages.length - 1;

      return {
        ...z,
        soil: {
          ...z.soil,
          nitrogen: newN,
          phosphorus: newP,
          potassium: newK
        },
        plant: {
          ...z.plant,
          water: newWater,
          stageIndex: nextStageIdx,
          rootStrength: newRootStrength,
          health: Math.max(10, Math.min(100, z.plant.health - frostDamage)),
          isHarvestable: isReadyToHarvest
        }
      };
    }));

    addLog(`Advanced to Cycle Day ${nextDay} (${SEASON_METADATA[newSeason].name}). Crop telemetry and soil updated.`, 'info');
  };

  // Agronomic action handlers
  const handleHydrateZone = (zoneId: number) => {
    setZones(prev => prev.map(z => {
      if (z.id === zoneId && z.plant) {
        return {
          ...z,
          plant: { ...z.plant, water: Math.min(100, z.plant.water + 40), health: Math.min(100, z.plant.health + 5) }
        };
      }
      return z;
    }));
    addLog(`Irrigated Zone #${zoneId}. Root hydration replenished to optimal capacity.`, 'info');
  };

  const handleTendZone = (zoneId: number) => {
    setZones(prev => prev.map(z => {
      if (z.id === zoneId && z.plant) {
        return {
          ...z,
          plant: { ...z.plant, pests: 0, health: Math.min(100, z.plant.health + 10) }
        };
      }
      return z;
    }));
    addLog(`Cultivated and weeded Zone #${zoneId}. Pest pressure reduced to 0%.`, 'bonus');
  };

  const handleApplyAmendment = (amendmentId: string) => {
    const am = SOIL_AMENDMENTS.find(a => a.id === amendmentId);
    if (!am || credits < am.cost) return;

    setCredits(prev => prev - am.cost);
    setZones(prev => prev.map(z => {
      if (z.id === selectedZoneId) {
        return {
          ...z,
          soil: {
            ...z.soil,
            nitrogen: Math.min(100, z.soil.nitrogen + am.npk.n),
            phosphorus: Math.min(100, z.soil.phosphorus + am.npk.p),
            potassium: Math.min(100, z.soil.potassium + am.npk.k),
            ph: Math.min(8.5, Math.max(4.0, z.soil.ph + am.phShift)),
            organicMatter: Math.min(15, z.soil.organicMatter + am.om)
          }
        };
      }
      return z;
    }));

    addLog(`Applied ${am.name} to Zone #${selectedZoneId} (-${am.cost} 🪙). Soil chemistry balanced.`, 'bonus');
  };

  const handleHarvestZone = (zoneId: number) => {
    const targetZone = zones.find(z => z.id === zoneId);
    if (!targetZone || !targetZone.plant || !targetZone.plant.cropId) return;

    const crop = EXPANDED_CROP_CATALOG[targetZone.plant.cropId];
    if (!crop) return;

    const baseYield = Math.floor(Math.random() * (crop.harvest.maxYield - crop.harvest.minYield + 1)) + crop.harvest.minYield;
    const spacingSqft = crop.spacing.sqft;
    const plantUnits = Math.max(1, Math.round(targetZone.sqft / spacingSqft));
    const totalHarvestedQty = Math.round(baseYield * Math.min(10, Math.max(1, plantUnits / 50)));

    // Add to pantry
    const newItem: PantryItem = {
      id: `p-${Date.now()}`,
      cropId: crop.id,
      name: crop.harvest.displayName,
      qty: totalHarvestedQty,
      unit: crop.harvest.unit,
      preservation: 'fresh',
      quality: 1.2,
      basePrice: crop.harvest.basePrice,
      harvestDay: cycleDay
    };

    setPantry(prev => [newItem, ...prev]);

    // Reset crop or perennial
    setZones(prev => prev.map(z => {
      if (z.id === zoneId) {
        return {
          ...z,
          plant: {
            ...z.plant,
            stageIndex: crop.isPerennial ? crop.growthStages.length - 2 : 0,
            rootStrength: crop.isPerennial ? 730 : 0,
            isHarvestable: false
          }
        };
      }
      return z;
    }));

    addLog(`🌾 Harvested ${totalHarvestedQty} ${crop.harvest.unit} of ${crop.harvest.displayName} from Zone #${zoneId}! Placed in root pantry.`, 'bonus');
  };

  const handleLoadPreset = (preset: HomesteadPreset) => {
    setTotalAcreage(preset.acreage);
    const tileSqft = (preset.acreage * ACRE_SQFT) / (COLS * ROWS);

    const newZones: ZoneData[] = preset.zones.map((bz, index) => {
      const isCrop = bz.type === 'crop' || (bz.cropId && bz.cropId !== null);
      return {
        id: index + 1,
        name: bz.name,
        type: bz.type as any,
        col: bz.col,
        row: bz.row,
        w: bz.w,
        h: bz.h,
        color: bz.color,
        sqft: bz.w * bz.h * tileSqft,
        buildingType: (bz.buildingType || null) as any,
        elevation: bz.elevation || 'mid',
        sunExposure: 'full',
        soil: {
          nitrogen: bz.cropId === 'clover' ? 90 : 65,
          phosphorus: 60,
          potassium: 70,
          ph: bz.soilPh || 6.5,
          organicMatter: 6.0
        },
        rotationSequence: ['clover', 'lettuce', 'tomato', 'carrot'],
        plant: {
          cropId: bz.cropId || null,
          water: 65,
          nutrients: 75,
          pests: 0,
          health: 100,
          stageIndex: isCrop ? 1 : 0,
          rootStrength: 10,
          isHarvestable: false,
          yieldMultiplier: 1.0
        }
      };
    });

    setZones(newZones);
    setSelectedZoneId(newZones[0]?.id || 1);
    addLog(`Loaded Homestead Blueprint: "${preset.name}" (${preset.acreage} Acres).`, 'bonus');
  };

  const handleSellPantryItem = (itemId: string, qty: number, pricePerUnit: number) => {
    const totalEarnings = qty * pricePerUnit;
    setCredits(prev => prev + totalEarnings);

    setPantry(prev => prev.map(p => {
      if (p.id === itemId) {
        return { ...p, qty: p.qty - qty };
      }
      return p;
    }).filter(p => p.qty > 0));

    addLog(`Sold ${qty} units to seasonal market for +${totalEarnings} 🪙.`, 'bonus');
  };

  const handlePreservePantryItem = (itemId: string, method: 'cold_cellar' | 'dry' | 'canned') => {
    setPantry(prev => prev.map(p => {
      if (p.id === itemId) {
        return { ...p, preservation: method, quality: Math.min(1.5, p.quality + 0.15) };
      }
      return p;
    }));
    addLog(`Preserved stores using ${method.replace('_', ' ')}. Storage stability extended.`, 'bonus');
  };

  const selectedZone = zones.find(z => z.id === selectedZoneId) || zones[0];
  const selectedCrop = selectedZone?.plant?.cropId ? EXPANDED_CROP_CATALOG[selectedZone.plant.cropId] : null;
  const selectedSynergies = selectedZone ? getZoneSynergies(selectedZone) : [];
  const seasonInfo = SEASON_METADATA[currentSeason];

  return (
    <div className="w-full space-y-4 font-sans text-[#f4ecd8]">
      
      {/* Top Phase 2 Master Agronomic Toolbar */}
      <div className="bg-[#1f1b15] border border-[#332c22] p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        {/* Left: Cycle & Season Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#171410] px-3 py-1.5 rounded-lg border border-[#332c22]">
            <span className="text-xl">{seasonInfo.icon}</span>
            <div>
              <div className="text-[10px] text-[#8a7f68] font-mono uppercase tracking-wider">Active Season</div>
              <div className="text-xs font-bold font-mono text-[#f4ecd8] flex items-center gap-1.5">
                <span>{seasonInfo.name.toUpperCase()}</span>
                <span className="text-[10px] text-[#c9a227]">({seasonInfo.avgTempF}°F · {seasonInfo.sunlightHours}h sun)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#171410] px-3 py-1.5 rounded-lg border border-[#332c22]">
            <div>
              <div className="text-[10px] text-[#8a7f68] font-mono uppercase tracking-wider">Temporal Cycle</div>
              <div className="text-xs font-bold font-mono text-[#81c784]">DAY {cycleDay}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#171410] px-3 py-1.5 rounded-lg border border-[#332c22]">
            <div>
              <div className="text-[10px] text-[#8a7f68] font-mono uppercase tracking-wider">Homestead Treasury</div>
              <div className="text-xs font-bold font-mono text-[#c9a227]">{credits.toLocaleString()} 🪙</div>
            </div>
          </div>
        </div>

        {/* Center: Land Scale Control */}
        <div className="flex items-center gap-2 bg-[#171410] px-3 py-1.5 rounded-lg border border-[#332c22]">
          <span className="text-xs font-mono text-[#8a7f68]">Land Area:</span>
          <div className="flex gap-1">
            {[0.5, 1.0, 3.5, 5.0].map(ac => (
              <button
                key={ac}
                onClick={() => setTotalAcreage(ac)}
                className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  totalAcreage === ac
                    ? 'bg-[#c9a227] text-[#171410]'
                    : 'bg-[#221c15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
                }`}
              >
                {ac} ac
              </button>
            ))}
          </div>
          <span className="text-[10.5px] font-mono text-[#81c784] pl-1 hidden sm:inline">
            ({Math.round(totalAcreage * ACRE_SQFT).toLocaleString()} sq ft)
          </span>
        </div>

        {/* Right: Action Buttons & Modals Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCompanionModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#e9c46a] border border-[#8a6f1c]/40 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Scientific Companion Planting Matrix"
          >
            <span>🌿 Companion Matrix</span>
          </button>

          <button
            onClick={() => setIsRotationModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#81c784] border border-[#2e4726] flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open 4-Year Crop Rotation Planner"
          >
            <span>🔄 4-Year Rotation</span>
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#64b5f6] border border-[#1976d2]/40 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export or Print Homestead Agronomic Audit"
          >
            <span>📋 Audit Report</span>
          </button>

          <button
            onClick={handleAdvanceDay}
            className="px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#c9a227] hover:bg-[#e0b738] text-[#171410] shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>⏩ Next Day</span>
          </button>
        </div>
      </div>

      {/* Preset Blueprints Drawer */}
      <div className="bg-[#171410] border border-[#332c22] p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#8a7f68]">Permaculture Templates:</span>
          <div className="flex gap-1.5 flex-wrap">
            {HOMESTEAD_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => handleLoadPreset(p)}
                className="px-2.5 py-1 rounded bg-[#221c15] hover:bg-[#332c22] border border-[#3d3323] text-[#f4ecd8] text-[11px] transition-all cursor-pointer flex items-center gap-1"
              >
                <span>📐 {p.name.split('-Acre')[0]}-Acre</span>
                <span className="text-[9px] text-[#c9a227]">({p.badge})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overlay Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSynergyLines(!showSynergyLines)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
              showSynergyLines ? 'bg-[#81c784]/20 text-[#81c784] border border-[#81c784]/40' : 'bg-[#221c15] text-[#8a7f68] border border-[#332c22]'
            }`}
          >
            {showSynergyLines ? '✨ Synergies ON' : '✨ Synergies OFF'}
          </button>

          <button
            onClick={() => setShowTopography(!showTopography)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
              showTopography ? 'bg-[#64b5f6]/20 text-[#64b5f6] border border-[#64b5f6]/40' : 'bg-[#221c15] text-[#8a7f68] border border-[#332c22]'
            }`}
          >
            {showTopography ? '⛰️ Topography ON' : '⛰️ Topography OFF'}
          </button>
        </div>
      </div>

      {/* Main Grid & Telemetry Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left / Center (cols 1-8): Interactive 24x18 Draggable Site Plan */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-[#1f1b15] border border-[#332c22] p-3 rounded-xl shadow-lg relative">
            <div className="flex justify-between items-center mb-2 px-1 text-xs font-mono text-[#8a7f68]">
              <span>Site Plan Grid (24×18 Tiles · Click & Drag to Reorganize)</span>
              <span>Selected: #{selectedZone?.id} {selectedZone?.name}</span>
            </div>

            {/* Grid Container */}
            <div
              ref={gridContainerRef}
              style={{ backgroundColor: seasonInfo.themeBg }}
              className="w-full aspect-[4/3] border-2 border-[#3d3323] rounded-lg relative overflow-hidden select-none cursor-crosshair shadow-inner"
            >
              {/* Background 24x18 Grid Lines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #8a7f68 1px, transparent 1px),
                    linear-gradient(to bottom, #8a7f68 1px, transparent 1px)
                  `,
                  backgroundSize: `${100 / COLS}% ${100 / ROWS}%`
                }}
              />

              {/* Topography Contours if active */}
              {showTopography && (
                <div className="absolute inset-0 pointer-events-none opacity-25 flex flex-col justify-between p-2 text-[9px] font-mono text-[#64b5f6]">
                  <div>▲ High Elevation Ridge (North Swale)</div>
                  <div>— Mid-Slope Fertile Loam —</div>
                  <div>▼ Lowland Water Collection Basin (South Pond)</div>
                </div>
              )}

              {/* Render Zones */}
              {zones.map(z => {
                const isSelected = z.id === selectedZoneId;
                const isDragging = z.id === draggingZoneId;
                const crop = z.plant?.cropId ? EXPANDED_CROP_CATALOG[z.plant.cropId] : null;
                const stage = crop ? crop.growthStages[z.plant.stageIndex] || crop.growthStages[0] : null;

                const leftPct = ((z.col - 1) / COLS) * 100;
                const topPct = ((z.row - 1) / ROWS) * 100;
                const widthPct = (z.w / COLS) * 100;
                const heightPct = (z.h / ROWS) * 100;

                return (
                  <div
                    key={z.id}
                    onMouseDown={(e) => handleMouseDown(e, z)}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      backgroundColor: z.color
                    }}
                    className={`absolute rounded transition-shadow flex flex-col justify-between p-1.5 cursor-grab active:cursor-grabbing border-2 ${
                      isSelected
                        ? 'border-[#f4ecd8] shadow-[0_0_15px_rgba(201,162,39,0.5)] z-20 ring-2 ring-[#c9a227]'
                        : 'border-black/40 hover:border-white/50 z-10'
                    } ${isDragging ? 'opacity-40' : 'opacity-95'}`}
                  >
                    {/* Zone Badge Header */}
                    <div className="flex justify-between items-start leading-none pointer-events-none">
                      <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-black/60 rounded text-[#f4ecd8]">
                        #{z.id}
                      </span>
                      {crop && (
                        <span className="text-xs">{stage?.icon || '🌱'}</span>
                      )}
                      {z.type === 'water' && <span className="text-xs">💧</span>}
                      {z.type === 'compost' && <span className="text-xs">🍂</span>}
                      {z.type === 'livestock' && <span className="text-xs">🐑</span>}
                      {z.type === 'building' && <span className="text-xs">🏡</span>}
                    </div>

                    {/* Zone Name & Specs */}
                    <div className="pointer-events-none">
                      <div className="text-[10px] font-bold text-[#f4ecd8] truncate leading-tight drop-shadow">
                        {z.name}
                      </div>
                      <div className="text-[8.5px] text-[#f4ecd8]/80 font-mono leading-none mt-0.5">
                        {Math.round(z.sqft).toLocaleString()} sq ft
                      </div>
                    </div>

                    {/* Crop Moisture & Nutrients Mini Bars */}
                    {z.plant && z.plant.cropId && (
                      <div className="w-full space-y-0.5 pointer-events-none">
                        <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-[#64b5f6] h-full"
                            style={{ width: `${z.plant.water}%` }}
                          />
                        </div>
                        <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-[#81c784] h-full"
                            style={{ width: `${z.plant.health}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Drag Preview Outline */}
              {dragPreviewPos && draggingZoneId && (
                <div
                  style={{
                    left: `${((dragPreviewPos.col - 1) / COLS) * 100}%`,
                    top: `${((dragPreviewPos.row - 1) / ROWS) * 100}%`,
                    width: `${((zones.find(z => z.id === draggingZoneId)?.w || 1) / COLS) * 100}%`,
                    height: `${((zones.find(z => z.id === draggingZoneId)?.h || 1) / ROWS) * 100}%`
                  }}
                  className="absolute border-2 border-dashed border-[#c9a227] bg-[#c9a227]/20 pointer-events-none z-30 rounded"
                />
              )}
            </div>

            {/* Grid Footnote */}
            <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-mono text-[#8a7f68]">
              <span>Snap-to-grid auto collision detection enabled</span>
              <span className="text-[#81c784]">Click any zone to inspect pedology & agronomy</span>
            </div>
          </div>
        </div>

        {/* Right (cols 9-12): Zone Telemetry, Agronomy & Actions */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-[#1f1b15] border border-[#332c22] p-4 rounded-xl shadow-lg space-y-4">
            
            {/* Zone Title Header */}
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

            {/* Crop Details & Growth Stage */}
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

                {/* Vitals */}
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

                {/* Agronomic Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleHydrateZone(selectedZone.id)}
                    className="p-2 rounded bg-[#1976d2]/20 hover:bg-[#1976d2]/30 border border-[#1976d2]/40 text-[#64b5f6] text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>💧 Water Zone</span>
                  </button>

                  <button
                    onClick={() => handleTendZone(selectedZone.id)}
                    className="p-2 rounded bg-[#388e3c]/20 hover:bg-[#388e3c]/30 border border-[#388e3c]/40 text-[#81c784] text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🌿 Weed & Tend</span>
                  </button>
                </div>

                {/* Harvest Button if ready */}
                {selectedZone.plant.isHarvestable && (
                  <button
                    onClick={() => handleHarvestZone(selectedZone.id)}
                    className="w-full p-2.5 rounded bg-[#c9a227] hover:bg-[#e0b738] text-[#171410] text-xs font-mono font-bold shadow-lg animate-pulse transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>🌾 Harvest Crop Yield</span>
                  </button>
                )}

                {/* Micro-grid preview trigger */}
                <button
                  onClick={() => setZoomMicroGrid(true)}
                  className="w-full p-2 rounded bg-[#221c15] hover:bg-[#2e261d] border border-[#3d3323] text-[#b8ab8e] hover:text-[#f4ecd8] text-xs font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>🔍 Zoom Micro-Grid Plant Instances</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-[#171410] border border-dashed border-[#332c22] rounded-lg text-center text-xs text-[#8a7f68]">
                <span>Building / Facility Zone. Enhances neighboring biological zones.</span>
              </div>
            )}

            {/* Active Neighbor Synergies */}
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
        </div>
      </div>

      {/* Bottom Tabs: Soil Pedology / Root Cellar & Market / Homestead Log */}
      <div className="space-y-3">
        <div className="flex gap-2 border-b border-[#332c22] pb-2 text-xs font-mono">
          <button
            onClick={() => setActiveBottomTab('soil')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeBottomTab === 'soil'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            🧪 Soil Chemistry & Pedology (Zone #{selectedZone.id})
          </button>
          <button
            onClick={() => setActiveBottomTab('cellar')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeBottomTab === 'cellar'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            🛖 Root Cellar & Seasonal Market ({pantry.length} items)
          </button>
          <button
            onClick={() => setActiveBottomTab('log')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeBottomTab === 'log'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            📜 Homestead Activity Log
          </button>
        </div>

        {activeBottomTab === 'soil' && (
          <SoilNutrientPanel
            zone={selectedZone}
            soil={selectedZone.soil}
            credits={credits}
            onApplyAmendment={handleApplyAmendment}
          />
        )}

        {activeBottomTab === 'cellar' && (
          <HarvestCellarPanel
            pantry={pantry}
            currentSeason={currentSeason}
            credits={credits}
            onSellItem={handleSellPantryItem}
            onPreserveItem={handlePreservePantryItem}
          />
        )}

        {activeBottomTab === 'log' && (
          <div className="bg-[#171410] border border-[#332c22] p-4 rounded-xl space-y-2 max-h-60 overflow-y-auto">
            <div className="text-xs font-mono font-bold text-[#e9c46a] mb-2 uppercase">Recent Homestead Activity:</div>
            {activityLogs.map(log => (
              <div
                key={log.id}
                className="text-xs font-mono flex items-start gap-2 p-1.5 rounded bg-[#1e1913] border border-[#2a241b]"
              >
                <span className="text-[#8a7f68] shrink-0">[{log.time}]</span>
                <span className={log.type === 'bonus' ? 'text-[#81c784]' : log.type === 'alert' ? 'text-[#e57373]' : 'text-[#f4ecd8]'}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Micro-Grid Zoom Modal */}
      {zoomMicroGrid && selectedCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1c1813] border-2 border-[#8a6f1c] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans text-[#f4ecd8]">
            <div className="p-4 bg-[#262016] border-b border-[#3d3323] flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-[#f4ecd8]">
                Individual Plant Matrix (Zone #{selectedZone.id}: {selectedZone.name})
              </h3>
              <button
                onClick={() => setZoomMicroGrid(false)}
                className="w-7 h-7 rounded bg-[#332c22] text-[#b8ab8e] hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div className="text-xs text-[#b8ab8e] font-mono bg-[#171410] p-2.5 rounded border border-[#332c22]">
                • Spacing Density: <b>{selectedCrop.spacing.label}</b> ({selectedCrop.spacing.description})<br />
                • Total plants calculated in zone: <b>{Math.max(1, Math.round(selectedZone.sqft / selectedCrop.spacing.sqft)).toLocaleString()} units</b>.
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 p-2 bg-[#171410] border border-[#332c22] rounded max-h-72 overflow-y-auto">
                {Array.from({ length: Math.min(60, Math.max(1, Math.round(selectedZone.sqft / selectedCrop.spacing.sqft))) }).map((_, idx) => (
                  <div
                    key={idx}
                    className="aspect-square border border-[#3d3323] rounded flex flex-col items-center justify-center bg-black/40 text-sm hover:scale-105 transition-transform"
                  >
                    <span>{selectedCrop.growthStages[selectedZone.plant.stageIndex]?.icon || '🌱'}</span>
                    <span className="text-[8px] font-mono text-[#8a7f68]">#{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#171410] border-t border-[#332c22] flex justify-end">
              <button
                onClick={() => setZoomMicroGrid(false)}
                className="px-4 py-1.5 rounded bg-[#c9a227] text-[#171410] font-mono font-bold text-xs cursor-pointer"
              >
                Close Micro-Grid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CompanionMatrixModal
        isOpen={isCompanionModalOpen}
        onClose={() => setIsCompanionModalOpen(false)}
        selectedCropId={selectedZone?.plant?.cropId}
      />

      <RotationPlannerModal
        isOpen={isRotationModalOpen}
        onClose={() => setIsRotationModalOpen(false)}
        zones={zones}
        onApplyRotationPlan={(zoneId, sequence) => {
          setZones(prev => prev.map(z => {
            if (z.id === zoneId) {
              return { ...z, rotationSequence: sequence };
            }
            return z;
          }));
          addLog(`Committed 4-Year Crop Rotation schedule to Zone #${zoneId}.`, 'bonus');
        }}
      />

      <HomesteadReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        acreage={totalAcreage}
        zones={zones}
        currentSeason={currentSeason}
        cycleDay={cycleDay}
        credits={credits}
      />
    </div>
  );
}
