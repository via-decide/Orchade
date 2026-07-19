export type InventoryStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type InventoryState = {
  module: 'inventory';
  status: InventoryStatus;
  updatedAt: string | null;
};

export const initialInventoryState: InventoryState = {
  module: 'inventory',
  status: 'planned',
  updatedAt: null,
};
