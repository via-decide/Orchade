export { initialWorldState } from './state';
export type { CropInstance, DiseaseType, FarmPosition, FarmTile, FarmWeather, FertilizerState, FertilizerType, PestType, Season, SimulationClock, SoilNutrients, SoilType, WeatherState, WorldState, WorldStatus } from './state';
export { createFarmTile, createFarmWorld, harvestCropToInventory, loadWorldSave, plantCropFromInventory, serializeWorldSave, simulateWorldTick } from './internal/simulation';
export type { HarvestResult, PlantingResult } from './internal/simulation';
