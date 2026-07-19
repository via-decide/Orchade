# Crafting Ownership

## Responsibilities
Owns recipes, crafting validation, and item production rules.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- inventory
- economy

## Public interfaces
- `CraftingRecipe`
- `CraftingState`
- `canCraftRecipe`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
