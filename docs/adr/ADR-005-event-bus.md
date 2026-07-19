# ADR-005: event bus

## Status
Accepted as an initial migration record.

## Context
Orchade is migrating from a monolithic app structure toward AI-native feature capsules. This decision record captures the current boundary and must be updated when architecture-changing pull requests affect this area.

## Decision
Keep current runtime behavior stable while documenting ownership and extracting code incrementally into capsule-owned public APIs and private internals.

## Consequences
- Future work has a stable documentation target.
- AI agents can reason about one system without loading the whole app.
- Runtime migration remains incremental and backwards compatible.
