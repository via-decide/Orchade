# World Feature Capsule

## Purpose
Owns orchards, locations, scene state, and world progression boundaries.

## Responsibilities
- Maintain world domain rules and state transitions.
- Expose stable public contracts from `public.ts` and `api.ts`.
- Keep UI adapters in `ui.ts` thin and replaceable.

## Architecture
This capsule separates public contracts, state shape, UI adapters, and internal implementation notes. Existing runtime code may still live in `src/` during the incremental migration; this folder is the authoritative boundary for future work.

## Public API
- `WorldState`
- `FarmTile`
- `CropInstance`
- `createFarmWorld`
- `plantCropFromInventory`
- `simulateWorldTick`
- `harvestCropToInventory`
- `serializeWorldSave`

## Internal API
Internal implementation belongs under `internal/` and must not be imported by other modules.

## Dependencies
- weather

## Events
- `PLAYER_MOVED`
- `WORLD_UPDATED`

## State ownership
Owns only state declared in `state.ts`; cross-module data should be referenced through public APIs or events.

## Current capabilities
- Deterministic tile-based farm grid with seasons and weather.
- Runtime crop instances are separated from immutable crop definitions.
- Planting consumes seed items through the inventory capsule.
- Harvesting inserts crop yield back into inventory with overflow reporting.
- Versioned save payloads persist world, inventory, weather, soil, crops, and clock state.

## Current limitations
- Runtime extraction from `src/App.tsx` remains incremental to avoid breaking existing saves and rendering behavior.
- Debug UI and overlays are not yet wired into the React shell.

## Future roadmap
- Move domain logic from `src/` into `internal/`.
- Add capsule-level unit tests.
- Document new events in `docs/events.md`.

## Example usage
```ts
import * as world from './public';
```

## Directory structure
- `README.md` — human overview.
- `AI.md` — AI contribution rules.
- `TODO.md` — local work queue.
- `CHANGELOG.md` — capsule history.
- `TESTS.md` — test strategy.
- `api.ts` — facade exports.
- `state.ts` — owned state types.
- `ui.ts` — presentation adapters.
- `public.ts` — stable external contract.
- `internal/` — private implementation.
- `tests/` — capsule tests.
