# Scientific / Engineering Boundary (Part U)

Orchade tests a plan under explicit assumptions. A deterministic result is
reproducible, not automatically scientifically or engineering validated.

Site Planner (and the homestead engine it compiles into) does **not**
claim:

- structural safety,
- building-code compliance,
- legal land-use approval,
- agronomic yield guarantees,
- groundwater availability,
- potable water safety,
- veterinary suitability,
- electrical certification,
- guaranteed self-sufficiency,
- guaranteed farm profitability.

Every module template in `SITE_MODULE_CATALOG`
(`gameplay/site-planner/internal/moduleCatalog.ts`) and every default in
`DEFAULT_SITE_SCENARIO_ASSUMPTIONS`
(`gameplay/site-planner/internal/scenarioAssumptions.ts`) is tagged
`evidenceLevel: 'ASSUMED'`. Future evidence may improve these numbers, but
historical simulation revisions must never be rewritten retroactively --
only new revisions carry new assumptions forward.

## Known limitations of this PR's compiler

These are explicitly acknowledged simplifications, not hidden bugs:

- A site may have multiple `WATER_TANK` or `POND` modules; the compiler
  aggregates their capacities into the engine's single canonical tank and
  pond, since the underlying simulation only models one of each.
- `RAIN_CATCHMENT` footprint is reused as both the tank's catchment area
  and the pond's runoff area (no separate catchment split is modeled yet).
- Crop and livestock agronomic numbers are per-module-type flat
  assumptions (`SiteCropAssumptionProfile` / `SiteLivestockAssumptionProfile`),
  not per-variety data -- crop-variety selection is deferred to a later,
  UI-driven PR.
- `SMALL_LIVESTOCK` always compiles to the engine's `sheep` type; the
  actual species (goats, sheep, etc.) is not yet configurable.
- The resource-connection graph (Part E) is validated for presence, not
  consumed quantitatively by the simulation -- a missing connection
  surfaces as an advisory `RESOURCE_CONNECTION_MISSING` finding, but the
  365-day run still uses the compiler's aggregated scenario numbers.

## Future sensor / live mode boundary (Part V)

Not implemented in this PR. The intended future boundary is:

```
PLAN    -> simulated state
LIVE    -> accepted observations
COMPARE -> plan vs. actual
CALIBRATE -> proposed scenario revision
```

Incoming sensor data must never rewrite a historical simulation run --
only ever propose a new, separately-evidenced revision. Extension points
to leave open for later work: soil/substrate sensors, water meters, tank
level, weather station, energy meter, load cells, cameras, pump state,
irrigation state.
