import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  UNLOCK_REGISTRY,
  canUnlock,
  credit,
  createResearchCreditsState,
  debit,
  getStarterUnlocks,
  performUnlock,
} from '../gameplay/research-credits/api';
import {
  ENVIRONMENT_SKINS,
  checkLevelUp,
  requireActiveEnvironmentSkin,
} from '../gameplay/progression/api';
import {
  applyHomesteadPlanningIntent,
  createBlankSlateScenario,
  createInitialHomesteadPlanningState,
  runHomesteadPlanningReplay,
  runProject001Scenario,
  validateHomesteadScenario,
  type HomesteadPlanningContext,
  type HomesteadPlanningStep,
} from '../src/simulation/homestead';

export function runProgressionContractTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('❌ Test failed: ' + message); }
  };
  const assertThrows = (callback: () => void, message: string) => {
    try { callback(); assert(false, message); } catch { assert(true, message); }
  };

  const starters = getStarterUnlocks();
  const emptyCredits = createResearchCreditsState(starters);
  assert(starters.length === 4 && starters.every(item => item.cost === 0), 'Four starter crops initialize as free unlocks');
  assert(emptyCredits.balance === 0 && emptyCredits.ledger.length === 0, 'Research-credit state starts reconciled at zero');

  const earned = credit(emptyCredits, 25, { gameId: 'orchade', action: 'harvest', tick: 4, evidenceRef: 'event:harvest:4' });
  assert(earned.balance === 25 && earned.totalEarned === 25, 'Credit transition increases balance and total earned');
  assert(earned.ledger[0].id === 'research:4:0:credit', 'Ledger IDs derive from deterministic tick and sequence');
  assert(earned.ledger[0].source?.evidenceRef === 'event:harvest:4', 'Ledger preserves evidence provenance');

  const spent = debit(earned, 10, { gameId: 'orchade', action: 'unlock_crop', contentId: 'garlic', tick: 5 });
  assert(spent.ok && spent.state.balance === 15 && spent.state.totalSpent === 10, 'Debit transition reconciles balance and spending');
  const rejectedDebit = debit(emptyCredits, 10, { gameId: 'orchade', action: 'unlock_crop', contentId: 'garlic', tick: 5 });
  assert(rejectedDebit.ok === false && rejectedDebit.error === 'insufficient' && rejectedDebit.state === emptyCredits, 'Insufficient debit fails without modifying state');

  let capped = createResearchCreditsState();
  for (let index = 0; index < 205; index += 1) capped = credit(capped, 1, { gameId: 'orchade', action: 'observation', tick: index });
  assert(capped.ledger.length === 200 && capped.totalEarned === 205 && capped.balance === 205, 'Ledger caps audit entries without losing reconciled totals');

  const funded = credit(emptyCredits, 100, { gameId: 'orchade', action: 'experiment_complete', tick: 1 });
  const wrongSeason = canUnlock(funded, 'marigold', 1, 'winter');
  assert(wrongSeason !== true && wrongSeason.error === 'wrong-season', 'Season-invalid crop unlock fails closed');
  const insufficient = canUnlock(emptyCredits, 'garlic', 1, 'spring');
  assert(insufficient !== true && insufficient.error === 'insufficient', 'Unlock rejects insufficient research credits');
  const prerequisite = canUnlock(funded, 'lifepo4_battery_5kwh', 2, 'spring');
  assert(prerequisite !== true && prerequisite.error === 'missing-prerequisite', 'Infrastructure unlock rejects missing prerequisite');

  const garlic = performUnlock(funded, 'garlic', 1, 'spring', 2);
  assert(garlic.ok && garlic.state.balance === 90 && garlic.state.unlocks.some(item => item.contentId === 'garlic'), 'Successful unlock deducts cost and records unlock');
  const duplicate = garlic.ok ? performUnlock(garlic.state, 'garlic', 1, 'spring', 3) : garlic;
  assert(duplicate.ok === false && duplicate.error === 'already-unlocked', 'Duplicate unlock fails without a second debit');
  assert(UNLOCK_REGISTRY.every(item => Number.isInteger(item.cost) && item.cost >= 0), 'Unlock costs remain explicit integer game-balance assumptions');

  const levelTwo = checkLevelUp(1, {
    pantryItemCount: 1,
    totalReusedLbs: 1,
    waterStoredGallons: 1,
    paidUnlockCount: 3,
    activePaddockCount: 0,
    closedLoopPercent: 0,
    solarWatts: 0,
  });
  assert(levelTwo === 2, 'BUILD advances to OPERATE only when every explicit criterion is met');
  assert(checkLevelUp(1, {
    pantryItemCount: 1,
    totalReusedLbs: 1,
    waterStoredGallons: 1,
    paidUnlockCount: 2,
    activePaddockCount: 0,
    closedLoopPercent: 0,
    solarWatts: 0,
  }) === null, 'Free starter unlocks do not satisfy paid-unlock level criteria');

  assert(ENVIRONMENT_SKINS.length === 12 && requireActiveEnvironmentSkin('default').status === 'active', 'Progression exposes one calibrated skin and eleven placeholders');
  assertThrows(() => requireActiveEnvironmentSkin('kutch'), 'Uncalibrated climate skin fails closed');

  const blank = createBlankSlateScenario({ durationDays: 1, seed: 'blank-test-seed' });
  validateHomesteadScenario(blank);
  assert(blank.land.placements.length === 0 && blank.foodProducers.length === 0 && blank.livestock.length === 0, 'Blank-slate scenario contains no components or producers');
  assert(blank.water.tankCapacityL === 0 && blank.energy.solarCapacityKw === 0, 'Blank-slate scenario contains zero water and energy infrastructure');
  const blankRun = runProject001Scenario(blank, 1);
  assert(blankRun.finalState.land.occupiedAreaM2 === 0 && blankRun.events.some(event => event.type === 'WATER_SHORTAGE'), 'Empty scenario runs without crashing and exposes unmet demand');

  const context: HomesteadPlanningContext = {
    day: 1,
    season: 'spring',
    levelInputs: {
      pantryItemCount: 0,
      totalReusedLbs: 0,
      waterStoredGallons: 0,
      paidUnlockCount: 0,
      activePaddockCount: 0,
      closedLoopPercent: 0,
      solarWatts: 0,
    },
  };
  const initialPlanning = createInitialHomesteadPlanningState('planning-test', 20);
  const rejectedUnlockEvent = applyHomesteadPlanningIntent(initialPlanning, {
    type: 'UNLOCK_CONTENT',
    contentId: 'garlic',
  }, context);
  assert(rejectedUnlockEvent.events[0].type === 'UNLOCK_REJECTED' && (rejectedUnlockEvent.events[0].payload as { reason: string }).reason === 'insufficient', 'Insufficient unlock intent emits a structured rejection and preserves balance');

  const accepted = applyHomesteadPlanningIntent(initialPlanning, {
    type: 'PLACE_COMPONENT',
    placementId: 'tomato-bed-1',
    contentId: 'tomato',
    areaM2: 10,
  }, context);
  assert(accepted.events[0].type === 'PLACEMENT_ACCEPTED' && accepted.state.occupiedAreaM2 === 10, 'Unlocked starter placement becomes a structured accepted event');

  const outOfSeason = applyHomesteadPlanningIntent(initialPlanning, {
    type: 'PLACE_COMPONENT',
    placementId: 'tomato-bed-winter',
    contentId: 'tomato',
    areaM2: 10,
  }, { ...context, season: 'winter' });
  assert(outOfSeason.events[0].type === 'PLACEMENT_REJECTED' && (outOfSeason.events[0].payload as { reason: string }).reason === 'WRONG_SEASON', 'Season-invalid placement becomes a structured rejection');

  const overArea = applyHomesteadPlanningIntent(accepted.state, {
    type: 'PLACE_COMPONENT',
    placementId: 'tomato-bed-2',
    contentId: 'tomato',
    areaM2: 15,
  }, context);
  assert(overArea.events[0].type === 'PLACEMENT_REJECTED' && overArea.state.occupiedAreaM2 === 10, 'Insufficient area rejects placement without orphan state');

  let levelPlanning = applyHomesteadPlanningIntent(initialPlanning, {
    type: 'GRANT_RESEARCH_CREDITS',
    amount: 30,
    gameId: 'orchade',
    action: 'experiment_complete',
  }, context).state;
  for (const contentId of ['garlic', 'clover', 'marigold']) {
    levelPlanning = applyHomesteadPlanningIntent(levelPlanning, { type: 'UNLOCK_CONTENT', contentId }, context).state;
  }
  const levelEvent = applyHomesteadPlanningIntent(levelPlanning, { type: 'EVALUATE_LEVEL' }, {
    ...context,
    levelInputs: {
      ...context.levelInputs,
      pantryItemCount: 1,
      totalReusedLbs: 1,
      waterStoredGallons: 1,
    },
  });
  assert(levelEvent.state.progression.level === 2 && levelEvent.events[0].type === 'LEVEL_ADVANCED', 'Level advancement is derived from verified state and emitted as a structured event');

  const steps: HomesteadPlanningStep[] = [
    { intent: { type: 'GRANT_RESEARCH_CREDITS', amount: 15, gameId: 'orchade', action: 'harvest', evidenceRef: 'harvest:1' }, context },
    { intent: { type: 'UNLOCK_CONTENT', contentId: 'garlic' }, context },
    { intent: { type: 'PLACE_COMPONENT', placementId: 'garlic-bed-1', contentId: 'garlic', areaM2: 10 }, context: { ...context, day: 2 } },
  ];
  const replayA = runHomesteadPlanningReplay(createInitialHomesteadPlanningState('planning-replay', 100), steps);
  const replayB = runHomesteadPlanningReplay(createInitialHomesteadPlanningState('planning-replay', 100), steps);
  assert(replayA.finalStateHash === replayB.finalStateHash, 'Repeated planning intent sequence produces the same final checksum');
  assert(JSON.stringify(replayA.checksums) === JSON.stringify(replayB.checksums), 'Repeated planning intent sequence produces the same replay checksum sequence');
  assert(JSON.stringify(replayA.events) === JSON.stringify(replayB.events), 'Repeated planning intent sequence produces identical structured events');
  assert(replayA.replayFrames.length === steps.length && replayA.replayFrames.every(frame => Boolean(frame.checksum)), 'Every planning intent records replay/checksum evidence');

  const deterministicSources = [
    '../gameplay/research-credits/internal/ledger.ts',
    '../gameplay/research-credits/internal/unlocks.ts',
    '../gameplay/progression/internal/levels.ts',
    '../src/simulation/homestead/planningTransition.ts',
    '../src/simulation/homestead/planningRun.ts',
    '../src/simulation/homestead/blankSlateScenario.ts',
  ].map(relativePath => readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8')).join('\n');
  assert(!/Math\.random\s*\(|Date\.now\s*\(|crypto\.randomUUID\s*\(/.test(deterministicSources), 'Planning and progression contracts contain no ambient randomness or wall-clock calls');

  return { passed, failed, errors };
}
