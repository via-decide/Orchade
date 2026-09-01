export type PlayerLevel = 1 | 2 | 3;
export type LevelName = 'BUILD' | 'OPERATE' | 'MASTER';
export type ProgressionSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export const LEVEL_NAMES: Record<PlayerLevel, LevelName> = {
  1: 'BUILD',
  2: 'OPERATE',
  3: 'MASTER',
};

export interface LevelCriterion {
  id: string;
  label: string;
  check: string;
}

export interface CriterionStatus extends LevelCriterion {
  met: boolean;
}

export interface LevelCriteria {
  level: PlayerLevel;
  name: LevelName;
  description: string;
  criteria: LevelCriterion[];
}

export interface ClimateSeasonPreset {
  season: ProgressionSeason;
  startDayOfYear: number;
  endDayOfYear: number;
  meanTemperatureC: number;
  rainfallProbability: number;
  rainfallMmWhenWet: number;
  solarHours: number;
  humidityPercent: number;
  frostRisk: number;
}

export interface SkinClimatePreset {
  annualRainfallMm: number;
  seasons: ClimateSeasonPreset[];
  soilProfile: {
    defaultPh: number;
    organicMatterPercent: number;
  };
}

export interface EnvironmentSkin {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'placeholder';
  climatePreset?: SkinClimatePreset;
  visuals: {
    terrainPalette: string[];
    buildingStyle: string;
    vegetationSet: string;
    uiAtmosphere: string;
  };
}
