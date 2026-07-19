# Orchade Repository Audit

## Architecture

Orchade is a Vite React 19 single-page application. The primary runtime path is `src/main.tsx` -> `src/App.tsx` -> components under `src/components/`. Firebase Authentication and Firestore are initialized in `src/firebase.ts`. Game data and type contracts live in `src/constants.ts` and `src/types.ts`.

## Directory Structure

- `/src`: active application source.
- `/src/components`: UI components for plant cards, plant visualization, and encyclopedia content.
- `/src/lib`: maintenance-oriented platform utilities for config validation, logging, retry, and telemetry.
- `/docs`: engineering documentation and generated health reports.
- `/.github`: CI and dependency automation.
- `/game-repo`: duplicated copy of the application. This should be treated as archival or removed after a source-of-truth decision.

## Dependencies

Runtime dependencies include React, Firebase, Motion, Lucide icons, Three, Tailwind/Vite integration, and Google GenAI. Express and Dotenv are present but no server entry point is currently wired in the root app, so they are candidates for removal after confirmation.

## Duplicate Code

The `game-repo/` tree duplicates root app files, including package metadata, Vite config, Firebase config, Firestore rules, and source files. This is the highest-impact maintenance issue because every change can drift across two copies.

## Dead Code and Unused Assets

- `game-repo-app.txt`, `game-repo-classes.txt`, and `current-app-classes.txt` appear to be generated snapshots rather than runtime inputs.
- `express`, `dotenv`, `@google/genai`, and `three` require follow-up verification because they are listed but not obviously used in the root runtime path.

## Circular Imports

No circular imports were identified in the small root source graph during manual inspection. Add automated cycle detection before the codebase grows.

## Large Files

The generated production bundle is large: Vite reported a 1,420.17 KB minified JS chunk and a 375.58 KB gzip size during `npm run build`. See `docs/performance.md`.

## Naming Inconsistencies

- Package name was `react-example`; it now identifies the root package as `orchade`.
- The duplicate `game-repo/package.json` still uses the old name because this PR avoids rewriting the mirrored project without a source-of-truth decision.

## Configuration Problems

- Firebase config is committed as JSON and used at runtime. Firebase client identifiers are not secrets, but environment-specific config should be documented and validated.
- Vite defines `process.env.GEMINI_API_KEY`; client-side secrets should not be exposed unless intentionally public. Prefer `VITE_` prefixed variables for browser-safe values.
- CSS imports produce a warning because Tailwind's import precedes the Google Font import. This should be addressed with either local fonts or ordering compatible with Tailwind CSS.

## Security Issues

- Firestore rules need dedicated review against the user journeys.
- `npm audit --omit=dev --audit-level=moderate` should run in CI.
- Client-side API keys must be treated as public; privileged operations should move server-side if introduced.

## Build Issues

`npm run lint` passes. `npm run build` passes with warnings about CSS import ordering and chunk size.

## Performance Bottlenecks

- Single large JS chunk likely includes Firebase, Motion, and visual dependencies in the initial path.
- No lazy route/component boundaries exist yet.
- Remote Google Fonts introduce a render-blocking external network dependency.

## Recommendations

1. Choose one source of truth and remove or archive `game-repo/`.
2. Add a test runner and critical journey smoke tests.
3. Split Firebase-heavy leaderboard/auth paths and encyclopedia/visualizer paths behind lazy boundaries.
4. Replace ad hoc console calls with the structured logger.
5. Track repository-health output in CI artifacts and keep the committed dashboard refreshed before releases.
