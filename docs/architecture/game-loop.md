# Game Loop

Orchade currently uses an event-driven simulation loop rather than a continuously ticking physics loop.

1. User performs an action.
2. App validates affordability/state constraints.
3. App mutates React state.
4. Day/weather/growth calculations run when the user advances progression.
5. Harvest and economy results update local state and persistence.

There is no real-time physics loop today.
