import { GameState, GlobalUpgrades, Plant, Weather } from '../../../src/types';
import { PLANT_STAGES } from '../../../src/constants';

export type FarmingAction = 'research' | 'water' | 'fertilize' | 'pesticide' | 'harvest';
export type LogEntry = { msg: string; type: string };
export type FarmingResult = { state: GameState; logs: LogEntry[]; effect?: string };

const getStageIndex = (rootStrength: number) => PLANT_STAGES.reduce((stage, plantStage, index) => rootStrength >= plantStage.threshold ? index : stage, 0);

export const createPlant = (plantType = 'Basic', color?: string): Plant => ({
  id: Math.random().toString(36).substr(2, 9),
  type: plantType,
  rootStrength: 0,
  water: 30,
  nutrients: 100,
  stress: 0,
  pests: 0,
  pestImmunity: 0,
  stageIndex: 0,
  isHarvestable: false,
  color,
});

export const applyPlantAction = (state: GameState, action: FarmingAction): FarmingResult => {
  if (state.selectedPlantIndex === null) return { state, logs: [] };
  const orchardIndex = state.orchards.findIndex(o => o.id === state.activeOrchardId);
  const sourcePlant = state.orchards[orchardIndex]?.plants[state.selectedPlantIndex];
  if (!sourcePlant) return { state, logs: [] };

  const logs: LogEntry[] = [];
  const newOrchards = [...state.orchards];
  const orchard = { ...newOrchards[orchardIndex] };
  const newPlants = [...orchard.plants];
  const plant = { ...sourcePlant };
  let credits = state.credits;
  let dataSeeds = state.dataSeeds;
  let harvestedTypes = state.harvestedTypes || [];
  let effect: string | undefined;

  if (action === 'research') {
    if (plant.water < 5) return { state, logs: [{ msg: 'Insufficient water for research.', type: 'warn' }] };
    effect = 'genetic-scanner';
    const isFog = state.weather?.type === 'fog';
    const weatherMultiplier = isFog ? 0.5 : 1.0;
    const baseG = Math.floor(Math.random() * 8) + 5;
    const finalG = Math.max(1, Math.round(baseG * (plant.nutrients / 100) * weatherMultiplier));
    const stressGain = Math.round(5 * (state.weather?.intensity ?? 1.0));
    plant.rootStrength += finalG;
    plant.water -= 5;
    plant.nutrients -= 10;
    plant.stress += stressGain;
    credits += 10;
    const nextStage = getStageIndex(plant.rootStrength);
    if (nextStage > plant.stageIndex) {
      plant.stageIndex = nextStage;
      logs.push({ msg: `Evolution! ${plant.type} reached stage: ${PLANT_STAGES[nextStage].name}`, type: 'success' });
      dataSeeds += 5;
    }
    const pestChance = 0.15 * (1 - (state.upgrades.pestDefense / 100));
    if (plant.pestImmunity === 0 && Math.random() < pestChance) {
      plant.pests = Math.min(5, plant.pests + 1);
      logs.push({ msg: 'Warning: Pest infestation detected!', type: 'danger' });
    }
    logs.push({ msg: isFog ? `Research completed under Dense Fog (Efficiency -50%): +${finalG} roots, +10 credits.` : `Research complete: +${finalG} roots, +10 credits.`, type: isFog ? 'warn' : 'success' });
  }

  if (action === 'water') {
    effect = 'water';
    plant.water = Math.min(PLANT_STAGES[plant.stageIndex].maxWater, plant.water + 20);
    plant.stress = Math.max(0, plant.stress - (5 + state.upgrades.stressResistance));
    logs.push({ msg: 'Hydration levels increased.', type: 'info' });
  }

  if (action === 'fertilize') {
    effect = 'fertilize';
    plant.nutrients = Math.min(PLANT_STAGES[plant.stageIndex].maxNutrients, plant.nutrients + 30);
    plant.stress += 10;
    logs.push({ msg: 'Nutrient levels boosted.', type: 'success' });
  }

  if (action === 'pesticide') {
    effect = 'pesticide';
    plant.pests = 0;
    plant.pestImmunity = 3;
    plant.stress += 15;
    logs.push({ msg: 'Pests eradicated. Immunity active for 3 cycles.', type: 'success' });
  }

  if (action === 'harvest') {
    if (plant.stageIndex < 4) return { state, logs: [{ msg: 'Plant is not ready for harvest.', type: 'warn' }] };
    effect = 'pruning-shears';
    const reward = 500 + (plant.rootStrength * 0.5);
    credits += reward;
    dataSeeds += 5;
    newPlants[state.selectedPlantIndex] = null;
    if (!harvestedTypes.includes(plant.type)) {
      harvestedTypes = [...harvestedTypes, plant.type];
      logs.push({ msg: `NEW SPECIES DISCOVERED AND HARVESTED: ${plant.type}! Check the Botanical Archives.`, type: 'success' });
    }
    logs.push({ msg: `Harvest complete! Gained ${Math.floor(reward)} credits and 5 data seeds.`, type: 'success' });
  } else {
    newPlants[state.selectedPlantIndex] = plant;
  }

  orchard.plants = newPlants;
  newOrchards[orchardIndex] = orchard;
  return { state: { ...state, orchards: newOrchards, credits, dataSeeds, harvestedTypes, selectedPlantIndex: action === 'harvest' ? null : state.selectedPlantIndex }, logs, effect };
};

