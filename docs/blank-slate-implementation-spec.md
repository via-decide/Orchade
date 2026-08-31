# Blank-Slate + Deterministic Progression — PR #39 Rebase

Status: implemented foundation  
Base: PR #39 merge commit \`64cf7a0d10daa1d836eee7d9d6634dfc7d42d993\`  
Source specification: \`claude/security-leak-orchade-card-ss3sue\`

## Architecture

\`\`\`text
PLOT / CROSS-GAME INTENT
↓
DETERMINISTIC RESEARCH LEDGER
↓
UNLOCK / LEVEL / PLACEMENT VALIDATION
↓
STRUCTURED HOMESTEAD EVENT
↓
REPLAY FRAME + CHECKSUM
↓
UI GATING
\`\`\`

The progression layer gates access and interface complexity. It does not change crop, water, nutrient, energy, livestock, household, labour, or economy equations.

## Determinism rules

- Ledger IDs use simulation tick plus monotonic state sequence.
- No timestamp-derived IDs.
- No \`Date.now()\`, \`Math.random()\`, or \`crypto.randomUUID()\`.
- Rejected debit, unlock, skin, level, and placement intents do not partially mutate state.
- Starter unlocks are explicit cost-zero records.
- Paid unlock count excludes starter records.
- Environment skins compile explicit climate inputs; they cannot apply hidden multipliers.
- Placeholder skins fail closed until their climate assumptions are calibrated.

## Modules

### \`gameplay/research-credits\`

Pure cross-game contract:

- \`credit(state, amount, source)\`
- \`debit(state, amount, reason)\`
- \`canUnlock(state, contentId, level, season)\`
- \`performUnlock(state, contentId, level, season, tick)\`
- 200-entry capped audit trail with lifetime totals retained
- explicit level, season, prerequisite, duplicate, and balance rejection

This module has no React, browser, Firebase, simulation-physics, or progression-module dependency.

### \`gameplay/progression\`

Pure access contract:

- BUILD → OPERATE
- OPERATE → MASTER
- explicit criterion status
- 12 environment-skin records
- one active temperate climate preset
- eleven fail-closed placeholders

Level changes do not modify physical coefficients.

### Homestead planning transition

\`applyHomesteadPlanningIntent\` accepts:

- \`GRANT_RESEARCH_CREDITS\`
- \`UNLOCK_CONTENT\`
- \`PLACE_COMPONENT\`
- \`EVALUATE_LEVEL\`
- \`SELECT_ENVIRONMENT_SKIN\`

It emits machine-readable events and returns immutable planning state. Placement checks unlock, level, season, duplicate ID, positive area, and remaining usable area.

\`runHomesteadPlanningReplay\` records every intent with the repository's existing replay and checksum primitives.

## Blank-slate scenario

\`createBlankSlateScenario\` produces a valid canonical schema-v2 scenario with:

- explicit deterministic seed and revision time
- land but no placements
- no food producers or livestock
- zero water and energy infrastructure
- zero initial food inventory
- no implicit external supply
- selected active climate skin compiled into canonical seasonal profiles

The scenario can advance immediately. Unmet household demand appears as structured failure evidence rather than negative storage or fabricated supply.

## UI boundary

\`ProgressionPanel\` submits intents to the pure planning transition and renders returned state/events. It does not calculate physical results or directly modify the Project 001 runtime state.

The existing Plot Planner and Project 001 equations are unchanged.

## Verification

Tests cover:

- deterministic credit/debit reconciliation
- ledger cap and provenance
- insufficient balance
- duplicate unlock
- required level
- invalid season
- missing prerequisite
- uncalibrated skin rejection
- blank/empty scenario advancement
- accepted and rejected placement events
- insufficient area
- repeated replay checksum equality
- source rejection of ambient randomness and wall-clock calls

## Deferred

- Persistent account-level cross-game ledger storage
- authenticated external-game credit authority
- calibrated Kutch and other climate presets
- converting planning placements into immutable scenario revisions
- research-credit reward rates from simulation evidence
- playtesting unlock and placement prices

These remain separate from deterministic physical simulation.
