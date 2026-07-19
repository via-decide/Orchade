import type { FarmWeather, Season } from '../../world/api';
import { defaultVillagerSchedule, initialNpcState, type NpcProfile, type NpcScheduleEntry, type NpcState } from '../state';

export const createVillager = (id: string, name: string, job: NpcProfile['job'], home: string, inventoryContainerId = `${id}-bag`): NpcProfile => ({
  id,
  entityId: `entity-npc-${id}`,
  name,
  home,
  job,
  personality: job === 'merchant' ? 'ambitious' : 'friendly',
  skills: { farming: job === 'farmer' ? 60 : 20, trade: job === 'merchant' ? 65 : 25, foraging: job === 'forager' ? 60 : 20 },
  needs: { hunger: 20, energy: 15, social: 25, money: 30 },
  inventoryContainerId,
  money: 100,
  relationships: {},
  memory: [],
  schedule: defaultVillagerSchedule,
  reputation: 0,
  currentActivity: 'sleep',
  currentLocation: home,
});

export const addNpc = (state: NpcState = initialNpcState, profile: NpcProfile): NpcState => ({ ...state, profiles: { ...state.profiles, [profile.id]: profile }, updatedAt: new Date().toISOString() });

const scheduleForHour = (schedule: NpcScheduleEntry[], hour: number) => schedule.reduce((current, entry) => entry.startHour <= hour ? entry : current, schedule[schedule.length - 1]);

export const advanceNpcRoutines = (state: NpcState, hour: number, weather: FarmWeather, season: Season): NpcState => {
  const profiles = Object.fromEntries(Object.entries(state.profiles).map(([id, npc]) => {
    let entry = scheduleForHour(npc.schedule, hour);
    if ((weather === 'storm' || weather === 'coldSnap') && entry.activity !== 'sleep') entry = { startHour: hour, activity: 'shelter', location: 'home' };
    if (season === 'winter' && entry.activity === 'work' && npc.job === 'farmer') entry = { startHour: hour, activity: 'shop', location: 'market' };
    const hunger = Math.min(100, npc.needs.hunger + (entry.activity === 'breakfast' || entry.activity === 'lunch' ? -35 : 2));
    const energy = Math.min(100, Math.max(0, npc.needs.energy + (entry.activity === 'sleep' ? -30 : 3)));
    const social = Math.min(100, Math.max(0, npc.needs.social + (entry.activity === 'socialize' ? -25 : 2)));
    const money = Math.min(100, Math.max(0, npc.needs.money + (entry.activity === 'work' ? -10 : 1)));
    const currentLocation = entry.location === 'home' ? npc.home : entry.location === 'workplace' ? `${npc.job}-guild` : entry.location;
    return [id, { ...npc, needs: { hunger, energy, social, money }, currentActivity: entry.activity, currentLocation } satisfies NpcProfile];
  }));
  return { ...state, profiles, updatedAt: new Date().toISOString() };
};
