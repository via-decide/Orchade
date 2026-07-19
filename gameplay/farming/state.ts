export type FarmingStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type FarmingState = {
  module: 'farming';
  status: FarmingStatus;
  updatedAt: string | null;
};

export const initialFarmingState: FarmingState = {
  module: 'farming',
  status: 'in-progress',
  updatedAt: null,
};
