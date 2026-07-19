import { addItem, removeItem, type InventoryState } from '../../inventory/api';
import { getCropDefinition } from '../../farming/api';
import { initialWorldState, type CropInstance, type FarmTile, type FarmWeather, type Season, type SoilNutrients, type WorldState } from '../state';

export type PlantingResult = { world: WorldState; inventory: InventoryState; crop?: CropInstance; reason?: string };
export type HarvestResult = { world: WorldState; inventory: InventoryState; itemId?: string; quantity: number; overflow: number; reason?: string };

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const tileId = (x: number, y: number) => `tile-${x}-${y}`;
const cropId = (definitionId: string, x: number, y: number, tick: number) => `crop-${definitionId}-${x}-${y}-${tick}`;
const rng = (seed: number) => (seed * 1664525 + 1013904223) >>> 0;
const randomUnit = (seed: number) => rng(seed) / 0xffffffff;

const baseNutrients = (soilType: FarmTile['soilType']): SoilNutrients => {
  if (soilType === 'clay') return { nitrogen: 55, phosphorus: 45, potassium: 60, organicMatter: 50 };
  if (soilType === 'sand') return { nitrogen: 35, phosphorus: 35, potassium: 40, organicMatter: 25 };
  if (soilType === 'silt') return { nitrogen: 50, phosphorus: 55, potassium: 50, organicMatter: 45 };
  return { nitrogen: 60, phosphorus: 55, potassium: 55, organicMatter: 55 };
};

export const createFarmTile = (x: number, y: number, soilType: FarmTile['soilType'] = 'loam'): FarmTile => ({
  id: tileId(x, y),
  position: { x, y },
  soilType,
  moisture: soilType === 'sand' ? 35 : 55,
  nutrients: baseNutrients(soilType),
  pH: soilType === 'clay' ? 6.8 : 6.5,
  plantedCropId: null,
  growthStage: 0,
  weeds: 0,
  disease: {},
  pests: {},
  irrigation: { enabled: false, efficiency: 1 },
  fertilizer: null,
  compaction: soilType === 'clay' ? 35 : 20,
});

export const createFarmWorld = (width: number, height: number, seed = 1): WorldState => ({
  ...initialWorldState,
  seed,
  tiles: Array.from({ length: width * height }, (_, index) => createFarmTile(index % width, Math.floor(index / width))),
});

const seasonMultiplier: Record<Season, number> = { spring: 1.15, summer: 1.05, autumn: 0.9, winter: 0.55 };
const weatherGrowth: Record<FarmWeather, number> = { sunny: 1.05, rain: 1.15, storm: 0.75, fog: 0.9, wind: 0.95, heatwave: 0.65, coldSnap: 0.45 };
const weatherMoisture: Record<FarmWeather, number> = { sunny: -4, rain: 14, storm: 22, fog: 2, wind: -6, heatwave: -14, coldSnap: -2 };

const chooseWeather = (season: Season, seed: number): FarmWeather => {
  const roll = randomUnit(seed);
  if (season === 'winter') return roll < 0.35 ? 'coldSnap' : roll < 0.55 ? 'fog' : roll < 0.7 ? 'wind' : 'sunny';
  if (season === 'summer') return roll < 0.2 ? 'heatwave' : roll < 0.4 ? 'rain' : roll < 0.5 ? 'storm' : 'sunny';
  if (season === 'autumn') return roll < 0.25 ? 'fog' : roll < 0.45 ? 'wind' : roll < 0.65 ? 'rain' : 'sunny';
  return roll < 0.35 ? 'rain' : roll < 0.45 ? 'storm' : roll < 0.6 ? 'fog' : 'sunny';
};

