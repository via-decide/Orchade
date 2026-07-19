import { addItem, initialInventoryState, registerItemMetadata } from '../../inventory/api';
import { createFarmWorld, harvestCropToInventory, plantCropFromInventory, serializeWorldSave, simulateWorldTick } from '../api';

let inventory = registerItemMetadata(initialInventoryState, [
  { id: 'Basic-seed', name: 'Terran Sprout Seed', category: 'seed', maxStack: 99, tags: ['crop', 'spring'] },
  { id: 'Basic-crop', name: 'Terran Sprout', category: 'crop', maxStack: 99, tags: ['harvest'] },
]);
inventory = addItem(inventory, 'backpack', 'Basic-seed', 2).state;
let world = createFarmWorld(2, 2, 42);

const planted = plantCropFromInventory(world, inventory, 'tile-0-0', 'Basic-seed');
if (!planted.crop) throw new Error(planted.reason ?? 'planting failed');
if (planted.inventory.backpack.stacks[0].quantity !== 1) throw new Error('seed should be consumed');

world = planted.world;
inventory = planted.inventory;
for (let index = 0; index < 480 && !world.crops[planted.crop.id].readyToHarvest; index += 1) {
  world = simulateWorldTick(world);
}
if (!world.crops[planted.crop.id].readyToHarvest) throw new Error('crop did not mature');
if (world.tiles[0].nutrients.nitrogen >= 60) throw new Error('soil nitrogen should deplete during growth');

const harvested = harvestCropToInventory(world, inventory, planted.crop.id);
if (harvested.quantity <= 0 || harvested.overflow !== 0) throw new Error('harvest should enter inventory');
if (!harvested.inventory.backpack.stacks.some(stack => stack.itemId === 'Basic-crop')) throw new Error('crop stack missing');
const save = serializeWorldSave(harvested.world, harvested.inventory);
if (save.schemaVersion !== 1 || save.world.clock.tick === 0) throw new Error('save should include versioned simulated world');
