# ORCHADE Code Audit

## 1. Architecture Overview

### Repository map

```text
/
├── src/
│   ├── App.tsx                       # Main game state + UI shell
│   ├── main.tsx                      # React bootstrap + service worker registration
│   ├── firebase.ts                   # Firebase/Auth/Firestore initialization + helpers
│   ├── constants.ts                  # Domain constants (plants, weather, shop)
│   ├── types.ts                      # Shared TypeScript game types
│   ├── hooks/
│   │   └── usePersonalityVector.ts   # Personality vector state/evolution hook
│   ├── services/
│   │   ├── gameService.js            # Live market pricing subscription
│   │   └── personalityService.ts     # Hashing + Firestore persistence logic
│   └── components/
│       ├── PlantCard.tsx             # Plant card UI
│       ├── PlantVisualizer.tsx       # Three.js renderer (currently not mounted)
│       └── MarketView.tsx            # Market view UI
├── public/
│   ├── manifest.json                 # PWA metadata
│   └── sw.js                         # Service worker
├── firestore.rules                   # Firestore security rules
├── firebase-applet-config.json       # Firebase project config (public client config)
├── package.json                      # Vite + React + Firebase dependency declarations
├── vite.config.ts                    # Vite build and PWA plugin config
└── game-repo/                        # Duplicate app snapshot (appears archival/non-runtime)
```

### Stack and build/runtime model

- **Language stack**: TypeScript + React 19 + JSX; one JS service module (`src/services/gameService.js`).
- **Rendering/runtime**: Browser SPA with React; optional Three.js scene component.
- **Backend services**: Firebase Auth, Firestore, Remote Config.
- **Build system**: Vite 6 (`npm run dev`, `npm run build`), no custom bundler.
- **PWA**: `vite-plugin-pwa` + custom `public/sw.js`.

### Dependency graph (module-level)

```text
src/main.tsx
  └── src/App.tsx
      ├── src/firebase.ts
      ├── src/constants.ts -> src/types.ts
      ├── src/components/PlantCard.tsx -> src/constants.ts, src/types.ts
      ├── src/components/MarketView.tsx -> src/services/gameService.js -> src/firebase.ts
      ├── src/hooks/usePersonalityVector.ts -> src/services/personalityService.ts -> src/firebase.ts
      └── src/services/personalityService.ts

src/components/PlantVisualizer.tsx -> src/types.ts (currently not imported by active app shell)
```

### Frameworks and runtime dependencies identified

- React / React DOM
- Vite + @vitejs/plugin-react
- Firebase SDK
- Three.js
- Lucide icons
- Motion (Framer Motion runtime package)
- Tailwind v4 tooling

---

## 2. Critical Bugs

| BUG TYPE | FILE | LINE | DESCRIPTION | SEVERITY |
|---|---|---:|---|---|
| State persistence race / lost write | `src/App.tsx` | 227-229, 237-239, 534-541 | Credits are decremented in a separate `setGs` call after `updatePlant` already persisted a snapshot; resulting Firestore saves can miss credit deductions until a later tick/save event. | HIGH |
| Null pointer risk from non-validated persisted state | `src/App.tsx` | 196 | `const activeOrchard = ...!` assumes saved `activeOrchardId` always exists; corrupted/migrated user docs can crash the app at render. | HIGH |
| Firestore rules logic corruption (statement termination) | `firestore.rules` | 116-119, 136-140 | Semicolon-terminated return expressions are followed by additional conditions that are effectively detached, breaking intended validation logic. | CRITICAL |
| Firestore rules duplicated/conflicting create rule | `firestore.rules` | 200-203 | Duplicate `allow create` on `/transfers` introduces policy ambiguity and weakens reviewability; can mask incorrect rule behavior. | MEDIUM |
| Invalid transfer doc lookup logic | `firestore.rules` | 145-151 | `isCreditTransferUpdate` checks a deterministic `{sender}_{receiver}` id while transfer docs are documented with day/random/window suffixes; integrity check can fail open/closed unexpectedly depending on path usage. | HIGH |

