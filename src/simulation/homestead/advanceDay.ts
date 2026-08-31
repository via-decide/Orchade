import { EXPANDED_CROP_CATALOG, SEASON_METADATA } from '../../data/cropCatalog';
import { LIVESTOCK_BREEDS } from '../../data/livestockData';
import { DeterministicRandom } from '../../engine/random/rng';
import { createHomesteadEvent, type HomesteadSimulationEvent } from './events';
import { validateHomesteadScenario, type HomesteadScenarioDefinition } from './scenario';
import { validateHomesteadState, type HomesteadSimulationState, type HomesteadSeason, type HomesteadZoneState } from './state';

export interface HomesteadDayActions {
  // Reserved for explicit player/controller actions. The current Plot Planner
  // applies its UI actions before calling this physical day transition.
}

export interface AdvanceHomesteadDayInput<TZone extends HomesteadZoneState> {
  scenario: HomesteadScenarioDefinition;
  state: HomesteadSimulationState<TZone>;
  actions?: HomesteadDayActions;
}

export interface AdvanceHomesteadDayResult<TZone extends HomesteadZoneState> {
  state: HomesteadSimulationState<TZone>;
  events: HomesteadSimulationEvent[];
}

const SEASONS: readonly HomesteadSeason[] = ['spring', 'summer', 'autumn', 'winter'];

