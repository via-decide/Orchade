# Inventory Ownership

## Responsibilities
Owns item, equipment, and inventory persistence contracts.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- farming
- crafting
- economy

## Public interfaces
- `InventoryItem`
- `InventoryState`
- `createEmptyInventory`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
