export type UiStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type UiState = {
  module: 'ui';
  status: UiStatus;
  updatedAt: string | null;
};

export const initialUiState: UiState = {
  module: 'ui',
  status: 'in-progress',
  updatedAt: null,
};
