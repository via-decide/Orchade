/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './public';
export * from './state';
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
} from './internal/lifecycle';
