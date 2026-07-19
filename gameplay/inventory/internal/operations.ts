import type { EquipmentSlot, InventoryContainer, InventorySearch, InventoryStack, InventoryState, ItemMetadata } from '../state';

const cloneContainer = (container: InventoryContainer): InventoryContainer => ({ ...container, stacks: container.stacks.map(stack => ({ ...stack })) });
const createStackId = (itemId: string) => `${itemId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const registerItemMetadata = (state: InventoryState, metadata: ItemMetadata[]): InventoryState => ({
  ...state,
  status: 'in-progress',
  updatedAt: new Date().toISOString(),
  metadata: metadata.reduce((catalog, item) => ({ ...catalog, [item.id]: item }), { ...state.metadata }),
});

export const createContainer = (id: string, name: string, capacity: number): InventoryContainer => ({ id, name, capacity, stacks: [] });

export const addContainer = (state: InventoryState, container: InventoryContainer): InventoryState => ({
  ...state,
  storage: { ...state.storage, [container.id]: cloneContainer(container) },
  updatedAt: new Date().toISOString(),
});

export const addItem = (state: InventoryState, containerId: string, itemId: string, quantity: number): { state: InventoryState; remainder: number } => {
  const metadata = state.metadata[itemId];
  if (!metadata || quantity <= 0) return { state, remainder: quantity };
  const container = containerId === state.backpack.id ? cloneContainer(state.backpack) : cloneContainer(state.storage[containerId]);
  if (!container || (container.acceptedCategories && !container.acceptedCategories.includes(metadata.category))) return { state, remainder: quantity };
  let remaining = quantity;
  for (const stack of container.stacks) {
    if (stack.itemId === itemId && stack.quantity < metadata.maxStack) {
      const moved = Math.min(remaining, metadata.maxStack - stack.quantity);
      stack.quantity += moved;
      remaining -= moved;
      if (remaining === 0) break;
    }
  }
  while (remaining > 0 && container.stacks.length < container.capacity) {
    const moved = Math.min(remaining, metadata.maxStack);
    container.stacks.push({ stackId: createStackId(itemId), itemId, quantity: moved });
    remaining -= moved;
  }
  return { state: replaceContainer(state, container), remainder: remaining };
};

export const replaceContainer = (state: InventoryState, container: InventoryContainer): InventoryState => ({
  ...state,
  updatedAt: new Date().toISOString(),
  backpack: container.id === state.backpack.id ? container : state.backpack,
  storage: container.id === state.backpack.id ? state.storage : { ...state.storage, [container.id]: container },
});

export const transferItem = (state: InventoryState, fromId: string, toId: string, stackId: string, quantity: number): { state: InventoryState; moved: number } => {
  const from = fromId === state.backpack.id ? cloneContainer(state.backpack) : cloneContainer(state.storage[fromId]);
  const stack = from?.stacks.find(s => s.stackId === stackId);
  if (!from || !stack || quantity <= 0) return { state, moved: 0 };
  const moved = Math.min(quantity, stack.quantity);
  const without = { ...state, backpack: from.id === state.backpack.id ? from : state.backpack, storage: from.id === state.backpack.id ? state.storage : { ...state.storage, [from.id]: from } };
  const added = addItem(without, toId, stack.itemId, moved);
  const accepted = moved - added.remainder;
  stack.quantity -= accepted;
  from.stacks = from.stacks.filter(s => s.quantity > 0);
  return { state: replaceContainer(added.state, from), moved: accepted };
};

export const sortContainer = (state: InventoryState, containerId: string): InventoryState => {
  const container = containerId === state.backpack.id ? cloneContainer(state.backpack) : cloneContainer(state.storage[containerId]);
  if (!container) return state;
  container.stacks.sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || (state.metadata[a.itemId]?.category ?? '').localeCompare(state.metadata[b.itemId]?.category ?? '') || (state.metadata[a.itemId]?.name ?? a.itemId).localeCompare(state.metadata[b.itemId]?.name ?? b.itemId));
  return replaceContainer(state, container);
};

export const searchStacks = (state: InventoryState, containerId: string, search: InventorySearch = {}): InventoryStack[] => {
  const container = containerId === state.backpack.id ? state.backpack : state.storage[containerId];
  if (!container) return [];
  const query = search.query?.trim().toLowerCase();
  return container.stacks.filter(stack => {
    const item = state.metadata[stack.itemId];
    if (!item) return false;
    if (search.favoritesOnly && !stack.favorite) return false;
    if (search.categories?.length && !search.categories.includes(item.category)) return false;
    if (search.tags?.length && !search.tags.every(tag => item.tags?.includes(tag))) return false;
    return !query || item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query) || item.tags?.some(tag => tag.toLowerCase().includes(query));
  });
};

export const toggleFavorite = (state: InventoryState, containerId: string, stackId: string): InventoryState => {
  const container = containerId === state.backpack.id ? cloneContainer(state.backpack) : cloneContainer(state.storage[containerId]);
  const stack = container?.stacks.find(s => s.stackId === stackId);
  if (!container || !stack) return state;
  stack.favorite = !stack.favorite;
  return replaceContainer(state, container);
};

export const equipStack = (state: InventoryState, containerId: string, stackId: string): InventoryState => {
  const container = containerId === state.backpack.id ? state.backpack : state.storage[containerId];
  const stack = container?.stacks.find(s => s.stackId === stackId);
  const slot = stack ? state.metadata[stack.itemId]?.equipmentSlot : undefined;
  if (!slot) return state;
  return { ...state, equipment: { ...state.equipment, [slot as EquipmentSlot]: stackId }, updatedAt: new Date().toISOString() };
};

export const removeItem = (state: InventoryState, containerId: string, itemId: string, quantity: number): { state: InventoryState; removed: number } => {
  const container = containerId === state.backpack.id ? cloneContainer(state.backpack) : cloneContainer(state.storage[containerId]);
  if (!container || quantity <= 0) return { state, removed: 0 };
  let remaining = quantity;
  for (const stack of container.stacks) {
    if (stack.itemId !== itemId || remaining === 0) continue;
    const removed = Math.min(remaining, stack.quantity);
    stack.quantity -= removed;
    remaining -= removed;
  }
  container.stacks = container.stacks.filter(stack => stack.quantity > 0);
  return { state: replaceContainer(state, container), removed: quantity - remaining };
};
