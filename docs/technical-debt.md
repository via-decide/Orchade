# Technical Debt and Gap Analysis

| Severity | Subsystem | Gap/debt | Risk | Recommendation |
|---|---|---|---|---|
| Critical | App shell | `src/App.tsx` combines UI, auth, save, economy, and simulation orchestration | Hard to test/scale | Extract command handlers, save adapter, and screens |
| Critical | Saves | No documented versioned migration system | Data loss/regression | Add SaveGame schema, migrations, compatibility fixtures |
| High | Testing | Capsule tests are README placeholders | Regressions invisible | Add unit/integration/simulation tests |
| High | Content | JSON definitions lack enforced schemas | Broken references/balance drift | Add schema validation and content CI |
| High | Economy | Static/simple economy risks runaway currency | Weak retention | Add demand/sinks/simulation validation |
| Medium | AI readability | Capsules are readable but runtime ownership is mixed | AI edits may touch wrong layer | Enforce boundaries and ownership docs |
| Medium | UX/accessibility | Multi-input and accessibility specs not implemented | Platform/player exclusion | Add input abstraction and accessibility checklist |
| Medium | Performance | No automated budgets | Scale failures at 10x/100x | Add profiling benchmarks |
| Low | Visual/audio | Direction exists as improvements but not production bible | Inconsistent polish | Use visuals/audio docs as acceptance criteria |
