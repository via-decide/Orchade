export type WorldViewModel = {
  title: string;
  status: string;
};

export const createWorldViewModel = (status: string): WorldViewModel => ({
  title: 'World',
  status,
});
