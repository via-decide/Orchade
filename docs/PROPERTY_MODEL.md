# Property Model v1

`src/property/{property,intent,entity}.ts`. Section 3 of ORCHADE P0.

## The permanent product invariant

**Features grow around the Property. Properties do not get copied into
features.** A user creates a `Property` once; every capability -- Plan,
Simulate, Operate, Observe, Experiment, Learn, Improve -- reads and writes
the same persistent entity graph. See `docs/PROPERTY_MODEL_MIGRATION.md`
for why this codebase did not already have this and what it supersedes.

## Property is not HomesteadScenarioDefinition

```
Property                        <- persistent world/user state
  PropertyRevision (immutable)  <- one frozen snapshot of that state
    PropertyGraph                 (entities + resource connections)
    ↓ compilePropertyRevisionToHomesteadScenario()
HomesteadScenarioDefinition     <- immutable simulation INPUT
  ↓ runProject001Scenario()
ProjectHomesteadState (daily)   <- immutable simulation OUTPUT
```

The two halves are never collapsed into one mutable object. A `Property`
can exist, be edited, and be revised without ever being compiled or run;
a `HomesteadScenarioDefinition` never exists except as the deterministic
output of compiling exactly one `PropertyRevision`.

## Property

```ts
interface Property {
  propertyId: string;
  schemaVersion: number;
  name: string;
  intent: PropertyIntent;
  realityDeclaration: PropertyRealityDeclaration;   // reuses reality.ts, unchanged
  currentRevisionId: string;
  revisionRefs: string[];   // every revision id this property has ever had, oldest first, never shrinks
  createdAt: string;
  createdBy: string;
}
```

`createProperty(input, initialRevision)` pins a new property to its first
revision (which must not declare a `parentRevisionId`).
`advancePropertyToRevision(property, nextRevision)` moves the "current"
pointer forward -- it requires `nextRevision.parentRevisionId` to equal the
property's current revision id (rejecting a revision derived from a stale
or unrelated parent) and refuses to re-record a revision id already in
`revisionRefs`. Both return a new `Property`; neither mutates its input.

`PropertyRevisionStore` is an append-only `Record<revisionId, PropertyRevision>`,
mirroring `EquipmentTwinRegistry`'s shape, for callers that need to look
revisions up by id.

## PropertyIntent

What the user is trying to do with this property -- not a promise of
achievement:

```ts
interface PropertyIntent {
  propertyId: string;
  name: string;
  purpose: 'HOMESTEAD' | 'FARM' | 'RESEARCH' | 'WORKSHOP';
  measurementSystem: 'metric' | 'imperial';
  householdIntent: { size: number; notes?: string };
  goals: { foodSelfSufficiency, waterIndependence, energyIndependence, nutrientCircularity, labourFeasibility, economicCoverage }; // all boolean
  planningHorizonDays: number;
  seed: string;
}
```

`seed` lives here, not on each `PropertyRevision`, deliberately: it is
what makes test-before-buy/build (`equipmentCandidateTest.ts`) work at
all. A candidate revision is derived from a baseline revision without
changing `intent`, so both share the exact same seed by construction --
a revision-scoped seed could not guarantee that across two different
`revisionId`s.

## PropertyEntity

The unit everything else (Site Planner, equipment, observations,
experiments) eventually attaches to. See `docs/PROPERTY_GRAPH.md` for the
full contract, validation rules, and the bounded v1 entity-type set.
