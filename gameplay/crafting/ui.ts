export type CraftingViewModel = {
  title: string;
  status: string;
};

export const createCraftingViewModel = (status: string): CraftingViewModel => ({
  title: 'Crafting',
  status,
});
