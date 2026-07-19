# Testing Strategy

## Current State

The repository currently has type checking and production build validation. No unit, integration, or browser smoke test runner is installed yet.

## Priorities

1. Critical user journeys: guest sign-in, plant seed, advance day, harvest, save/load, leaderboard read, and transfer validation.
2. Regression tests for game economy calculations and weather effects.
3. Integration tests for Firebase service wrappers using emulators or mocks.
4. Smoke test that the app renders without crashing.
5. Coverage reporting with thresholds once test files exist.

## Recommended Tooling

- Vitest and React Testing Library for unit/integration tests.
- Playwright for browser smoke and critical workflows.
- Firebase Emulator Suite for auth and Firestore flows.
