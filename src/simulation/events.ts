export type GameplayEventType =
  | 'GAME_BOOTED'
  | 'MAIN_MENU_OPENED'
  | 'WORLD_GENERATED'
  | 'PLAYER_SPAWNED'
  | 'SIMULATION_TICKED'
  | 'INPUT_RECEIVED'
  | 'RENDER_REQUESTED'
  | 'AUTOSAVE_COMPLETED'
  | 'SHUTDOWN_STARTED'
  | 'PLAYER_MOVED'
  | 'ITEM_PICKED'
  | 'ITEM_DROPPED'
  | 'CROP_PLANTED'
  | 'CROP_HARVESTED'
  | 'NPC_TALKED'
  | 'QUEST_STARTED'
  | 'QUEST_COMPLETED'
  | 'DAY_STARTED'
  | 'WEATHER_CHANGED';

export type GameplayEvent<TPayload = unknown> = {
  id: string;
  type: GameplayEventType;
  tick: number;
  timestamp: number;
  payload: TPayload;
};

export type EventHandler<TPayload = unknown> = (event: GameplayEvent<TPayload>) => void;

export class EventBus {
  private handlers = new Map<GameplayEventType, Set<EventHandler>>();
  private history: GameplayEvent[] = [];

  on<TPayload>(type: GameplayEventType, handler: EventHandler<TPayload>): () => void {
    const handlers = this.handlers.get(type) ?? new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.handlers.set(type, handlers);
    return () => handlers.delete(handler as EventHandler);
  }

  emit<TPayload>(type: GameplayEventType, payload: TPayload, tick = 0): GameplayEvent<TPayload> {
    const event: GameplayEvent<TPayload> = {
      id: `${type.toLowerCase()}-${tick}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      tick,
      timestamp: Date.now(),
      payload,
    };
    this.history = [event, ...this.history].slice(0, 200);
    this.handlers.get(type)?.forEach(handler => handler(event));
    return event;
  }

  getRecentEvents(): readonly GameplayEvent[] {
    return this.history;
  }
}
