# Site Planner (ORCHADE SITE PLANNER 001)

Tracking issue: `ORCHADE SITE PLANNER 001 — 10-Guntha Sovereign Homestead Designer`.

Site Planner turns Orchade into a dimension-aware tool for designing and
testing a real small homestead before physical construction:

```
DRAW / DEFINE REAL LAND -> PLACE REAL SYSTEMS -> CONNECT RESOURCE FLOWS
  -> COMPILE SITE INTO HOMESTEAD SCENARIO -> RUN EXISTING DETERMINISTIC SIMULATION
  -> SEE PHYSICAL + OPERATIONAL FAILURES -> MODIFY LAYOUT / CONFIGURATION
  -> CREATE IMMUTABLE REVISION -> COMPARE 365-DAY RESULTS
```

It is not CAD/BIM software, not a construction-engineering certification
tool, and not a decorative farming game. It answers one question: *given
this actual piece of land, household, infrastructure and budget, is this
proposed homestead physically and operationally feasible?*

## Scope of this PR

This first PR implements only the spatial layer and its bridge into the
existing simulation engine:

- **Canonical geometry contracts** (Part A) -- `gameplay/site-planner/internal/geometry.ts`
- **Module contracts + catalog** (Part B) -- `gameplay/site-planner/internal/moduleCatalog.ts`, `factory.ts`
- **Placement engine** (Part C) -- `gameplay/site-planner/internal/placement.ts`
- **Access/reachability graph** (Part D, minimal grid BFS) -- `gameplay/site-planner/internal/access.ts`
- **Resource graph validation** (Part E) -- folded into `internal/validation.ts`
- **Site -> homestead scenario compiler** (Part G) -- `gameplay/site-planner/internal/compiler.ts`
- **10-guntha reference fixture** (Part H) -- `gameplay/site-planner/fixtures/reference10Guntha.ts`
- **Deterministic tests** (subset of Part S/T) -- `gameplay/site-planner/tests/sitePlanner.test.ts`

Deliberately **not** in this PR (see the parent issue for the full
implementation order): spatial distance costs (Part F), the bottleneck
panel (Part K), the revision/comparison system (Parts L/M), the
land-utilisation panel (Part N), any UI (Part O/P), blank-site UI wiring
beyond the existing factory (Part Q), and import/export (Part R). Every one
of those builds on the contracts here without changing them.

## Architecture

```
gameplay/site-planner/
  public.ts              # All exported types and contracts
  state.ts                # createRectangularSiteGeometry(), createBlankSiteProject()
  api.ts                  # Public re-exports
  internal/
    geometry.ts            # Polygon area, self-intersection, overlap, point-in-polygon, unit conversions
    moduleCatalog.ts        # Per-module-type defaults: footprint, access requirement, resource I/O, cost
    factory.ts               # createSiteModule() from catalog defaults
    access.ts                # Deterministic grid-BFS reachability from access points
    validation.ts            # validateSiteProject(): every FATAL + ADVISORY failure check
    placement.ts             # applySitePlacementIntent(): the only sanctioned mutation path
    compiler.ts               # compileSiteProjectToHomesteadScenario()
    scenarioAssumptions.ts     # DEFAULT_SITE_SCENARIO_ASSUMPTIONS (Part U: named, documented, overridable)
    hash.ts                    # geometryHash / moduleHash / resourceGraphHash / siteHash
  fixtures/
    reference10Guntha.ts        # ORCHADE-SITE-001
  tests/
    sitePlanner.test.ts          # runSitePlannerTests()
```

Extends (never replaces) two existing canonical unions in
`src/simulation/homestead/scenario.ts` so the compiler can map site modules
precisely instead of lossily: `LandPlacementType` gained `workshop`,
`nursery`, `vermicompost`, `biogas`, `battery`, `grid`, `food-storage`,
`equipment-storage`, `road`, `path`, `service-area`; `FoodProducerType`
gained `nursery`. These are additive-only changes with no runtime version
bump, since `validateHomesteadScenario` never enumerates these unions at
runtime. `src/simulation/homestead/units.ts` gained `guntha`/`m2`
conversion (1 acre = 40 guntha; vigha stays excluded, as required, because
its size varies by region).

## Fatal vs. advisory failures

`SiteValidationFailureType` splits into two buckets (`public.ts`):

- **FATAL** (`FATAL_SITE_FAILURE_TYPES`): `INVALID_SITE_GEOMETRY`,
  `OUTSIDE_BOUNDARY`, `MODULE_OVERLAP`, `INSUFFICIENT_AREA`,
  `INVALID_DIMENSIONS`, `EXCLUDED_ZONE_COLLISION`, `DUPLICATE_MODULE_ID`,
  `CIRCULAR_MODULE_DEPENDENCY`, `INVALID_INTENT`. These reject a placement
  intent outright (state unchanged) and would block compilation.
- **ADVISORY** (`ADVISORY_SITE_FAILURE_TYPES`): `ACCESS_BLOCKED`,
  `RESOURCE_CONNECTION_MISSING`, `MODULE_DEPENDENCY_MISSING`. These are
  reported as evidence but never block placement or compilation, because
  they can be resolved by a later placement/connection in the same
  session, and because the underlying simulation engine reasons over
  aggregated scenario numbers rather than the resource graph itself.

This means a compiled scenario can carry advisory failures (e.g. "chicken
coop has no FEED connection") while still being fully runnable -- which is
the point: the 365-day run is where the *consequences* of an unconnected
system show up as an operational failure, not a blocked placement.

## Determinism guarantees

- Every function in `internal/` is pure: same inputs, same outputs.
- No `Math.random`, `Date.now`, or `crypto.randomUUID` anywhere in the
  module (enforced by a static-scan test).
- `applySitePlacementIntent` never mutates its input `SiteProject`; it
  returns a new project or the original, unchanged, on rejection.
- `siteHash`/`moduleHash`/`geometryHash`/`resourceGraphHash` reuse the
  existing `engine/replay/checksum.ts` checksum, so identical site state
  always hashes identically.

## See also

- `docs/SITE_GEOMETRY.md`
- `docs/SITE_MODULES.md`
- `docs/SITE_SCENARIO_COMPILER.md`
- `docs/SITE_PLANNER_SCIENTIFIC_BOUNDARY.md`
