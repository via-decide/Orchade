import { Blackboard } from './blackboard/blackboard';
import { Memory } from './memory/memory';
import { Perception } from './perception/perception';
import { Planner } from './planner/planner';
import type { BehaviorTree } from './behaviorTree/tree';
export type Need = { name: string; value: number };
export type Goal = { name: string; priority: number };
export class AiAgent { readonly memory = new Memory(); readonly blackboard = new Blackboard(); readonly perception = new Perception(); readonly planner = new Planner(); constructor(readonly id: string, public needs: Need[] = [], public goals: Goal[] = [], public tree?: BehaviorTree) {} decide(tick = 0): void { this.tree?.tick({ tick, blackboard: this.blackboard }); } }
