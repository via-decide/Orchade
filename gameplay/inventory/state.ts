export type InventoryStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type ItemCategory = 'seed' | 'crop' | 'material' | 'tool' | 'equipment' | 'consumable' | 'quest' | 'decor';
export type EquipmentSlot = 'head' | 'body' | 'hands' | 'feet' | 'tool';

export type ItemMetadata = {
  id: string;
  name: string;
  category: ItemCategory;
  description?: string;
  maxStack: number;
  value?: number;
  tags?: string[];
  equipmentSlot?: EquipmentSlot;
};

export type InventoryStack = {
  stackId: string;
  itemId: string;
  quantity: number;
  favorite?: boolean;
};

export type InventoryContainer = {
  id: string;
  name: string;
  capacity: number;
  stacks: InventoryStack[];
  acceptedCategories?: ItemCategory[];
};

export type InventorySearch = {
  query?: string;
  categories?: ItemCategory[];
  tags?: string[];
  favoritesOnly?: boolean;
};

export type InventoryState = {
  module: 'inventory';
  status: InventoryStatus;
  updatedAt: string | null;
  metadata: Record<string, ItemMetadata>;
  backpack: InventoryContainer;
  hotbar: (string | null)[];
  equipment: Partial<Record<EquipmentSlot, string>>;
  storage: Record<string, InventoryContainer>;
};

export const initialInventoryState: InventoryState = {
  module: 'inventory',
  status: 'in-progress',
  updatedAt: null,
  metadata: {},
  backpack: { id: 'backpack', name: 'Backpack', capacity: 24, stacks: [] },
  hotbar: Array(8).fill(null),
  equipment: {},
  storage: {},
};
