import { validateHomesteadScenario, type HomesteadScenarioDefinition, type ScenarioChange } from './scenario';

export interface ScenarioRevisionInput {
  id: string;
  createdAt: string;
  reason: string;
  evidenceRefs: string[];
  changes: ScenarioChange[];
}

export function createScenarioRevision(
  parent: HomesteadScenarioDefinition,
  input: ScenarioRevisionInput,
): HomesteadScenarioDefinition {
  if (!input.id.trim() || !input.createdAt.trim() || !input.reason.trim()) throw new Error('Scenario revision identity, timestamp, and reason are required.');
  const next = structuredClone(parent);
  input.changes.forEach(change => {
    if (change.path === 'water.tankCapacityL' && change.operation === 'replace') next.water.tankCapacityL = Number(change.nextValue);
    else if (change.path === 'water.initialTankLevelL' && change.operation === 'replace') next.water.initialTankLevelL = Number(change.nextValue);
    else if (change.path.startsWith('land.placements.') && change.operation === 'remove') {
      const placementId = change.path.slice('land.placements.'.length);
      next.land.placements = next.land.placements.filter(item => item.id !== placementId);
      next.foodProducers = next.foodProducers.filter(item => item.placementId !== placementId);
      next.livestock = next.livestock.filter(item => item.placementId !== placementId);
    } else throw new Error(`Unsupported deterministic scenario revision path: ${change.path}.`);
  });
  next.revision = {
    id: input.id,
    parentRevisionId: parent.revision.id,
    changeSet: input.changes,
    reason: input.reason,
    evidenceRefs: [...input.evidenceRefs],
    createdAt: input.createdAt,
  };
  validateHomesteadScenario(next);
  return next;
}
