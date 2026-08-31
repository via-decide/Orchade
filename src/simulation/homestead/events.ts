export type HomesteadSimulationEventType =
  | 'DAY_ADVANCED'
  | 'SEASON_CHANGED'
  | 'WEATHER_SAMPLED'
  | 'RAINFALL_OCCURRED'
  | 'WATER_BALANCE_UPDATED'
  | 'ENERGY_BALANCE_UPDATED'
  | 'LIVESTOCK_UPDATED'
  | 'CROP_UPDATED'
  | 'FROST_DAMAGE_APPLIED';

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
