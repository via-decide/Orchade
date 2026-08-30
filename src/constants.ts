import { PlantStage, Weather, WeatherType } from './types';
export {
  CROP_DEFINITIONS,
  GENERIC_PLANT_STAGES,
  getCropDefinition,
  getPlantStages,
  getTotalCycleDays,
  resolveStageIndex,
  getCurrentStage,
  createNewPlant,
  applyHarvest
} from '../gameplay/farming/api';
import { GENERIC_PLANT_STAGES } from '../gameplay/farming/api';

export const WEATHER_TYPES: Record<WeatherType, Weather> = {
  clear: { type: 'clear', name: 'Clear Skies', description: 'Optimal growth conditions.', intensity: 1 },
  rain: { type: 'rain', name: 'Gentle Rain', description: 'Hydration levels increasing.', intensity: 1.5 },
  storm: { type: 'storm', name: 'Severe Storm', description: 'High hydration, but increased stress.', intensity: 2 },
  heatwave: { type: 'heatwave', name: 'Intense Heatwave', description: 'Rapid nutrient drain and high stress.', intensity: 2.5 },
  fog: { type: 'fog', name: 'Dense Fog', description: 'Reduced water loss, slow research.', intensity: 0.5 },
};

export const getRandomWeather = (): Weather => {
  const types = Object.keys(WEATHER_TYPES) as WeatherType[];
  const type = types[Math.floor(Math.random() * types.length)];
  return WEATHER_TYPES[type];
};

/**
 * Hardcoded generic 5-stage plant stage definitions preserved as baseline fallback.
 */
export const PLANT_STAGES: PlantStage[] = GENERIC_PLANT_STAGES.map(s => ({
  threshold: s.threshold,
  name: s.name,
  color: s.color,
  maxWater: s.maxWater,
  maxNutrients: s.maxNutrients
}));

export const INITIAL_UPGRADES = {
  waterEfficiency: 1.0,
  nutrientRetention: 1.0,
  stressResistance: 0,
  pestDefense: 0,
};

export const SHOP_ITEMS = [
  { id: 'compost', name: 'Compost', cost: 15, nut: 40, stress: 0, type: 'fertilizer' },
  { id: 'synthetic', name: 'Synthetic', cost: 25, nut: 80, stress: 15, type: 'fertilizer' },
  { id: 'organic', name: 'Organic Premium', cost: 50, nut: 100, stress: -20, type: 'fertilizer' },
  { id: 'neem', name: 'Neem Oil', cost: 15, kills: 1, stress: 0, type: 'pesticide' },
  { id: 'chemical', name: 'Chemical Spray', cost: 25, kills: 5, stress: 15, type: 'pesticide' },
];
