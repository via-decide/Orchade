import { PlantStage, Tool, Weather, WeatherType } from './types';

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

export const INITIAL_TOOLS: Tool[] = [
  {
    id: 'watering-can',
    name: 'Advanced Watering Can',
    description: 'Increases hydration efficiency by 15% per level.',
    level: 0,
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.5,
    type: 'passive',
    bonusType: 'water',
    bonusValue: 0.15,
  },
  {
    id: 'soil-tester',
    name: 'Digital Soil Tester',
    description: 'Reduces nutrient drain by 10% per level.',
    level: 0,
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.6,
    type: 'passive',
    bonusType: 'nutrients',
    bonusValue: 0.1,
  },
  {
    id: 'pest-control',
    name: 'Automated Pest Control',
    description: 'Reduces pest infestation chance by 20% per level.',
    level: 0,
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.8,
    type: 'passive',
    bonusType: 'pests',
    bonusValue: 0.2,
  },
  {
    id: 'stress-monitor',
    name: 'Stress Monitor',
    description: 'Reduces stress build-up from research by 1 per level.',
    level: 0,
    maxLevel: 5,
    baseCost: 120,
    costMultiplier: 1.4,
    type: 'passive',
    bonusType: 'stress',
    bonusValue: 1,
  },
  {
    id: 'data-extractor',
    name: 'Data Extractor',
    description: 'Increases credit gain from research by 2 per level.',
    level: 0,
    maxLevel: 5,
    baseCost: 180,
    costMultiplier: 1.7,
    type: 'passive',
    bonusType: 'credits',
    bonusValue: 2,
  },
  {
    id: 'pest-repellent-pulse',
    name: 'Pest Repellent Pulse',
    description: 'Instantly clears all pests in the current orchard. 10 cycle cooldown.',
    level: 0,
    maxLevel: 1,
    baseCost: 500,
    costMultiplier: 1,
    type: 'active',
    bonusType: 'pests',
    bonusValue: 0,
    activeCooldown: 10,
    currentCooldown: 0,
  },
  {
    id: 'genetic-scanner',
    name: 'Genetic Scanner',
    description: 'Increases rarity chance for the next seeded plot. 5 cycle cooldown.',
    level: 0,
    maxLevel: 1,
    baseCost: 300,
    costMultiplier: 1,
    type: 'active',
    bonusType: 'credits',
    bonusValue: 0,
    activeCooldown: 5,
    currentCooldown: 0,
  },
  {
    id: 'pruning-shears',
    name: 'Nanotech Pruning Shears',
    description: 'Instantly reduces stress for all plants in the current orchard. 3 cycle cooldown.',
    level: 0,
    maxLevel: 1,
    baseCost: 400,
    costMultiplier: 1,
    type: 'active',
    bonusType: 'stress',
    bonusValue: 0,
    activeCooldown: 3,
    currentCooldown: 0,
  }
];

export const SHOP_ITEMS = [
  { id: 'compost', name: 'Compost', cost: 15, nut: 40, stress: 0, type: 'fertilizer' },
  { id: 'synthetic', name: 'Synthetic', cost: 25, nut: 80, stress: 15, type: 'fertilizer' },
  { id: 'organic', name: 'Organic Premium', cost: 50, nut: 100, stress: -20, type: 'fertilizer' },
  { id: 'neem', name: 'Neem Oil', cost: 15, kills: 1, stress: 0, type: 'pesticide' },
  { id: 'chemical', name: 'Chemical Spray', cost: 25, kills: 5, stress: 15, type: 'pesticide' },
];

export const WEATHER_TYPES: Record<WeatherType, Weather> = {
  clear: { type: 'clear', name: 'Clear Skies', description: 'Optimal growth conditions.', intensity: 1 },
  rain: { type: 'rain', name: 'Gentle Rain', description: 'Hydration levels increasing.', intensity: 1.5 },
  storm: { type: 'storm', name: 'Severe Storm', description: 'High hydration, but increased stress.', intensity: 2 },
  heatwave: { type: 'heatwave', name: 'Intense Heatwave', description: 'Rapid nutrient drain and high stress.', intensity: 2.5 },
  fog: { type: 'fog', name: 'Dense Fog', description: 'Reduced water loss, slow research.', intensity: 0.5 },
};

export const RARITY_COLORS = {
  Common: '#9E9E9E',
  Uncommon: '#4CAF50',
  Rare: '#2196F3',
  Epic: '#9C27B0',
  Legendary: '#FF9800',
};

export const BREEDING_COST = 100;
export const MUTATION_CHANCE = 0.1;

export type BasePlantType = {
  name: string;
  baseGrowthSpeed: number;
  baseYield: number;
  description: string;
  color: string;
};

export const BASE_PLANT_TYPES: BasePlantType[] = [
  {
    name: 'Basic',
    baseGrowthSpeed: 1.0,
    baseYield: 1.0,
    description: 'A standard genetically modified sprout.',
    color: '#388E3C',
  },
  {
    name: 'Xero-Cactus',
    baseGrowthSpeed: 0.7,
    baseYield: 1.2,
    description: 'Resilient to heat and low water, but grows slowly.',
    color: '#827717',
  },
  {
    name: 'Neon-Vine',
    baseGrowthSpeed: 1.5,
    baseYield: 0.8,
    description: 'Rapid growth patterns with bioluminescent properties.',
    color: '#00E676',
  },
  {
    name: 'Quartz-Fern',
    baseGrowthSpeed: 0.5,
    baseYield: 2.5,
    description: 'Slow growth, but yields high-value mineral data.',
    color: '#B2EBF2',
  },
  {
    name: 'Shadow-Fungi',
    baseGrowthSpeed: 1.2,
    baseYield: 1.1,
    description: 'Thrives in low light, resistant to common pests.',
    color: '#4527A0',
  },
  {
    name: 'Solar-Bloom',
    baseGrowthSpeed: 1.1,
    baseYield: 1.5,
    description: 'Absorbs high amounts of radiation for energy.',
    color: '#FFD600',
  },
  {
    name: 'Cryo-Lily',
    baseGrowthSpeed: 0.6,
    baseYield: 2.2,
    description: 'Endothermic plant that thrives in sub-zero data streams.',
    color: '#E1F5FE',
  },
  {
    name: 'Plasma-Orchid',
    baseGrowthSpeed: 1.8,
    baseYield: 0.7,
    description: 'High-energy flora with volatile growth patterns.',
    color: '#FF4081',
  },
  {
    name: 'Gravity-Root',
    baseGrowthSpeed: 0.4,
    baseYield: 3.5,
    description: 'Dense molecular structure, extremely high data density.',
    color: '#263238',
  },
  {
    name: 'Aether-Grass',
    baseGrowthSpeed: 2.5,
    baseYield: 0.4,
    description: 'Translucent blades that grow at light-speed.',
    color: '#B2FF59',
  },
  {
    name: 'Void-Willow',
    baseGrowthSpeed: 1.0,
    baseYield: 1.8,
    description: 'Absorbs surrounding data noise to fuel its growth.',
    color: '#212121',
  }
];

export const getRandomWeather = (): Weather => {
  const types = Object.keys(WEATHER_TYPES) as WeatherType[];
  const type = types[Math.floor(Math.random() * types.length)];
  return WEATHER_TYPES[type];
};
