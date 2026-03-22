import { PlantStage } from './types';

export const PLANT_STAGES: PlantStage[] = [
  { threshold: 0, name: 'Dormant Seed', color: '#5D4037', maxWater: 30, maxNutrients: 100 },
  { threshold: 25, name: 'Sprout', color: '#388E3C', maxWater: 50, maxNutrients: 100 },
  { threshold: 80, name: 'Sapling', color: '#43A047', maxWater: 80, maxNutrients: 120 },
  { threshold: 180, name: 'Young Tree', color: '#2E7D32', maxWater: 120, maxNutrients: 150 },
  { threshold: 400, name: 'Mature Tree', color: '#1B5E20', maxWater: 200, maxNutrients: 200 },
];

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