export const plantCropFromInventory = (world: WorldState, inventory: InventoryState, tileIdToPlant: string, seedItemId: string, owner = 'player'): PlantingResult => {
  const tile = world.tiles.find(candidate => candidate.id === tileIdToPlant);
  const definitionId = seedItemId.endsWith('-seed') ? seedItemId.slice(0, -5) : seedItemId;
  const definition = getCropDefinition(definitionId);
  if (!tile) return { world, inventory, reason: 'Tile not found' };
  if (tile.plantedCropId) return { world, inventory, reason: 'Tile already planted' };
  if (!definition.seasons.includes(world.clock.season)) return { world, inventory, reason: `${definition.displayName} is not compatible with ${world.clock.season}` };
  const consumed = removeItem(inventory, inventory.backpack.id, seedItemId, 1);
  if (consumed.removed !== 1) return { world, inventory, reason: 'Seed not available in inventory' };
  const crop: CropInstance = {
    id: cropId(definition.id, tile.position.x, tile.position.y, world.clock.tick),
    definitionId: definition.id,
    plantedAt: world.clock.tick,
    growthProgress: 0,
    growthStage: 0,
    health: 100,
    water: tile.moisture,
    nutrients: { ...tile.nutrients },
    genetics: { ...definition.genetics },
    disease: {},
    pests: {},
    harvestRemaining: definition.harvests,
    owner,
    tile: { ...tile.position },
    readyToHarvest: false,
    regenerationProgress: 0,
  };
  const tiles = world.tiles.map(candidate => candidate.id === tile.id ? { ...candidate, plantedCropId: crop.id, growthStage: 0 } : candidate);
  return { world: { ...world, tiles, crops: { ...world.crops, [crop.id]: crop }, updatedAt: new Date().toISOString() }, inventory: consumed.state, crop };
};

const updateCrop = (world: WorldState, tile: FarmTile, crop: CropInstance): { tile: FarmTile; crop: CropInstance } => {
  const definition = getCropDefinition(crop.definitionId);
  const compatible = definition.seasons.includes(world.clock.season);
  const moistureScore = 1 - Math.abs(tile.moisture - 62) / 100;
  const nutrientScore = Math.max(0.55, (tile.nutrients.nitrogen + tile.nutrients.phosphorus + tile.nutrients.potassium) / 300);
  const fertilizerBoost = tile.fertilizer ? 1 + tile.fertilizer.potency / 100 : 1;
  const diseaseLoad = Object.values(crop.disease).reduce((sum, value) => sum + (value ?? 0), 0);
  const pestLoad = Object.values(crop.pests).reduce((sum, value) => sum + (value ?? 0), 0);
  const growth = (100 / (definition.baseGrowthDays * world.clock.ticksPerDay)) * definition.genetics.vigor * seasonMultiplier[world.clock.season] * weatherGrowth[world.weather.current] * moistureScore * nutrientScore * fertilizerBoost * (compatible ? 1 : 0.25);
  const progress = crop.readyToHarvest ? crop.growthProgress : clamp(crop.growthProgress + growth, 0, 100);
  const health = clamp(crop.health - diseaseLoad * 0.02 - pestLoad * 0.015 + (compatible ? 0.02 : -0.1));
  const readyToHarvest = progress >= 100;
  const nutrientDrain = definition.soil.nutrientUse / world.clock.ticksPerDay;
  const nextTile = {
    ...tile,
    moisture: clamp(tile.moisture + weatherMoisture[world.weather.current] * 0.1 + (tile.irrigation.enabled ? tile.irrigation.efficiency * 4 : 0) - definition.soil.waterUse / world.clock.ticksPerDay),
    nutrients: {
      nitrogen: clamp(tile.nutrients.nitrogen - nutrientDrain * 0.45 + (tile.fertilizer?.type === 'organic' ? 0.25 : 0)),
      phosphorus: clamp(tile.nutrients.phosphorus - nutrientDrain * 0.25 + (tile.fertilizer?.type === 'mineral' ? 0.3 : 0)),
      potassium: clamp(tile.nutrients.potassium - nutrientDrain * 0.3 + (tile.fertilizer?.type === 'compost' ? 0.2 : 0)),
      organicMatter: clamp(tile.nutrients.organicMatter - 0.02 + (tile.fertilizer?.type === 'compost' ? 0.3 : 0)),
    },
    weeds: clamp(tile.weeds + (world.weather.current === 'rain' ? 0.5 : 0.1)),
    fertilizer: tile.fertilizer ? { ...tile.fertilizer, ticksRemaining: tile.fertilizer.ticksRemaining - 1 } : null,
    growthStage: Math.min(4, Math.floor(progress / 25)),
  };
  if (nextTile.fertilizer && nextTile.fertilizer.ticksRemaining <= 0) nextTile.fertilizer = null;
  return { tile: nextTile, crop: { ...crop, growthProgress: progress, growthStage: nextTile.growthStage, health, water: nextTile.moisture, nutrients: { ...nextTile.nutrients }, readyToHarvest } };
};

