import { GameState, WeatherType } from '../../../src/types';
import { getRandomWeather, WEATHER_TYPES } from '../../../src/constants';

export type WeatherLog = { msg: string; type: string };

export const advanceWeatherCycle = (state: GameState): Pick<GameState, 'weather' | 'weatherForecast' | 'climateControl'> & { logs: WeatherLog[] } => {
  const forecast = state.weatherForecast && state.weatherForecast.length > 0 ? state.weatherForecast : [getRandomWeather(), getRandomWeather(), getRandomWeather()];
  let weather = forecast[0];
  const weatherForecast = [...forecast.slice(1), getRandomWeather()];
  let climateControl = state.climateControl ? { ...state.climateControl } : null;
  const logs: WeatherLog[] = [];

  if (climateControl && climateControl.daysRemaining > 0) {
    const template = WEATHER_TYPES[climateControl.targetWeatherType];
    weather = { ...template, name: `[Controlled] ${template.name}`, description: `Atmospheric stabilizers are locking weather patterns. ${template.description}` };
    climateControl.daysRemaining -= 1;
    if (climateControl.daysRemaining <= 0) {
      climateControl = null;
      logs.push({ msg: 'Climate control duration completed. Atmospheric stabilizers powering down.', type: 'warn' });
    } else {
      logs.push({ msg: `Controlled atmosphere active: ${climateControl.daysRemaining} cycle(s) remaining.`, type: 'info' });
    }
  }

  const day = state.day + 1;
  const weatherMessages: Record<string, WeatherLog> = {
    rain: { msg: `Day ${day} started. Gentle Rain is replenishing specimen water levels.`, type: 'info' },
    storm: { msg: `Day ${day} started. Severe Storm active. High specimen stress!`, type: 'danger' },
    heatwave: { msg: `Day ${day} started. WARNING: Intense Heatwave dehydrating crops and soil!`, type: 'danger' },
    fog: { msg: `Day ${day} started. Dense Fog shielding crops from rapid water loss.`, type: 'system' },
    clear: { msg: `Day ${day} started. Atmosphere is optimal under Clear Skies.`, type: 'system' },
  };
  logs.push(weatherMessages[weather.type]);
  return { weather, weatherForecast, climateControl, logs };
};

export const activateClimateControlState = (state: GameState, targetType: WeatherType, cost = 120) => {
  if (state.credits < cost) return { state, logs: [{ msg: `Insufficient credits for atmospheric override (requires ${cost}🪙).`, type: 'danger' }] };
  const template = WEATHER_TYPES[targetType];
  const weather = { ...template, name: `[Controlled] ${template.name}`, description: `Atmospheric stabilizers are locking weather patterns. ${template.description}` };
  const climateControl = { targetWeatherType: targetType, daysRemaining: 3 };
  return { state: { ...state, credits: state.credits - cost, weather, climateControl }, logs: [{ msg: `Atmospheric Stabilizer Engaged: Local ecosystem weather locked to ${template.name} for 3 temporal cycles!`, type: 'success' }] };
};
