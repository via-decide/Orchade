# Orchade Engineering Control Panel

Orchade is a React/Vite orchard simulation being migrated into an AI-native engineering platform. The active product goal is still playable orchard management, but the repository goal is now clearer ownership, smaller AI context windows, and GitHub-visible engineering state.

## Current milestone
AI-first repository architecture: establish feature capsules, documentation indexes, ADRs, event docs, dashboards, metrics, and graph generation without breaking the existing app in `src/`.

## Architecture overview
- `src/` remains the legacy runnable application shell during incremental migration.
- `gameplay/` contains independent feature capsules for gameplay systems.
- `docs/` contains dashboards, ADRs, event catalogs, health reports, metrics, and generated graphs.
- `tools/` contains automation that regenerates repository intelligence artifacts.
- `AI/` is reserved for cross-repository AI contribution protocols.

## Completed systems
- Legacy orchard app shell builds with Vite.
- Gameplay capsule scaffold exists for inventory, farming, combat, crafting, quests, NPC, weather, economy, UI, and world.
- Engineering dashboard, documentation index, event catalog, ADRs, health report, metrics, and graph placeholders are generated.

## Systems under development
- Farming, weather, economy, UI, and world are marked in progress because current runtime behavior maps most closely to those domains.
- Inventory, combat, crafting, quests, and NPC are scaffolded for future extraction.

## Blocked work
No blocked modules are currently recorded. Future blocked work belongs in each module's `TODO.md`, not in a global TODO list.

## Repository health
Start with [`docs/dashboard.md`](docs/dashboard.md), [`docs/repository-health.md`](docs/repository-health.md), and [`docs/metrics.md`](docs/metrics.md). Regenerate these with:

```bash
npm run docs:generate
```

## Quick start
```bash
npm install
npm run docs:generate
npm run lint
npm run build
npm run dev
```

## Folder overview
- `AI/` — repository-level AI instructions and audit conventions.
- `assets/` — future organized asset source tree.
- `docs/` — engineering dashboard, ADRs, event docs, graphs, metrics, and health reports.
- `engine/` — future engine/runtime boundaries outside gameplay capsules.
- `gameplay/` — self-contained feature capsules with README, AI context, ownership, TODOs, tests, state, API, UI, public, and internal files.
- `src/` — current app implementation pending incremental migration.
- `tests/` — cross-module and integration tests.
- `tools/` — repository automation scripts.

## Latest engineering work
- Created AI-native feature capsule standard.
- Added generated documentation and graph artifacts.
- Added CI workflow to validate docs, build, dependency audit, and markdown links.

## Development roadmap
1. Move one runtime behavior at a time from `src/` into the owning `gameplay/` capsule.
2. Add tests inside the affected capsule before cross-module tests.
3. Update the relevant ADR when architecture changes.
4. Regenerate dashboards and graphs.
5. Keep public APIs stable and isolate internal implementation.
