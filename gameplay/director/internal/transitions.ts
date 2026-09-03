import type { NewGameState, NewGameEvent } from '../public';
import type { HomesteadScenarioDefinition, FoodProducerDefinition, LandPlacementDefinition } from '../../../src/simulation/homestead/scenario';
import type { PlanningPlacement } from '../../../src/simulation/homestead/planningTransition';
import { UNLOCK_REGISTRY } from '../../research-credits/internal/unlocks';
import { advanceHomesteadDay } from '../../../src/simulation/homestead/advanceDay';
import type { HomesteadSimulationEvent } from '../../../src/simulation/homestead/events';

const CROP_PLACEMENT_DEFAULTS: Record<string, Partial<FoodProducerDefinition>> = {
  tomato: { type: 'vegetable-bed', cycleDays: 75, waterLitresPerM2Day: 4, nutrientUnitsPerM2Cycle: 6, labourMinutesPerDay: 5, harvestLabourMinutes: 30, expectedCaloriesPerHarvest: 3000, expectedKgPerHarvest: 15, residueUnitsPerHarvest: 3 },
  lettuce: { type: 'vegetable-bed', cycleDays: 45, waterLitresPerM2Day: 3, nutrientUnitsPerM2Cycle: 3, labourMinutesPerDay: 3, harvestLabourMinutes: 15, expectedCaloriesPerHarvest: 800, expectedKgPerHarvest: 5, residueUnitsPerHarvest: 1 },
  carrot: { type: 'vegetable-bed', cycleDays: 70, waterLitresPerM2Day: 3, nutrientUnitsPerM2Cycle: 4, labourMinutesPerDay: 3, harvestLabourMinutes: 20, expectedCaloriesPerHarvest: 2000, expectedKgPerHarvest: 10, residueUnitsPerHarvest: 2 },
  basil: { type: 'vegetable-bed', cycleDays: 50, waterLitresPerM2Day: 2, nutrientUnitsPerM2Cycle: 2, labourMinutesPerDay: 2, harvestLabourMinutes: 10, expectedCaloriesPerHarvest: 200, expectedKgPerHarvest: 1, residueUnitsPerHarvest: 0.5 },
  garlic: { type: 'vegetable-bed', cycleDays: 90, waterLitresPerM2Day: 2, nutrientUnitsPerM2Cycle: 3, labourMinutesPerDay: 2, harvestLabourMinutes: 20, expectedCaloriesPerHarvest: 1500, expectedKgPerHarvest: 5, residueUnitsPerHarvest: 1 },
};

export function placementToFoodProducer(
  placement: PlanningPlacement,
  day: number,
): FoodProducerDefinition | null {
  const content = UNLOCK_REGISTRY.find(u => u.contentId === placement.contentId);
  if (!content || content.category !== 'crop') return null;

  const defaults = CROP_PLACEMENT_DEFAULTS[placement.contentId] ?? {
    type: 'vegetable-bed' as const,
    cycleDays: 60,
    waterLitresPerM2Day: 3,
    nutrientUnitsPerM2Cycle: 4,
    labourMinutesPerDay: 3,
    harvestLabourMinutes: 20,
    expectedCaloriesPerHarvest: 1500,
    expectedKgPerHarvest: 8,
    residueUnitsPerHarvest: 2,
  };

  return {
    id: `fp-${placement.id}`,
    type: defaults.type ?? 'vegetable-bed',
    placementId: placement.id,
    cropId: placement.contentId,
    areaM2: placement.areaM2,
    plantingDay: day,
    cycleDays: defaults.cycleDays ?? 60,
    waterLitresPerM2Day: defaults.waterLitresPerM2Day ?? 3,
    nutrientUnitsPerM2Cycle: defaults.nutrientUnitsPerM2Cycle ?? 4,
    labourMinutesPerDay: defaults.labourMinutesPerDay ?? 3,
    harvestLabourMinutes: defaults.harvestLabourMinutes ?? 20,
    expectedCaloriesPerHarvest: defaults.expectedCaloriesPerHarvest ?? 1500,
    expectedKgPerHarvest: defaults.expectedKgPerHarvest ?? 8,
    residueUnitsPerHarvest: defaults.residueUnitsPerHarvest ?? 2,
  };
}

export function applyPlacementsToScenario(
  state: NewGameState,
): { state: NewGameState; events: NewGameEvent[] } {
  const unappliedPlacements = state.planning.placements.filter(
    p => !state.scenario.foodProducers.some(fp => fp.placementId === p.id),
  );

  if (unappliedPlacements.length === 0) {
    return { state: { ...state, simulationReady: true }, events: [] };
  }

  const newProducers: FoodProducerDefinition[] = [];
  const newLandPlacements: LandPlacementDefinition[] = [];
  const events: NewGameEvent[] = [];

  for (const placement of unappliedPlacements) {
    const producer = placementToFoodProducer(placement, state.day);
    if (producer) {
      newProducers.push(producer);
      newLandPlacements.push({
        id: placement.id,
        type: producer.type === 'vegetable-bed' ? 'vegetable-bed' : producer.type === 'staple-field' ? 'staple-field' : producer.type === 'orchard' ? 'orchard' : producer.type === 'greenhouse' ? 'greenhouse' : 'vegetable-bed',
        areaM2: placement.areaM2,
      });
      events.push({
        type: 'PLACEMENT_APPLIED_TO_SCENARIO',
        day: state.day,
        payload: { placementId: placement.id, contentId: placement.contentId, producerId: producer.id },
      });
    }
  }

  const updatedScenario: HomesteadScenarioDefinition = {
    ...state.scenario,
    land: {
      ...state.scenario.land,
      placements: [...state.scenario.land.placements, ...newLandPlacements],
    },
    foodProducers: [...state.scenario.foodProducers, ...newProducers],
  };

  const zones = unappliedPlacements.reduce((zs, placement) => {
    const content = UNLOCK_REGISTRY.find(u => u.contentId === placement.contentId);
    if (!content || content.category !== 'crop') return zs;
    const existingHasPlant = zs.some(z => z.plant.cropId === placement.contentId);
    if (existingHasPlant) return zs;
    const emptyZone = zs.find(z => !z.plant.cropId);
    if (!emptyZone) return zs;
    return zs.map(z => z.id === emptyZone.id
      ? { ...z, plant: { ...z.plant, cropId: placement.contentId, water: 60, health: 80, stageIndex: 0, rootStrength: 0, isHarvestable: false } }
      : z,
    );
  }, [...state.simulation.zones.map(z => ({ ...z, soil: { ...z.soil }, plant: { ...z.plant } }))]);

  return {
    state: {
      ...state,
      scenario: updatedScenario,
      simulation: { ...state.simulation, zones },
      simulationReady: true,
    },
    events,
  };
}

export function advanceNewGameDay(
  state: NewGameState,
): { state: NewGameState; events: NewGameEvent[]; simulationEvents: HomesteadSimulationEvent[] } {
  const result = advanceHomesteadDay({
    scenario: state.scenario,
    state: state.simulation,
  });

  return {
    state: {
      ...state,
      day: result.state.day,
      simulation: result.state,
    },
    events: [{
      type: 'OBJECTIVE_ADVANCED',
      day: result.state.day,
      payload: { simulationDay: result.state.day, season: result.state.season },
    }],
    simulationEvents: result.events,
  };
}
