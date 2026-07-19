# Technical Game Design

Progression moves from plot mastery to orchard expansion, biome unlocks, tool specialization, crafting stations, village reputation, and endgame ecological restoration. Onboarding should introduce one concept per day: plant, water, weather, harvest, sell, upgrade, quest, craft, travel. Pacing alternates short care actions with medium planning arcs and long seasonal goals. Retention loops: daily forecast decisions, weekly contracts, seasonal events, collection milestones, NPC relationships, and visual orchard evolution. Reward loops: credits, data seeds, new species, tools, recipes, landmarks, achievements, and narrative reveals. Mastery comes from understanding traits, weather, market timing, automation, and ecological balance. Endgame should support optimization, restoration projects, rare genetics, community goals, and modded scenarios.

Weak loops: pure currency grind, static pricing, isolated plant species, no loss recovery, and unlocks without choice. Replace with meaningful tradeoffs, forecasts, specialization paths, and player-authored orchard identity.
## Suggestions
| Suggestion | Why it improves the game | Dev effort | Technical risk | Gameplay impact | Replayability impact | Retention impact | Architecture impact |
|---|---|---:|---:|---:|---:|---:|---:|
| Define explicit crop roles: starter, fast-cycle, resilient, risky high-yield, weather-specialist, collection trophy. | Makes seed choice legible and supports varied strategies. | M | L | H | H | H | M |
| Add tradeoffs to every upgrade path. | Prevents obvious best choices and creates build identity. | M | M | H | H | H | M |
| Add soft failure recovery for burned, pest-ridden, or neglected plants. | Keeps setbacks interesting instead of purely punitive. | M | L | H | M | H | M |
| Add mastery badges for species, weather survival, low-stress harvests, and efficient orchards. | Gives players durable goals after basic completion. | M | L | H | H | H | M |
| Add prestige research tiers after archive completion. | Extends late-game retention without requiring endless new species. | L | M | H | H | H | H |


## Economy

The economy should be treated as a first-class design system owned by the `gameplay/economy/` capsule, whose README defines responsibility for currencies, pricing rules, shop contracts, and telemetry while the current runtime remains partially implemented in `src/App.tsx`. The goals are to make purchases legible, prevent runaway credit creation, and give future inventory, crafting, merchant, and Firebase save features deterministic server-verifiable rules.

### Currency model

| Currency | Current role | Primary uses | Design constraints |
|---|---|---|---|
| Credits | Soft currency. New saves begin with 100 credits; credits buy seed starts, orchard unlocks, care shop items, atmospheric overrides, and can be transferred between Firebase users. | Everyday spending, player-to-player exchange, ranking score, liquidity from Data Seed liquidation. | Credits are high-volume and transferable, so every source and sink must have an audit reason, client preview, and authoritative validation before persistence. |
| Data Seeds | Research currency. New saves begin with 0 Data Seeds; plant research milestones and harvests award Data Seeds, upgrades spend them, and the market liquidates them at 1 Data Seed = 50 credits. | Genetic upgrades, research trees, late-game unlocks, optional conversion into credits. | Data Seeds should remain mostly non-transferable and slower than credits because they gate power progression. Conversion should be one-way until there is a server-priced exchange. |
| Future tokens | Reserved premium/event/reputation currency, not implemented in runtime state yet. | Seasonal passes, cosmetic orchard modules, merchant favors, challenge tickets, or anti-inflation sinks. | Future tokens must never bypass core cultivation progression. If they become paid or event-limited, Firebase writes require stricter server authority than credits. |

### Sources and sinks

| Flow | Implemented baseline | Recommended expansion |
|---|---|---|
| Credit sources | Research actions grant +10 credits; harvests grant `500 + rootStrength * 0.5` credits; daily login rewards are saved through Firebase increments; Data Seeds can be liquidated for 50 credits each. | Add quest payouts, merchant orders, crop-quality bonuses, first-discovery bonuses, and capped assistance grants for recovery after crop burn. |
| Credit sinks | Seed purchases cost 50-300 credits, care items cost 15-50 credits, orchard unlocks cost 250 and 750 credits after the free starting orchard, and climate control costs 120 credits for three cycles. | Add repair fees, merchant taxes, storage rent, listing fees, travel costs, building maintenance, and optional cosmetic sinks that do not affect power. |
| Data Seed sources | Stage evolution grants +5 Data Seeds and harvest grants +5 Data Seeds. | Add encyclopedia completion, rare crop analysis, weather challenge milestones, quest rewards, and merchant research contracts. |
| Data Seed sinks | Each global upgrade purchase costs 10 Data Seeds by default. | Add tiered upgrade costs, recipe discovery, orchard specialization, crop mastery unlocks, and research rerolls. |
| Future token sources/sinks | None currently. | Keep sources scarce and explicit: event participation, major milestones, or server-issued grants; sinks should be cosmetic, convenience-limited, or entry fees with capped rewards. |

### Pricing baselines

