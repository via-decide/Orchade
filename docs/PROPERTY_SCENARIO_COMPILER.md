# Property -> Scenario Compiler

`src/property/scenarioCompiler.ts`. Section 37 of ORCHADE P0.

## The one hard boundary

No feature -- not `gameplay/site-planner` (still compiling independently
for now, see `docs/PROPERTY_MODEL_MIGRATION.md`'s Wave 11 note), not the
equipment candidate-test workflow, not any future UI -- may construct a
`HomesteadScenarioDefinition` by hand. Everything goes through
`compilePropertyRevisionToHomesteadScenario()`.

```ts
function compilePropertyRevisionToHomesteadScenario(
  revision: PropertyRevision,
  options?: {
    assumptions?: Partial<PropertyScenarioAssumptions>;
    equipmentInstances?: PropertyEquipmentInstance[];   // section 37's "pinned EquipmentTwin revisions"
  },
): { scenario: HomesteadScenarioDefinition; notes: PropertyScenarioCompilerNote[] }
```

The input `PropertyRevision` is already known-valid --
`createPropertyRevision` validates the whole graph before a revision can
even exist. This compiler therefore doesn't re-validate; it maps, and
separately reports advisory `notes` (see
`docs/PROPERTY_RESOURCE_GRAPH.md`) that never block compilation.

## Mapping table

| Property concept | Scenario field |
|---|---|
| Sum of `PARCEL` entities' `footprintM2` | `land.totalAreaM2` (throws if zero -- a property cannot compile without land) |
| `PATH`/`ROAD`/`SERVICE_AREA`/`EXCLUDED_ZONE` footprint | `land.reservedAreaM2` |
| Every addressable entity with a land-placement mapping | `land.placements` (present regardless of operational status -- Part N: even an INACTIVE entity still occupies its footprint) |
| `VEGETABLE_BED`/`STAPLE_FIELD`/`ORCHARD`/`GREENHOUSE`/`NURSERY` (operational only) | `foodProducers`, via `PropertyScenarioAssumptions.cropProfiles` |
| `CHICKEN_COOP`/`SMALL_LIVESTOCK` (operational only), `physical.capacity` as head count | `livestock`, via `.livestockProfiles` |
| `WATER_TANK`/`POND` `physical.capacity` | `water.tankCapacityL` / `.pondCapacityL` |
| `RAIN_CATCHMENT` `physical.footprintM2` | `water.catchmentAreaM2` (reused as `runoffAreaM2`, a documented known limitation shared with Site Planner) |
| `SOLAR_ARRAY` / `BATTERY` `physical.capacity` | `energy.solarCapacityKw` / `.batteryCapacityKwh` |
| `GRID_CONNECTION` present (operational) | `energy.gridEnabled` and `operatingPolicy.allowGridImport` |
| `RESIDENCE`'s `resourceInputs` ENERGY rate | `energy.householdLoadKwhPerDay` |
| every other operational entity's ENERGY resourceInputs minus resourceOutputs | `energy.farmBaseLoadKwhPerDay` (floored at 0) |
| every operational entity's `economicProfile.operatingCostPerDay` | `economy.dailyPropertyOperatingCost` |
| `revision.intent.householdIntent.size` | `household.members` |
| `revision.intent.seed` | `scenario.seed` |

Entities read their own declared `resourceInputs`/`resourceOutputs`/
`physical`/`labourProfile`/`economicProfile` fields directly -- there is
no per-entity-type catalog to consult (unlike `gameplay/site-planner`'s
`SITE_MODULE_CATALOG`). This is deliberate: a `PropertyEntity` is data the
caller fully specifies, not an instance of a fixed template.

`PARCEL`, `ZONE`, `ACCESS_POINT`, `HOUSEHOLD` entities are excluded from
`land.placements` on purpose: `PARCEL` defines the container rather than
occupying it, `ZONE` is an informational grouping (not yet consumed),
`ACCESS_POINT` has negligible footprint, and household size comes from
`PropertyIntent` rather than a `HOUSEHOLD` entity's own fields.

## Operational status gates the numbers, not the land-use accounting

Only `PLANNED`, `INSTALLED`, and `ACTIVE` entities contribute food
production, livestock, water/energy capacity, and operating cost.
`INACTIVE`/`FAILED` entities are addressable (not `REMOVED`/`HISTORICAL`)
so they still appear in `land.placements`, but contribute nothing
operational -- section 59 test 23.

## Folding in equipment (section 37's "pinned EquipmentTwin revisions")

`options.equipmentInstances` lets the equipment candidate-test workflow
(`docs/EQUIPMENT_TEST_WORKFLOW.md`) add one or more
`PropertyEquipmentInstance`s on top of an already-mapped scenario, via
`applyEquipmentInstanceDeltas` (exported from this same file): a small,
generic, documented set of numeric configuration levers
(`energyConsumptionKwhPerDay`, `waterProductionLitresPerDay`,
`purchaseCostINR`, ...) applied additively. This never reads the twin's
descriptive/commercial fields (name, source, listed price) -- only
`instance.configuration`'s numbers reach the scenario, which is what
keeps commerce and simulation strictly separate (section 42).

## Determinism

Pure function of `(revision, options)`: same revision + same assumptions
+ same equipment instances always produces a byte-identical scenario
(`tests/propertyFoundation.test.ts` test 19,
`tests/equipmentCandidateTest.test.ts`'s determinism tests).
