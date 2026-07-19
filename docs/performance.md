# Performance Report

## Current Measurements

`npm run build` produced a 1,420.17 KB minified JavaScript chunk with 375.58 KB gzip size. Vite warned that some chunks exceed 500 KB.

## Bottlenecks

- Initial bundle contains all app screens and Firebase code.
- Google Fonts are loaded from a remote stylesheet.
- No lazy loading boundaries are present.
- Firestore listeners should be audited to ensure they unsubscribe on every path.

## Recommended Optimizations

1. Add `React.lazy` boundaries for encyclopedia, leaderboard/social features, and heavy visual components.
2. Configure Rollup manual chunks for Firebase, React vendor code, and visualization dependencies.
3. Self-host fonts or use system fonts for faster startup.
4. Add bundle-size budgets to CI after code splitting lands.
5. Cache read-only constants and avoid recreating large arrays inside render paths.

## Measurement Plan

Track startup time, first render time, route/tab navigation duration, API latency, JS bundle size, CSS size, and error rate in the telemetry layer and CI artifacts.
