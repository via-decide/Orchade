# Property Reality Mode

`src/property/reality.ts`. Parts 2-4 of ORCHADE P0.

## The question this answers

**PropertyRealityMode** answers "what relationship does this property have
to physical reality?" -- `VIRTUAL`, `REAL`, or `HYBRID`.

This is orthogonal to PR #53's PLAN / SIMULATE / LIVE / COMPARE /
CALIBRATE, which answer "what is Orchade doing with this property right
now?" A VIRTUAL property can be simulated; a REAL property can be
planned against before any physical change happens. The two axes are
never merged into one enum, and no function in this codebase reads one to
infer the other.

## No new Property aggregate

There is no separate `Property` wrapper type in this codebase, and this
task does not introduce one. `HomesteadScenarioDefinition.id` is already
the stable identity that survives across revisions (`createScenarioRevision`
clones a scenario and only replaces `.revision`), and
`scenario.revision.id` is already the per-revision identity. `reality.ts`
treats those two existing fields as `propertyId` / `propertyRevisionId`.

## The three modes

- **VIRTUAL** -- a hypothetical property. The user does not need to own
  land. It may run simulations, create revisions, compare scenarios, and
  test equipment. It must never claim physical/live state, silently mark
  an assumption MEASURED, or claim installed/field-verified equipment.
- **REAL** -- an actual physical property. **REAL ≠ fully measured.** A
  REAL property can still contain `USER_ASSUMPTION`, `REGIONAL_DEFAULT`,
  `RESEARCHED`, or entirely unrecorded parameters. Reality mode is never
  evidence confidence.
- **HYBRID** -- contains both modeled and real-world entities. It is the
  bridge: `SIMULATION -> PROTOTYPE -> CAPITAL DEPLOYMENT -> LIVE PROPERTY`.

## EntityRealityStatus

Per-entity, not per-property: `VIRTUAL` (exists only in the model),
`PHYSICAL` (an actual real-world entity), `CANDIDATE` (a proposed
purchase/build/installation being evaluated, not yet committed).
`PHYSICAL` never implies verified evidence -- that is a separate concern
handled by `ParameterOrigin` (`provenance.ts`) and, for equipment,
`EquipmentTwinLifecycleStatus`.

## The one hard invariant

A property's **declared, committed** reality snapshot may only contain
entity statuses legal for its mode:

| Mode | Allowed entity statuses |
|---|---|
| VIRTUAL | VIRTUAL |
| REAL | PHYSICAL |
| HYBRID | VIRTUAL, PHYSICAL, CANDIDATE |

VIRTUAL and REAL are deliberately "pure": adding a PHYSICAL entity to a
VIRTUAL property, or a VIRTUAL entity to a REAL property, fails closed
(`validateEntityRealityConsistency` throws) instead of silently promoting
the property to HYBRID. A **declared** CANDIDATE entity always means the
property is, by definition, in a transitional state -- even "REAL
property + candidate Daxini pump" is a HYBRID case (Part 2's own Case 3).

This is unrelated to running an ephemeral `EquipmentCandidateTest`
(`equipmentCandidateTest.ts`): that workflow clones a disposable scenario
revision purely to compare simulation outcomes, and never touches, reads,
or writes a `PropertyRealitySnapshot`. A VIRTUAL or REAL property can
freely test equipment candidates without ever declaring them here.

## Explicit transitions only

`proposeRealityTransition(current, input)` is the only sanctioned way to
change a property's mode. It always requires a new `propertyRevisionId`
(rejects reuse of the current one) and always produces a brand-new,
independent `PropertyRealitySnapshot` -- it never mutates the current
snapshot. Every earlier snapshot in a property's `PropertyRealityHistory`
keeps reading back exactly as it was declared
(`getRealitySnapshotAtRevision`), even after a later transition.

## Independence from provenance

`EntityRealityStatus` (`VIRTUAL`/`PHYSICAL`/`CANDIDATE`) and
`ParameterOrigin` (`MEASURED`/`RESEARCHED`/`REGIONAL_DEFAULT`/
`USER_ASSUMPTION`/`DERIVED`, from PR #53's `provenance.ts`) are disjoint,
independently-declared contracts. Nothing in `reality.ts` reads or writes
a `ParameterProvenanceRecord`, and nothing in `provenance.ts` knows what
`PropertyRealityMode` is. A REAL property's tank capacity can be
`USER_ASSUMPTION`; a VIRTUAL property's assumed rainfall can be
`REGIONAL_DEFAULT`. Reality mode never implies evidence confidence.
