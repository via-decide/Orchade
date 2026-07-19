# Simulation Pipeline

`EngineRuntimeKernel.advance(elapsedMs)` converts elapsed time into fixed substeps. Each substep drains commands, executes scheduler systems, flushes events, records replay data, stores profiler metrics, and calls debug hooks.
