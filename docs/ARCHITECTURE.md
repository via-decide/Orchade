# Architecture

Orchade uses engine-first architecture. Gameplay systems are plugins registered into stable scheduler phases and communicate only through events.

## Layering

Runtime Kernel -> Scheduler/Events/Replay/Profiler -> Navigation/AI/World Services -> Gameplay Capsules -> UI/Renderer.

Circular dependencies across gameplay capsules are forbidden.

## Entity/component registry

Shared simulation state lives in the engine world. Gameplay capsules may add or query components through the registry, but cross-capsule behavior still flows through events and commands. This keeps ownership centralized while preserving modular systems.

## Property model invariants (ORCHADE P0)

Everything under `src/simulation/homestead/`, `src/property/`, and
`gameplay/site-planner/` sits on top of one authoritative runtime:

```
PROPERTY / REVISION -> SCENARIO COMPILATION -> EXISTING PROJECT 001 ENGINE
  -> DETERMINISTIC DAILY TRANSITIONS -> EVENTS -> FAILURES -> REPLAY -> CHECKSUMS -> METRICS
```

There is exactly one deterministic simulation engine, one observation
model, one provenance model, and one control/actuator model in this
codebase (PR #53's `src/simulation/homestead/{provenance,observation,
prediction,control,reconciliation,modelCapabilities}.ts`). Every later
addition -- Site Planner, Property Reality, EquipmentTwin -- extends these
contracts additively and compiles into the same `HomesteadScenarioDefinition`
+ `runProject001Scenario` pipeline; none of them introduce a second one.
See `docs/ORCHADE_GAMEPLAY_REFERENCE_MATRIX.md` for what UX patterns this
codebase is and is not allowed to borrow from reference games, and its
governance template for future PRs that touch UI.

The following distinctions are load-bearing and must never be collapsed
into each other:

- **Orchade = one property model.** Every feature reads and writes the
  same canonical `HomesteadScenarioDefinition` + revision chain, never a
  parallel schema of its own (Site Planner's compiler, for example, maps
  into this schema rather than replacing it).
- **Gameplay UX ≠ game physics.** A reference product's interaction
  pattern (an overlay, a catalog browser, a build-preview) may be copied;
  its physics never are.
- **Simulation-ready ≠ physically verified.** `EquipmentTwinLifecycleStatus`
  reaching `SIMULATION_READY` means enough explicit data exists to run a
  bounded simulation, not that a bench or field has confirmed anything.
  `BENCH_VERIFIED`/`FIELD_VERIFIED` require explicit evidence and are
  never inferred from source (LogicHub/Daxini) or from an earlier status.
- **REAL ≠ fully measured.** `PropertyRealityMode.REAL` describes a
  property's relationship to physical reality, not the confidence of any
  parameter on it -- a REAL property can still carry `USER_ASSUMPTION` or
  entirely unrecorded parameters (`docs/PROPERTY_REALITY_MODE.md`).
- **HYBRID = real + modeled entities in one auditable property history.**
  It is the only mode that may contain a declared `CANDIDATE` entity, and
  every reality-mode transition is an explicit new property revision --
  never an inferred one.
- **EquipmentTwinDefinition ≠ PropertyEquipmentInstance.** A twin
  describes a model/revision; an instance pins one exact revision to one
  placement in one property revision. Updating the twin catalog must never
  rewrite a historical property or simulation run
  (`docs/EQUIPMENT_TWIN.md`).
- **Marketplace/commercial metadata ≠ simulation evidence.** Source type
  (LogicHub/Daxini/external/user-defined), listing price, product name,
  and marketplace ranking never influence a candidate test's physical
  result -- only numbers explicitly placed into a
  `PropertyEquipmentInstance.configuration` do
  (`docs/EQUIPMENT_TEST_WORKFLOW.md`).
