export type EconomyStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type EconomyState = {
  module: 'economy';
  status: EconomyStatus;
  updatedAt: string | null;
};

export const initialEconomyState: EconomyState = {
  module: 'economy',
  status: 'in-progress',
  updatedAt: null,
};
