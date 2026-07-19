export type InventoryViewModel = {
  title: string;
  status: string;
};

export const createInventoryViewModel = (status: string): InventoryViewModel => ({
  title: 'Inventory',
  status,
});
