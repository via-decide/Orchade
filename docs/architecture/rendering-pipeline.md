# Rendering Pipeline

```mermaid
flowchart LR
  Browser[index.html] --> Vite[src/main.tsx]
  Vite --> ReactRoot[React root]
  ReactRoot --> App[App.tsx]
  App --> Components[src/components]
  Components --> CSS[src/index.css]
```

Rendering is currently eager: all major UI code ships in the initial bundle. Future performance work should introduce lazy boundaries around non-critical panels and heavy visual systems.
