import { applyEffects, satisfies, type GoapAction, type GoapGoal, type WorldState } from '../goap/goap';

type Node = { state: WorldState; plan: GoapAction[]; cost: number };

export class Planner {
  plan(state: WorldState, goal: GoapGoal, actions: GoapAction[], maxDepth = 8): GoapAction[] {
    const queue: Node[] = [{ state, plan: [], cost: 0 }];
    let best: Node | undefined;
    while (queue.length) {
      const node = queue.shift()!;
      if (satisfies(node.state, goal.desired)) { best = node; break; }
      if (node.plan.length >= maxDepth) continue;
      for (const action of actions) {
        if (!satisfies(node.state, action.preconditions)) continue;
        queue.push({ state: applyEffects(node.state, action), plan: [...node.plan, action], cost: node.cost + action.cost });
      }
      queue.sort((left, right) => left.cost - right.cost);
    }
    return best?.plan ?? [];
  }

  shouldReplan(currentGoal: GoapGoal | undefined, nextGoal: GoapGoal): boolean {
    return !currentGoal || nextGoal.priority > currentGoal.priority;
  }
}
