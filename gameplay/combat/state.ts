export type CombatStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type CombatState = {
  module: 'combat';
  status: CombatStatus;
  updatedAt: string | null;
};

export const initialCombatState: CombatState = {
  module: 'combat',
  status: 'planned',
  updatedAt: null,
};
