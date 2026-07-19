import type { CropDefinition } from '../farming/api';
import type { Entity } from './internal/ecs';

export type WorldStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type FarmWeather = 'sunny' | 'rain' | 'storm' | 'fog' | 'wind' | 'heatwave' | 'coldSnap';
export type SoilType = 'loam' | 'clay' | 'sand' | 'silt';
export type FertilizerType = 'organic' | 'mineral' | 'compost' | 'hybrid';
export type DiseaseType = 'blight' | 'mildew' | 'rust';
export type PestType = 'insects' | 'birds' | 'fungus' | 'worms' | 'rodents';

export type FarmPosition = { x: number; y: number };

export type SoilNutrients = {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
};

export type FertilizerState = {
  type: FertilizerType;
  potency: number;
  ticksRemaining: number;
} | null;

export type CropInstance = {
  id: string;
  definitionId: string;
  plantedAt: number;
  growthProgress: number;
  growthStage: number;
  health: number;
  water: number;
  nutrients: SoilNutrients;
  genetics: CropDefinition['genetics'];
  disease: Partial<Record<DiseaseType, number>>;
  pests: Partial<Record<PestType, number>>;
  harvestRemaining: number;
  owner: string;
  tile: FarmPosition;
  readyToHarvest: boolean;
  regenerationProgress: number;
};

export type FarmTile = {
  id: string;
  position: FarmPosition;
  soilType: SoilType;
  moisture: number;
  nutrients: SoilNutrients;
  pH: number;
  plantedCropId: string | null;
  growthStage: number;
  weeds: number;
  disease: Partial<Record<DiseaseType, number>>;
  pests: Partial<Record<PestType, number>>;
  irrigation: { enabled: boolean; efficiency: number };
  fertilizer: FertilizerState;
  compaction: number;
};

export type WeatherState = {
  current: FarmWeather;
  intensity: number;
  ticksRemaining: number;
};

export type SimulationClock = {
  tick: number;
  day: number;
  season: Season;
  year: number;
  ticksPerDay: number;
};

export type WorldState = {
  module: 'world';
  status: WorldStatus;
  updatedAt: string | null;
  schemaVersion: 1;
  seed: number;
  clock: SimulationClock;
  weather: WeatherState;
  tiles: FarmTile[];
  crops: Record<string, CropInstance>;
  entities: Record<string, Entity>;
  regions: Record<string, { id: string; name: string; biome: 'farm' | 'forest' | 'mountains' | 'river' | 'lake' | 'swamp' | 'desert' | 'caves' | 'ruins'; resources: Record<string, number>; discovered: boolean }>;
  eventLog: { tick: number; type: string; message: string }[];
};

export const initialWorldState: WorldState = {
  module: 'world',
  status: 'in-progress',
  updatedAt: null,
  schemaVersion: 1,
  seed: 1,
  clock: { tick: 0, day: 1, season: 'spring', year: 1, ticksPerDay: 24 },
  weather: { current: 'sunny', intensity: 1, ticksRemaining: 8 },
  tiles: [],
  crops: {},
  entities: {},
  regions: { farmstead: { id: 'farmstead', name: 'Farmstead', biome: 'farm', resources: { wildSeeds: 8, forage: 12, water: 100 }, discovered: true } },
  eventLog: [],
};
