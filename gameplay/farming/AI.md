# AI Context: Farming

## Allowed responsibilities
- Modify farming-owned docs, tests, state, and internal implementation.
- Extend public interfaces only with backwards-compatible additions.

## Forbidden responsibilities
- Do not own behavior assigned to: weather, world, ui.
- Do not import from another capsule's `internal/` directory.
- Do not change global app behavior without updating an ADR.

## Coding style
- Prefer small pure functions and explicit types.
- Keep side effects at API boundaries.
- Never wrap imports in try/catch blocks.

## Architectural rules
- `public.ts` is stable.
- `internal/` is private.
- Document new events in `docs/events.md`.

## Naming conventions
- Types use PascalCase.
- Events use SCREAMING_SNAKE_CASE.
- Functions use verb-first camelCase.

## Public interfaces
- `FarmingState`
- `PlantSummary`
- `selectHarvestablePlants`

## Internal interfaces
Internal helpers should live in `internal/` and be re-exported only through `api.ts` when safe.

## Common mistakes
- Editing unrelated capsules to complete farming work.
- Adding hidden cross-module coupling.
- Forgetting TODO, TESTS, and CHANGELOG updates.

## Files that should rarely change
- `public.ts`
- `README.md` architecture sections after stabilization

## Preferred extension points
- Add internals under `internal/`.
- Add tests under `tests/`.
- Add new public exports through `api.ts` after documenting them.
