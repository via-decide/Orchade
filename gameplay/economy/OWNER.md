# Economy Ownership

## Responsibilities
Owns currencies, pricing rules, shop contracts, and economy telemetry.

## Owned systems
- State in `state.ts`.
- Public surface in `public.ts` and `api.ts`.
- Tests in `tests/`.

## Dependencies
- inventory
- farming

## Public interfaces
- `EconomyState`
- `PriceQuote`
- `quotePrice`

## Non-responsibilities
- Other gameplay capsules' private implementation.
- Global application shell orchestration unless explicitly documented by ADR.

## Future expansion
- Move stable runtime logic from `src/` into this capsule behind public APIs.
