export type HomesteadSimulationEventType =
  | 'DAY_ADVANCED'
  | 'SEASON_CHANGED'
  | 'WEATHER_SAMPLED'
  | 'RAINFALL_OCCURRED'
  | 'WATER_BALANCE_UPDATED'
  | 'ENERGY_BALANCE_UPDATED'
  | 'LIVESTOCK_UPDATED'
  | 'CROP_UPDATED'
  | 'FROST_DAMAGE_APPLIED'
  | 'BEGIN_DAY'
  | 'END_DAY'
  | 'PLACEMENT_ACCEPTED'
  | 'PLACEMENT_REJECTED'
  | 'RAIN_OCCURRED'
  | 'WATER_CAPTURED'
  | 'WATER_SHORTAGE'
  | 'TANK_OVERFLOW'
  | 'POND_UPDATED'
  | 'IRRIGATION_APPLIED'
  | 'IRRIGATION_SKIPPED'
  | 'CROP_STRESSED'
  | 'CROP_HARVESTED'
  | 'FOOD_CONSUMED'
  | 'FOOD_PURCHASED'
  | 'FOOD_SHORTAGE'
  | 'LIVESTOCK_RESOURCE_SHORTAGE'
  | 'MANURE_COLLECTED'
  | 'COMPOST_MATURED'
  | 'COMPOST_APPLIED'
  | 'NUTRIENT_DEFICIT'
  | 'SOLAR_GENERATED'
  | 'BATTERY_CHARGED'
  | 'BATTERY_DEPLETED'
  | 'GRID_IMPORTED'
  | 'ENERGY_SHORTAGE'
  | 'LABOUR_ALLOCATED'
  | 'LABOUR_OVERLOAD'
  | 'REVENUE_RECORDED'
  | 'INPUT_PURCHASED'
  | 'CASH_SHORTAGE'
  | 'MAINTENANCE_REQUIRED'
  | 'SYSTEM_FAILED'
  | 'OBSERVATION_RECORDED'
  | 'EXPERIMENT_STARTED'
  | 'EXPERIMENT_COMPLETED'
  | 'LEARNED_RULE_CREATED'
  | 'METRIC_SNAPSHOT_RECORDED';

export interface HomesteadSimulationEvent<TPayload = unknown> {
  id: string;
  scenarioId: string;
  day: number;
  sequence: number;
  type: HomesteadSimulationEventType;
  payload: TPayload;
}

export function createHomesteadEvent<TPayload>(
  scenarioId: string,
  day: number,
  sequence: number,
  type: HomesteadSimulationEventType,
  payload: TPayload,
): HomesteadSimulationEvent<TPayload> {
  return {
    id: `${scenarioId}:${day}:${type}:${sequence}`,
    scenarioId,
    day,
    sequence,
    type,
    payload,
  };
}
