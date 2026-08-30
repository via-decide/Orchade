/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CropDefinition, ResolvedPlantStage } from '../public';
import { FarmingPlant } from '../state';
import cropData from '../../../data/crops/crop-definitions.json';

export const CROP_DEFINITIONS: Record<string, CropDefinition> = (cropData as any).crops || {};

/**
 * Baseline fallback 5-stage plant configuration for generic or unassigned crop plants.
 * MUST be preserved for backwards compatibility and non-crop flora.
 */
export const GENERIC_PLANT_STAGES: ResolvedPlantStage[] = [
  { threshold: 0, days: 25, name: 'Dormant Seed', color: '#5D4037', maxWater: 30, maxNutrients: 100, icon: '🌰', stageId: 'stage_0' },
  { threshold: 25, days: 55, name: 'Sprout', color: '#388E3C', maxWater: 50, maxNutrients: 100, icon: '🌱', stageId: 'stage_1' },
  { threshold: 80, days: 100, name: 'Sapling', color: '#43A047', maxWater: 80, maxNutrients: 120, icon: '🌿', stageId: 'stage_2' },
  { threshold: 180, days: 220, name: 'Young Tree', color: '#2E7D32', maxWater: 120, maxNutrients: 150, icon: '🌳', stageId: 'stage_3' },
  { threshold: 400, days: 0, name: 'Mature Tree', color: '#1B5E20', maxWater: 200, maxNutrients: 200, icon: '🌲', stageId: 'stage_4' },
];

export function getCropDefinition(cropId?: string): CropDefinition | null {
  if (!cropId) return null;
  return CROP_DEFINITIONS[cropId] || null;
}

export function getPlantStages(cropId?: string): ResolvedPlantStage[] {
  const crop = getCropDefinition(cropId);
  if (!crop || !crop.growthStages || crop.growthStages.length === 0) {
    return GENERIC_PLANT_STAGES;
  }

  let cumulativeThreshold = 0;
  return crop.growthStages.map((st, idx) => {
    const threshold = cumulativeThreshold;
    cumulativeThreshold += st.days;
    return {
      threshold,
      days: st.days,
      name: st.name,
      color: st.color,
      maxWater: crop.water?.max ?? 100,
      maxNutrients: 100,
      icon: st.icon ?? '🌱',
      stageId: st.id ?? `stage_${idx}`
    };
  });
}

export function getTotalCycleDays(cropId?: string): number {
  const crop = getCropDefinition(cropId);
  if (!crop) return 400; // Fallback generic threshold
  return crop.growthStages.reduce((total, st) => total + st.days, 0);
}

export function resolveStageIndex(cropId: string | undefined, rootStrength: number): number {
  const stages = getPlantStages(cropId);
  let resolvedIndex = 0;
  for (let i = 0; i < stages.length; i++) {
    if (rootStrength >= stages[i].threshold) {
      resolvedIndex = i;
    }
  }
  return resolvedIndex;
}

export function getCurrentStage(cropId: string | undefined, stageIndex: number): ResolvedPlantStage {
  const stages = getPlantStages(cropId);
  return stages[stageIndex] ?? stages[0];
}

export function createNewPlant(cropId?: string, id: string = `plant_${Date.now()}`, type: string = 'Basic'): FarmingPlant {
  const crop = getCropDefinition(cropId);
  const initialWater = crop ? crop.water.min : 30;
  return {
    id,
    type: crop ? crop.displayName : type,
    cropId: cropId ?? undefined,
    rootStrength: 0,
    water: initialWater,
    nutrients: 100,
    stress: 0,
    pests: 0,
    pestImmunity: 0,
    stageIndex: 0,
    isHarvestable: false,
    color: crop?.growthStages[0]?.color ?? '#4CAF50'
  };
}

export function applyHarvest(plant: FarmingPlant): { harvested: boolean; yieldCount: number; reward: number; resetPlant: FarmingPlant } {
  const crop = getCropDefinition(plant.cropId);
  const stages = getPlantStages(plant.cropId);
  const maxStageIndex = stages.length - 1;

  if (plant.stageIndex < maxStageIndex) {
    return { harvested: false, yieldCount: 0, reward: 0, resetPlant: plant };
  }

  let yieldCount = 1;
  let reward = 500 + plant.rootStrength * 0.5;

  if (crop && crop.harvest) {
    const { minYield, maxYield } = crop.harvest;
    yieldCount = Math.floor(Math.random() * (maxYield - minYield + 1)) + minYield;
    reward = 350 + (yieldCount * 45) + (plant.rootStrength * 0.3);
  }

  const updatedPlant: FarmingPlant = { ...plant };

  if (crop && crop.isPerennial) {
    // Perennial crop (e.g. Apple): stays established at bearing stage threshold
    const matureThreshold = stages[maxStageIndex].threshold;
    updatedPlant.rootStrength = matureThreshold;
    updatedPlant.stageIndex = maxStageIndex;
    updatedPlant.stress = 0;
    updatedPlant.isHarvestable = false;
  } else {
    // Annual crop: resets back to initial seed stage
    const fresh = createNewPlant(plant.cropId, plant.id, plant.type);
    updatedPlant.rootStrength = fresh.rootStrength;
    updatedPlant.stageIndex = fresh.stageIndex;
    updatedPlant.water = fresh.water;
    updatedPlant.nutrients = fresh.nutrients;
    updatedPlant.stress = 0;
    updatedPlant.pests = 0;
    updatedPlant.pestImmunity = 0;
    updatedPlant.isHarvestable = false;
  }

  return {
    harvested: true,
    yieldCount,
    reward: Math.floor(reward),
    resetPlant: updatedPlant
  };
}
