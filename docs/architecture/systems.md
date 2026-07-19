# Systems Catalog

| System | Current implementation | Notes |
| --- | --- | --- |
| Gameplay | `src/App.tsx`, `src/constants.ts`, `src/types.ts` | Main stateful orchestration is centralized |
| UI | `src/components/`, `src/index.css` | Needs repeated UI audit before abstraction |
| Input | React event handlers | No separate input manager |
| Physics | Not implemented | Avoid documenting fake physics behavior |
| Audio | Haptic/audio feedback appears in recent history | Needs explicit system ownership if expanded |
| Rendering | React + CSS + Vite | No lazy boundaries yet |
| Persistence | Firebase Auth + Firestore | Needs emulator tests |
| Assets | CSS, metadata, Firebase JSON | Asset inventory automation needed |
| AI | Dependency present, no confirmed root runtime path | Avoid exposing privileged keys in browser |
