import { createFarmWorld, simulateWorldTick } from '../api';

let first = createFarmWorld(3, 3, 7);
let second = createFarmWorld(3, 3, 7);
for (let index = 0; index < 100; index += 1) {
  first = simulateWorldTick(first);
  second = simulateWorldTick(second);
}
if (JSON.stringify(first.weather) !== JSON.stringify(second.weather)) throw new Error('weather diverged');
if (JSON.stringify(first.clock) !== JSON.stringify(second.clock)) throw new Error('clock diverged');
if (JSON.stringify(first.tiles.map(tile => tile.moisture)) !== JSON.stringify(second.tiles.map(tile => tile.moisture))) throw new Error('tile moisture diverged');
