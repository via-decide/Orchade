export type NpcStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type NpcState = {
  module: 'npc';
  status: NpcStatus;
  updatedAt: string | null;
};

export const initialNpcState: NpcState = {
  module: 'npc',
  status: 'planned',
  updatedAt: null,
};
