import type { EngineEvent, EngineEventType } from './eventTypes';
export type EventHandler<T = unknown> = (event: EngineEvent<T>) => void | Promise<void>;
export type Subscription = { id: string; type: EngineEventType | '*'; handler: EventHandler; once?: boolean; enabled: boolean; priority: number };
