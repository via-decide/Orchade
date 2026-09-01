# EquipmentTwin v1

`src/property/equipmentTwin.ts` and `src/property/propertyEquipment.ts`.
Parts 5-14 of ORCHADE P0.

## The one hard invariant

**`EquipmentTwinDefinition` ≠ `PropertyEquipmentInstance`.**

An `EquipmentTwinDefinition` describes a specific model/revision of
equipment (a pump design, a controller firmware revision). A
`PropertyEquipmentInstance` describes one use/placement/installation of
that *exact* twin revision inside one property revision
(`propertyEquipment.ts`). Updating a twin's catalog entry never rewrites a
historical property or simulation run: every instance pins
`equipmentTwinId` + `equipmentTwinRevisionId` explicitly, and
`createEquipmentTwinRevision` always returns a brand-new object rather
than mutating the twin it was derived from.

## Reuses PR #53, not a second contract layer

- `ParameterOrigin` (`provenance.ts`) -- per-field origin tracking via the
  twin's `parameterOrigins: Partial<Record<string, ParameterOrigin>>`
  (e.g. `{ ratedPowerW: 'MEASURED', purchaseCostINR: 'RESEARCHED' }`). A
  key absent here means its origin is unrecorded, not that it defaults to
  MEASURED.
- `ModelCapabilityStatus` (`modelCapabilities.ts`) -- `SUPPORTED` /
  `ESTIMATE_ONLY` / `NOT_MODELED`, reused verbatim as
  `twin.modelCapabilityStatus`.
- `ActuatorCommandType` (`control.ts`) -- reused verbatim in
  `EquipmentControlDefinition.actuatorCommandType`. Equipment never gets
  its own actuator vocabulary.

No new provenance enum, no new capability-status enum, no new actuator
vocabulary.

## Missing data stays missing

Every optional field on `EquipmentOperatingEnvelope`,
`EquipmentPhysicalSpecification`, etc. is genuinely optional and left
`undefined` when not supplied -- validation never manufactures a default.
A resource port with no `canonicalUnit`, an envelope with no
`humidityPercent`, are legitimate "unknown," not zero.

## Validation fails closed

`validateEquipmentTwinDefinition` (called by every creation/revision path)
rejects: empty `twinId`/`revisionId`, a `revisionId` equal to its own
`parentRevisionId`, a source-type-specific ref missing (e.g. `LOGICHUB`
without `logicHubProjectRef`), duplicate resource-port or failure-mode
ids, negative/NaN/Infinity resource-port capacities, capacity ranges where
`minimum > maximum` or `nominal` falls outside `[minimum, maximum]`, and
an unsupported physical unit on a port (checked against a small closed
whitelist -- not a second unit-conversion system).

## Lifecycle is one explicit step at a time

```
DRAFT -> SIMULATION_READY -> BENCH_VERIFIED -> FIELD_VERIFIED -> RETIRED
```

`promoteEquipmentTwinLifecycle(twin, next, evidenceRefs)` only allows the
transitions in that chain (plus `RETIRED` from anywhere), and requires at
least one evidence ref to promote into `BENCH_VERIFIED` or
`FIELD_VERIFIED`. **A LogicHub or Daxini source never implies
verification** -- new twins default to `DRAFT` regardless of `source.type`
(Part 7, Part 13). `SIMULATION_READY` means "enough explicit data exists
for a bounded simulation," not "physically verified."

## PropertyEquipmentInstance

```ts
interface PropertyEquipmentInstance {
  instanceId; propertyId; propertyRevisionId;
  equipmentTwinId; equipmentTwinRevisionId; // pinned, exact
  realityStatus: EntityRealityStatus;        // VIRTUAL | PHYSICAL | CANDIDATE
  quantity; geometryRef?; configuration;
  resourceConnectionRefs; deviceSourceRefs;
  active; installedAt?; purchaseSnapshotRef?; evidenceRefs;
}
```

`createPropertyEquipmentInstance` rejects a reference to a twin
revision that does not exist in the supplied `EquipmentTwinRegistry` (fail
closed, never silently create a placeholder twin). It also enforces:
`PHYSICAL` requires `installedAt`; `VIRTUAL`/`CANDIDATE` must not declare
one (they have not been installed). `removePropertyEquipmentInstance`
returns a new array and never mutates its input, matching the immutability
guarantee everywhere else in this module.

## ORCHADE-PUMP-FIXTURE-001

`src/property/fixtures/pumpFixture.ts`. A bounded `WATER_PUMP` twin
exercising every layer of this contract without inventing physics it
cannot support. `performanceModel.limitations` names exactly what is
*not* modeled: pump curves, head-loss hydraulics, cavitation, motor
transients, sub-day dispatch, and enforcement of
`dailyWaterMovementCapacityL` as a throughput constraint (the current
engine has no lever for that -- see `docs/EQUIPMENT_TEST_WORKFLOW.md`).
Its `parameterOrigins` shows the inspectable provenance spread Part 12
asks for: rated power `MEASURED`, daily runtime `USER_ASSUMPTION`, water
movement capacity `RESEARCHED`, derived energy consumption `DERIVED`,
purchase cost `RESEARCHED`, maintenance cost `USER_ASSUMPTION`.