export const applyOvernightPlantLifecycle = (state: GameState, newWeather: Weather): { orchards: GameState['orchards']; logs: LogEntry[] } => {
  const logs: LogEntry[] = [];
  const orchards = state.orchards.map(o => {
    if (!o.isUnlocked) return o;
    const plants = o.plants.map(p => {
      if (!p) return null;
      const plant = { ...p };
      const stage = PLANT_STAGES[plant.stageIndex];
      if (newWeather.type === 'rain') plant.water = Math.min(stage.maxWater, plant.water + 15);
      else if (newWeather.type === 'storm') { plant.water = Math.min(stage.maxWater, plant.water + 30); plant.stress = Math.min(100, plant.stress + 10); }
      else if (newWeather.type === 'heatwave') { plant.water = Math.max(0, plant.water - 20); plant.nutrients = Math.max(0, plant.nutrients - 15); plant.stress = Math.min(100, plant.stress + 15); }
      else if (newWeather.type === 'fog') plant.water = Math.max(0, plant.water - 2);
      else { plant.water = Math.max(0, plant.water - 10); plant.stress = Math.max(0, plant.stress - 5); }
      if (plant.pests > 0) { plant.nutrients = Math.max(0, plant.nutrients - (plant.pests * 10)); plant.stress += (plant.pests * 5); }
      else if (newWeather.type !== 'heatwave' && newWeather.type !== 'storm') plant.stress = Math.max(0, plant.stress - 20);
      if (plant.pestImmunity > 0) plant.pestImmunity--;
      if (plant.stress >= 100) {
        logs.push({ msg: `CRITICAL: ${plant.type} in ${o.name} suffered crop burn!`, type: 'danger' });
        plant.rootStrength = Math.max(0, plant.rootStrength - 50);
        plant.stress = 0;
        plant.stageIndex = getStageIndex(plant.rootStrength);
      }
      return plant;
    });
    return { ...o, plants };
  });
  return { orchards, logs };
};

export const applyUpgradePurchase = (state: GameState, id: keyof GlobalUpgrades, cost = 10): FarmingResult => {
  if (state.dataSeeds < cost) return { state, logs: [{ msg: 'Insufficient genetic data for upgrade.', type: 'danger' }] };
  const upgrades = { ...state.upgrades, [id]: id === 'stressResistance' ? (state.upgrades[id] as number) + 5 : (state.upgrades[id] as number) * 0.9 };
  return { state: { ...state, dataSeeds: state.dataSeeds - cost, upgrades }, logs: [{ msg: `Upgrade acquired: ${id} enhanced.`, type: 'success' }] };
};
