import {
  evaluatePhysicalPrerequisites,
  type EligibilityResult,
  type PhysicalMeasurement,
  type PhysicalPrerequisite,
  type PhysicalPrerequisiteFacts,
} from '../../../gameplay/prerequisites/api';
import type { ProjectHomesteadState } from './projectState';

export function deriveProjectPrerequisiteFacts(state: ProjectHomesteadState): PhysicalPrerequisiteFacts {
  const entityIds = [
    ...state.land.acceptedPlacementIds,
    ...state.foodProducers.map(producer => producer.id),
    ...state.livestock.map(animal => animal.id),
  ];
  const resources: Record<string, PhysicalMeasurement> = {
    'water:stored': {
      amount: state.water.tankLevelL + state.water.pondLevelL,
      unit: 'L',
      stateRef: 'water.tankLevelL+water.pondLevelL',
    },
    'energy:battery': {
      amount: state.energy.batteryKwh,
      unit: 'kWh',
      stateRef: 'energy.batteryKwh',
    },
    'nutrient:mature-compost': {
      amount: state.nutrients.matureCompostUnits,
      unit: 'normalized-unit',
      stateRef: 'nutrients.matureCompostUnits',
    },
    'food:inventory': {
      amount: state.household.foodInventoryCalories,
      unit: 'kcal',
      stateRef: 'household.foodInventoryCalories',
    },
  };
  state.livestock.forEach(animal => {
    resources[`feed:${animal.id}`] = {
      amount: animal.feedInventoryKg,
      unit: 'kg',
      stateRef: `livestock.${animal.id}.feedInventoryKg`,
    };
  });

  return {
    season: state.climate.season,
    areaAvailableM2: state.land.remainingUsableAreaM2,
    capacities: {
      LAND: {
        amount: state.land.remainingUsableAreaM2,
        unit: 'm2',
        stateRef: 'land.remainingUsableAreaM2',
      },
      LABOUR: {
        amount: Math.max(0, state.household.labourAvailableTodayMinutes - state.household.labourRequiredTodayMinutes),
        unit: 'min/day',
        stateRef: 'household.labourAvailableTodayMinutes-household.labourRequiredTodayMinutes',
      },
    },
    resources,
    resourceCatalogComplete: false,
    entityIds: [...new Set(entityIds)].sort(),
    entityCatalogComplete: true,
    componentIds: [...state.land.acceptedPlacementIds].sort(),
    componentCatalogComplete: false,
    capital: {
      currency: 'INR',
      available: state.economy.cashBalance,
      stateRef: 'economy.cashBalance',
    },
  };
}

export function evaluateProjectPhysicalPrerequisites(
  state: ProjectHomesteadState,
  prerequisites: readonly PhysicalPrerequisite[],
): EligibilityResult {
  return evaluatePhysicalPrerequisites(prerequisites, deriveProjectPrerequisiteFacts(state));
}
