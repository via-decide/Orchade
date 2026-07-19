# Farming Ownership

## Responsibilities
Owns orchard plant lifecycle, growth state, harvest readiness, and farm actions.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- weather
- world
- ui

## Public interfaces
- `FarmingState`
- `PlantSummary`
- `selectHarvestablePlants`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
