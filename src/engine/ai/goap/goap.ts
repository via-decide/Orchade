export type WorldState = Record<string, boolean | number | string>;
export type GoapAction = { name: string; cost: number; preconditions: WorldState; effects: WorldState };
export type GoapGoal = { name: string; desired: WorldState; priority: number };
