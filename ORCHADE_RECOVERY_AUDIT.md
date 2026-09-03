# ORCHADE INCOMPLETE-WORK RECOVERY AUDIT

**Audited**: 2026-09-01  
**Branch**: `claude/security-leak-orchade-card-ss3sue` @ `da88327`  
**Test suite**: 255/255 passing

---

## Area-by-Area Audit

### 1. Research Credits Module
**Status: COMPLETE**

- `gameplay/research-credits/` — `api.ts`, `state.ts`, `internal/ledger.ts`, `internal/unlocks.ts`
- `credit()`, `debit()`, `performUnlock()`, `isUnlocked()`, `getStarterUnlocks()`, `UNLOCK_REGISTRY`
- Wired into `planningTransition.ts` (GRANT_RESEARCH_CREDITS, UNLOCK_CONTENT intents)
- Tests: 31/31 via `progressionContracts.test.ts`
- manifest: `"status": "in-progress"` (accurate — UI wiring incomplete, see #6/#7)

### 2. Progression Module (BUILD → OPERATE → MASTER)
**Status: COMPLETE**

- `gameplay/progression/` — `api.ts`, `state.ts`, `internal/levels.ts`, `internal/skins.ts`
- `checkLevelUp()`, `requireActiveEnvironmentSkin()`, `ProgressionState`, `EnvironmentSkin`
- Wired into `planningTransition.ts` (EVALUATE_LEVEL, SELECT_ENVIRONMENT_SKIN intents)
- Tests: 31/31 (shared with research-credits)
- manifest: `"status": "in-progress"` (accurate)

### 3. Blank-Slate Scenario
**Status: COMPLETE**

- `src/simulation/homestead/blankSlateScenario.ts` — `createBlankSlateScenario()` producing zero-infra scenario
- Skin-aware climate preset integration
- Validates against `HomesteadScenarioDefinition` schema

### 4. Season Enforcement
**Status: INCOMPLETE** (Task #4 pending)

- `UNLOCK_REGISTRY` entries have `validSeasons` field
- `planningTransition.ts:139` checks `content.validSeasons` during PLACE_COMPONENT — **backend enforced**
- **Missing**: UI-side gating in `PlotPlanner.tsx` — crop planting UI does not check `crop.seasons` vs `currentSeason`
- The simulation-side check is complete; the PlotPlanner UI bypass is the gap

### 5. Unlock Gating UI
**Status: COMPLETE**

- PlotPlanner crop selection and zone assignment UI checks `isUnlocked()` before allowing crop assignment
- Lock icons and unlock modal implemented in PlotPlanner
- Tests verify unlock flow end-to-end

### 6. Output → Research Credits Earnings
**Status: INCOMPLETE** (Task #6 pending)

- `credit()` API exists and is tested
- `GRANT_RESEARCH_CREDITS` intent works in `planningTransition.ts`
- **Missing**: No PlotPlanner UI hook to call `credit()` when crops are harvested or milestones reached
- The engine produces harvest events but the UI doesn't convert them to research credit grants

### 7. Supply Costs (Zone Placement / Crop Planting)
**Status: INCOMPLETE** (Task #7 pending)

- `debit()` API exists
- `performUnlock()` costs credits for content unlocks
- **Missing**: No per-placement credit cost in PlotPlanner UI — zones can be placed without spending credits
- The planning intent layer has cost enforcement for unlocks but not for zone placement actions

### 8. Level Progression Logic and UI
**Status: COMPLETE**

- `checkLevelUp()` with progression inputs (paid unlock count, area, etc.)
- `EVALUATE_LEVEL` intent in planning layer
- UI progression panel renders current level + history

### 9. dataSeeds → researchCredits Rename
**Status: INCOMPLETE** (Task #9 pending)

- `src/App.tsx` — 30+ references to `dataSeeds` in legacy UI code (leaderboard, state, Firebase save/load)
- `src/types.ts:56` — `dataSeeds: number` in main game state type
- `gameplay/economy/internal/transactions.ts` — `dataSeeds` in liquidation function
- The new `research-credits` module uses the correct naming (`ResearchCreditsState`, `credit`, etc.)
- **Gap**: Legacy App.tsx code and economy module still use old naming

### 10. Module Manifest
**Status: COMPLETE**

- `gameplay/module-manifest.json` has 12 modules with status, dependencies, publicApi, events
- Includes `research-credits` and `progression` modules
- Status values match reality (in-progress for active modules, planned for future)

### 11. Research Credits UI (Balance, Unlock Modal, Notifications)
**Status: COMPLETE**

- PlotPlanner header shows research credit balance
- Unlock modal for content gating
- Credit earning notifications in PlotPlanner UI

### 12. Test Suite
**Status: COMPLETE**

- 9 test modules, 255 total assertions, 0 failures
- Coverage: crops (50), farm-loop (5), determinism (6), homestead (17), project-001 (35), progression (31), system-performance (23), prerequisites (37), digital-twin (51)
- Custom test runner at `tests/runner.ts`

### 13. Push daxini.xyz Build
**Status: INCOMPLETE** (Task #14 pending)

- daxini.xyz branch `claude/security-leak-orchade-card-ss3sue` pushed at `dc778e3`
- Updated assets: `index-aFkhbpKy.js`, `index-CG4qfbEy.css`
- Updated `build.json` with source commit `da88327`
- **Gap**: Branch not yet merged to main — Vercel deploys from main, so changes are not live

### 14. Viewport-Bound UI Shell
**Status: COMPLETE**

- `src/index.css` — `.orchade-app-shell` (100dvh flex column), `.orchade-board-grid`
- `App.tsx` plot_planner wrapper uses viewport-bound classes
- `PlannerHeader`, `PersistentPlotBoard`, `PlannerTabBar` + 4 workspace panels extracted

### 15. Engine Subsystems (AI, Navigation, World)
**Status: PARTIAL (structural stubs)**

- `src/engine/ai/` — `AiAgent`, `BehaviorTree` (Sequence/Selector/Parallel/Decorator), `Blackboard`, `Memory`, `Perception`, `Planner`, `GoapAction`, `UtilityOption`
- `src/engine/navigation/` — A* pathfinding, priority queue, grid, flow field stub, region graph stub
- `src/engine/world/` — `EntityRegistry`, `WorldStreamer`, chunk/region types, loader interface
- These are **structural scaffolds** — types + minimal implementations. They are not wired into the homestead simulation (which uses its own day-step model, not the game engine tick loop)
- **Intentionally separate**: The engine is for future real-time game mode; homestead sim is its own domain

### 16. Gameplay Modules (Combat, Crafting, Quests, NPC, Inventory)
**Status: PARTIAL (planned stubs)**

- `gameplay/combat/`, `gameplay/crafting/`, `gameplay/quests/`, `gameplay/npc/`, `gameplay/inventory/`
- Each has `api.ts`, `state.ts`, `public.ts`, `ui.ts` — but api.ts is 1-2 lines (re-exports only)
- Manifest marks them as `"status": "planned"`
- Internal implementations exist for inventory (operations), NPC (routines with tests), crafting (state)
- **Not blocking**: These are future game modes, not dependencies for the homestead simulation

### 17. Waste Economy Module
**Status: COMPLETE**

- `gameplay/waste-economy/` — 266-line api.ts, 5 internal modules
- `byproducts.ts`, `composting.ts`, `contamination.ts`, `routing.ts`, `ledger.ts`
- Full closed-loop waste economy: manure → compost → soil, greywater flows, contamination tracking
- Tests: `composting.test.ts`, `contamination.test.ts`, `routing.test.ts` via dedicated runner

### 18. Weather Module
**Status: PARTIAL**

- `gameplay/weather/` — `api.ts` (2 lines), `state.ts`, `internal/climate.ts`, `ui.ts`
- Season metadata exists in `src/data/cropCatalog.ts` (SEASON_METADATA)
- Climate profiles exist in progression skins
- **Gap**: The gameplay weather module is a thin re-export; actual weather logic is inline in `advanceDay.ts` and `projectTransition.ts`

### 19. Economy Module
**Status: PARTIAL**

- `gameplay/economy/` — `api.ts` (2 lines), `state.ts`, `internal/market.ts`, `internal/transactions.ts`
- Market test exists: `economy/tests/market.test.ts`
- `transactions.ts` still uses `dataSeeds` naming
- **Gap**: The homestead simulation has its own parallel economy system in `projectState.ts` / `projectTransition.ts` (cash balance, revenue activities, operating costs). The gameplay economy module is not yet unified with it.

### 20. Auth Gate & Public Access
**Status: COMPLETE (just fixed)**

- Auth gate in `App.tsx` now bypasses for Plot Planner tab (`!isPlotPlannerTab` guard on both overlays)
- Default `activeTab: 'plot_planner'` means unauthenticated users land directly in the game
- Firebase auth still works for other tabs (lab, leaderboard, etc.)

---

## Priority Matrix

### Blocking (must fix before Issue #54)
None — all 12 onboarding layers that Issue #54 depends on are implemented and tested.

### Incomplete but Not Blocking
| Task | Status | Priority |
|------|--------|----------|
| #4 Season enforcement UI | Backend done, UI gap | Medium |
| #6 Output → credits earnings | API ready, UI not wired | Medium |
| #7 Supply costs | API ready, UI not wired | Medium |
| #9 dataSeeds → researchCredits rename | 30+ legacy refs in App.tsx | Low |
| #14 Deploy daxini.xyz | Branch pushed, needs merge | High |

### Complete
Tasks #1, #2, #3, #5, #8, #10, #11, #12, #13, #15 (viewport shell), #17 (waste economy), #20 (auth gate)

### Structural / Future
- Engine subsystems (#15 engine): structural scaffolds, not blocking
- Gameplay stubs (#16): planned modules, not dependencies
- Weather/Economy (#18/#19): partial — functional inline, gameplay modules are thin wrappers

---

## Earliest Incomplete Dependency

**Per the onboarding layer check**: Layer 13 (ACQUISITION AUTOMATION) is the only NOT IMPLEMENTED layer. All 12 prior layers are IMPLEMENTED with tests.

**Per the recovery audit**: No incomplete task blocks Issue #54. The simulation core, scenario definitions, planning intents, research credits, progression, prerequisites, digital-twin contracts, and deterministic engine are all complete and tested.

**Conclusion**: The codebase is ready for Issue #54 (deterministic new-game director / playable first-session engine). The incomplete UI tasks (#4, #6, #7, #9) are PlotPlanner-side wiring that can be addressed independently.
