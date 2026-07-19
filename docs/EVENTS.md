# Events

Events are the only supported communication path between gameplay capsules.

## Lifecycle

Events may be emitted synchronously, queued for the current tick, or delayed to a future tick. Dispatch honors subscription priority, supports wildcard subscribers, once-only handlers, cancellation, history inspection, replay flags, and a dead-letter queue for failed dispatch.

## Replay semantics

Replayable events are stored with deterministic tick metadata. Non-replayable diagnostics may still appear in history but should not affect simulation state.
