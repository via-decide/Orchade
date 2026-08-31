import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EXPANDED_CROP_CATALOG, SOIL_AMENDMENTS, SEASON_METADATA, CropDefinition } from '../data/cropCatalog';
import { HOMESTEAD_PRESETS, HomesteadPreset } from '../data/homesteadPresets';
import { LIVESTOCK_BREEDS, PaddockState, LivestockBreed } from '../data/livestockData';
import {
  WaterHydrologyState,
  SolarMicrogridState,
  WATER_INFRASTRUCTURE_UPGRADES,
  ENERGY_INFRASTRUCTURE_UPGRADES
} from '../data/homesteadEngineering';
import { CompanionMatrixModal } from './CompanionMatrixModal';
import { RotationPlannerModal } from './RotationPlannerModal';
import { SoilNutrientPanel, SoilState } from './SoilNutrientPanel';
import { HarvestCellarPanel, PantryItem } from './HarvestCellarPanel';
import { HomesteadReportModal } from './HomesteadReportModal';
import { RotationalGrazingModal } from './RotationalGrazingModal';
import { HomesteadEngineeringModal } from './HomesteadEngineeringModal';
import {
  advanceWasteEconomy,
  initialWasteEconomyState,
  createCompostBin,
  isHarvestContaminated,
  getContaminationPenalty,
  produceResidue,
  getResidueProfile,
} from '../../gameplay/waste-economy/api';
import type { WasteEconomyState, ZoneRef } from '../../gameplay/waste-economy/api';

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
  const [credits, setCredits] = useState<number>(420);
  const [selectedZoneId, setSelectedZoneId] = useState<number>(2); // Default to Tomato guild

  // Phase 3 Systems State: Livestock Paddocks
  const [paddocks, setPaddocks] = useState<PaddockState[]>([
    {
      id: 'pad-1',
      zoneId: 7, // Chicken Coop / Pasture
      breedId: 'heritage_chickens',
      population: 24,
      health: 100,
      pastureBiomass: 88,
      daysInPaddock: 2,
      manureAccumulation: 28,
      cycleProgress: 2,
      shelterStatus: 'coop'
    },
    {
      id: 'pad-2',
      zoneId: 8, // Apple Orchard Silvopasture
      breedId: 'apiculture_bees',
      population: 40000,
      health: 100,
      pastureBiomass: 95,
      daysInPaddock: 12,
      manureAccumulation: 5,
      cycleProgress: 6,
      shelterStatus: 'solar_fence'
    }
  ]);

  // Phase 3 Systems State: Water Hydrology & Off-Grid Solar Microgrid
  const [waterState, setWaterState] = useState<WaterHydrologyState>({
    catchmentSqft: 2800, // House + barn roofs
    currentStoredGallons: 4200,
    maxCisternCapacityGallons: 6000,
    annualRainfallInches: 38,
    dailyConsumptionGallons: 180,
    swaleInfiltrationRate: 1200,
    graywaterRecycledGallons: 45,
    irrigationType: 'drip',
    keylinePondsCount: 1
  });

  const [solarState, setSolarState] = useState<SolarMicrogridState>({
    solarArrayWatts: 6400,
    batteryBankKwh: 15.0,
    currentBatteryStorageKwh: 13.8,
    maxBatteryStorageKwh: 15.0,
    dailyGenerationKwh: 28.5,
    dailyLoadKwh: 18.2,
    isOffGridTied: true,
    backupBiomassGenActive: false
  });

  // Phase 4: Waste Economy State
  const [wasteState, setWasteState] = useState<WasteEconomyState>(() => {
    const initial = { ...initialWasteEconomyState };
    const compostZones = zones.filter(z => z.type === 'compost');
    initial.compostBins = compostZones.map(z => createCompostBin(z.id, z.sqft));
    return initial;
  });

  // Modals & Panels
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState<boolean>(false);
  const [isRotationModalOpen, setIsRotationModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isGrazingModalOpen, setIsGrazingModalOpen] = useState<boolean>(false);
  const [isEngineeringModalOpen, setIsEngineeringModalOpen] = useState<boolean>(false);

  const [activeBottomTab, setActiveBottomTab] = useState<'details' | 'soil' | 'cellar' | 'grazing' | 'energy' | 'log'>('details');
  const [zoomMicroGrid, setZoomMicroGrid] = useState<boolean>(false);

  // Overlays
  const [showSynergyLines, setShowSynergyLines] = useState<boolean>(true);
  const [showTopography, setShowTopography] = useState<boolean>(false);
  const [showWaterRadius, setShowWaterRadius] = useState<boolean>(true);

  // Notification / Activity Log
  const [activityLogs, setActivityLogs] = useState<{ id: string; time: string; message: string; type: 'info' | 'bonus' | 'alert' }[]>([
    { id: '1', time: 'Day 1 · Spring', message: 'Homestead Site Plan initialized. 3.5 Acres calculated (152,460 sq ft).', type: 'info' },
    { id: '2', time: 'Day 1 · Spring', message: 'Heritage Chickens & Italian Bee Colony active in rotational silvopasture.', type: 'bonus' },
    { id: '3', time: 'Day 1 · Spring', message: 'Off-grid 6.4kW PV Solar microgrid & 6,000 gal rainwater catchment online.', type: 'bonus' }
  ]);

  // Pantry Storage Inventory
  const [pantry, setPantry] = useState<PantryItem[]>([
    { id: 'p1', cropId: 'apple', name: 'Bushels of Apples', qty: 25, unit: 'bushels', preservation: 'cold_cellar', quality: 1.25, basePrice: 65, harvestDay: 1 },
    { id: 'p2', cropId: 'basil', name: 'Aromatic Basil Leaves', qty: 10, unit: 'bunches', preservation: 'dry', quality: 1.2, basePrice: 15, harvestDay: 1 },
    { id: 'p3', cropId: 'garlic', name: 'Cured Hardneck Garlic Bulbs', qty: 18, unit: 'bulbs', preservation: 'dry', quality: 1.3, basePrice: 22, harvestDay: 1 },
    { id: 'p4', cropId: 'egg', name: 'Pastured Golden Yolk Eggs', qty: 6, unit: 'dozen', preservation: 'fresh', quality: 1.4, basePrice: 18, harvestDay: 1 },
    { id: 'p5', cropId: 'honey', name: 'Raw Wildflower Honey & Beeswax', qty: 4, unit: 'jars', preservation: 'dry', quality: 1.5, basePrice: 55, harvestDay: 1 }
  ]);

  // Initialize Zones from default preset
  const defaultPreset = HOMESTEAD_PRESETS[0];
  const [zones, setZones] = useState<ZoneData[]>(() => {
    const tileSqft = (3.5 * ACRE_SQFT) / (COLS * ROWS);
    return defaultPreset.zones.map((bz, index) => {
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

  // Active Tool Mode
  const [toolMode, setToolMode] = useState<'select' | 'tend' | 'water' | 'harvest'>('select');

  // Floating feedback effect per zone
  const [zoneEffect, setZoneEffect] = useState<{ zoneId: number; text: string; icon: string; color: string } | null>(null);

  const triggerZoneEffect = (zoneId: number, text: string, icon: string, color: string) => {
    setZoneEffect({ zoneId, text, icon, color });
    setTimeout(() => {
      setZoneEffect(prev => (prev?.zoneId === zoneId ? null : prev));
    }, 1800);
  };

  // Dragging State & Refs for stable 60fps event handling
  const [draggingZoneId, setDraggingZoneId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragPreviewPos, setDragPreviewPos] = useState<{ col: number; row: number } | null>(null);
  const [dragHasCollision, setDragHasCollision] = useState<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false);
  const lastTendedZoneIdRef = useRef<number | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const zonesRef = useRef<ZoneData[]>(zones);
  zonesRef.current = zones;
  const draggingZoneIdRef = useRef<number | null>(null);
  const dragPreviewPosRef = useRef<{ col: number; row: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedRef = useRef<boolean>(false);
  const toolModeRef = useRef<'select' | 'tend' | 'water' | 'harvest'>(toolMode);
  toolModeRef.current = toolMode;

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
  const handleZoneMouseDown = (e: React.MouseEvent, zone: ZoneData) => {
    e.stopPropagation();
    setSelectedZoneId(zone.id);
    isMouseDownRef.current = true;
    lastTendedZoneIdRef.current = zone.id;

    // If using a specialized click-tool, perform action immediately on click
    if (toolMode === 'tend') {
      handleTendZone(zone.id);
      return;
    }
    if (toolMode === 'water') {
      handleHydrateZone(zone.id);
      return;
    }
    if (toolMode === 'harvest') {
      if (zone.plant?.isHarvestable) {
        handleHarvestZone(zone.id);
      } else {
        addLog(`Zone #${zone.id} (${zone.name}) is not ready for harvest yet.`, 'alert');
        triggerZoneEffect(zone.id, 'Not ready yet', '⏳', '#ffb74d');
      }
      return;
    }

    // Default select & move mode: initiate drag
    setDraggingZoneId(zone.id);
    draggingZoneIdRef.current = zone.id;
    dragMovedRef.current = false;

    if (!gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    const mouseCol = (e.clientX - rect.left) / cellW;
    const mouseRow = (e.clientY - rect.top) / cellH;

    const offset = {
      x: mouseCol - zone.col,
      y: mouseRow - zone.row
    };
    setDragOffset(offset);
    dragOffsetRef.current = offset;
    const initialPos = { col: zone.col, row: zone.row };
    setDragPreviewPos(initialPos);
    dragPreviewPosRef.current = initialPos;
    setDragHasCollision(false);
  };

  // Support sweeping / dragging active tools across zones
  const handleZoneMouseEnter = (zone: ZoneData) => {
    if (!isMouseDownRef.current) return;
    if (lastTendedZoneIdRef.current === zone.id) return;
    lastTendedZoneIdRef.current = zone.id;

    if (toolModeRef.current === 'tend') {
      handleTendZone(zone.id);
    } else if (toolModeRef.current === 'water') {
      handleHydrateZone(zone.id);
    } else if (toolModeRef.current === 'harvest' && zone.plant?.isHarvestable) {
      handleHarvestZone(zone.id);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const currentDragId = draggingZoneIdRef.current;
    if (currentDragId === null || !gridContainerRef.current) return;
    const rect = gridContainerRef.current.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    const mouseCol = (e.clientX - rect.left) / cellW;
    const mouseRow = (e.clientY - rect.top) / cellH;

    const targetZone = zonesRef.current.find(z => z.id === currentDragId);
    if (!targetZone) return;

    let newCol = Math.round(mouseCol - dragOffsetRef.current.x);
    let newRow = Math.round(mouseRow - dragOffsetRef.current.y);

    newCol = Math.max(1, Math.min(COLS - targetZone.w + 1, newCol));
    newRow = Math.max(1, Math.min(ROWS - targetZone.h + 1, newRow));

    if (newCol !== targetZone.col || newRow !== targetZone.row) {
      dragMovedRef.current = true;
    }

    const collision = checkCollision(
      targetZone.id,
      newCol,
      newRow,
      targetZone.w,
      targetZone.h,
      zonesRef.current
    );

    setDragHasCollision(collision);
    const newPos = { col: newCol, row: newRow };
    setDragPreviewPos(newPos);
    dragPreviewPosRef.current = newPos;
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    lastTendedZoneIdRef.current = null;
    const currentDragId = draggingZoneIdRef.current;
    const currentPos = dragPreviewPosRef.current;

    if (currentDragId !== null && currentPos !== null) {
      const targetZone = zonesRef.current.find(z => z.id === currentDragId);
      if (targetZone) {
        const moved = currentPos.col !== targetZone.col || currentPos.row !== targetZone.row;
        if (moved) {
          const hasCollision = checkCollision(
            targetZone.id,
            currentPos.col,
            currentPos.row,
            targetZone.w,
            targetZone.h,
            zonesRef.current
          );

          if (!hasCollision) {
            setZones(prev => prev.map(z => {
              if (z.id === currentDragId) {
                return { ...z, col: currentPos.col, row: currentPos.row };
              }
              return z;
            }));
            addLog(`Zone #${targetZone.id} (${targetZone.name}) repositioned to Grid [Col ${currentPos.col}, Row ${currentPos.row}].`, 'info');
            triggerZoneEffect(targetZone.id, `Relocated to [${currentPos.col}, ${currentPos.row}]`, '📍', '#81c784');
          } else {
            addLog(`⚠️ Placement collision on Grid [${currentPos.col}, ${currentPos.row}]. Snapped back to original position.`, 'alert');
            triggerZoneEffect(targetZone.id, 'Collision Snapped Back', '⚠️', '#e57373');
          }
        }
      }
    }
    setDraggingZoneId(null);
    draggingZoneIdRef.current = null;
    setDragPreviewPos(null);
    dragPreviewPosRef.current = null;
    setDragHasCollision(false);
  }, []);

  useEffect(() => {
    const onGlobalMouseUp = () => {
      isMouseDownRef.current = false;
      lastTendedZoneIdRef.current = null;
    };
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => window.removeEventListener('mouseup', onGlobalMouseUp);
  }, []);

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

  // Neighbor Synergies Evaluator (Enhanced with Animal Silvopasture & Pollination)
  const getZoneSynergies = (zone: ZoneData) => {
    const synergies: { type: 'bonus' | 'penalty' | 'info'; title: string; desc: string; source: string }[] = [];
    const neighbors = zones.filter(other => {
      if (other.id === zone.id) return false;
      const xOverlap = !(zone.col + zone.w < other.col - 1 || zone.col - 1 > other.col + other.w);
      const yOverlap = !(zone.row + zone.h < other.row - 1 || zone.row - 1 > other.row + other.h);
      return xOverlap && yOverlap;
    });

    const crop = zone.plant?.cropId ? EXPANDED_CROP_CATALOG[zone.plant.cropId] : null;

    // Check if zone hosts an active livestock paddock
    const paddockInZone = paddocks.find(p => p.zoneId === zone.id);
    if (paddockInZone) {
      const breed = LIVESTOCK_BREEDS[paddockInZone.breedId];
      if (breed) {
        synergies.push({
          type: 'bonus',
          title: `Active Herd: ${breed.name}`,
          desc: `${breed.grazingImpact.weedSuppression}% weed suppression & high-value ${breed.outputs.name} production.`,
          source: `Paddock #${paddockInZone.id}`
        });
      }
    }

    // Check if bees are in proximity (within 6 tiles)
    const hasBeeApiaryNearby = paddocks.some(p => {
      if (p.breedId !== 'apiculture_bees') return false;
      const beeZone = zones.find(z => z.id === p.zoneId);
      if (!beeZone) return false;
      const dist = Math.hypot(zone.col - beeZone.col, zone.row - beeZone.row);
      return dist <= 8;
    });

    if (hasBeeApiaryNearby && (crop?.category === 'fruiting' || crop?.category === 'herb' || crop?.id === 'tomato' || crop?.id === 'apple')) {
      synergies.push({
        type: 'bonus',
        title: 'Apiary Pollination Corridor',
        desc: 'Honeybee foraging increases blossom fruit-set and seed density by +35%.',
        source: 'Bee Colony'
      });
    }

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

      // Greywater flow from house
      if (n.type === 'building' && n.buildingType === 'house' && zone.type === 'crop') {
        synergies.push({
          type: 'bonus',
          title: 'Greywater Irrigation',
          desc: 'Recycled household water reduces crop water drain by 30%.',
          source: n.name
        });
      }
      if (n.type === 'building' && n.buildingType === 'house' && zone.type === 'water') {
        synergies.push({
          type: 'bonus',
          title: 'Greywater Recovery',
          desc: 'Recycled household water supplements cistern storage.',
          source: n.name
        });
      }

      // Direct manure warning (livestock adjacent to crop with no compost buffer)
      if (n.type === 'livestock' && zone.type === 'crop') {
        const hasCompostBuffer = zones.some(z =>
          z.type === 'compost' && z.id !== zone.id && z.id !== n.id &&
          !(zone.col + zone.w < z.col - 1 || zone.col - 1 > z.col + z.w) &&
          !(zone.row + zone.h < z.row - 1 || zone.row - 1 > z.row + z.h)
        );
        if (!hasCompostBuffer) {
          const penalty = getContaminationPenalty(zone.id, cycleDay, wasteState.contaminations);
          if (penalty) {
            synergies.push({
              type: 'penalty',
              title: 'Raw Manure Contamination Risk',
              desc: `Uncomposted manure applied. Harvest unsafe for ${penalty.daysUntilSafe} more days. Quality penalty if harvested early.`,
              source: n.name
            });
          } else {
            synergies.push({
              type: 'info',
              title: 'Direct Manure Application',
              desc: 'Raw manure provides NPK but triggers a 120-day food safety hold before harvest.',
              source: n.name
            });
          }
        }
      }

      // Compost feed pipeline (livestock → compost)
      if (n.type === 'livestock' && zone.type === 'compost') {
        synergies.push({
          type: 'bonus',
          title: 'Manure Feed Pipeline',
          desc: 'Livestock manure (green/nitrogen input) automatically feeds this compost bin.',
          source: n.name
        });
      }

      // Residue feed (crop → compost)
      if (n.type === 'crop' && zone.type === 'compost' && n.plant?.cropId) {
        synergies.push({
          type: 'bonus',
          title: 'Residue Feed Pipeline',
          desc: 'Crop residue (brown/carbon input) feeds compost bin on harvest.',
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

  // Advance Seasonal / Day Cycle (with Phase 3 Animal & Energy Simulation)
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
      addLog(`🍂 Season shifted to ${SEASON_METADATA[newSeason].name.toUpperCase()}! Temperature and solar radiation updated.`, 'bonus');
    }

    const seasonInfo = SEASON_METADATA[newSeason];

    // 1. Simulate Solar & Hydrology Energy Balance
    const solarGenerationToday = (solarState.solarArrayWatts / 1000) * (seasonInfo.sunlightHours * 0.75) + (solarState.backupBiomassGenActive ? 12 : 0);
    const updatedBatteryKwh = Math.min(
      solarState.maxBatteryStorageKwh,
      Math.max(1.0, solarState.currentBatteryStorageKwh + (solarGenerationToday - solarState.dailyLoadKwh))
    );

    // Water consumption & rain infiltration
    const isRainDay = Math.random() < (seasonInfo.id === 'spring' ? 0.35 : 0.15);
    const rainCatchment = isRainDay ? (waterState.catchmentSqft * 0.623 * 0.75) : 0; // 0.75 in rain
    const updatedCistern = Math.min(
      waterState.maxCisternCapacityGallons,
      Math.max(100, waterState.currentStoredGallons + rainCatchment - waterState.dailyConsumptionGallons)
    );

    setSolarState(prev => ({
      ...prev,
      dailyGenerationKwh: solarGenerationToday,
      currentBatteryStorageKwh: updatedBatteryKwh
    }));

    setWaterState(prev => ({
      ...prev,
      currentStoredGallons: updatedCistern
    }));

    if (isRainDay) {
      addLog(`🌧️ Precipitation Event! Harvested +${Math.round(rainCatchment)} gal of rainwater into homestead cisterns.`, 'bonus');
    }

    // 2. Simulate Livestock Paddocks & Biomass Grazing
    setPaddocks(prev => prev.map(p => {
      const breed = LIVESTOCK_BREEDS[p.breedId];
      if (!breed) return p;

      const newDaysInPaddock = p.daysInPaddock + 1;
      const isOvergrazing = newDaysInPaddock > breed.rotationalDays;
      const pastureDrain = isOvergrazing ? 15 : 8;
      const newBiomass = Math.max(5, p.pastureBiomass - pastureDrain);
      const newCycleProgress = p.cycleProgress + 1;

      // Manure NPK now handled by waste-economy module via advanceWasteEconomy()

      return {
        ...p,
        daysInPaddock: newDaysInPaddock,
        pastureBiomass: newBiomass,
        manureAccumulation: Math.min(100, p.manureAccumulation + 8),
        cycleProgress: newCycleProgress,
        health: isOvergrazing ? Math.max(50, p.health - 5) : Math.min(100, p.health + 2)
      };
    }));

    // 3. Simulate Zones Crop Growth & Telemetry
    setZones(prev => prev.map(z => {
      if (!z.plant || !z.plant.cropId) return z;
      const crop = EXPANDED_CROP_CATALOG[z.plant.cropId];
      if (!crop) return z;

      // Seasonal frost check
      let frostDamage = 0;
      if (seasonInfo.frostRisk > 0 && !crop.frostTolerant && Math.random() < seasonInfo.frostRisk) {
        frostDamage = 15;
      }

      // Water drain based on irrigation efficiency
      const waterDrain = (waterState.irrigationType === 'drip' ? 5 : 8) + (seasonInfo.id === 'summer' ? 4 : 0);
      const newWater = Math.max(0, z.plant.water - waterDrain);

      // Nitrogen / Nutrient depletion
      const nDrain = crop.nutrientDemand.n === 'heavy' ? 4 : crop.nutrientDemand.n === 'fixer' ? -6 : 2;
      const pDrain = crop.nutrientDemand.p === 'heavy' ? 3 : 1;
      const kDrain = crop.nutrientDemand.k === 'heavy' ? 3 : 1;

      const newN = Math.min(100, Math.max(10, z.soil.nitrogen - nDrain));
      const newP = Math.min(100, Math.max(10, z.soil.phosphorus - pDrain));
      const newK = Math.min(100, Math.max(10, z.soil.potassium - kDrain));

      // Growth step
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

    // 4. Advance Waste Economy (byproducts, composting, contamination, greywater)
    const wasteZoneRefs: ZoneRef[] = zones.map(z => ({
      id: z.id,
      type: z.type,
      col: z.col,
      row: z.row,
      w: z.w,
      h: z.h,
      sqft: z.sqft,
      buildingType: z.buildingType ?? undefined,
    }));
    const wastePaddockRefs = paddocks.map(p => ({
      breedId: p.breedId,
      population: p.population,
      zoneId: p.zoneId,
    }));
    const wasteResult = advanceWasteEconomy(
      wasteState,
      wasteZoneRefs,
      wastePaddockRefs,
      waterState.dailyConsumptionGallons,
      nextDay,
    );

    setWasteState(wasteResult.state);

    // Apply soil deltas from composting and direct manure
    if (wasteResult.soilDeltas.length > 0) {
      setZones(prev => prev.map(z => {
        const delta = wasteResult.soilDeltas.find(d => d.zoneId === z.id);
        if (!delta) return z;
        return {
          ...z,
          soil: {
            ...z.soil,
            nitrogen: Math.min(100, z.soil.nitrogen + delta.nitrogenDelta),
            phosphorus: Math.min(100, z.soil.phosphorus + delta.phosphorusDelta),
            potassium: Math.min(100, z.soil.potassium + delta.potassiumDelta),
            organicMatter: Math.min(15, z.soil.organicMatter + delta.organicMatterDelta),
          },
        };
      }));
    }

    // Apply greywater water-drain reduction
    if (wasteResult.waterDelta.reduceConsumptionGallons > 0) {
      setWaterState(prev => ({
        ...prev,
        graywaterRecycledGallons: wasteResult.waterDelta.reduceConsumptionGallons,
        currentStoredGallons: Math.min(
          prev.maxCisternCapacityGallons,
          prev.currentStoredGallons + wasteResult.waterDelta.reduceConsumptionGallons,
        ),
      }));
    }

    // Forward waste economy logs to the activity log
    for (const log of wasteResult.logs) {
      addLog(log, log.startsWith('⚠') ? 'alert' : 'bonus');
    }

    addLog(`Advanced to Cycle Day ${nextDay} (${SEASON_METADATA[newSeason].name}). Systems updated.`, 'info');
  };

  // Phase 3 Livestock Handlers
  const handleAdoptBreed = (targetZone: number, breedId: string) => {
    const breed = LIVESTOCK_BREEDS[breedId];
    if (!breed || credits < breed.cost) return;

    setCredits(prev => prev - breed.cost);
    const newPaddock: PaddockState = {
      id: `pad-${Date.now()}`,
      zoneId: targetZone,
      breedId: breed.id,
      population: breed.species === 'poultry' ? 18 : breed.species === 'apiculture' ? 35000 : 4,
      health: 100,
      pastureBiomass: 90,
      daysInPaddock: 0,
      manureAccumulation: 10,
      cycleProgress: 0,
      shelterStatus: 'solar_fence'
    };

    setPaddocks(prev => [...prev, newPaddock]);
    addLog(`Integrated ${breed.name} into Zone #${targetZone} (-${breed.cost} 🪙). Rotational grazing active.`, 'bonus');
  };

  const handleRotatePaddock = (paddockId: string, destZoneId: number) => {
    setPaddocks(prev => prev.map(p => {
      if (p.id === paddockId) {
        return {
          ...p,
          zoneId: destZoneId,
          daysInPaddock: 0,
          pastureBiomass: 95
        };
      }
      return p;
    }));
    addLog(`Mobile livestock tractor shifted to Zone #${destZoneId}. Previous pasture enters rest & root regeneration.`, 'bonus');
  };

  const handleHarvestLivestockYield = (paddockId: string) => {
    const paddock = paddocks.find(p => p.id === paddockId);
    if (!paddock) return;
    const breed = LIVESTOCK_BREEDS[paddock.breedId];
    if (!breed) return;

    const newItem: PantryItem = {
      id: `livestock-${Date.now()}`,
      cropId: breed.outputs.resourceId,
      name: breed.outputs.name,
      qty: breed.outputs.qtyPerCycle,
      unit: breed.outputs.unit,
      preservation: 'fresh',
      quality: 1.3,
      basePrice: breed.outputs.basePrice,
      harvestDay: cycleDay
    };

    setPantry(prev => [newItem, ...prev]);
    setPaddocks(prev => prev.map(p => {
      if (p.id === paddockId) {
        return { ...p, cycleProgress: 0 };
      }
      return p;
    }));

    addLog(`Harvested ${breed.outputs.qtyPerCycle} ${breed.outputs.unit} of ${breed.outputs.name}!`, 'bonus');
  };

  // Phase 3 Water & Solar Upgrade Handlers
  const handleUpgradeWater = (upgradeId: string) => {
    const up = WATER_INFRASTRUCTURE_UPGRADES.find(u => u.id === upgradeId);
    if (!up || credits < up.cost) return;

    setCredits(prev => prev - up.cost);
    setWaterState(prev => ({
      ...prev,
      maxCisternCapacityGallons: prev.maxCisternCapacityGallons + (up.storageBonusGallons || 0),
      irrigationType: up.id === 'gravity_drip_manifold' ? 'drip' : up.id === 'subsurface_clay_ollas' ? 'subsurface_ollas' : prev.irrigationType
    }));
    addLog(`Constructed ${up.name} (-${up.cost} 🪙). Homestead water security increased.`, 'bonus');
  };

  const handleUpgradeSolar = (upgradeId: string) => {
    const up = ENERGY_INFRASTRUCTURE_UPGRADES.find(u => u.id === upgradeId);
    if (!up || credits < up.cost) return;

    setCredits(prev => prev - up.cost);
    setSolarState(prev => ({
      ...prev,
      solarArrayWatts: prev.solarArrayWatts + (up.wattsBonus || 0),
      maxBatteryStorageKwh: prev.maxBatteryStorageKwh + (up.kwhCapacityBonus || 0),
      batteryBankKwh: prev.batteryBankKwh + (up.kwhCapacityBonus || 0)
    }));
    addLog(`Installed ${up.name} (-${up.cost} 🪙). Off-grid microgrid capacity boosted.`, 'bonus');
  };

  const handleToggleGenerator = () => {
    setSolarState(prev => ({
      ...prev,
      backupBiomassGenActive: !prev.backupBiomassGenActive
    }));
    addLog(solarState.backupBiomassGenActive ? 'Woodgas generator set to standby.' : '⚡ Woodgas Biomass Generator fired up! +12 kWh continuous generation.', 'bonus');
  };

  // Agronomic action handlers
  const handleHydrateZone = (zoneId: number) => {
    const targetZone = zonesRef.current.find(z => z.id === zoneId);
    if (!targetZone || !targetZone.plant) return;

    // Check water synergy
    const synergies = getZoneSynergies(targetZone);
    const hasWaterSynergy = synergies.some(s => s.title.includes('Hydraulic Gravity Swale'));
    const waterGain = hasWaterSynergy ? 55 : 40;

    setZones(prev => prev.map(z => {
      if (z.id === zoneId && z.plant) {
        return {
          ...z,
          plant: { ...z.plant, water: Math.min(100, z.plant.water + waterGain), health: Math.min(100, z.plant.health + 8) }
        };
      }
      return z;
    }));

    const logText = hasWaterSynergy
      ? `Irrigated Zone #${zoneId} (+${waterGain}% moisture). Gravity Swale synergy amplified retention.`
      : `Irrigated Zone #${zoneId}. Root hydration replenished to optimal capacity.`;
    addLog(logText, 'info');
    triggerZoneEffect(zoneId, `+${waterGain}% Water`, '💧', '#64b5f6');
  };

  const handleTendZone = (zoneId: number) => {
    const targetZone = zonesRef.current.find(z => z.id === zoneId);
    if (!targetZone || !targetZone.plant) {
      addLog(`Zone #${zoneId} contains homestead infrastructure. No crops to cultivate.`, 'info');
      triggerZoneEffect(zoneId, 'No crop to tend', '🏡', '#b8ab8e');
      return;
    }

    const synergies = getZoneSynergies(targetZone);
    const hasShedSynergy = synergies.some(s => s.title.includes('Tool Depot'));
    const hasCompostSynergy = synergies.some(s => s.title.includes('Microbial Soil Inoculation'));
    const hasGrazingSynergy = synergies.some(s => s.title.includes('Active Herd'));

    const healthGain = hasShedSynergy ? 18 : 12;
    const omBonus = hasCompostSynergy ? 0.4 : 0.1;

    setZones(prev => prev.map(z => {
      if (z.id === zoneId && z.plant) {
        return {
          ...z,
          soil: {
            ...z.soil,
            organicMatter: Math.min(15, z.soil.organicMatter + omBonus),
            nitrogen: Math.min(100, z.soil.nitrogen + (hasCompostSynergy ? 2 : 0))
          },
          plant: {
            ...z.plant,
            pests: 0,
            health: Math.min(100, z.plant.health + healthGain)
          }
        };
      }
      return z;
    }));

    let synergyBonusNotes = [];
    if (hasShedSynergy) synergyBonusNotes.push('Tool Depot (+50% vigor)');
    if (hasCompostSynergy) synergyBonusNotes.push('Microbial Inoculation (+OM)');
    if (hasGrazingSynergy) synergyBonusNotes.push('Silvopasture Weed Control');

    const bonusNote = synergyBonusNotes.length > 0 ? ` [Synergies: ${synergyBonusNotes.join(', ')}]` : '';
    addLog(`Cultivated and weeded Zone #${zoneId}. Pest pressure reduced to 0%, health +${healthGain}%${bonusNote}.`, 'bonus');
    triggerZoneEffect(zoneId, `Weeded & Cultivated (+${healthGain} Health)`, '🌿', '#81c784');
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

    // Check contamination penalty (120-day raw manure food safety rule)
    const contamPenalty = getContaminationPenalty(zoneId, cycleDay, wasteState.contaminations);
    const qualityMult = contamPenalty ? contamPenalty.qualityMultiplier : 1.0;
    const priceMult = contamPenalty ? contamPenalty.priceMultiplier : 1.0;

    const newItem: PantryItem = {
      id: `p-${Date.now()}`,
      cropId: crop.id,
      name: contamPenalty ? `${crop.harvest.displayName} (Contaminated)` : crop.harvest.displayName,
      qty: totalHarvestedQty,
      unit: crop.harvest.unit,
      preservation: 'fresh',
      quality: 1.2 * qualityMult,
      basePrice: Math.round(crop.harvest.basePrice * priceMult),
      harvestDay: cycleDay
    };

    setPantry(prev => [newItem, ...prev]);

    // Produce crop residue as brown compost input
    const residueStack = produceResidue(crop.id, totalHarvestedQty, zoneId, cycleDay);
    if (residueStack) {
      setWasteState(prev => ({
        ...prev,
        byproducts: [...prev.byproducts, residueStack],
        ledger: {
          ...prev.ledger,
          totalProducedLbs: prev.ledger.totalProducedLbs + residueStack.massLbs,
        },
      }));
    }

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

    if (contamPenalty) {
      addLog(`⚠️ Harvested ${totalHarvestedQty} ${crop.harvest.unit} of ${crop.harvest.displayName} from Zone #${zoneId} — CONTAMINATED (${contamPenalty.daysUntilSafe} days early). Quality & price reduced.`, 'alert');
    } else {
      addLog(`🌾 Harvested ${totalHarvestedQty} ${crop.harvest.unit} of ${crop.harvest.displayName} from Zone #${zoneId}! Placed in root pantry.`, 'bonus');
    }
    if (residueStack) {
      addLog(`♻️ ${Math.round(residueStack.massLbs)} lb of crop residue collected from Zone #${zoneId}.`, 'info');
    }
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

  // Active Paddock on selected zone
  const activePaddockOnSelected = paddocks.find(p => p.zoneId === selectedZone.id);
  const paddockBreed = activePaddockOnSelected ? LIVESTOCK_BREEDS[activePaddockOnSelected.breedId] : null;

  return (
    <div className="w-full space-y-4 font-sans text-[#f4ecd8]">
      
      {/* Top Phase 3 Master Homestead Toolbar */}
      <div className="bg-[#1f1b15] border border-[#332c22] p-3 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Cycle, Season & Treasury */}
        <div className="flex items-center gap-2.5 flex-wrap">
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

          {/* Quick Microgrid & Hydrology Telemetry Badge */}
          <div className="hidden md:flex items-center gap-3 bg-[#171410] px-3 py-1.5 rounded-lg border border-[#332c22] text-xs font-mono">
            <div>
              <div className="text-[9.5px] text-[#8a7f68] uppercase">💧 Water</div>
              <div className="text-[#64b5f6] font-bold">{Math.round(waterState.currentStoredGallons)} gal</div>
            </div>
            <div className="border-l border-[#332c22] pl-3">
              <div className="text-[9.5px] text-[#8a7f68] uppercase">⚡ Battery</div>
              <div className="text-[#e9c46a] font-bold">{solarState.currentBatteryStorageKwh.toFixed(1)} kWh</div>
            </div>
            <div className="border-l border-[#332c22] pl-3">
              <div className="text-[9.5px] text-[#8a7f68] uppercase">♻️ Loop</div>
              <div className={`font-bold ${wasteState.ledger.closedLoopPercent >= 70 ? 'text-[#81c784]' : wasteState.ledger.closedLoopPercent >= 40 ? 'text-[#e9c46a]' : 'text-[#ef5350]'}`}>
                {wasteState.ledger.closedLoopPercent.toFixed(0)}%
              </div>
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
          <span className="text-xs font-mono text-[#8a7f68]">Scale:</span>
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
        </div>

        {/* Right: Modals & Next Day Advance */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsGrazingModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#ffb74d] border border-[#ffb74d]/40 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Rotational Grazing & Animal Tractors"
          >
            <span>🐑 Grazing ({paddocks.length})</span>
          </button>

          <button
            onClick={() => setIsEngineeringModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#64b5f6] border border-[#1976d2]/40 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Off-Grid Solar & Hydrology Engineering"
          >
            <span>⚡ Utilities & Solar</span>
          </button>

          <button
            onClick={() => setIsCompanionModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#e9c46a] border border-[#8a6f1c]/40 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open Scientific Companion Planting Matrix"
          >
            <span>🌿 Companion</span>
          </button>

          <button
            onClick={() => setIsRotationModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#81c784] border border-[#2e4726] flex items-center gap-1.5 transition-all cursor-pointer"
            title="Open 4-Year Crop Rotation Planner"
          >
            <span>🔄 Rotation</span>
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#262016] hover:bg-[#3d3323] text-[#b8ab8e] border border-[#332c22] flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export or Print Homestead Agronomic Audit"
          >
            <span>📋 Audit</span>
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
            
            {/* Header & Tool Mode Palette */}
            <div className="flex flex-wrap justify-between items-center mb-2.5 px-1 gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#8a7f68] font-bold">Active Tool:</span>
                <div className="flex gap-1 bg-[#171410] p-1 rounded-lg border border-[#332c22]">
                  <button
                    onClick={() => setToolMode('select')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      toolMode === 'select'
                        ? 'bg-[#c9a227] text-[#171410] shadow'
                        : 'text-[#b8ab8e] hover:text-white hover:bg-[#262016]'
                    }`}
                    title="Select and drag zones to reorganize layout"
                  >
                    <span>🖐️ Move / Select</span>
                  </button>

                  <button
                    onClick={() => setToolMode('tend')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      toolMode === 'tend'
                        ? 'bg-[#388e3c] text-white shadow'
                        : 'text-[#81c784] hover:text-white hover:bg-[#262016]'
                    }`}
                    title="Click any zone on the grid to weed & cultivate with synergy boost"
                  >
                    <span>🌿 Weed & Tend Tool</span>
                  </button>

                  <button
                    onClick={() => setToolMode('water')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      toolMode === 'water'
                        ? 'bg-[#1976d2] text-white shadow'
                        : 'text-[#64b5f6] hover:text-white hover:bg-[#262016]'
                    }`}
                    title="Click any zone on the grid to irrigate"
                  >
                    <span>💧 Water Tool</span>
                  </button>

                  <button
                    onClick={() => setToolMode('harvest')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      toolMode === 'harvest'
                        ? 'bg-[#f57c00] text-white shadow'
                        : 'text-[#ffb74d] hover:text-white hover:bg-[#262016]'
                    }`}
                    title="Click ready crops to harvest directly from the grid"
                  >
                    <span>🌾 Harvest Tool</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[#b8ab8e] font-mono">
                {toolMode === 'select' && <span>🖐️ Drag zones to move · Click to inspect</span>}
                {toolMode === 'tend' && <span className="text-[#81c784]">🌿 Click any zone to weed & tend</span>}
                {toolMode === 'water' && <span className="text-[#64b5f6]">💧 Click any zone to irrigate</span>}
                {toolMode === 'harvest' && <span className="text-[#ffb74d]">🌾 Click ripe zones to harvest</span>}
              </div>
            </div>

            {/* Grid Container */}
            <div
              ref={gridContainerRef}
              style={{ backgroundColor: seasonInfo.themeBg }}
              className={`w-full aspect-[4/3] border-2 border-[#3d3323] rounded-lg relative overflow-hidden select-none shadow-inner ${
                toolMode === 'select' ? 'cursor-default' : 'cursor-crosshair'
              }`}
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

                // Check if this zone has an animal paddock
                const zonePaddock = paddocks.find(p => p.zoneId === z.id);
                const zoneBreed = zonePaddock ? LIVESTOCK_BREEDS[zonePaddock.breedId] : null;

                const leftPct = ((z.col - 1) / COLS) * 100;
                const topPct = ((z.row - 1) / ROWS) * 100;
                const widthPct = (z.w / COLS) * 100;
                const heightPct = (z.h / ROWS) * 100;

                const hasActiveEffect = zoneEffect?.zoneId === z.id;

                return (
                  <div
                    key={z.id}
                    onMouseDown={(e) => handleZoneMouseDown(e, z)}
                    onMouseEnter={() => handleZoneMouseEnter(z)}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                      backgroundColor: z.color
                    }}
                    className={`absolute rounded transition-shadow flex flex-col justify-between p-1.5 border-2 ${
                      toolMode === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:brightness-110'
                    } ${
                      isSelected
                        ? 'border-[#f4ecd8] shadow-[0_0_15px_rgba(201,162,39,0.5)] z-20 ring-2 ring-[#c9a227]'
                        : 'border-black/40 hover:border-white/50 z-10'
                    } ${isDragging ? 'opacity-30' : 'opacity-95'}`}
                  >
                    {/* Floating Action Badge Feedback */}
                    {hasActiveEffect && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-white shadow-xl z-40 animate-bounce flex items-center gap-1 whitespace-nowrap border border-white/40"
                        style={{ backgroundColor: zoneEffect.color }}
                      >
                        <span>{zoneEffect.icon}</span>
                        <span>{zoneEffect.text}</span>
                      </div>
                    )}

                    {/* Zone Badge Header */}
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
                        {crop && (
                          <span className="text-xs">{stage?.icon || '🌱'}</span>
                        )}
                        {z.type === 'water' && <span className="text-xs">💧</span>}
                        {z.type === 'compost' && <span className="text-xs">🍂</span>}
                        {z.type === 'livestock' && !zoneBreed && <span className="text-xs">🐑</span>}
                        {z.type === 'building' && <span className="text-xs">🏡</span>}
                      </div>
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
                            className="bg-[#64b5f6] h-full transition-all duration-300"
                            style={{ width: `${z.plant.water}%` }}
                          />
                        </div>
                        <div className="w-full bg-black/50 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-[#81c784] h-full transition-all duration-300"
                            style={{ width: `${z.plant.health}%` }}
                          />
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
                    left: `${((dragPreviewPos.col - 1) / COLS) * 100}%`,
                    top: `${((dragPreviewPos.row - 1) / ROWS) * 100}%`,
                    width: `${((zones.find(z => z.id === draggingZoneId)?.w || 1) / COLS) * 100}%`,
                    height: `${((zones.find(z => z.id === draggingZoneId)?.h || 1) / ROWS) * 100}%`
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

            {/* Grid Footnote */}
            <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-mono text-[#8a7f68]">
              <span>Snap-to-grid collision detection active</span>
              <span className="text-[#81c784]">Click or drag any zone · Use Weed & Tend tool directly on grid</span>
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

            {/* Phase 3 Animal Paddock Info if Present */}
            {activePaddockOnSelected && paddockBreed && (
              <div className="bg-[#261f14] border border-[#8a6f1c] p-2.5 rounded-lg text-xs font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#f4ecd8] font-bold">
                    <span>{paddockBreed.icon}</span>
                    <span>{paddockBreed.name}</span>
                  </div>
                  <span className="text-[10px] text-[#81c784] bg-[#2e7d32]/20 px-1.5 py-0.5 rounded">
                    Day {activePaddockOnSelected.daysInPaddock}/{paddockBreed.rotationalDays}
                  </span>
                </div>
                <div className="text-[10.5px] text-[#b8ab8e]">
                  Pasture Forage: <b>{Math.round(activePaddockOnSelected.pastureBiomass)}%</b> · Yield in <b>{Math.max(0, paddockBreed.outputs.cycleDays - activePaddockOnSelected.cycleProgress)} days</b>
                </div>
              </div>
            )}

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
                  <span>🔍 Zoom Micro-Grid Plant Matrix</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-[#171410] border border-dashed border-[#332c22] rounded-lg text-center text-xs text-[#8a7f68]">
                <span>Building / Utility Zone. Powers and stores resources for adjacent agroecological guilds.</span>
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

      {/* Bottom Tabs: Soil Pedology / Root Cellar & Market / Rotational Grazing / Utilities / Homestead Log */}
      <div className="space-y-3">
        <div className="flex gap-2 border-b border-[#332c22] pb-2 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveBottomTab('details')}
            className={`px-3 py-2 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              activeBottomTab === 'details'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            📊 Zone #{selectedZone.id} Overview
          </button>

          <button
            onClick={() => setActiveBottomTab('soil')}
            className={`px-3 py-2 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              activeBottomTab === 'soil'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            🧪 Soil Chemistry & Pedology
          </button>

          <button
            onClick={() => setActiveBottomTab('grazing')}
            className={`px-3 py-2 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              activeBottomTab === 'grazing'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            🐑 Rotational Grazing ({paddocks.length} herds)
          </button>

          <button
            onClick={() => setActiveBottomTab('energy')}
            className={`px-3 py-2 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              activeBottomTab === 'energy'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            ⚡ Water & Solar Microgrid
          </button>

          <button
            onClick={() => setActiveBottomTab('cellar')}
            className={`px-3 py-2 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              activeBottomTab === 'cellar'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            🛖 Root Cellar & Seasonal Market ({pantry.length} items)
          </button>

          <button
            onClick={() => setActiveBottomTab('log')}
            className={`px-3 py-2 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
              activeBottomTab === 'log'
                ? 'bg-[#c9a227] text-[#171410]'
                : 'bg-[#1f1b15] text-[#b8ab8e] hover:text-white border border-[#332c22]'
            }`}
          >
            📜 Activity Log
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

        {activeBottomTab === 'grazing' && (
          <div className="bg-[#171410] border border-[#332c22] p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#332c22] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🐑</span>
                <div>
                  <h3 className="text-sm font-bold font-mono text-[#f4ecd8]">Active Livestock Herds & Silvopasture</h3>
                  <span className="text-[11px] text-[#8a7f68]">Rotational animal tractors cycle fertility into soil beds</span>
                </div>
              </div>
              <button
                onClick={() => setIsGrazingModalOpen(true)}
                className="px-3 py-1 rounded bg-[#c9a227] text-[#171410] font-mono font-bold text-xs cursor-pointer"
              >
                + Manage Herds & Paddocks
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {paddocks.map(p => {
                const breed = LIVESTOCK_BREEDS[p.breedId];
                const zone = zones.find(z => z.id === p.zoneId);
                return (
                  <div key={p.id} className="bg-[#1e1913] border border-[#332c22] p-3 rounded-lg flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#f4ecd8]">
                          <span>{breed?.icon}</span>
                          <span>{breed?.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#81c784]">Zone #{p.zoneId}</span>
                      </div>
                      <div className="text-[10px] text-[#8a7f68] font-mono">Location: {zone?.name}</div>
                      <div className="text-[10.5px] text-[#b8ab8e] mt-1">
                        Forage: <b>{Math.round(p.pastureBiomass)}%</b> · Days Grazed: <b>{p.daysInPaddock}/{breed?.rotationalDays}</b>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#332c22] flex justify-between items-center text-[10px] font-mono">
                      <span className="text-[#e9c46a]">Output: {breed?.outputs.name}</span>
                      <button
                        onClick={() => setIsGrazingModalOpen(true)}
                        className="text-[#64b5f6] hover:underline cursor-pointer"
                      >
                        Shift Paddock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeBottomTab === 'energy' && (
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
                onClick={() => setIsEngineeringModalOpen(true)}
                className="px-3 py-1 rounded bg-[#c9a227] text-[#171410] font-mono font-bold text-xs cursor-pointer"
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
      <RotationalGrazingModal
        isOpen={isGrazingModalOpen}
        onClose={() => setIsGrazingModalOpen(false)}
        paddocks={paddocks}
        zones={zones}
        credits={credits}
        onAdoptBreed={handleAdoptBreed}
        onRotatePaddock={handleRotatePaddock}
        onHarvestLivestockYield={handleHarvestLivestockYield}
      />

      <HomesteadEngineeringModal
        isOpen={isEngineeringModalOpen}
        onClose={() => setIsEngineeringModalOpen(false)}
        water={waterState}
        solar={solarState}
        credits={credits}
        currentSeason={currentSeason}
        onUpgradeWater={handleUpgradeWater}
        onUpgradeSolar={handleUpgradeSolar}
        onToggleGenerator={handleToggleGenerator}
      />

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
