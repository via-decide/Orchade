# Site -> Homestead Scenario Compiler (Part G)

`gameplay/site-planner/internal/compiler.ts`.

This is the integration boundary between the spatial layer and the
existing canonical simulation engine. **There is exactly one simulation
engine in Orchade.** The compiler's only job is to turn a `SiteProject`
into a `HomesteadScenarioDefinition` that the existing
`validateHomesteadScenario` / `runProject001Scenario` pipeline can run
unmodified.

```ts
compileSiteProjectToHomesteadScenario(
  project: SiteProject,
  assumptionsOverride?: Partial<SiteScenarioAssumptions>,
): { scenario: HomesteadScenarioDefinition; failures: SiteValidationFailure[] }
```

## Fail-closed on FATAL failures only

The compiler runs `validateSiteProject` first. If any FATAL failure exists
(self-intersecting geometry, a module outside the boundary, an illegal
overlap, ...), it throws -- a physically impossible site cannot be
compiled at all. ADVISORY failures (missing resource connection, blocked
access, missing dependency) are returned alongside the compiled scenario:
the underlying engine reasons over aggregated scenario numbers, not the
site's resource graph, so a spatially valid site is always runnable even
if some infrastructure connection is missing -- that gap should show up as
an *operational* failure during the 365-day run, not block the run itself.

## Mapping table

| Site module type(s) | Maps to |
|---|---|
| `VEGETABLE_BED`, `STAPLE_FIELD`, `ORCHARD`, `GREENHOUSE`, `NURSERY` (enabled) | `FoodProducerDefinition`, one per module |
| `CHICKEN_COOP`, `SMALL_LIVESTOCK` (enabled) | `LivestockScenarioDefinition` (`chickens` / `sheep`) |
| `WATER_TANK`, `POND` capacities (enabled) | summed into `water.tankCapacityL` / `water.pondCapacityL` |
| `RAIN_CATCHMENT` footprint (enabled) | `water.catchmentAreaM2` (and reused as `water.runoffAreaM2` -- a documented known limitation: a single shared catchment total feeds both tank and pond) |
| `SOLAR_ARRAY` capacity (enabled) | `energy.solarCapacityKw` |
| `BATTERY` capacity (enabled) | `energy.batteryCapacityKwh` |
| `GRID_CONNECTION` present (enabled) | `energy.gridEnabled` and `operatingPolicy.allowGridImport` |
| `BIOGAS` production (enabled) | `energy.biomassKwhPerDay` |
| `RESIDENCE` consumption (enabled) | `energy.householdLoadKwhPerDay` |
| every other enabled module's consumption | summed into `energy.farmBaseLoadKwhPerDay` |
| every module, enabled or not | one `LandPlacementDefinition` each (Part N: disabled modules still occupy land) |
| `ROAD`, `PATH`, `SERVICE_AREA` footprint + excluded zones + existing structures | `land.reservedAreaM2` (non-productive) |
| every enabled module's `economicProfile.operatingCostPerDay` | summed into `economy.dailyPropertyOperatingCost` |

Every crop/livestock module's per-instance numbers (cycle length, water
demand, calories, labour, ...) come from
`DEFAULT_SITE_SCENARIO_ASSUMPTIONS.cropProfiles` /
`.livestockProfiles` in `scenarioAssumptions.ts` -- one named,
documented, overridable file, not scattered magic numbers. Crop
`cropId` is a generic `site-module:<TYPE>` tag; real crop-variety
selection is a later UI-driven extension, not part of this PR.

A few structural mapping choices live as named constants at the top of
`compiler.ts` (initial fill fractions, capture efficiency, leakage
fraction, etc.) rather than in `SiteScenarioAssumptions`, because they are
compiler-internal modeling choices, not numbers a planner tunes per site.

## Extending the canonical scenario schema

Two existing unions in `src/simulation/homestead/scenario.ts` were
extended additively (new literal members only) so the compiler could map
precisely instead of lossily: `LandPlacementType` and `FoodProducerType`.
`validateHomesteadScenario` never enumerates these unions at runtime (it
only checks numeric/id invariants), so this required no schema-version
bump and is fully backward compatible with every existing scenario
fixture.

## Determinism

The compiler is a pure function of `(project, assumptions)`: no
`Date.now`, `Math.random`, or `crypto.randomUUID`. Compiling the same
`SiteProject` twice always produces byte-identical
`HomesteadScenarioDefinition` output (checked by test).
