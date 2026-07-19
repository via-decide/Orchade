import { GameplaySystem, SimulationContext } from './types';

export type WorldSystemId =
  | 'terrain'
  | 'weather'
  | 'day-night'
  | 'temperature'
  | 'water'
  | 'wind'
  | 'lighting'
  | 'season'
  | 'wildlife'
  | 'npc-simulation';

export const createWorldSystem = (id: WorldSystemId, order: number): GameplaySystem => ({
  id: `world.${id}`,
  order,
  update(context: SimulationContext) {
    if (id === 'day-night' && context.tick > 0 && context.tick % 240 === 0) {
      context.day += 1;
      context.events.emit('DAY_STARTED', { day: context.day }, context.tick);
    }
    if (id === 'weather' && context.tick > 0 && context.tick % 180 === 0) {
      context.events.emit('WEATHER_CHANGED', { weatherId: 'rain', influence: ['crops', 'movement', 'visibility', 'npc-behaviour', 'audio', 'lighting'] }, context.tick);
    }
  },
});

export const WORLD_SYSTEMS: GameplaySystem[] = [
  createWorldSystem('terrain', 10),
  createWorldSystem('weather', 20),
  createWorldSystem('day-night', 30),
  createWorldSystem('temperature', 40),
  createWorldSystem('water', 50),
  createWorldSystem('wind', 60),
  createWorldSystem('lighting', 70),
  createWorldSystem('season', 80),
  createWorldSystem('wildlife', 90),
  createWorldSystem('npc-simulation', 100),
];
