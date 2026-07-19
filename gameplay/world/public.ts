export { initialWorldState } from './state';
export type { CropInstance, DiseaseType, FarmPosition, FarmTile, FarmWeather, FertilizerState, FertilizerType, PestType, Season, SimulationClock, SoilNutrients, SoilType, WeatherState, WorldState, WorldStatus } from './state';
export { createFarmTile, createFarmWorld, harvestCropToInventory, loadWorldSave, plantCropFromInventory, serializeWorldSave, simulateWorldTick } from './internal/simulation';
export type { HarvestResult, PlantingResult } from './internal/simulation';
export { attachDefaultLivingEntities, migrateWorldSaveToV2, recordHarvestInEconomy, simulateLivingWorldTick } from './internal/livingWorld';
export type { LivingWorldState } from './internal/livingWorld';
export { createEntity, getComponent, upsertEntity } from './internal/ecs';
export type { AIComponent, AnimationComponent, ComponentKind, EcologyComponent, Entity, EntityComponent, EntityKind, EntityPatch, HealthComponent, InteractionComponent, InventoryComponent, MovementComponent, TransformComponent } from './internal/ecs';
