import { initialInventoryState, registerItemMetadata, addItem, createContainer, addContainer, transferItem, searchStacks, sortContainer, toggleFavorite } from '../api';

const state = registerItemMetadata(initialInventoryState, [
  { id: 'turnip-seed', name: 'Turnip Seed', category: 'seed', maxStack: 99, tags: ['crop', 'spring'] },
  { id: 'hoe', name: 'Field Hoe', category: 'equipment', maxStack: 1, equipmentSlot: 'tool' },
]);

const added = addItem(state, 'backpack', 'turnip-seed', 125);
if (added.remainder !== 0 || added.state.backpack.stacks.length !== 2) throw new Error('stacking failed');

const storage = addContainer(added.state, createContainer('shed', 'Storage Shed', 4));
const moved = transferItem(storage, 'backpack', 'shed', storage.backpack.stacks[0].stackId, 50);
if (moved.moved !== 50 || moved.state.storage.shed.stacks[0].quantity !== 50) throw new Error('transfer failed');

const favorite = toggleFavorite(moved.state, 'shed', moved.state.storage.shed.stacks[0].stackId);
const sorted = sortContainer(favorite, 'shed');
const matches = searchStacks(sorted, 'shed', { query: 'turnip', favoritesOnly: true });
if (matches.length !== 1) throw new Error('search/favorite failed');
