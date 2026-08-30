/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FarmingPlant {
  id: string;
  type: string;
  cropId?: string;
  rootStrength: number;
  water: number;
  nutrients: number;
  stress: number;
  pests: number;
  pestImmunity: number;
  stageIndex: number;
  isHarvestable: boolean;
  color?: string;
}

export interface FarmingUpgradeState {
  waterEfficiency: number;
  nutrientRetention: number;
  stressResistance: number;
  pestDefense: number;
}
