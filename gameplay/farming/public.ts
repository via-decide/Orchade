/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CropGrowthStage {
  id: string;
  name: string;
  days: number;
  color: string;
  icon?: string;
}

export interface CropWaterRange {
  min: number;
  max: number;
}

export interface CropHarvestConfig {
  itemId: string;
  displayName: string;
  minYield: number;
  maxYield: number;
}

export interface FertilizerEffects {
  compost: number;
  synthetic: number;
  organic: number;
  [key: string]: number;
}

export interface CropSpacing {
  sqft: number;
  label: string;
  note: string;
}

export interface CropDefinition {
  id: string;
  displayName: string;
  scientificName?: string;
  seasons: string[];
  isPerennial: boolean;
  _source?: string;
  growthStages: CropGrowthStage[];
  water: CropWaterRange;
  nutrients: string[];
  harvest: CropHarvestConfig;
  _yieldNote?: string;
  diseases: string[];
  fertilizerEffects: FertilizerEffects;
  _fertilizerNote?: string;
  spacing?: CropSpacing;
}

export interface ResolvedPlantStage {
  threshold: number;
  days: number;
  name: string;
  color: string;
  maxWater: number;
  maxNutrients: number;
  icon?: string;
  stageId?: string;
}
