# Visual Repository Map

```mermaid
flowchart TD
  Repository --> Engine[src/lib]
  Repository --> Gameplay[src/App.tsx]
  Repository --> Systems[src/firebase.ts + src/constants.ts + src/types.ts]
  Repository --> UI[src/components]
  Repository --> Assets[index.css + metadata]
  Repository --> Audio[planned audio ownership]
  Repository --> Tools[scripts + .github]
  Engine --> Telemetry[src/lib/telemetry.ts]
  Engine --> Logging[src/lib/logger.ts]
  Engine --> Retry[src/lib/retry.ts]
  Engine --> Config[src/lib/config.ts]
  Gameplay --> State[React state]
  Systems --> Persistence[Firebase Auth + Firestore]
  UI --> Rendering[React components]
```

## Responsibility Rule

Every folder should have one owner and one primary responsibility. If a folder starts serving two unrelated purposes, split it or document the exception in an ADR.
