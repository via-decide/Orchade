export type UiViewModel = {
  title: string;
  status: string;
};

export const createUiViewModel = (status: string): UiViewModel => ({
  title: 'Ui',
  status,
});
