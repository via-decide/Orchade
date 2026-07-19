import { GameState, Plant } from '../../../src/types';
import { PLANT_STAGES } from '../../../src/constants';

export type ShopItem = { id: string; name: string; cost: number; nut?: number; stress: number; type: string; kills?: number };

export const applyShopItem = (state: GameState, item: ShopItem) => {
  if (state.credits < item.cost) return { state, logs: [{ msg: `Insufficient credits for ${item.name}.`, type: 'danger' }] };
  if (state.selectedPlantIndex === null) return { state, logs: [{ msg: 'Select a plant to apply items.', type: 'warn' }] };
  const orchardIndex = state.orchards.findIndex(o => o.id === state.activeOrchardId);
  const selectedPlant = state.orchards[orchardIndex]?.plants[state.selectedPlantIndex];
  if (!selectedPlant) return { state, logs: [{ msg: 'Select a plant to apply items.', type: 'warn' }] };
  const orchards = [...state.orchards];
  const orchard = { ...orchards[orchardIndex] };
  const plants = [...orchard.plants];
  const plant: Plant = { ...selectedPlant };
  if (item.type === 'fertilizer') {
    plant.nutrients = Math.min(PLANT_STAGES[plant.stageIndex].maxNutrients, plant.nutrients + (item.nut || 0));
    plant.stress += (item.stress || 0);
  } else if (item.type === 'pesticide') {
    plant.pests = Math.max(0, plant.pests - (item.kills || 0));
    plant.stress += (item.stress || 0);
  }
  plants[state.selectedPlantIndex] = plant;
  orchard.plants = plants;
  orchards[orchardIndex] = orchard;
  return { state: { ...state, orchards, credits: state.credits - item.cost }, logs: [{ msg: `Applied ${item.name} to ${selectedPlant.type}.`, type: 'success' }] };
};

export const liquidateDataSeeds = (state: GameState, amount: 1 | 10) => {
  if (state.dataSeeds < amount) return { state, logs: [] };
  const credits = amount * 50;
  return { state: { ...state, dataSeeds: state.dataSeeds - amount, credits: state.credits + credits }, logs: [{ msg: `Liquidated ${amount} Data Seed${amount > 1 ? 's' : ''} for ${credits} credits.`, type: 'success' }] };
};
