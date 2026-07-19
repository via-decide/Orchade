# Replay

Replay records deterministic frames containing input, commands, events, random seeds, simulation tick, and checksums.

## Debug workflow

A save snapshot plus replay frames can reproduce bugs, crashes, and multiplayer desyncs. `ReplayPlayer` can step forward or rewind to a checkpoint tick while checksum utilities compare expected and actual state.
