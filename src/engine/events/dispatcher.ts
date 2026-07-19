import type { EngineEvent } from './eventTypes';
import type { Subscription } from './subscriptions';
export function dispatch(event: EngineEvent, subscriptions: Iterable<Subscription>): string[] {
  const invoked: string[] = [];
  for (const sub of [...subscriptions].sort((a, b) => a.priority - b.priority)) {
    if (!sub.enabled) continue;
    if (event.cancelled) break;
    if (sub.type === '*' || sub.type === event.type) { void sub.handler(event); invoked.push(sub.id); }
  }
  return invoked;
}
