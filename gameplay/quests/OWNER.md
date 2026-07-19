# Quests Ownership

## Responsibilities
Owns quest definitions, progress tracking, rewards contracts, and quest lifecycle.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- inventory
- farming
- npc

## Public interfaces
- `QuestState`
- `QuestProgress`
- `updateQuestProgress`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
