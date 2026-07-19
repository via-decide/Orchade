# Combat Ownership

## Responsibilities
Owns future combat encounters, damage resolution, and battle-facing state.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- inventory
- world

## Public interfaces
- `CombatState`
- `createCombatState`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
