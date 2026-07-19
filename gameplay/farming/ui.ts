export type FarmingViewModel = {
  title: string;
  status: string;
};

export const createFarmingViewModel = (status: string): FarmingViewModel => ({
  title: 'Farming',
  status,
});
