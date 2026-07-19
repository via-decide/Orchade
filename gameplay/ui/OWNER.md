# Ui Ownership

## Responsibilities
Owns gameplay-facing presentation contracts, tabs, and view model boundaries.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- farming
- inventory
- economy
- weather

## Public interfaces
- `GameplayTab`
- `UiState`
- `setActiveTab`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
