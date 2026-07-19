import type { Blackboard } from '../blackboard/blackboard';

export type BehaviorStatus = 'success' | 'failure' | 'running';
export type BehaviorContext = { tick: number; blackboard: Blackboard };
export type BehaviorNode = { name: string; tick(context: BehaviorContext): BehaviorStatus; interrupt?(): void };

export class Sequence implements BehaviorNode {
  name = 'Sequence';
  constructor(private children: BehaviorNode[]) {}
  tick(context: BehaviorContext): BehaviorStatus {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== 'success') return status;
    }
    return 'success';
  }
}

export class Selector implements BehaviorNode {
  name = 'Selector';
  constructor(private children: BehaviorNode[]) {}
  tick(context: BehaviorContext): BehaviorStatus {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== 'failure') return status;
    }
    return 'failure';
  }
}

export class Condition implements BehaviorNode {
  constructor(readonly name: string, private predicate: (context: BehaviorContext) => boolean) {}
  tick(context: BehaviorContext): BehaviorStatus { return this.predicate(context) ? 'success' : 'failure'; }
}

export class Cooldown implements BehaviorNode {
  private nextTick = 0;
  constructor(readonly name: string, private child: BehaviorNode, private ticks: number) {}
  tick(context: BehaviorContext): BehaviorStatus {
    if (context.tick < this.nextTick) return 'failure';
    const status = this.child.tick(context);
    if (status === 'success') this.nextTick = context.tick + this.ticks;
    return status;
  }
}

export class BehaviorTree {
  constructor(private root: BehaviorNode) {}
  tick(context: BehaviorContext): BehaviorStatus { return this.root.tick(context); }
  interrupt(): void { this.root.interrupt?.(); }
}
