export type CombatViewModel = {
  title: string;
  status: string;
};

export const createCombatViewModel = (status: string): CombatViewModel => ({
  title: 'Combat',
  status,
});
