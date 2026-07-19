# Debugging

Debug panels expose scheduler timings, event flow, AI state, navigation paths, replay controls, and world streaming status.

## Inspectors

Inspectors should be read-only by default. Mutating debug actions must route through commands so replay can reproduce them.