---

## 3. Security Issues

| ISSUE TYPE | FILE | LINE | DESCRIPTION | SEVERITY |
|---|---|---:|---|---|
| Overly broad write permission | `firestore.rules` | 208-214 | Any authenticated user can write `system/global_stats`, enabling market-manipulation/tampering. | HIGH |
| Hardcoded admin identity in rules | `firestore.rules` | 83 | Direct email allowlisting ties admin escalation to one email claim and increases misconfiguration risk; role-based claims only is safer. | MEDIUM |
| Sensitive auth context over-logging | `src/firebase.ts` | 66-87 | `handleFirestoreError` logs full auth metadata (email/provider info) to console and rethrows serialized payload; this can leak PII in shared logs. | MEDIUM |
| Public repository key hygiene risk | `firebase-applet-config.json` | 4 | Firebase client `apiKey` is expected to be public, but the repo should still treat this as environment-bound config to avoid accidental cross-project reuse. | LOW |

Dependency vulnerability scan status:
- `npm audit --json` could not query advisories due registry `403 Forbidden`, so package CVE status could not be conclusively verified in this environment.

---

## 4. Runtime Failures

| FAILURE TYPE | FILE | LINE | DESCRIPTION | SEVERITY |
|---|---|---:|---|---|
| Type/runtime mismatch risk | `src/components/PlantVisualizer.tsx` | 507, 570 | `createWeatherParticles` expects `WeatherType`, but component prop passes a wider/optional value path; TS already flags this and runtime could call with invalid value in future refactors. | MEDIUM |
| Service worker fallback response bug | `public/sw.js` | 26 | `catch(() => cached)` returns `undefined` when no cache hit exists, causing fetch handler failures instead of proper offline fallback `Response`. | MEDIUM |
| Base-path deployment bug (GH Pages/subpath) | `src/main.tsx`, `index.html` | 14, 7-13 | Hardcoded absolute `/sw.js`, `/manifest.json`, `/icons/...` can break when app is hosted under a subpath. | MEDIUM |

---

## 5. Performance Problems

| PROBLEM | FILE | LINE | DESCRIPTION | SEVERITY |
|---|---|---:|---|---|
| Unbounded cache growth | `public/sw.js` | 20-23 | Runtime `cache.put` stores every same-origin GET without size/version strategy, increasing storage use over time. | MEDIUM |
| High per-frame allocation pressure | `src/components/PlantVisualizer.tsx` | 605-614 | New `THREE.Color` objects are created inside animation traversal each frame; avoidable GC churn in long sessions. | LOW |
| Repeated expensive full-doc writes | `src/App.tsx` | 83-113 and multiple call sites | Entire orchard/upgrades payload is persisted on many interactions; batching/debouncing would reduce write frequency/cost and contention. | MEDIUM |

---

## 6. Suggested Fixes

1. **Fix split state writes in `App.tsx`** by making each user action produce one consolidated `setGs` mutation and persist the same computed `next` object.
2. **Guard persisted identifiers** (`activeOrchardId`, `selectedPlantIndex`) with fallback defaults before render.
3. **Repair `firestore.rules` syntax/logic**, remove detached expressions, and add emulator tests for transfer paths and rate limits.
4. **Restrict `/system/global_stats` writes** to server/admin paths (or Cloud Function) and validate fields/ranges.
5. **Harden service worker** with explicit offline fallback responses and bounded runtime cache strategy.
6. **Normalize base URLs** via `import.meta.env.BASE_URL` for PWA assets/service worker registration.
7. **Reduce render-loop allocations** in `PlantVisualizer` by reusing color objects and memoizing immutable materials.
8. **Resolve TS baseline issues** (`@types/resolve`, `@types/trusted-types` mismatch) so CI can run strict static checks cleanly.

