import type { EngineEvent, EngineEventType, EventFilter } from './eventTypes';
import { dispatch } from './dispatcher';
import type { EventHandler, Subscription } from './subscriptions';

type QueuedEvent = EngineEvent & { deliverAtTick: number };

export class EngineEventBus {
  private subscriptions = new Map<string, Subscription>();
  private history: EngineEvent[] = [];
  private queue: QueuedEvent[] = [];
  private sequence = 0;

  subscribe(type: EngineEventType | '*', handler: EventHandler): () => void {
    const id = `sub-${++this.sequence}`;
    this.subscriptions.set(id, { id, type, handler, enabled: true });
    return () => this.subscriptions.delete(id);
  }

  emit<T>(type: EngineEventType, payload: T, tick: number, replayable = true): EngineEvent<T> {
    const event = this.create(type, payload, tick, replayable);
    this.record(event);
    dispatch(event, this.subscriptions.values());
    return event;
  }

  queueEvent<T>(type: EngineEventType, payload: T, tick: number, delayTicks = 0, replayable = true): EngineEvent<T> {
    const event = this.create(type, payload, tick, replayable);
    this.queue.push({ ...event, deliverAtTick: tick + delayTicks });
    return event;
  }

  flush(tick: number): EngineEvent[] {
    const ready = this.queue.filter(event => event.deliverAtTick <= tick);
    this.queue = this.queue.filter(event => event.deliverAtTick > tick);
    ready.forEach(event => { this.record(event); dispatch(event, this.subscriptions.values()); });
    return ready;
  }

  inspect(filter: EventFilter = {}): readonly EngineEvent[] {
    return this.history.filter(event => (!filter.type || event.type === filter.type)
      && (!filter.sinceTick || event.tick >= filter.sinceTick)
      && (!filter.untilTick || event.tick <= filter.untilTick)
      && (!filter.replayableOnly || event.replayable));
  }

  private create<T>(type: EngineEventType, payload: T, tick: number, replayable: boolean): EngineEvent<T> {
    return { id: `${tick}-${++this.sequence}-${type}`, type, tick, createdAt: tick, payload, replayable };
  }

  private record(event: EngineEvent): void { this.history.push(event); if (this.history.length > 5_000) this.history.shift(); }
}
