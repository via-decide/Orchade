import type { EngineEvent } from './eventTypes';
import type { Subscription } from './subscriptions';
export function dispatch(event: EngineEvent, subscriptions: Iterable<Subscription>): string[] {
  const invoked: string[] = [];
  for (const sub of subscriptions) {
    if (!sub.enabled) continue;
    if (sub.type === '*' || sub.type === event.type) { sub.handler(event); invoked.push(sub.id); }
  }
  return invoked;
}
