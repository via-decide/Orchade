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
import { SoilState } from './SoilNutrientPanel';
import { PantryItem } from './HarvestCellarPanel';
import { HomesteadReportModal } from './HomesteadReportModal';
import { RotationalGrazingModal } from './RotationalGrazingModal';
import { HomesteadEngineeringModal } from './HomesteadEngineeringModal';
import { PlannerHeader } from './PlannerHeader';
import { PersistentPlotBoard } from './PersistentPlotBoard';
import { PlannerTabBar, PlannerPrimaryTab } from './PlannerTabBar';
import { PlannerPlanPanel } from './PlannerPlanPanel';
import { PlannerOperatePanel, OperateSubView } from './PlannerOperatePanel';
import { PlannerSystemPanel } from './PlannerSystemPanel';
import { PlannerEvidencePanel } from './PlannerEvidencePanel';
import { hashSeed, DeterministicRandom } from '../engine/random/rng';
import {
  advanceHomesteadDay,
  DEFAULT_PLOT_PLANNER_SCENARIO,
} from '../simulation/homestead';
import {
  credit as grantCredit,
  debit as spendCredit,
  createResearchCreditsState,
  getStarterUnlocks,
  type ResearchCreditsState,
} from '../../gameplay/research-credits/api';
import {
  createNewGameState,
  deriveNextPlayerObjective,
  deriveAvailablePlayerActions,
  advanceNewGameDay,
  processSimulationConsequences,
  OBJECTIVE_GRAPH,
} from '../../gameplay/director/api';
import { ObjectiveBanner } from './ObjectiveBanner';

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
  const [totalAcreage, setTotalAcreage] = useState<number>(0.75);
  const [currentSeason, setCurrentSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [cycleDay, setCycleDay] = useState<number>(DEFAULT_PLOT_PLANNER_SCENARIO.startDay);
  const [researchState, setResearchState] = useState<ResearchCreditsState>(() => {
    const initial = createResearchCreditsState(getStarterUnlocks());
    return grantCredit(initial, 420, { gameId: 'orchade', action: 'initial_grant', tick: 0 });
  });
  const credits = researchState.balance;

  // NOTE: PlotPlanner runs its own long-standing ZoneData simulation (zones, credits,
  // researchCredits) that predates the director module and is not itself expressed as
  // director PlacementIntent/HomesteadPlanningState. Full objective wiring (e.g.
  // place_first_food_producer, choose_starter_plan) would require translating real
  // zone/crop assignments into director placements, which is a larger design decision
  // deferred beyond this fix. What IS wired here: day-advancement is a natural 1:1
  // concept between both systems, so handleAdvanceDay below also drives the director's
  // own day counter and consequence pipeline, so day-gated objectives (advance_first_day,
  // establish_water_source, respond_to_consequence) progress in step with real play
  // instead of being permanently stuck at day 0.
  const [newGameState, setNewGameState] = useState(() => createNewGameState({ seed: 'orchade-session', runId: 'session-run' }));
  const currentObjective = deriveNextPlayerObjective(newGameState, currentSeason);
  const currentActions = deriveAvailablePlayerActions(newGameState, currentSeason);

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

  // Modals & Panels
  const [isCompanionModalOpen, setIsCompanionModalOpen] = useState<boolean>(false);
  const [isRotationModalOpen, setIsRotationModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isGrazingModalOpen, setIsGrazingModalOpen] = useState<boolean>(false);
  const [isEngineeringModalOpen, setIsEngineeringModalOpen] = useState<boolean>(false);

  const [activePrimaryTab, setActivePrimaryTab] = useState<PlannerPrimaryTab>('operate');
  const [operateSubView, setOperateSubView] = useState<OperateSubView>('details');
  const [zoomMicroGrid, setZoomMicroGrid] = useState<boolean>(false);

  // Overlays
  const [showSynergyLines, setShowSynergyLines] = useState<boolean>(true);
  const [showTopography, setShowTopography] = useState<boolean>(false);
  const [showWaterRadius, setShowWaterRadius] = useState<boolean>(true);

  // Notification / Activity Log
  const [activityLogs, setActivityLogs] = useState<{ id: string; time: string; message: string; type: 'info' | 'bonus' | 'alert' }[]>([
    // Was a hardcoded "3.5 Acres (152,460 sq ft)" -- contradicted the real
    // totalAcreage state below. Derived from that state instead so this
    // can't silently go stale again if the starting acreage ever changes.
    { id: '1', time: 'Day 1 · Spring', message: `Homestead Site Plan initialized. ${totalAcreage} Acres calculated (${Math.round(totalAcreage * ACRE_SQFT).toLocaleString()} sq ft).`, type: 'info' },
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
    const tileSqft = (0.75 * ACRE_SQFT) / (COLS * ROWS);
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
  const simulationRngStateRef = useRef<number>(hashSeed(DEFAULT_PLOT_PLANNER_SCENARIO.seed));

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

  const handleZoneTouchStart = useCallback((e: React.TouchEvent, zone: ZoneData) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const syntheticMouseEvent = { stopPropagation: () => {}, clientX: touch.clientX, clientY: touch.clientY } as unknown as React.MouseEvent;
    handleZoneMouseDown(syntheticMouseEvent, zone);
  }, [toolMode, researchState]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (draggingZoneIdRef.current === null) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  useEffect(() => {
    const onGlobalMouseUp = () => {
      isMouseDownRef.current = false;
      lastTendedZoneIdRef.current = null;
    };
    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('touchend', onGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('touchend', onGlobalMouseUp);
    };
  }, []);

  useEffect(() => {
    if (draggingZoneId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [draggingZoneId, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

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
    const result = advanceHomesteadDay<ZoneData>({
      scenario: DEFAULT_PLOT_PLANNER_SCENARIO,
      state: {
        day: cycleDay,
        season: currentSeason,
        water: waterState,
        solar: solarState,
        zones,
        paddocks,
        rngState: simulationRngStateRef.current,
      },
    });

    simulationRngStateRef.current = result.state.rngState;
    setCycleDay(result.state.day);
    setCurrentSeason(result.state.season);
    setWaterState(result.state.water);
    setSolarState(result.state.solar);
    setPaddocks(result.state.paddocks);
    setZones(result.state.zones);

    const dayAdvance = advanceNewGameDay(newGameState);
    const { state: nextDirectorState } = processSimulationConsequences(
      dayAdvance.state,
      dayAdvance.simulationEvents,
      result.state.season,
    );
    setNewGameState(nextDirectorState);

    if (result.events.some(event => event.type === 'SEASON_CHANGED')) {
      addLog(`🍂 Season shifted to ${SEASON_METADATA[result.state.season].name.toUpperCase()}! Temperature and solar radiation updated.`, 'bonus');
    }
    const rainfallEvent = result.events.find(event => event.type === 'RAINFALL_OCCURRED');
    if (rainfallEvent) {
      const { harvestedGallons } = rainfallEvent.payload as { harvestedGallons: number };
      addLog(`🌧️ Precipitation Event! Harvested +${Math.round(harvestedGallons)} gal of rainwater into homestead cisterns.`, 'bonus');
    }
    addLog(`Advanced to Cycle Day ${result.state.day} (${SEASON_METADATA[result.state.season].name}). Systems updated.`, 'info');
  };

  // Phase 3 Livestock Handlers
  const handleAdoptBreed = (targetZone: number, breedId: string) => {
    const breed = LIVESTOCK_BREEDS[breedId];
    if (!breed || researchState.balance < breed.cost) return;

    if (breed.cost > 0) {
      const result = spendCredit(researchState, breed.cost, { gameId: 'orchade', action: 'adopt_breed', contentId: breedId, tick: cycleDay });
      if (!result.ok) return;
      setResearchState(result.state);
    }
    const newPaddock: PaddockState = {
      // Deterministic: (day, zone, breed) instead of Date.now() -- this is a
      // simulation-affecting entity, not just a UI event.
      id: `pad-${cycleDay}-${targetZone}-${breed.id}`,
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
      // Deterministic: (day, paddock) instead of Date.now().
      id: `livestock-${cycleDay}-${paddockId}`,
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

    const livestockCredits = Math.max(1, Math.ceil(breed.outputs.basePrice / 8));
    setResearchState(prev => grantCredit(prev, livestockCredits, { gameId: 'orchade', action: 'harvest_livestock', tick: cycleDay }));
    addLog(`Harvested ${breed.outputs.qtyPerCycle} ${breed.outputs.unit} of ${breed.outputs.name}! +${livestockCredits} research credits.`, 'bonus');
  };

  // Phase 3 Water & Solar Upgrade Handlers
  const handleUpgradeWater = (upgradeId: string) => {
    const up = WATER_INFRASTRUCTURE_UPGRADES.find(u => u.id === upgradeId);
    if (!up || researchState.balance < up.cost) return;

    if (up.cost > 0) {
      const result = spendCredit(researchState, up.cost, { gameId: 'orchade', action: 'upgrade_water', contentId: upgradeId, tick: cycleDay });
      if (!result.ok) return;
      setResearchState(result.state);
    }
    setWaterState(prev => ({
      ...prev,
      maxCisternCapacityGallons: prev.maxCisternCapacityGallons + (up.storageBonusGallons || 0),
      irrigationType: up.id === 'gravity_drip_manifold' ? 'drip' : up.id === 'subsurface_clay_ollas' ? 'subsurface_ollas' : prev.irrigationType
    }));
    addLog(`Constructed ${up.name} (-${up.cost} 🪙). Homestead water security increased.`, 'bonus');
  };

  const handleUpgradeSolar = (upgradeId: string) => {
    const up = ENERGY_INFRASTRUCTURE_UPGRADES.find(u => u.id === upgradeId);
    if (!up || researchState.balance < up.cost) return;

    if (up.cost > 0) {
      const result = spendCredit(researchState, up.cost, { gameId: 'orchade', action: 'upgrade_energy', contentId: upgradeId, tick: cycleDay });
      if (!result.ok) return;
      setResearchState(result.state);
    }
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
    if (!am || researchState.balance < am.cost) return;

    if (am.cost > 0) {
      const result = spendCredit(researchState, am.cost, { gameId: 'orchade', action: 'apply_amendment', contentId: amendmentId, tick: cycleDay });
      if (!result.ok) return;
      setResearchState(result.state);
    }
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

    if (crop.seasons && !crop.seasons.includes(currentSeason)) {
      addLog(`Cannot harvest ${crop.displayName} — out of season (${currentSeason}). Valid: ${crop.seasons.join(', ')}.`, 'alert');
      triggerZoneEffect(zoneId, 'Out of Season', '❄️', '#e57373');
      return;
    }

    // Deterministic: consumes and advances the same seeded RNG state
    // advanceHomesteadDay() reads/writes (simulationRngStateRef, line ~265).
    // Was Math.random() -- two identical runs (same scenario, same seed,
    // same action sequence) could yield different harvest quantities,
    // breaking the same-seed-same-result replay guarantee. Restoring a
    // DeterministicRandom from the current ref value and writing its
    // post-draw state back keeps this harvest in the same deterministic
    // sequence as the daily tick, not a separate untracked stream.
    const harvestRng = new DeterministicRandom(simulationRngStateRef.current);
    const baseYield = harvestRng.integer(crop.harvest.minYield, crop.harvest.maxYield);
    simulationRngStateRef.current = harvestRng.snapshot();

    const spacingSqft = crop.spacing.sqft;
    const plantUnits = Math.max(1, Math.round(targetZone.sqft / spacingSqft));
    const totalHarvestedQty = Math.round(baseYield * Math.min(10, Math.max(1, plantUnits / 50)));

    // Add to pantry
    const newItem: PantryItem = {
      // Deterministic: derived from the harvest's own inputs (day, zone,
      // post-draw RNG state) instead of Date.now(), which cannot replay
      // identically and must not participate in simulation-affecting identity.
      id: `p-${cycleDay}-${zoneId}-${simulationRngStateRef.current}`,
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

    const harvestCredits = Math.max(1, Math.ceil(crop.harvest.basePrice / 10));
    setResearchState(prev => grantCredit(prev, harvestCredits, { gameId: 'orchade', action: 'harvest_crop', tick: cycleDay }));
    addLog(`🌾 Harvested ${totalHarvestedQty} ${crop.harvest.unit} of ${crop.harvest.displayName} from Zone #${zoneId}! +${harvestCredits} research credits.`, 'bonus');
  };

  const handleLoadPreset = (preset: HomesteadPreset) => {
    setTotalAcreage(preset.acreage);
    const tileSqft = (preset.acreage * ACRE_SQFT) / (COLS * ROWS);
    const skippedCrops: string[] = [];

    const newZones: ZoneData[] = preset.zones.map((bz, index) => {
      let assignedCropId = bz.cropId || null;
      if (assignedCropId) {
        const cropDef = EXPANDED_CROP_CATALOG[assignedCropId];
        if (cropDef?.seasons && !cropDef.seasons.includes(currentSeason)) {
          skippedCrops.push(cropDef.displayName);
          assignedCropId = null;
        }
      }
      const isCrop = bz.type === 'crop' || (assignedCropId !== null);
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
          cropId: assignedCropId,
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
    if (skippedCrops.length > 0) {
      addLog(`Season gate: ${skippedCrops.join(', ')} skipped — not plantable in ${currentSeason}.`, 'alert');
    }
  };

  const handleSellPantryItem = (itemId: string, qty: number, pricePerUnit: number) => {
    const totalEarnings = Math.round(qty * pricePerUnit);
    if (totalEarnings > 0) {
      setResearchState(prev => grantCredit(prev, totalEarnings, { gameId: 'orchade', action: 'sell_produce', tick: cycleDay }));
    }

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
    <div className="orchade-shell gap-2 p-2 font-sans text-[#f4ecd8]">
      <PlannerHeader
        seasonInfo={seasonInfo}
        cycleDay={cycleDay}
        waterGallons={waterState.currentStoredGallons}
        batteryKwh={solarState.currentBatteryStorageKwh}
        credits={credits}
        totalAcreage={totalAcreage}
        selectedZoneLabel={`#${selectedZone.id} ${selectedZone.name}`}
        selectedZoneType={selectedZone.type}
        onAdvanceDay={handleAdvanceDay}
      />

      <ObjectiveBanner
        objective={currentObjective}
        phase={newGameState.phase}
        completedCount={newGameState.completedObjectiveIds.length}
        totalCount={OBJECTIVE_GRAPH.length}
        actions={currentActions}
      />

      <PersistentPlotBoard
        cols={COLS}
        rows={ROWS}
        zones={zones}
        paddocks={paddocks}
        selectedZoneId={selectedZoneId}
        draggingZoneId={draggingZoneId}
        dragPreviewPos={dragPreviewPos}
        dragHasCollision={dragHasCollision}
        zoneEffect={zoneEffect}
        toolMode={toolMode}
        setToolMode={setToolMode}
        showTopography={showTopography}
        themeBg={seasonInfo.themeBg}
        gridContainerRef={gridContainerRef}
        onZoneMouseDown={handleZoneMouseDown}
        onZoneMouseEnter={handleZoneMouseEnter}
        onZoneTouchStart={handleZoneTouchStart}
      />

      <PlannerTabBar active={activePrimaryTab} onChange={setActivePrimaryTab} />

      <div className="orchade-workspace">
        <div className="orchade-workspace-pane h-full" hidden={activePrimaryTab !== 'plan'}>
          <PlannerPlanPanel
            totalAcreage={totalAcreage}
            setTotalAcreage={setTotalAcreage}
            presets={HOMESTEAD_PRESETS}
            onLoadPreset={handleLoadPreset}
            showSynergyLines={showSynergyLines}
            setShowSynergyLines={setShowSynergyLines}
            showTopography={showTopography}
            setShowTopography={setShowTopography}
            onOpenCompanion={() => setIsCompanionModalOpen(true)}
            onOpenRotation={() => setIsRotationModalOpen(true)}
          />
        </div>

        <div className="orchade-workspace-pane h-full" hidden={activePrimaryTab !== 'operate'}>
          <PlannerOperatePanel
            activeSubView={operateSubView}
            setActiveSubView={setOperateSubView}
            selectedZone={selectedZone}
            selectedCrop={selectedCrop}
            selectedSynergies={selectedSynergies}
            activePaddockOnSelected={activePaddockOnSelected}
            paddockBreed={paddockBreed}
            onHydrateZone={handleHydrateZone}
            onTendZone={handleTendZone}
            onHarvestZone={handleHarvestZone}
            onZoomMicroGrid={() => setZoomMicroGrid(true)}
            credits={credits}
            onApplyAmendment={handleApplyAmendment}
            paddocks={paddocks}
            zones={zones}
            onOpenGrazingModal={() => setIsGrazingModalOpen(true)}
            pantry={pantry}
            currentSeason={currentSeason}
            onSellItem={handleSellPantryItem}
            onPreserveItem={handlePreservePantryItem}
          />
        </div>

        <div className="orchade-workspace-pane h-full" hidden={activePrimaryTab !== 'system'}>
          <PlannerSystemPanel
            totalAcreage={totalAcreage}
            waterState={waterState}
            solarState={solarState}
            onOpenEngineeringModal={() => setIsEngineeringModalOpen(true)}
          />
        </div>

        <div className="orchade-workspace-pane h-full" hidden={activePrimaryTab !== 'evidence'}>
          <PlannerEvidencePanel
            activityLogs={activityLogs}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        </div>
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
