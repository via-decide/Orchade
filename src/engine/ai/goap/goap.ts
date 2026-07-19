export type WorldStateValue = boolean | number | string;
export type WorldState = Record<string, WorldStateValue>;
export type GoapAction = { name: string; cost: number; preconditions: WorldState; effects: WorldState; interruptible?: boolean };
export type GoapGoal = { name: string; desired: WorldState; priority: number };
export function satisfies(state: WorldState, desired: WorldState): boolean { return Object.entries(desired).every(([key, value]) => state[key] === value); }
export function applyEffects(state: WorldState, action: GoapAction): WorldState { return { ...state, ...action.effects }; }
