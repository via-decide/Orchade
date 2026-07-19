import type { WeatherType } from '../../../src/types';

export type CropDefinition = {
  id: string;
  displayName: string;
  seasons: ('spring' | 'summer' | 'autumn' | 'winter')[];
  baseGrowthDays: number;
  preferredWeather?: WeatherType[];
  harvests: number;
  genetics: { vigor: number; yield: number; resilience: number };
  soil: { nutrientUse: number; waterUse: number; diseaseResistance: number; pestResistance: number };
};

export const CROP_DEFINITIONS: Record<string, CropDefinition> = {
  Basic: { id: 'Basic', displayName: 'Terran Sprout', seasons: ['spring', 'summer', 'autumn'], baseGrowthDays: 5, preferredWeather: ['clear', 'rain'], harvests: 1, genetics: { vigor: 1, yield: 1, resilience: 1 }, soil: { nutrientUse: 10, waterUse: 10, diseaseResistance: 0.2, pestResistance: 0.2 } },
  'Neon-Vine': { id: 'Neon-Vine', displayName: 'Neon Vine', seasons: ['spring', 'summer'], baseGrowthDays: 4, preferredWeather: ['rain', 'fog'], harvests: 3, genetics: { vigor: 1.25, yield: 0.9, resilience: 0.8 }, soil: { nutrientUse: 14, waterUse: 12, diseaseResistance: 0.15, pestResistance: 0.1 } },
  'Quartz-Fern': { id: 'Quartz-Fern', displayName: 'Quartz Fern', seasons: ['autumn', 'winter'], baseGrowthDays: 7, preferredWeather: ['fog'], harvests: 1, genetics: { vigor: 0.75, yield: 1.6, resilience: 1.3 }, soil: { nutrientUse: 8, waterUse: 6, diseaseResistance: 0.35, pestResistance: 0.3 } },
};

export const getCropDefinition = (cropId: string): CropDefinition => CROP_DEFINITIONS[cropId] ?? CROP_DEFINITIONS.Basic;

export const createHybridCropDefinition = (first: CropDefinition, second: CropDefinition): CropDefinition => ({
  id: `${first.id}x${second.id}`,
  displayName: `${first.displayName} Hybrid`,
  seasons: Array.from(new Set([...first.seasons, ...second.seasons])),
  baseGrowthDays: Math.round((first.baseGrowthDays + second.baseGrowthDays) / 2),
  preferredWeather: Array.from(new Set([...(first.preferredWeather ?? []), ...(second.preferredWeather ?? [])])),
  harvests: Math.max(first.harvests, second.harvests),
  genetics: {
    vigor: Number(((first.genetics.vigor + second.genetics.vigor) / 2).toFixed(2)),
    yield: Number(((first.genetics.yield + second.genetics.yield) / 2).toFixed(2)),
    resilience: Number(((first.genetics.resilience + second.genetics.resilience) / 2).toFixed(2)),
  },
  soil: {
    nutrientUse: Math.round((first.soil.nutrientUse + second.soil.nutrientUse) / 2),
    waterUse: Math.round((first.soil.waterUse + second.soil.waterUse) / 2),
    diseaseResistance: Number(Math.max(first.soil.diseaseResistance, second.soil.diseaseResistance).toFixed(2)),
    pestResistance: Number(Math.max(first.soil.pestResistance, second.soil.pestResistance).toFixed(2)),
  },
});