export function advanceHomesteadDay<TZone extends HomesteadZoneState>({
  scenario,
  state,
}: AdvanceHomesteadDayInput<TZone>): AdvanceHomesteadDayResult<TZone> {
  validateHomesteadScenario(scenario);
  validateHomesteadState(state);

  const rng = new DeterministicRandom();
  rng.restore(state.rngState);
  const nextDay = state.day + 1;
  const currentSeasonIndex = SEASONS.indexOf(state.season);
  const nextSeason = nextDay % 30 === 1 && nextDay > 1
    ? SEASONS[(currentSeasonIndex + 1) % SEASONS.length]
    : state.season;
  const seasonInfo = SEASON_METADATA[nextSeason];
  const events: HomesteadSimulationEvent[] = [];
  const emit = (type: Parameters<typeof createHomesteadEvent>[3], payload: unknown) => {
    events.push(createHomesteadEvent(scenario.id, nextDay, events.length, type, payload));
  };

  if (nextSeason !== state.season) {
    emit('SEASON_CHANGED', { previousSeason: state.season, season: nextSeason });
  }

  const solarGenerationToday = (state.solar.solarArrayWatts / 1000) * (seasonInfo.sunlightHours * 0.75)
    + (state.solar.backupBiomassGenActive ? 12 : 0);
  const updatedBatteryKwh = Math.min(
    state.solar.maxBatteryStorageKwh,
    Math.max(Math.min(1, state.solar.maxBatteryStorageKwh), state.solar.currentBatteryStorageKwh + solarGenerationToday - state.solar.dailyLoadKwh),
  );
  const solar = {
    ...state.solar,
    dailyGenerationKwh: solarGenerationToday,
    currentBatteryStorageKwh: updatedBatteryKwh,
  };
  emit('ENERGY_BALANCE_UPDATED', {
    generatedKwh: solarGenerationToday,
    loadKwh: state.solar.dailyLoadKwh,
    storedKwh: updatedBatteryKwh,
  });

  const rainfallProbability = seasonInfo.id === 'spring' ? 0.35 : 0.15;
  const weatherSample = rng.next();
  const isRainDay = weatherSample < rainfallProbability;
  emit('WEATHER_SAMPLED', { sample: weatherSample, rainfallProbability, isRainDay });
  const rainCatchmentGallons = isRainDay ? state.water.catchmentSqft * 0.623 * 0.75 : 0;
  const cisternFloor = Math.min(100, state.water.maxCisternCapacityGallons);
  const updatedCistern = Math.min(
    state.water.maxCisternCapacityGallons,
    Math.max(cisternFloor, state.water.currentStoredGallons + rainCatchmentGallons - state.water.dailyConsumptionGallons),
  );
  const water = { ...state.water, currentStoredGallons: updatedCistern };
  if (isRainDay) emit('RAINFALL_OCCURRED', { harvestedGallons: rainCatchmentGallons });
  emit('WATER_BALANCE_UPDATED', {
    previousStoredGallons: state.water.currentStoredGallons,
    harvestedGallons: rainCatchmentGallons,
    consumedGallons: state.water.dailyConsumptionGallons,
    storedGallons: updatedCistern,
  });

  let zones = state.zones.map(zone => ({ ...zone, soil: { ...zone.soil }, plant: { ...zone.plant } })) as TZone[];
  const paddocks = state.paddocks.map(paddock => {
    const breed = LIVESTOCK_BREEDS[paddock.breedId];
    if (!breed) return { ...paddock };

    const daysInPaddock = paddock.daysInPaddock + 1;
    const isOvergrazing = daysInPaddock > breed.rotationalDays;
    const nextPaddock = {
      ...paddock,
      daysInPaddock,
      pastureBiomass: Math.max(5, paddock.pastureBiomass - (isOvergrazing ? 15 : 8)),
      manureAccumulation: Math.min(100, paddock.manureAccumulation + 8),
      cycleProgress: paddock.cycleProgress + 1,
      health: isOvergrazing ? Math.max(50, paddock.health - 5) : Math.min(100, paddock.health + 2),
    };

    zones = zones.map(zone => zone.id === paddock.zoneId ? {
      ...zone,
      soil: {
        ...zone.soil,
        nitrogen: Math.min(100, zone.soil.nitrogen + Math.round(breed.outputs.manureNpk.n / 4)),
        organicMatter: Math.min(15, zone.soil.organicMatter + 0.1),
      },
    } : zone) as TZone[];
    emit('LIVESTOCK_UPDATED', {
      paddockId: paddock.id,
      isOvergrazing,
      daysInPaddock: nextPaddock.daysInPaddock,
      pastureBiomass: nextPaddock.pastureBiomass,
      health: nextPaddock.health,
    });
    return nextPaddock;
  });

  zones = zones.map(zone => {
    const cropId = zone.plant.cropId;
    if (!cropId) return zone;
    const crop = EXPANDED_CROP_CATALOG[cropId];
    if (!crop) return zone;

    let frostDamage = 0;
    if (seasonInfo.frostRisk > 0 && !crop.frostTolerant) {
      const frostSample = rng.next();
      if (frostSample < seasonInfo.frostRisk) {
        frostDamage = 15;
        emit('FROST_DAMAGE_APPLIED', { zoneId: zone.id, cropId, damage: frostDamage, sample: frostSample, frostRisk: seasonInfo.frostRisk });
      }
    }

    const waterDrain = (state.water.irrigationType === 'drip' ? 5 : 8) + (seasonInfo.id === 'summer' ? 4 : 0);
    const nitrogenDrain = crop.nutrientDemand.n === 'heavy' ? 4 : crop.nutrientDemand.n === 'fixer' ? -6 : 2;
    const phosphorusDrain = crop.nutrientDemand.p === 'heavy' ? 3 : 1;
    const potassiumDrain = crop.nutrientDemand.k === 'heavy' ? 3 : 1;
    const rootStrength = zone.plant.rootStrength + 1;
    let stageIndex = zone.plant.stageIndex;
    let stageThreshold = 0;
    for (let index = 0; index <= zone.plant.stageIndex; index += 1) {
      stageThreshold += crop.growthStages[index]?.days || 10;
    }
    if (rootStrength >= stageThreshold && stageIndex < crop.growthStages.length - 1) stageIndex += 1;

    const nextZone = {
      ...zone,
      soil: {
        ...zone.soil,
        nitrogen: Math.min(100, Math.max(10, zone.soil.nitrogen - nitrogenDrain)),
        phosphorus: Math.min(100, Math.max(10, zone.soil.phosphorus - phosphorusDrain)),
        potassium: Math.min(100, Math.max(10, zone.soil.potassium - potassiumDrain)),
      },
      plant: {
        ...zone.plant,
        water: Math.max(0, zone.plant.water - waterDrain),
        stageIndex,
        rootStrength,
        health: Math.max(10, Math.min(100, zone.plant.health - frostDamage)),
        isHarvestable: stageIndex === crop.growthStages.length - 1,
      },
    } as TZone;
    emit('CROP_UPDATED', {
      zoneId: zone.id,
      cropId,
      stageIndex: nextZone.plant.stageIndex,
      water: nextZone.plant.water,
      health: nextZone.plant.health,
      isHarvestable: nextZone.plant.isHarvestable,
    });
    return nextZone;
  });

  const nextState: HomesteadSimulationState<TZone> = {
    day: nextDay,
    season: nextSeason,
    water,
    solar,
    zones,
    paddocks,
    rngState: rng.snapshot(),
  };
  validateHomesteadState(nextState);
  emit('DAY_ADVANCED', { previousDay: state.day, day: nextDay });
  return { state: nextState, events };
}
