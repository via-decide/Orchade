# PropertyResourceGraph

`src/property/resourceGraph.ts`. Section 11 of ORCHADE P0.

## The one hard rule

**Proximity is not connection.** Two entities existing on the same
property -- even drawn right next to each other -- share nothing until an
explicit `PropertyResourceConnection` says so. This mirrors the identical
rule already enforced in `gameplay/site-planner`'s resource graph.

```ts
type PropertyResourceType =
  'LAND_AREA' | 'WATER' | 'ENERGY' | 'FOOD' | 'FEED' | 'BIOMASS' | 'MANURE'
  | 'COMPOST' | 'NUTRIENTS' | 'LABOUR' | 'CASH' | 'STORAGE' | 'ACCESS' | 'DATA';

interface PropertyResourceConnection {
  connectionId: string;
  propertyId: string;
  resourceType: PropertyResourceType;
  fromEntityId: string;
  toEntityId: string;
  mode: 'CONTINUOUS' | 'SCHEDULED' | 'ON_DEMAND';
  enabled: boolean;
  constraints: string[];
  evidenceRefs: string[];
}
```

## Validation

`validatePropertyResourceGraph(graph, entities)` rejects: an empty
`connectionId`, a duplicate `connectionId`, a self-connection
(`fromEntityId === toEntityId`), either endpoint referencing an entity
that doesn't exist on the property, and an unsupported `mode`. It does
**not** check that the resource type is something the source entity can
actually produce or the target can consume -- that would require a
type-level capability model this v1 doesn't have yet (a natural extension
once `PropertyEntityCapability` is consumed by real queries).

## What the compiler does with connections

The scenario compiler (`docs/PROPERTY_SCENARIO_COMPILER.md`) does not
quantitatively route resources through this graph -- the underlying
Project 001 engine reasons over aggregated scenario numbers (total tank
capacity, total solar capacity, ...), not a live flow simulation. What the
graph *does* drive is an advisory check: for every entity's declared
`resourceInputs`, is there at least one `enabled` connection targeting it
with a matching `resourceType` from another entity that is itself
operational? If not, the compiler emits a `PropertyScenarioCompilerNote`
naming exactly which entity and resource class is unconnected. This never
blocks compilation -- a later revision can add the missing connection --
but it is real, inspectable evidence that something in the plan is
physically disconnected, which is exactly what section 11 exists to catch.
