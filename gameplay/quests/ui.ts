export type QuestsViewModel = {
  title: string;
  status: string;
};

export const createQuestsViewModel = (status: string): QuestsViewModel => ({
  title: 'Quests',
  status,
});
