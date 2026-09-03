# PropertyRevision

`src/property/revision.ts`. Section 12 of ORCHADE P0.

Immutable and hashable. Material changes create a new revision; a
revision, once created, never mutates -- section 59 tests 2-5 exist
precisely to pin this down.

```ts
interface PropertyRevision {
  revisionId; propertyId; parentRevisionId?;
  createdAt; createdBy;
  realityDeclaration: PropertyRealityDeclaration;   // reality.ts, unchanged
  graph: PropertyGraph;                              // frozen entity + resource-graph snapshot
  intent: PropertyIntent;
  changeSet: PropertyChangeDescription[];            // human-readable, not machine-replayed
  rationale: string;
  entityHashes: Record<string, string>;              // entityId -> checksum(entity)
  resourceGraphHash: string;
  knowledgeBundleRefs: string[];                      // Wave 8 (Expert Knowledge), not implemented in this PR -- always empty
  evidenceRefs: string[];
  revisionHash: string;
}
```

## This is one layer above scenario revisions

`ScenarioRevisionDefinition` (`src/simulation/homestead/scenario.ts`) and
`createScenarioRevision` (`.../revision.ts`) already existed before this
PR: a narrow, hardcoded mechanism for editing a handful of scenario
fields directly (tank capacity, removing a placement). `PropertyRevision`
does not extend or call into that mechanism -- it is a property-level
revision one layer up, covering the whole entity graph, with its own
independent hash. See `docs/PROPERTY_MODEL_MIGRATION.md` for the full
reasoning; the scenario-level mechanism keeps working unchanged for
direct scenario editing elsewhere in the codebase.

## Creation is the only mutation path, and it validates everything

`createPropertyRevision(input)`:

1. Validates identity fields are non-empty and `revisionId !== parentRevisionId`.
2. Validates that `realityDeclaration`, `graph`, and `intent` all declare
   the same `propertyId` as the revision itself.
3. Runs `validatePropertyRealityDeclaration`, `validatePropertyIntent`,
   and `validatePropertyGraph(graph, realityDeclaration.mode)` -- the
   whole graph is checked against the whole reality declaration together.
4. `structuredClone`s the graph, intent, and reality declaration into an
   independent copy before hashing. Mutating the caller's original input
   objects after this call can never leak into the created revision
   (tested directly in `tests/propertyFoundation.test.ts`).
5. Hashes every entity individually (`entityHashes`), the resource graph
   as a whole (`resourceGraphHash`), and the complete revision
   (`revisionHash`), all via the existing `engine/replay/checksum.ts`
   checksum -- the same hashing primitive every other deterministic
   contract in this codebase uses.

`deriveNextPropertyRevision(parent, input)` is a convenience wrapper:
supply only what changed (a replacement `graph`, `intent`, or
`realityDeclaration`; anything omitted is inherited from `parent`), and it
calls `createPropertyRevision` with `parentRevisionId: parent.revisionId`.
The parent object itself is never touched.

## Determinism

Same revision inputs -> same `revisionHash`, always (checked directly:
`tests/propertyFoundation.test.ts` test 3). This is what lets
`compilePropertyRevisionToHomesteadScenario` guarantee "same
PropertyRevision -> same compiled scenario hash -> same simulation run"
end to end.
