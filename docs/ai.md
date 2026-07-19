# AI Architecture

| AI | Inputs | Memory | Goals | Planning/decision making | Events | Future learning |
|---|---|---|---|---|---|---|
| NPCs | time, location, relationship, quests | profile, schedule, facts | serve, socialize, request | utility scoring + schedule planner | NPC_UPDATED, QUEST_PROGRESS | preference adaptation |
| Animals | weather, crops, habitat | territory | eat, avoid, nest | behavior tree | WORLD_UPDATED | habitat migration |
| Enemies | biome, player gear | encounter state | challenge player | telegraphed tactics | COMBAT_STARTED/ENDED | difficulty tuning |
| Merchants | inventory, demand, season | price history | profit, availability | market rules | ECONOMY_CHANGED | demand forecasting |
| Companions | player task, location | bond, skills | assist, warn | goal-oriented action planning | PLAYER_MOVED | learned preferences |
| Weather | season, climate, RNG | forecast seed | variety, pressure | Markov/seasonal model | WEATHER_UPDATED | climate adaptation |
| World simulation | events, calendar | world flags | coherence | deterministic tick systems | WORLD_UPDATED | scenario tuning |
| Automation assistants | tasks, machines, inventory | routes, rules | reduce repetition | job queue planner | INVENTORY_CHANGED | player macro suggestions |
