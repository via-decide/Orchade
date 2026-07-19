# Technical Improvements

## Evidence baseline
The app uses React 19, Vite, TypeScript, Firebase, Three.js, Motion, and generated docs. The repository has ADRs for game loop, rendering, save system, inventory, event bus, and UI. `src/App.tsx` currently owns many domain behaviors while `gameplay/` capsules are scaffolded for extraction.

## Suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Split `src/App.tsx` into route/tab containers and domain hooks. | Speeds feature work and lowers regression risk in the main loop. | L | M | M | M | H | H |
| Add schema validation for JSON data packs and Firebase user documents. | Prevents bad content or old saves from breaking sessions. | M | M | M | M | H | H |
| Add automated unit tests for `src/simulation` and each capsule API. | Makes future feature additions safer. | M | L | M | M | H | H |
| Add deterministic random utilities seeded by world/user/session. | Enables reproducible weather, forecasts, balancing tests, and fair events. | M | M | H | H | H | H |
| Introduce a save migration registry with versioned state. | Protects player progress during architecture migration. | M | M | M | M | H | H |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
