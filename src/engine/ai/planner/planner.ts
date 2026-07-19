import type { GoapAction, GoapGoal, WorldState } from '../goap/goap';
export class Planner { plan(_state: WorldState, goal: GoapGoal, actions: GoapAction[]): GoapAction[] { return actions.filter(action => Object.entries(goal.desired).some(([k,v]) => action.effects[k] === v)).sort((a,b)=>a.cost-b.cost); } }
