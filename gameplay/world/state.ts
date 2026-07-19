export type WorldStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type WorldState = {
  module: 'world';
  status: WorldStatus;
  updatedAt: string | null;
};

export const initialWorldState: WorldState = {
  module: 'world',
  status: 'in-progress',
  updatedAt: null,
};
