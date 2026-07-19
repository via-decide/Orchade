export const EVENT_TYPES = [
  'CropHarvested','CropPlanted','WeatherChanged','NPCMoved','PlayerMoved','AnimalFed','QuestCompleted','PriceChanged','InventoryUpdated','RegionLoaded','RegionUnloaded','CommandIssued','SimulationTicked',
] as const;
export type EngineEventType = (typeof EVENT_TYPES)[number] | string;
export type EngineEvent<T = unknown> = { id: string; type: EngineEventType; tick: number; createdAt: number; payload: T; replayable: boolean; cancelled?: boolean; cancel(): void };
export type EventFilter = { type?: EngineEventType; sinceTick?: number; untilTick?: number; replayableOnly?: boolean };
