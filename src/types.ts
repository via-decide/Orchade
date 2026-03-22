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

export type GameState = {
  day: number;
  credits: number;
  dataSeeds: number;
  orchards: Orchard[];
  activeOrchardId: string;
  selectedPlantIndex: number | null;
  upgrades: GlobalUpgrades;
  activeTab: 'orchard' | 'lab' | 'market' | 'rankings' | 'profile';
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
  } | null;
  isAuthReady: boolean;
};
