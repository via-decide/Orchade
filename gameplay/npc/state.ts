export type NpcStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';
export type NpcNeed = 'hunger' | 'energy' | 'social' | 'money';
export type NpcJob = 'farmer' | 'merchant' | 'rancher' | 'forager' | 'builder';
export type NpcPersonality = 'friendly' | 'reserved' | 'ambitious' | 'curious';

export type NpcScheduleEntry = {
  startHour: number;
  activity: 'sleep' | 'breakfast' | 'work' | 'lunch' | 'socialize' | 'shop' | 'shelter' | 'wander';
  location: string;
};

export type NpcMemory = { tick: number; subject: string; sentiment: number; note: string };
export type Relationship = { targetId: string; friendship: number; trust: number; reputation: number; lastInteractionTick: number | null };

export type NpcProfile = {
  id: string;
  entityId: string;
  name: string;
  home: string;
  job: NpcJob;
  personality: NpcPersonality;
  skills: Record<string, number>;
  needs: Record<NpcNeed, number>;
  inventoryContainerId: string;
  money: number;
  relationships: Record<string, Relationship>;
  memory: NpcMemory[];
  schedule: NpcScheduleEntry[];
  reputation: number;
  currentActivity: NpcScheduleEntry['activity'];
  currentLocation: string;
};

export type NpcState = {
  module: 'npc';
  status: NpcStatus;
  updatedAt: string | null;
  profiles: Record<string, NpcProfile>;
};

export const defaultVillagerSchedule: NpcScheduleEntry[] = [
  { startHour: 6, activity: 'breakfast', location: 'home' },
  { startHour: 8, activity: 'work', location: 'workplace' },
  { startHour: 12, activity: 'lunch', location: 'market' },
  { startHour: 13, activity: 'work', location: 'workplace' },
  { startHour: 18, activity: 'socialize', location: 'square' },
  { startHour: 22, activity: 'sleep', location: 'home' },
];

export const initialNpcState: NpcState = {
  module: 'npc',
  status: 'in-progress',
  updatedAt: null,
  profiles: {},
};
