# Audio Improvements

## Evidence baseline
The encyclopedia and climate control use Web Audio oscillator feedback, and weather data includes audio IDs such as `rain_loop`, `storm_loop`, and `fog_ambience`. The visualizer already responds to weather and status, creating strong hooks for adaptive audio.

## Suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Add a small audio manager with buses for UI, ambience, weather, and alerts. | Prevents one-off sound code and supports settings. | M | M | M | M | H | H |
| Implement weather ambience from data-pack audio IDs. | Makes weather changes emotionally legible. | M | M | M | M | H | M |
| Add plant action sounds for water, fertilizer, pesticide, research, harvest, and failed action. | Strengthens feedback loops and makes actions satisfying. | M | L | H | M | H | M |
| Add low-health/pest/stress warning stingers with cooldowns. | Helps players notice urgent problems without constant UI scanning. | S | L | M | L | H | M |
| Add accessibility settings for master volume, mute, and reduced alerts. | Broadens comfort and prevents audio fatigue. | S | L | M | L | H | M |

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
