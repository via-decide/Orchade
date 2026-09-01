import {
  createNewGameState,
  deriveNextPlayerObjective,
  deriveAvailablePlayerActions,
  deriveStarterBootstrap,
  redeemBootstrap,
  applyPlacementsToScenario,
  advanceNewGameDay,
  processSimulationConsequences,
  completeObjective,
  deriveProgressionInputs,
  OBJECTIVE_GRAPH,
} from '../api';
import {
  applyHomesteadPlanningIntent,
  type HomesteadPlanningContext,
} from '../../../src/simulation/homestead/planningTransition';
import { UNLOCK_REGISTRY } from '../../research-credits/internal/unlocks';
import type { UnlockSeason } from '../../research-credits/public';

const FIXED_SEED = 'test-deterministic-seed';

function freshGame() {
  return createNewGameState({ seed: FIXED_SEED, runId: 'test-run' });
}

function planningContext(state: ReturnType<typeof freshGame>, season: UnlockSeason = 'spring'): HomesteadPlanningContext {
  return { day: state.day, season, levelInputs: deriveProgressionInputs(state) };
}

export function runDirectorTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };

  // 1. Blank slate always produces one legal first objective
  {
    const state = freshGame();
    const objective = deriveNextPlayerObjective(state, 'spring');
    assert(!!objective && !!objective.id && !!objective.title, '1. Blank slate produces a legal first objective');
  }

  // 2. Same seed → identical objective and actions
  {
    const s1 = freshGame();
    const s2 = freshGame();
    const o1 = deriveNextPlayerObjective(s1, 'spring');
    const o2 = deriveNextPlayerObjective(s2, 'spring');
    assert(o1.id === o2.id && o1.title === o2.title, '2. Same seed produces identical objective');
    const a1 = deriveAvailablePlayerActions(s1, 'spring');
    const a2 = deriveAvailablePlayerActions(s2, 'spring');
    const idsMatch = a1.map(a => a.id).join(',') === a2.map(a => a.id).join(',');
    assert(idsMatch, '2. Same seed produces identical available actions');
  }

  // 3. Bootstrap cannot be redeemed twice
  {
    const state = freshGame();
    const voucher = deriveStarterBootstrap(state, 'spring');
    assert(voucher !== null, '3. Bootstrap voucher derived for fresh game');
    const { state: redeemed } = redeemBootstrap(state, voucher!);
    assert(redeemed.bootstrapRedeemed === true, '3. Bootstrap marked as redeemed');
    const secondVoucher = deriveStarterBootstrap(redeemed, 'spring');
    assert(secondVoucher === null, '3. Second bootstrap voucher is null');
    const { state: doubleRedeemed, events } = redeemBootstrap(redeemed, voucher!);
    assert(events.length === 0, '3. Double redemption emits no events');
    assert(doubleRedeemed.planning.research.balance === redeemed.planning.research.balance, '3. Balance unchanged on double redemption');
  }

  // 4. Invalid placement rejected with reason
  {
    const state = freshGame();
    const ctx = planningContext(state);
    const result = applyHomesteadPlanningIntent(state.planning, {
      type: 'PLACE_COMPONENT', placementId: 'test', contentId: 'unknown_crop_xyz', areaM2: 25,
    }, ctx);
    const rejected = result.events.find(e => e.type === 'PLACEMENT_REJECTED');
    assert(!!rejected, '4. Invalid placement emits PLACEMENT_REJECTED event');
  }

  // 5. Legal placement changes planning state
  {
    const state = freshGame();
    const ctx = planningContext(state);
    const result = applyHomesteadPlanningIntent(state.planning, {
      type: 'PLACE_COMPONENT', placementId: 'first-crop', contentId: 'tomato', areaM2: 25,
    }, ctx);
    assert(result.state.placements.length === 1, '5. Placement added to planning state');
    assert(result.state.placements[0].contentId === 'tomato', '5. Placement contentId is correct');
    assert(result.state.occupiedAreaM2 > state.planning.occupiedAreaM2, '5. Occupied area increased');
  }

  // 6. Placement changes simulation behaviour
  {
    let state = freshGame();
    const ctx = planningContext(state);
    const pr = applyHomesteadPlanningIntent(state.planning, {
      type: 'PLACE_COMPONENT', placementId: 'first-crop', contentId: 'tomato', areaM2: 25,
    }, ctx);
    state = { ...state, planning: pr.state };
    const { state: withPlacements } = applyPlacementsToScenario(state);
    assert(withPlacements.simulationReady === true, '6. Simulation marked ready after placement application');
    assert(withPlacements.scenario.foodProducers.length > 0, '6. Food producer added to scenario');
    const hasPlant = withPlacements.simulation.zones.some(z => z.plant.cropId === 'tomato');
    assert(hasPlant, '6. Simulation zone has planted crop');
    const { state: afterDay } = advanceNewGameDay(withPlacements);
    assert(afterDay.simulation.day === 2, '6. Day advanced after placement');
    const tomatoZone = afterDay.simulation.zones.find(z => z.plant.cropId === 'tomato');
    assert(!!tomatoZone && tomatoZone.plant.rootStrength > 0, '6. Crop root strength increased after day advance');
  }

  // 7. Wrong-season starter cannot be recommended
  {
    const state = completeObjective(freshGame(), 'inspect_land');
    const springObj = deriveNextPlayerObjective(state, 'spring');
    if (springObj.targetIds) {
      const allValid = springObj.targetIds.every(id => {
        const c = UNLOCK_REGISTRY.find(u => u.contentId === id);
        return !c?.validSeasons || c.validSeasons.includes('spring');
      });
      assert(allValid, '7. Spring objective targets only spring-valid crops');
    }
    const winterObj = deriveNextPlayerObjective(state, 'winter');
    if (winterObj.targetIds) {
      const allValid = winterObj.targetIds.every(id => {
        const c = UNLOCK_REGISTRY.find(u => u.contentId === id);
        return !c?.validSeasons || c.validSeasons.includes('winter');
      });
      assert(allValid, '7. Winter objective targets only winter-valid crops');
    }
  }

  // 8. Insufficient-area placement is rejected
  {
    const state = freshGame();
    const ctx = planningContext(state);
    const hugeArea = state.planning.availableAreaM2 + 1000;
    const result = applyHomesteadPlanningIntent(state.planning, {
      type: 'PLACE_COMPONENT', placementId: 'too-big', contentId: 'tomato', areaM2: hugeArea,
    }, ctx);
    const rejected = result.events.find(e => e.type === 'PLACEMENT_REJECTED');
    assert(!!rejected, '8. Oversized placement is rejected');
    assert((rejected?.payload as Record<string, string>)?.reason === 'INSUFFICIENT_AREA', '8. Rejection reason is INSUFFICIENT_AREA');
  }

  // 9. Fresh player cannot deadlock
  {
    const state = freshGame();
    const actions = deriveAvailablePlayerActions(state, 'spring');
    const available = actions.filter(a => a.availability === 'AVAILABLE');
    assert(available.length > 0, '9. Fresh player has at least one available action');
    const objective = deriveNextPlayerObjective(state, 'spring');
    assert(!objective.blockedBy || objective.blockedBy.length === 0, '9. First objective is not blocked');
  }

  // 10. Progression recomputes after qualifying events
  {
    const state = freshGame();
    const { state: result } = processSimulationConsequences(state, [
      { id: 'test:1:CONTENT_UNLOCKED:0', scenarioId: state.scenarioId, day: 1, sequence: 0, type: 'CONTENT_UNLOCKED', payload: {} },
    ], 'spring');
    assert(!!result && !!result.objectiveId, '10. Progression recomputes after qualifying events');
  }

  // 11. Replay produces identical objective sequence
  {
    const r1 = freshGame();
    const r2 = freshGame();
    const objs1: string[] = [];
    const objs2: string[] = [];
    let s1 = r1, s2 = r2;
    for (const def of OBJECTIVE_GRAPH) {
      objs1.push(deriveNextPlayerObjective(s1, 'spring').id);
      objs2.push(deriveNextPlayerObjective(s2, 'spring').id);
      s1 = completeObjective(s1, def.id);
      s2 = completeObjective(s2, def.id);
    }
    assert(objs1.join(',') === objs2.join(','), '11. Replay produces identical objective sequence');
  }

  // 12. Restoring state does not duplicate bootstrap
  {
    const state = freshGame();
    const voucher = deriveStarterBootstrap(state, 'spring')!;
    const { state: redeemed } = redeemBootstrap(state, voucher);
    const balance = redeemed.planning.research.balance;
    const serialized = JSON.parse(JSON.stringify(redeemed));
    const { state: restored, events } = redeemBootstrap(serialized, voucher);
    assert(restored.planning.research.balance === balance, '12. Restored state has same balance');
    assert(events.length === 0, '12. No duplicate bootstrap events on restore');
  }

  // 13. UI gating matches engine availability
  {
    const state = freshGame();
    const actions = deriveAvailablePlayerActions(state, 'spring');
    const advDay = actions.find(a => a.id === 'advance_day');
    assert(!!advDay && advDay.availability === 'BLOCKED_STATE', '13. Advance day blocked before first placement');
  }

  // 14. Planned modules not required for first-session
  {
    const ids = OBJECTIVE_GRAPH.map(o => o.id);
    const blocked = ['inventory', 'combat', 'crafting', 'quests', 'npc'];
    const noBlockedModules = OBJECTIVE_GRAPH.every(o =>
      o.permittedIntentTypes.every(t => !blocked.includes(t.toLowerCase())),
    );
    assert(noBlockedModules, '14. No planned-module intent types in objective graph');
    assert(!ids.includes('craft_item') && !ids.includes('complete_quest'), '14. No planned-module objectives');
  }

  return { passed, failed, errors };
}
