# PropertyGraph / PropertyEntity

`src/property/{entity,graph}.ts`. Sections 7-10 of ORCHADE P0.

## PropertyEntity

```ts
interface PropertyEntity {
  entityId; propertyId; entityType: PropertyEntityType;
  schemaVersion; revision;       // entity-local revision tag, not a full sub-revision system
  createdAt; createdBy;
  status: PropertyEntityStatus;              // PLANNED | INSTALLED | ACTIVE | INACTIVE | FAILED | REMOVED | HISTORICAL
  realityStatus: EntityRealityStatus;        // VIRTUAL | PHYSICAL | CANDIDATE, reused from reality.ts unchanged
  geometryRef?; capabilities; tags; evidenceRefs; knowledgeRefs; metadata;
  physical: { footprintM2?; capacity? };     // capacity's meaning depends on entityType -- documented in scenarioCompiler.ts
  resourceInputs; resourceOutputs;           // PropertyResourceProfile[] -- what this entity needs/supplies
  labourProfile; economicProfile;
}
```

`createPropertyEntity(options)` fills in empty defaults (`[]`, `{}`,
`{minutesPerDay:0}`, etc.) and validates before returning. There is no
per-entity-type catalog the way `gameplay/site-planner`'s
`SITE_MODULE_CATALOG` has one -- a `PropertyEntity` is just data the
caller fully specifies; the scenario compiler reads each entity's own
declared `resourceInputs`/`resourceOutputs`/`physical` fields directly,
generically, regardless of `entityType`.

### The bounded v1 entity-type set

Land: `PARCEL`, `ZONE`, `PATH`, `ROAD`, `ACCESS_POINT`, `EXCLUDED_ZONE`.
Household: `HOUSEHOLD`. Food: `VEGETABLE_BED`, `STAPLE_FIELD`, `ORCHARD`,
`GREENHOUSE`, `NURSERY`, `FOOD_STORAGE`. Livestock: `CHICKEN_COOP`,
`SMALL_LIVESTOCK`, `FEED_STORAGE`. Water: `RAIN_CATCHMENT`, `WATER_TANK`,
`POND`, `WATER_SOURCE`, `PUMP`, `IRRIGATION_ZONE`. Energy: `SOLAR_ARRAY`,
`BATTERY`, `GRID_CONNECTION`, `ENERGY_LOAD`. Nutrients: `COMPOST`,
`VERMICOMPOST`, `NUTRIENT_STORE`. Infrastructure: `RESIDENCE`,
`WORKSHOP`, `SHED`, `EQUIPMENT_STORAGE`, `SERVICE_AREA`. Economy:
`REVENUE_ACTIVITY`, `COST_ACTIVITY`.

"Do not model everything in v1, keep extensible" (section 9): this list
is deliberately smaller than a full production catalog. Names match
`gameplay/site-planner`'s `SiteModuleType` where they mean the same real
thing, but this file does not import from `gameplay/site-planner/` --
see `docs/PROPERTY_MODEL_MIGRATION.md` for why that duplication is
temporary and deliberate.

### Capability model

`PropertyEntityCapability` (`STORE_WATER`, `MOVE_WATER`, `PRODUCE_CROP`,
`REQUIRE_LABOUR`, ...) lets future features query "what can this entity
do" instead of branching on `entityType`/name (section 10). Not yet
consumed by any query in this PR -- entities just carry the tags for
later features to read.

## PropertyGraph

```ts
interface PropertyGraph {
  propertyId: string;
  entities: PropertyEntity[];
  resourceGraph: PropertyResourceGraph;   // see docs/PROPERTY_RESOURCE_GRAPH.md
}
```

`validatePropertyGraph(graph, mode)` is the one place all of this is
checked together, and it fails closed on every violation:

- **Duplicate entity id** within the graph.
- **Cross-property reference**: an entity whose own `propertyId` doesn't
  match the graph's.
- **Illegal reality status for the property's mode** (delegates to
  `reality.ts`'s `validateEntityRealityConsistency` -- REMOVED/HISTORICAL
  entities are excluded from this check, since their reality status is a
  historical fact, not a claim about the property's current state).
- **Unresolvable resource connections** (delegates to
  `validatePropertyResourceGraph`).

This runs automatically inside `createPropertyRevision` -- there is no
way to construct a `PropertyRevision` around an invalid graph.

## Removal keeps history addressable

`markPropertyEntityRemoved(graph, entityId)` sets `status: 'REMOVED'`; it
never deletes the entity object. A removed entity is excluded from
"addressable" entity lists the compiler builds `land.placements` etc.
from (see `docs/PROPERTY_SCENARIO_COMPILER.md`) but is still resolvable
by id in the graph that recorded its removal, and every revision before
that keeps it fully present -- section 7's "removed entities remain
addressable historically."
