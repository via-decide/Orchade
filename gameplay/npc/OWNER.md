# Npc Ownership

## Responsibilities
Owns NPC identity, dialogue hooks, schedules, and relationship state.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- quests
- world

## Public interfaces
- `NpcState`
- `NpcProfile`
- `findNpc`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
