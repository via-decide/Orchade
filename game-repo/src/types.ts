/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlantStage = {
  threshold: number;
  name: string;
  color: string;
  maxWater: number;
  maxNutrients: number;
};

export type Plant = {
  id: string;
  type: string;
  rootStrength: number;
  water: number;
  nutrients: number;
  stress: number;
  pests: number;
  pestImmunity: number;
  stageIndex: number;
  isHarvestable: boolean;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  growthSpeedMultiplier: number;
  yieldMultiplier: number;
  color?: string;
};

export type GlobalUpgrades = {
  waterEfficiency: number; // multiplier for water consumption
  nutrientRetention: number; // multiplier for nutrient drain
  stressResistance: number; // flat reduction in stress gain
  pestDefense: number; // base chance to block pests
};

export type Orchard = {
  id: string;
  name: string;
  plants: (Plant | null)[];
  isUnlocked: boolean;
  unlockCost: number;
};

export type Tool = {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  type: 'passive' | 'active';
  bonusType: 'water' | 'nutrients' | 'stress' | 'pests' | 'credits';
  bonusValue: number;
  activeCooldown?: number;
  currentCooldown?: number;
};

export type WeatherType = 'clear' | 'rain' | 'storm' | 'heatwave' | 'fog';

export type Weather = {
  type: WeatherType;
  name: string;
  description: string;
  intensity: number;
};

export type GameState = {
  day: number;
  credits: number;
  dataSeeds: number;
  orchards: Orchard[];
  activeOrchardId: string;
  selectedPlantIndex: number | null;
  upgrades: GlobalUpgrades;
  tools: Tool[];
  activeTab: 'orchard' | 'lab' | 'market' | 'tools' | 'leaderboard' | 'discovery' | 'archives' | 'admin';
  weather: Weather;
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    role?: 'player' | 'admin';
  } | null;
  isAuthReady: boolean;
  lastToolEffect: string | null;
  discoveredTypes: string[];
};
