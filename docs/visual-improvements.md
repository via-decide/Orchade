# Visual Improvements

## Evidence baseline
`PlantVisualizer` uses Three.js meshes for multiple plant silhouettes, weather particles for rain/storm/fog/heatwave, pest meshes, burning particles, tool particles, dynamic lighting, and plant swaying. `PlantCard` shows status bars and alerts.

## Suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Add species-specific maturation silhouettes for every encyclopedia species. | Makes collection and growth feel more rewarding. | L | M | H | H | H | M |
| Add orchard-level weather and time-of-day backgrounds. | Makes world simulation instantly visible. | M | M | M | M | H | M |
| Add clear harvest-ready glow and pest/stress overlays on plot cards. | Improves readability and action prioritization. | S | L | H | M | H | L |
| Add reduced-motion and lower-particle modes. | Improves accessibility and performance on weaker devices. | M | M | M | L | H | M |
| Add visual progression for unlocked orchards and buildings. | Turns expansion into visible accomplishment. | L | M | H | H | H | M |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
