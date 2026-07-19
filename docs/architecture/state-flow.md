# State Flow

```mermaid
sequenceDiagram
  participant User
  participant App as App.tsx state
  participant UI as Components
  participant Firebase
  User->>UI: input action
  UI->>App: callback/event
  App->>App: update local game state
  App->>Firebase: persist selected changes
  Firebase-->>App: auth/snapshot updates
  App-->>UI: render props/state
```

Core state currently lives in `App.tsx`: day, credits, data seeds, orchards, selected plant, upgrades, active tab, weather, forecast, harvested types, auth readiness, rankings, logs, and transfer form state.
