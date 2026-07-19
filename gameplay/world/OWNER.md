# World Ownership

## Responsibilities
Owns orchards, locations, scene state, and world progression boundaries.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- weather

## Public interfaces
- `WorldState`
- `WorldLocation`
- `advanceWorldDay`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
