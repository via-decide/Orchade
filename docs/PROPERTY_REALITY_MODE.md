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

## Now attaches to the real Property aggregate

An earlier revision of this doc decided *not* to introduce a `Property`
wrapper type, treating `HomesteadScenarioDefinition.id`/`.revision.id` as
`propertyId`/`propertyRevisionId` directly. The ORCHADE P0 master task
explicitly superseded that decision and mandated a real, persistent
`Property` aggregate, distinct from simulation input (see
`docs/PROPERTY_MODEL.md`, `docs/PROPERTY_MODEL_MIGRATION.md`). `reality.ts`
itself is unchanged by that shift -- its contracts (below) are exactly as
correct standing alone as they are attached to a `Property`. What changed
is *where they live*: `PropertyRealityDeclaration` is now
`Property.realityDeclaration` / `PropertyRevision.realityDeclaration`, and
`EntityRealityStatus` is now `PropertyEntity.realityStatus`, rather than
sitting on the freestanding `PropertyRealitySnapshot` described further
below (which is superseded, kept only for its own passing tests).

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
(`equipmentCandidateTest.ts`): that workflow clones a disposable
`PropertyRevision` purely to compare simulation outcomes, and never
touches or changes the property's own reality declaration. A VIRTUAL or
REAL property can freely test equipment candidates without ever declaring
them PHYSICAL.

## Explicit transitions only

Changing a property's mode always means creating a brand-new
`PropertyRevision` (`docs/PROPERTY_REVISIONS.md`) with a different
`realityDeclaration.mode` -- there is no in-place mutation path.
`advancePropertyToRevision(property, nextRevision)` then moves the
property's "current" pointer forward, requiring `nextRevision` to chain
from the property's actual current revision (never a stale or unrelated
parent). Every earlier `PropertyRevision` keeps reading back exactly as it
was declared (`docs/PROPERTY_MODEL_MIGRATION.md`'s fixtures demonstrate
this directly: `createHybridBenchDemoProperty()` derives a HYBRID revision
from a VIRTUAL one, and the original VIRTUAL revision object is
unaffected).

`reality.ts`'s own `proposeRealityTransition(current, input)` remains the
transition mechanism for the freestanding `PropertyRealitySnapshot`/
`PropertyRealityHistory` types (below) if anything still uses them
directly; new code building a real `Property` uses
`deriveNextPropertyRevision` + `advancePropertyToRevision` instead, which
compose the same `reality.ts` validation functions under the hood.

## Independence from provenance

`EntityRealityStatus` (`VIRTUAL`/`PHYSICAL`/`CANDIDATE`) and
`ParameterOrigin` (`MEASURED`/`RESEARCHED`/`REGIONAL_DEFAULT`/
`USER_ASSUMPTION`/`DERIVED`, from PR #53's `provenance.ts`) are disjoint,
independently-declared contracts. Nothing in `reality.ts` reads or writes
a `ParameterProvenanceRecord`, and nothing in `provenance.ts` knows what
`PropertyRealityMode` is. A REAL property's tank capacity can be
`USER_ASSUMPTION`; a VIRTUAL property's assumed rainfall can be
`REGIONAL_DEFAULT`. Reality mode never implies evidence confidence.
