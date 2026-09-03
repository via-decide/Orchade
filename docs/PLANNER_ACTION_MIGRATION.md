# Plot Planner Action Migration Inventory

Required first step of #59 (ORCHADE-RUNTIME-001). Classifies every state-changing handler
in `src/components/PlotPlanner.tsx` (as of deployed commit `9da7759`, branch
`feat/orchade-daxini-mount-rebuild`, the commit currently served at `daxini.xyz/games/orchade`)
before any migration code is written, per that issue's explicit instruction: *"Do not start
migrating handlers before this inventory is reviewed in the PR."*

No handler code is changed in this PR. This is inventory + contracts only (issue #59's own
"001A" scope).

## Classification key

- `UI_ONLY` — presentation/selection/drag state. Never touches simulation-truth state
  (`zones`, `paddocks`, `pantry`, `waterState`, `solarState`, `researchState`).
- `PROPERTY_REVISION_ACTION` — changes persistent property configuration. Should produce
  `PropertyRevision` lineage once migrated (issue #59, "PropertyRevision migration").
- `OPERATIONAL_RUNTIME_ACTION` — runtime event against a fixed revision (issue #59: *"do
  not force every daily operation into a new property revision if it is operational
  history rather than property design"*).
- `ECONOMY_ONLY` — economic transaction; must be separated from physical/property truth
  per issue #59's economy migration section.

Two pre-existing findings that go beyond what issue #59's own text called out, found by
reading every handler body rather than assuming from the handler name:

1. `handleMouseUp` (zone drag-and-drop repositioning) is **not** presentation-only — it
   calls `setZones(...)` with a new `col`/`row` on drop, which is simulation-truth (zone
   position affects sun exposure and inter-zone synergies via `getZoneSynergies`). It is
   not in issue #59's own enumerated scope list and needed to be added here.
2. `handleHarvestZone` calls `Math.random()` directly (line 864) for yield, and three
   handlers derive simulation-affecting entity IDs from `Date.now()` — both explicitly
   forbidden by issue #59's "Critical boundaries" #4 and #5. These are **already-shipping
   determinism breaks** in the live, sold ("Orchade Execution", ₹2,999) build, not just
   migration debt. Flagged per-row below; recommend prioritizing these two independent of
   migration sequencing, since every other `OPERATIONAL_RUNTIME_ACTION` test in the
   required-test list (#3, #4, #15) already fails against current code.

## Handler inventory

| Handler | Line | Class | Notes |
|---|---|---|---|
| `handleZoneMouseDown` | 297 | `UI_ONLY` | Dispatches to `handleTendZone`/`handleHydrateZone`/`handleHarvestZone` based on active tool; sets `selectedZoneId` + drag-start refs. The mutation, if any, happens in the dispatched handler, not here. |
| `handleZoneMouseEnter` | 348 | `UI_ONLY` | Same dispatch pattern, for drag-sweep across zones. |
| `handleMouseMove` | 362 | `UI_ONLY` | Drag preview position only (`dragPreviewPos`), no `zones` mutation until drop. |
| `handleMouseUp` | 400 | **`PROPERTY_REVISION_ACTION`** | Not presentation — see finding 1 above. `setZones` on drop with collision check. Zone layout is closer to property configuration than daily operation: it's not undone by advancing a day, and other systems (synergies, sun exposure) key off it. |
| `handleZoneTouchStart` / `handleTouchMove` / `handleTouchEnd` | 443 / 450 / 457 | `UI_ONLY` | Touch equivalents of the above three; same classification. |
| `onGlobalMouseUp` (in `useEffect`) | 462 | `UI_ONLY` | Resets internal refs only. |
| `handleAdvanceDay` | 592 | *(reference — already correct)* | Already routes through `advanceHomesteadDay()`. This is the pattern every other handler below should converge on. Note it also drives `advanceNewGameDay`/`processSimulationConsequences` from `gameplay/director/api` — the one place the director module is currently wired in. |
| `handleAdoptBreed` | 634 | **`PROPERTY_REVISION_ACTION`** | Issue #59 names "livestock additions" explicitly as revision-producing. Currently: `spendCredit()` then unconditional `setPaddocks([...prev, newPaddock])` — no validation/mutation separation (Critical boundary #3 violation). Paddock `id` uses `` `pad-${Date.now()}` `` — wall-clock ID (Critical boundary #5 violation). |
| `handleRotatePaddock` | 660 | `OPERATIONAL_RUNTIME_ACTION` | Moves existing livestock between zones; reversible, no new property config. |
| `handleHarvestLivestockYield` | 675 | `OPERATIONAL_RUNTIME_ACTION` | Pantry item `id` uses `` `livestock-${Date.now()}` `` — wall-clock ID violation. Grants credit directly coupled to the harvest mutation, no atomicity boundary. |
| `handleUpgradeWater` | 707 | **`PROPERTY_REVISION_ACTION`** | Issue #59 names "water... upgrade" explicitly. `spendCredit()` → direct `setWaterState` capacity increase, same coupling violation as `handleAdoptBreed`. |
| `handleUpgradeSolar` | 724 | **`PROPERTY_REVISION_ACTION`** | Same pattern as water upgrade, for solar/battery capacity. |
| `handleToggleGenerator` | 742 | `OPERATIONAL_RUNTIME_ACTION` | Daily on/off toggle, not persistent structural change (no cost, fully reversible). |
| `handleHydrateZone` | 751 | `OPERATIONAL_RUNTIME_ACTION` | Watering — issue #59's own example of an operational action against a fixed revision. |
| `handleTendZone` | 777 | `OPERATIONAL_RUNTIME_ACTION` | Cultivation — same category. |
| `handleApplyAmendment` | 822 | `OPERATIONAL_RUNTIME_ACTION` | Soil amendment application. Still credit-coupled (`spendCredit()` → direct `setZones`), needs the same economy/physical separation as the `PROPERTY_REVISION_ACTION` rows even though the action itself is operational, not structural. |
| `handleHarvestZone` | 851 | `OPERATIONAL_RUNTIME_ACTION` | **`Math.random()` at line 864** — direct violation of Critical boundary #4 (see finding 2). Pantry item `id` uses `` `p-${Date.now()}` `` — Critical boundary #5 violation. This handler alone breaks required tests #3, #4, and #15. |
| `handleLoadPreset` | 905 | **`PROPERTY_REVISION_ACTION`** | Issue #59's own primary example — see its full "Presets" section. Currently: direct `setTotalAcreage` + `setZones` replacement, no parent-revision lineage, no content-hash freeze, no audit-timestamp isolation from semantic hash. |
| `handleSellPantryItem` | 963 | `ECONOMY_ONLY` | Issue #59 explicitly names "pantry sale" under Economy/inventory. Grants credit and decrements existing pantry qty — no new physical/property truth created, an economic transaction against existing inventory. |
| `handlePreservePantryItem` | 979 | `OPERATIONAL_RUNTIME_ACTION` | Changes preservation method/quality of existing pantry items. No credit involved — operational processing step, not an economic transaction. |

**Totals:** 6 `UI_ONLY` (unchanged), 6 `PROPERTY_REVISION_ACTION`, 8 `OPERATIONAL_RUNTIME_ACTION`,
1 `ECONOMY_ONLY`, 1 reference-correct (`handleAdvanceDay`). 15 non-UI handlers to migrate,
matching issue #59's own "~15 handlers" estimate.

## Existing conventions checked, to avoid duplicating canonical contracts

- `src/simulation/homestead/revision.ts` already implements `ScenarioRevisionInput` /
  `createScenarioRevision()` — but operates on the *compiled* `HomesteadScenarioDefinition`
  schema (the Project 001 / scenario-compiler layer), not on Plot Planner's own
  `ZoneData`/`PaddockState`/`PantryItem` state. This confirms the new
  `PlannerActionIntent` pipeline is a distinct, adjacent layer — it should not attempt to
  reuse `ScenarioRevisionInput` directly, but its `PropertyRevision` output shape should
  stay structurally consistent with it (parent lineage, content hash, reason, evidence
  refs) so a future Site Planner (#55) compiler integration isn't fighting two divergent
  revision shapes.
- `src/simulation/homestead/events.ts` already defines a large `HomesteadSimulationEventType`
  union (`CROP_HARVESTED`, `IRRIGATION_APPLIED`, `RESEARCH_CREDIT_GRANTED`, etc.) — the new
  `PlannerRuntimeEvent` type (see contracts file) reuses these string literals directly
  where the concept overlaps, rather than inventing parallel names.
- `gameplay/research-credits/api.ts` already exports `credit`/`debit` (aliased in
  `PlotPlanner.tsx` as `grantCredit`/`spendCredit`) with typed `CreditSource`/`DebitReason`
  inputs. The new economy-boundary contracts reuse these types rather than re-typing credit
  transactions.
- `gameplay/director/api.ts` already exists (`deriveNextPlayerObjective`,
  `deriveAvailablePlayerActions`, `advanceNewGameDay`, `processSimulationConsequences`) —
  this is #54's target surface. A code comment at `PlotPlanner.tsx:92-99` (existing,
  unmodified by this PR) already documents that this module is wired for day-advancement
  only and not for placement/zone intents, which is precisely #54's scope. Not migrated
  here — flagged for #54's own PR — but the canonical dispatcher this issue builds (001B)
  is what #54 point 6 needs in order to route accepted placements into real simulation
  input without inventing a second transition path.

## Next steps (not this PR)

Per issue #59's suggested split, 001B (central deterministic action dispatcher) is the
next unit of work, followed by 001C–G (per-category handler migration) in the order the
issue specifies. This PR intentionally stops at inventory + contracts.
