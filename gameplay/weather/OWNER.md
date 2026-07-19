# Weather Ownership

## Responsibilities
Owns weather types, forecasts, climate modifiers, and weather event contracts.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- world

## Public interfaces
- `WeatherState`
- `WeatherKind`
- `describeWeather`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
