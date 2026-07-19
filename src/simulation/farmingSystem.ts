import { GameplaySystem, SimulationContext } from './types';

export type CropDefinition = {
  id: string;
  displayName: string;
  seasons: string[];
  growthStages: { id: string; days: number; sprite: string }[];
  water: { min: number; max: number };
  nutrients: string[];
  harvest: { itemId: string; minYield: number; maxYield: number };
  diseases: string[];
  fertilizerEffects: Record<string, number>;
};

export const farmingSystem: GameplaySystem = {
  id: 'farming',
  order: 200,
  update(context: SimulationContext) {
    if (context.tick % 60 === 0) {
      context.events.emit('CROP_PLANTED', { mode: 'simulation-sample', dataDriven: true }, context.tick);
    }
  },
};
