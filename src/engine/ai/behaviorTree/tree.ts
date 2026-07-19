export type BehaviorStatus = 'success' | 'failure' | 'running';
export type BehaviorNode = { name: string; tick(): BehaviorStatus };
export class BehaviorTree { constructor(private root: BehaviorNode) {} tick(): BehaviorStatus { return this.root.tick(); } }
