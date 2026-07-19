# Event Catalog

Events are documented at capsule boundaries. Producers and consumers should use public APIs, never another capsule's internals.

## INVENTORY_CHANGED
- Producer: inventory
- Consumers: TBD by integration work.
- Payload: Define in inventory/public.ts before runtime use.
- Lifecycle: Emitted after inventory state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: INVENTORY_CHANGED -> WORLD_UPDATED when global state must refresh.

## PLANT_WATERED
- Producer: farming
- Consumers: TBD by integration work.
- Payload: Define in farming/public.ts before runtime use.
- Lifecycle: Emitted after farming state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: PLANT_WATERED -> WORLD_UPDATED when global state must refresh.

## PLANT_HARVESTED
- Producer: farming
- Consumers: TBD by integration work.
- Payload: Define in farming/public.ts before runtime use.
- Lifecycle: Emitted after farming state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: PLANT_HARVESTED -> WORLD_UPDATED when global state must refresh.

## FARMING_STATE_CHANGED
- Producer: farming
- Consumers: TBD by integration work.
- Payload: Define in farming/public.ts before runtime use.
- Lifecycle: Emitted after farming state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: FARMING_STATE_CHANGED -> WORLD_UPDATED when global state must refresh.

## COMBAT_STARTED
- Producer: combat
- Consumers: TBD by integration work.
- Payload: Define in combat/public.ts before runtime use.
- Lifecycle: Emitted after combat state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: COMBAT_STARTED -> WORLD_UPDATED when global state must refresh.

## COMBAT_ENDED
- Producer: combat
- Consumers: TBD by integration work.
- Payload: Define in combat/public.ts before runtime use.
- Lifecycle: Emitted after combat state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: COMBAT_ENDED -> WORLD_UPDATED when global state must refresh.

## CRAFTING_COMPLETED
- Producer: crafting
- Consumers: TBD by integration work.
- Payload: Define in crafting/public.ts before runtime use.
- Lifecycle: Emitted after crafting state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: CRAFTING_COMPLETED -> WORLD_UPDATED when global state must refresh.

## QUEST_PROGRESS
- Producer: quests
- Consumers: TBD by integration work.
- Payload: Define in quests/public.ts before runtime use.
- Lifecycle: Emitted after quests state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: QUEST_PROGRESS -> WORLD_UPDATED when global state must refresh.

## NPC_UPDATED
- Producer: npc
- Consumers: TBD by integration work.
- Payload: Define in npc/public.ts before runtime use.
- Lifecycle: Emitted after npc state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: NPC_UPDATED -> WORLD_UPDATED when global state must refresh.

## WEATHER_UPDATED
- Producer: weather
- Consumers: TBD by integration work.
- Payload: Define in weather/public.ts before runtime use.
- Lifecycle: Emitted after weather state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: WEATHER_UPDATED -> WORLD_UPDATED when global state must refresh.

## ECONOMY_CHANGED
- Producer: economy
- Consumers: TBD by integration work.
- Payload: Define in economy/public.ts before runtime use.
- Lifecycle: Emitted after economy state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: ECONOMY_CHANGED -> WORLD_UPDATED when global state must refresh.

## UI_TAB_CHANGED
- Producer: ui
- Consumers: TBD by integration work.
- Payload: Define in ui/public.ts before runtime use.
- Lifecycle: Emitted after ui state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: UI_TAB_CHANGED -> WORLD_UPDATED when global state must refresh.

## PLAYER_MOVED
- Producer: world
- Consumers: TBD by integration work.
- Payload: Define in world/public.ts before runtime use.
- Lifecycle: Emitted after world state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: PLAYER_MOVED -> WORLD_UPDATED when global state must refresh.

## WORLD_UPDATED
- Producer: world
- Consumers: TBD by integration work.
- Payload: Define in world/public.ts before runtime use.
- Lifecycle: Emitted after world state changes are committed.
- Failure conditions: Invalid payload, missing consumer, or rejected persistence.
- Example: WORLD_UPDATED -> WORLD_UPDATED when global state must refresh.


## Example flow
PLAYER_MOVED -> NPC_UPDATED -> WEATHER_UPDATED -> INVENTORY_CHANGED -> QUEST_PROGRESS -> SAVE_REQUESTED -> WORLD_UPDATED
