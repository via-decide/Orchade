# Navigation

Navigation provides grid-based A*, terrain costs, dynamic obstacle invalidation, path caching, flow-field identifiers, and region graph scaffolding.

## Path lifecycle

Requests are resolved through `NavigationService`. Cached paths are invalidated when terrain or dynamic obstacles change. Higher-level systems can layer steering, smoothing, or region graph routing on top of this service.
