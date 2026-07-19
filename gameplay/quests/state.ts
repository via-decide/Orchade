export type QuestsStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type QuestsState = {
  module: 'quests';
  status: QuestsStatus;
  updatedAt: string | null;
};

export const initialQuestsState: QuestsState = {
  module: 'quests',
  status: 'planned',
  updatedAt: null,
};
