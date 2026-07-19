import { GameplaySystem, SimulationContext } from './types';

export const inventorySystem: GameplaySystem = {
  id: 'inventory',
  order: 300,
  update(context: SimulationContext) {
    context.flags.inventorySupportsWeightStackingSortingFilteringQuickSlots = true;
  },
};

export const craftingSystem: GameplaySystem = {
  id: 'crafting',
  order: 400,
  update(context: SimulationContext) {
    context.flags.craftingSupportsRecipeDatabaseWorkbenchTimeUnlocksPreview = true;
  },
};

export const npcAiSystem: GameplaySystem = {
  id: 'npc-ai',
  order: 500,
  update(context: SimulationContext) {
    context.flags.npcAiUsesSchedulesNeedsGoalsMemoryRelationshipsTasks = true;
  },
};

export const questSystem: GameplaySystem = {
  id: 'quests',
  order: 600,
  update(context: SimulationContext) {
    context.flags.questEngineSupportsObjectivesDialogueRewardsDependenciesTriggersConditionsFailuresRepeatables = true;
  },
};

export const saveSystem: GameplaySystem = {
  id: 'save',
  order: 900,
  update(context: SimulationContext) {
    context.flags.versionedSavesMigrationsAutosaveManualCloudReadyIntegrityValidation = true;
  },
};

export const developerToolsSystem: GameplaySystem = {
  id: 'developer-tools',
  order: 1000,
  update(context: SimulationContext) {
    context.flags.debugOverlayTracksFpsMemoryEntitiesTickWeatherQuestPlayerCollisionPathfinding = true;
  },
};