| Price family | Current values | Design rule |
|---|---:|---|
| Shop care items | Compost 15, Neem Oil 15, Synthetic 25, Chemical Spray 25, Organic Premium 50 credits. | Price by immediate plant-state delta and downside: high nutrient or pest removal effects with stress penalties can be cheaper than premium low-stress options. |
| Seed pricing | Terran Sprout 50, Aether Grass 80, Neon Vine 100, Shadow Fungi 120, Xero Cactus 130, Quartz Fern 150, Cryo Lily 180, Plasma Orchid 250, Void Willow 300 credits. | Seed prices should reflect expected harvest value, risk, lifecycle speed, weather resilience, data yield, and collection rarity. Starter seeds must stay affordable from a new-save balance of 100 credits. |
| Orchard unlock costs | Primary Orchard free, Highland Ridge 250 credits, Deep Valley 750 credits. | Orchard expansion should be the main mid-game credit sink. Costs should scale faster than seed prices but slower than optimized harvest income to avoid blocking experimentation. |
| Upgrade costs | `applyUpgradePurchase` currently spends 10 Data Seeds per upgrade and improves stress resistance additively while reducing other multiplier-style values by 10%. | Move from flat costs to tiered costs such as 10/15/25/40 Data Seeds per repeated rank, with caps and diminishing returns. |
| Exchange pricing | Data Seed liquidation pays 50 credits per Data Seed. | Treat 50 credits as a floor/buyback rate, not a dynamic market price, until server-side market quotes exist. |
| Climate control | 120 credits for three cycles. | Keep weather manipulation above common care-item prices but below a full late-game seed so it is an emergency tool, not a mandatory tax. |

### Merchant inventories

Merchant inventories should be data-driven rather than hard-coded UI lists. Use `data/items/item-definitions.json` as the canonical item vocabulary: seeds, resources, tools, food, quest items, equipment, and containers. A merchant inventory entry should include `itemId`, buy price, sell price, stock count, restock cadence, rarity tier, prerequisites, and relationship modifiers. Until NPC merchants are live, the current `SHOP_ITEMS` list can be treated as the starter agricultural supplier, while future inventories should add seed lots, fertilizer variants, tool upgrades, crop-resource buy orders, crafting components, and limited event goods.

### Supply, demand, and inflation controls

Supply and demand should adjust prices gradually, deterministically, and with bounds. Each crop or item can track rolling server-side sales volume, purchases, and stockouts. High player selling volume lowers merchant buy prices; repeated purchases, low stock, or adverse weather raise sell prices. Price movement should be clamped per day and per item rarity to avoid manipulation, with visible arrows in the shop UI and telemetry events for quote generation, purchase, sale, liquidation, and transfer.

Inflation controls should combine hard sinks and anti-printing rules:

- Keep the Data Seed-to-credit liquidation rate fixed or server-quoted and never let players reverse-convert credits into Data Seeds at a profitable rate.
- Add progressive orchard, building, repair, listing, travel, and cosmetic sinks that scale with owned orchards and late-game production.
- Cap repeatable daily login rewards and require server timestamps so clock changes cannot mint credits.
- Clamp harvest rewards with crop-specific expected value curves, then use telemetry to compare credits generated per day against credits spent per day.
- Keep leaderboard scoring transparent; the current ranking formula values Data Seeds at 10 ranking points each, which is intentionally lower than the 50-credit liquidation value and should be revisited if rankings become competitive.

### Crafting economy and resource rarity

Crafting should consume items from `item-definitions.json` and output either marketable goods, care items, tools, or progression components. Rarity should be attached to both resources and recipes: common resources support baseline fertilizers and repairs; uncommon resources unlock crop-specific boosters; rare resources enable greenhouse modules, weather stabilizers, or merchant contracts; legendary resources should be mostly cosmetic or one-time unlock materials to prevent repetitive grind. Crafting must remain a sink for surplus crop output by including failure-free baseline recipes, optional quality bonuses, and batch crafting fees.

### Loot tables

Loot tables should be explicit data records rather than ad hoc random calls. Each table should include source type, eligible item IDs, rarity weights, quantity ranges, quality modifiers, pity counters for rare drops, and daily or per-source caps. Early loot tables can cover harvest outputs, weather event debris, merchant crates, quest rewards, and future mining/fishing/crafting byproducts. Tables must log the random seed or deterministic roll context for Firebase-backed saves so disputed rewards can be audited.

### Balance telemetry

Every economy-changing event should emit structured telemetry through the economy capsule or future event bus: currency before/after, item ID, price quote ID, source/sink reason, player day, orchard count, crop type, and Firebase user ID when authenticated. Core dashboards should track credits generated, credits spent, Data Seeds generated, upgrades purchased, seed purchase mix, orchard unlock timing, harvest reward distribution, merchant stockouts, liquidation volume, transfer volume, failed validations, and outlier accounts. Balance passes should target time-to-first-upgrade, time-to-second-orchard, average credits per active day, and ratio of generated currency to sinks.

### Anti-exploit constraints for Firebase-backed saves and credit transfers

The current app persists user economy state to Firebase and supports direct credit transfers through batched writes. To keep this safe as the economy grows:

- Treat client state as a request, not authority. Security rules or server functions should recompute affordability, rewards, transfer balances, daily rewards, and exchange payouts from trusted prior state.
- Store economy transactions in an append-only ledger with unique IDs, monotonic server timestamps, idempotency keys, source/sink reason codes, and before/after balances.
- Validate credit transfers with positive integer amounts, no self-transfer, sender balance checks, per-day and per-pair limits, cooldowns, and duplicate-transfer detection. Predictable transfer IDs should be replaced or augmented with collision-safe transaction IDs plus server-side uniqueness checks.
- Never trust client-provided `credits`, `dataSeeds`, `orchards`, upgrade ranks, shop prices, inventory stacks, or loot rolls without cross-checking the corresponding action.
- Use Firebase transactions or callable backend functions for all multi-document writes so sender debit, recipient credit, and transfer ledger creation succeed or fail atomically.
- Deny negative balances, non-finite values, fractional credits, oversized integers, stale save versions, and writes that skip required migration fields.
- Add anomaly detection for high credit velocity, repeated liquidation loops, impossible harvest cadence, excessive failed transfers, and merchant inventory purchases beyond available stock.

## Estimate scale
`S` = small, `M` = medium, `L` = large, `H` = high/very large impact or risk.
