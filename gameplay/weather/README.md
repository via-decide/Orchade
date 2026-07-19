# Weather Feature Capsule

## Purpose
Owns weather types, forecasts, climate modifiers, and weather event contracts.

## Responsibilities
- Maintain weather domain rules and state transitions.
- Expose stable public contracts from `public.ts` and `api.ts`.
- Keep UI adapters in `ui.ts` thin and replaceable.

## Architecture
This capsule separates public contracts, state shape, UI adapters, and internal implementation notes. Existing runtime code may still live in `src/` during the incremental migration; this folder is the authoritative boundary for future work.

## Public API
- `WeatherState`
- `WeatherKind`
- `describeWeather`

## Internal API
Internal implementation belongs under `internal/` and must not be imported by other modules.

## Dependencies
- world

## Events
- `WEATHER_UPDATED`

## State ownership
Owns only state declared in `state.ts`; cross-module data should be referenced through public APIs or events.

## Current limitations
- Runtime extraction from `src/App.tsx` is intentionally incremental to avoid breaking behavior.
- Tests are scaffolded and should be filled as code migrates.

## Future roadmap
- Move domain logic from `src/` into `internal/`.
- Add capsule-level unit tests.
- Document new events in `docs/events.md`.

## Example usage
```ts
import * as weather from './public';
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
