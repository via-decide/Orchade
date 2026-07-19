export type CraftingStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type CraftingState = {
  module: 'crafting';
  status: CraftingStatus;
  updatedAt: string | null;
};

export const initialCraftingState: CraftingState = {
  module: 'crafting',
  status: 'planned',
  updatedAt: null,
};
