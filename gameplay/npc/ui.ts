export type NpcViewModel = {
  title: string;
  status: string;
};

export const createNpcViewModel = (status: string): NpcViewModel => ({
  title: 'Npc',
  status,
});
