export type EconomyViewModel = {
  title: string;
  status: string;
};

export const createEconomyViewModel = (status: string): EconomyViewModel => ({
  title: 'Economy',
  status,
});
