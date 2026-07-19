# Navigation

Navigation provides grid-based A*, terrain costs, dynamic obstacle invalidation, path caching, flow-field identifiers, and region graph scaffolding.

## Path lifecycle

Requests are resolved through `NavigationService`. Cached paths are invalidated when terrain or dynamic obstacles change. Higher-level systems can layer steering, smoothing, or region graph routing on top of this service.

## Scaling note

A* frontier ordering uses a binary heap priority queue rather than sorting the full open set each iteration. Region graph and flow-field layers remain available for future hierarchical routing and crowd movement.
