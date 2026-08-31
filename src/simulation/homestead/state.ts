import type { WaterHydrologyState, SolarMicrogridState } from '../../data/homesteadEngineering';
import type { PaddockState } from '../../data/livestockData';

export type HomesteadSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface HomesteadSoilState {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
}

export interface HomesteadPlantState {
  cropId?: string | null;
  water: number;
  health: number;
  stageIndex: number;
  rootStrength: number;
  isHarvestable: boolean;
}

export interface HomesteadZoneState {
  id: number;
  soil: HomesteadSoilState;
  plant: HomesteadPlantState;
}

export interface HomesteadSimulationState<TZone extends HomesteadZoneState = HomesteadZoneState> {
  day: number;
  season: HomesteadSeason;
  water: WaterHydrologyState;
  solar: SolarMicrogridState;
  zones: TZone[];
  paddocks: PaddockState[];
  rngState: number;
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`Invalid homestead state: ${name} must be finite.`);
}

export function validateHomesteadState<TZone extends HomesteadZoneState>(state: HomesteadSimulationState<TZone>): void {
  if (!state || typeof state !== 'object') throw new Error('Homestead simulation state is required.');
  if (!Number.isInteger(state.day) || state.day < 1) throw new Error('Invalid homestead state: day must be a positive integer.');
  if (!['spring', 'summer', 'autumn', 'winter'].includes(state.season)) throw new Error('Invalid homestead state: unsupported season.');
  if (!Number.isInteger(state.rngState) || state.rngState < 0 || state.rngState > 0xffffffff) {
    throw new Error('Invalid homestead state: rngState must be an unsigned 32-bit integer.');
  }
  if (!Array.isArray(state.zones) || !Array.isArray(state.paddocks)) throw new Error('Invalid homestead state: zones and paddocks are required.');

  assertFinite(state.water.currentStoredGallons, 'water.currentStoredGallons');
  assertFinite(state.water.maxCisternCapacityGallons, 'water.maxCisternCapacityGallons');
  if (state.water.maxCisternCapacityGallons < 0 || state.water.currentStoredGallons < 0 || state.water.currentStoredGallons > state.water.maxCisternCapacityGallons) {
    throw new Error('Invalid homestead state: cistern storage must be within capacity bounds.');
  }
  assertFinite(state.solar.currentBatteryStorageKwh, 'solar.currentBatteryStorageKwh');
  assertFinite(state.solar.maxBatteryStorageKwh, 'solar.maxBatteryStorageKwh');
  if (state.solar.maxBatteryStorageKwh < 0 || state.solar.currentBatteryStorageKwh < 0 || state.solar.currentBatteryStorageKwh > state.solar.maxBatteryStorageKwh) {
    throw new Error('Invalid homestead state: battery storage must be within capacity bounds.');
  }

  state.zones.forEach((zone, index) => {
    assertFinite(zone.plant.water, `zones[${index}].plant.water`);
    assertFinite(zone.plant.health, `zones[${index}].plant.health`);
    assertFinite(zone.soil.nitrogen, `zones[${index}].soil.nitrogen`);
    assertFinite(zone.soil.phosphorus, `zones[${index}].soil.phosphorus`);
    assertFinite(zone.soil.potassium, `zones[${index}].soil.potassium`);
    if (zone.plant.water < 0 || zone.plant.water > 100 || zone.plant.health < 0 || zone.plant.health > 100) {
      throw new Error(`Invalid homestead state: zone ${zone.id} plant values are outside 0-100.`);
    }
    if ([zone.soil.nitrogen, zone.soil.phosphorus, zone.soil.potassium].some(value => value < 0 || value > 100)) {
      throw new Error(`Invalid homestead state: zone ${zone.id} soil nutrients are outside 0-100.`);
    }
  });

  state.paddocks.forEach((paddock, index) => {
    assertFinite(paddock.health, `paddocks[${index}].health`);
    assertFinite(paddock.pastureBiomass, `paddocks[${index}].pastureBiomass`);
    if (paddock.health < 0 || paddock.health > 100 || paddock.pastureBiomass < 0 || paddock.pastureBiomass > 100) {
      throw new Error(`Invalid homestead state: paddock ${paddock.id} values are outside 0-100.`);
    }
  });
}
