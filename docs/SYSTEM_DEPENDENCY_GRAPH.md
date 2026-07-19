# System Dependency Graph

Scheduler registrations may declare dependencies by system name. Dependencies are validated on registration and cycles are rejected before a tick can execute.

Runtime Kernel
├── Clock
├── Command Buffer
├── Scheduler
│   └── Registered Systems
├── Event Bus
├── Replay Recorder
├── Metrics
└── Deterministic RNG