export const simulateWorldTick = (world: WorldState): WorldState => {
  const nextTick = world.clock.tick + 1;
  const dayAdvanced = nextTick % world.clock.ticksPerDay === 0;
  const day = dayAdvanced ? world.clock.day + 1 : world.clock.day;
  const seasonIndex = Math.floor((day - 1) / 28) % 4;
  const season = (['spring', 'summer', 'autumn', 'winter'] as Season[])[seasonIndex];
  const year = Math.floor((day - 1) / 112) + 1;
  const weatherExpired = world.weather.ticksRemaining <= 1;
  const current = weatherExpired ? chooseWeather(season, world.seed + nextTick + day) : world.weather.current;
  const weather = { current, intensity: current === 'storm' || current === 'heatwave' || current === 'coldSnap' ? 1.3 : 1, ticksRemaining: weatherExpired ? 8 : world.weather.ticksRemaining - 1 };
  const crops = { ...world.crops };
  const tiles = world.tiles.map(tile => {
    let nextTile = { ...tile, moisture: clamp(tile.moisture + weatherMoisture[weather.current] * 0.1) };
    if (!tile.plantedCropId || !crops[tile.plantedCropId]) return nextTile;
    const updated = updateCrop({ ...world, clock: { ...world.clock, tick: nextTick, day, season, year }, weather }, nextTile, crops[tile.plantedCropId]);
    crops[tile.plantedCropId] = updated.crop;
    return updated.tile;
  });
  return { ...world, clock: { ...world.clock, tick: nextTick, day, season, year }, weather, tiles, crops, updatedAt: new Date().toISOString() };
};

export const harvestCropToInventory = (world: WorldState, inventory: InventoryState, cropIdToHarvest: string): HarvestResult => {
  const crop = world.crops[cropIdToHarvest];
  if (!crop || !crop.readyToHarvest) return { world, inventory, quantity: 0, overflow: 0, reason: 'Crop is not ready' };
  const definition = getCropDefinition(crop.definitionId);
  const quality = clamp(crop.health, 1, 100) / 100;
  const quantity = Math.max(1, Math.round(2 * definition.genetics.yield * quality));
  const itemId = `${definition.id}-crop`;
  const added = addItem(inventory, inventory.backpack.id, itemId, quantity);
  const overflow = added.remainder;
  const tile = world.tiles.find(candidate => candidate.plantedCropId === crop.id);
  const remainingHarvests = crop.harvestRemaining - 1;
  const crops = { ...world.crops };
  let tiles = world.tiles;
  if (remainingHarvests > 0) {
    crops[crop.id] = { ...crop, harvestRemaining: remainingHarvests, readyToHarvest: false, growthProgress: 65, regenerationProgress: 0 };
  } else {
    delete crops[crop.id];
    tiles = tile ? world.tiles.map(candidate => candidate.id === tile.id ? { ...candidate, plantedCropId: null, growthStage: 0 } : candidate) : world.tiles;
  }
  return { world: { ...world, tiles, crops, updatedAt: new Date().toISOString() }, inventory: added.state, itemId, quantity: quantity - overflow, overflow };
};

export const serializeWorldSave = (world: WorldState, inventory: InventoryState) => ({ schemaVersion: 1 as const, savedAt: new Date().toISOString(), world, inventory });
export const loadWorldSave = (save: ReturnType<typeof serializeWorldSave>) => save;
