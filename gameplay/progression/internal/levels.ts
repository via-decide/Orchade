import { LEVEL_NAMES, type CriterionStatus, type PlayerLevel } from '../public';

export interface ProgressionInputs {
  pantryItemCount: number;
  totalReusedLbs: number;
  waterStoredGallons: number;
  paidUnlockCount: number;
  activePaddockCount: number;
  closedLoopPercent: number;
  solarWatts: number;
}

const levelTwoCriteria = (inputs: ProgressionInputs): CriterionStatus[] => [
  { id: 'harvested', label: 'Complete a harvest', check: 'pantryItemCount > 0', met: inputs.pantryItemCount > 0 },
  { id: 'composted', label: 'Reuse organic material', check: 'totalReusedLbs > 0', met: inputs.totalReusedLbs > 0 },
  { id: 'stored-water', label: 'Store water', check: 'waterStoredGallons > 0', met: inputs.waterStoredGallons > 0 },
  { id: 'three-unlocks', label: 'Research three paid unlocks', check: 'paidUnlockCount >= 3', met: inputs.paidUnlockCount >= 3 },
];

const levelThreeCriteria = (inputs: ProgressionInputs): CriterionStatus[] => [
  { id: 'livestock', label: 'Operate livestock', check: 'activePaddockCount > 0', met: inputs.activePaddockCount > 0 },
  { id: 'closed-loop', label: 'Exceed 50% closed-loop reuse', check: 'closedLoopPercent > 50', met: inputs.closedLoopPercent > 50 },
  { id: 'energy', label: 'Operate local solar', check: 'solarWatts > 0', met: inputs.solarWatts > 0 },
  { id: 'eight-unlocks', label: 'Research eight paid unlocks', check: 'paidUnlockCount >= 8', met: inputs.paidUnlockCount >= 8 },
];

export function getLevelCriteriaStatus(currentLevel: PlayerLevel, inputs: ProgressionInputs): CriterionStatus[] {
  if (currentLevel === 1) return levelTwoCriteria(inputs);
  if (currentLevel === 2) return levelThreeCriteria(inputs);
  return [];
}

export function checkLevelUp(currentLevel: PlayerLevel, inputs: ProgressionInputs): PlayerLevel | null {
  const criteria = getLevelCriteriaStatus(currentLevel, inputs);
  if (criteria.length === 0 || criteria.some(item => !item.met)) return null;
  return currentLevel === 1 ? 2 : 3;
}

export function describeLevel(level: PlayerLevel): string {
  return LEVEL_NAMES[level];
}
