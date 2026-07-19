# Quality Engineering

Test pyramid: pure unit tests for capsule rules, integration tests for command/event/save flows, simulation validation for deterministic day advancement, balance validation for economic trajectories, content validation for schemas/references/localization, performance regression tests for render/tick/save budgets, save compatibility tests for every save version, and smoke tests for auth/offline/recovery. CI should run typecheck, build, docs check, schema validation, and targeted simulation fixtures on every PR.
