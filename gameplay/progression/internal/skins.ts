import type { EnvironmentSkin } from '../public';

const placeholder = (id: string, name: string, description: string): EnvironmentSkin => ({
  id,
  name,
  description,
  status: 'placeholder',
  visuals: { terrainPalette: [], buildingStyle: 'tbd', vegetationSet: 'tbd', uiAtmosphere: 'tbd' },
});

export const ENVIRONMENT_SKINS: EnvironmentSkin[] = [
  {
    id: 'default',
    name: 'Temperate Homestead',
    description: 'Explicit Project 001 temperate assumptions with four deterministic seasonal profiles.',
    status: 'active',
    climatePreset: {
      annualRainfallMm: 965.2,
      seasons: [
        { season: 'winter', startDayOfYear: 1, endDayOfYear: 59, meanTemperatureC: 8, rainfallProbability: 0.18, rainfallMmWhenWet: 7, solarHours: 5, humidityPercent: 68, frostRisk: 0.35 },
        { season: 'spring', startDayOfYear: 60, endDayOfYear: 151, meanTemperatureC: 18, rainfallProbability: 0.32, rainfallMmWhenWet: 9, solarHours: 8, humidityPercent: 62, frostRisk: 0.08 },
        { season: 'summer', startDayOfYear: 152, endDayOfYear: 243, meanTemperatureC: 29, rainfallProbability: 0.12, rainfallMmWhenWet: 12, solarHours: 10, humidityPercent: 52, frostRisk: 0 },
        { season: 'autumn', startDayOfYear: 244, endDayOfYear: 365, meanTemperatureC: 17, rainfallProbability: 0.22, rainfallMmWhenWet: 8, solarHours: 7, humidityPercent: 60, frostRisk: 0.12 },
      ],
      soilProfile: { defaultPh: 6.5, organicMatterPercent: 6 },
    },
    visuals: {
      terrainPalette: ['#4a6741', '#6f8f4e', '#8fae6b'],
      buildingStyle: 'american_farmhouse',
      vegetationSet: 'temperate_deciduous',
      uiAtmosphere: 'warm_earth',
    },
  },
  placeholder('kutch', 'Kutch Semi-Arid Homestead', 'Climate parameters require sourced local assumptions before activation.'),
  placeholder('pacific_northwest', 'Pacific Northwest', 'Climate parameters pending validation.'),
  placeholder('mediterranean', 'Mediterranean', 'Climate parameters pending validation.'),
  placeholder('alpine', 'Alpine', 'Climate parameters pending validation.'),
  placeholder('tropical', 'Tropical', 'Climate parameters pending validation.'),
  placeholder('desert', 'Hot Desert', 'Climate parameters pending validation.'),
  placeholder('coastal', 'Coastal', 'Climate parameters pending validation.'),
  placeholder('continental', 'Continental', 'Climate parameters pending validation.'),
  placeholder('monsoon', 'Monsoon', 'Climate parameters pending validation.'),
  placeholder('high_plains', 'High Plains', 'Climate parameters pending validation.'),
  placeholder('boreal', 'Boreal', 'Climate parameters pending validation.'),
];

export function getEnvironmentSkin(id: string): EnvironmentSkin | undefined {
  return ENVIRONMENT_SKINS.find(item => item.id === id);
}

export function requireActiveEnvironmentSkin(id: string): EnvironmentSkin & { climatePreset: NonNullable<EnvironmentSkin['climatePreset']> } {
  const skin = getEnvironmentSkin(id);
  if (!skin) throw new Error('Unknown environment skin: ' + id + '.');
  if (skin.status !== 'active' || !skin.climatePreset) throw new Error('Environment skin is not calibrated: ' + id + '.');
  return skin as EnvironmentSkin & { climatePreset: NonNullable<EnvironmentSkin['climatePreset']> };
}
