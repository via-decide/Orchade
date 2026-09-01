# Site Modules (Part B) and Placement (Part C)

`gameplay/site-planner/internal/moduleCatalog.ts`, `factory.ts`,
`placement.ts`, `access.ts`.

## The 23 module classes

`RESIDENCE`, `WORKSHOP`, `GREENHOUSE`, `VEGETABLE_BED`, `STAPLE_FIELD`,
`ORCHARD`, `NURSERY`, `CHICKEN_COOP`, `SMALL_LIVESTOCK`, `COMPOST`,
`VERMICOMPOST`, `BIOGAS`, `RAIN_CATCHMENT`, `WATER_TANK`, `POND`,
`SOLAR_ARRAY`, `BATTERY`, `GRID_CONNECTION`, `SHED`, `FOOD_STORAGE`,
`EQUIPMENT_STORAGE`, `ROAD`, `PATH`, `SERVICE_AREA`.

## Catalog: the one place assumptions live

Every module type has a `SiteModuleTemplate` in `SITE_MODULE_CATALOG`:
default footprint, access requirement, required resource inputs, resource
outputs it can supply, labour/energy/water baselines, capital + operating
cost, evidence level, and which other module types it may legally overlap
(`allowedOverlapWith`). No placement, validation, compiler, or (future) UI
code hardcodes a module-specific number -- it all reads from this one file,
per Part F/U's "isolated, documented, configurable" requirement.

Roof-mounted accessories are modeled as explicit legal overlaps:
`SOLAR_ARRAY`, `BATTERY`, and `RAIN_CATCHMENT` may overlap `RESIDENCE`,
`WORKSHOP`, or `SHED` (and each other, when several accessories share one
roof). Two ground buildings can never legally overlap.

`createSiteModule(options)` (`factory.ts`) builds a `SiteModuleDefinition`
from the catalog, with explicit overrides for width/depth/rotation/capacity.

## Placement is the only sanctioned mutation path

`applySitePlacementIntent(project, intent)` is pure and deterministic:

1. Builds a candidate `SiteProject` from the intent (`PLACE_MODULE`,
   `MOVE_MODULE`, `ROTATE_MODULE`, `RESIZE_MODULE`, `REMOVE_MODULE`,
   `ENABLE_MODULE`, `DISABLE_MODULE`).
2. Structurally invalid intents (target module missing, `PLACE_MODULE`
   without a `moduleType`, duplicate id on create) are rejected immediately
   as `INVALID_INTENT`, with the original project returned unchanged.
3. Otherwise runs `validateSiteProject` on the candidate. Any FATAL failure
   (see `docs/SITE_PLANNER.md`) rejects the whole intent -- state is never
   partially applied.
4. On acceptance, returns the new project plus any ADVISORY failures and a
   `SiteEvent` describing what happened.

React (or any other caller) must never construct or mutate
`SiteProject.modules` directly -- only through this function. That
invariant is enforced by a test that snapshots the input project's
checksum before and after every placement call.

## Access / reachability (Part D, minimal)

`isModuleReachable(geometry, modules, target)` answers one question: can
you get from a compatible access point to this module's footprint without
crossing another enabled, non-traversable module or leaving the boundary?

This is a fixed-resolution grid flood fill (BFS), not a road-engineering
model:

- Grid resolution is 0.5 m, auto-coarsened if a site would need more than
  40,000 cells.
- `PATH`, `ROAD`, and `SERVICE_AREA` modules are traversable -- they never
  block the flood fill.
- Each module's `accessRequirement` (`pedestrian` / `operator` /
  `maintenance` / `service` / `vehicle`, or `null` for none) maps to which
  `SiteAccessPoint` types can serve it (`COMPATIBLE_ACCESS_POINTS`); a
  `main-gate` point satisfies every requirement.
- A module with no access requirement (e.g. `RAIN_CATCHMENT`) is always
  considered reachable.

Failing this check produces the ADVISORY `ACCESS_BLOCKED` failure -- it
never blocks placement, since a later path/gate addition can resolve it.
