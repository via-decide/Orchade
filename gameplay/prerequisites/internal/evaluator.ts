import type {
  EligibilityResult,
  PhysicalMeasurement,
  PhysicalPrerequisite,
  PhysicalPrerequisiteFacts,
  PhysicalSeason,
  PrerequisiteCheck,
  PrerequisiteReasonCode,
} from '../public';

const PHYSICAL_SEASONS: readonly PhysicalSeason[] = ['winter', 'spring', 'summer', 'autumn'];

export const isPhysicalSeason = (value: string): value is PhysicalSeason =>
  PHYSICAL_SEASONS.includes(value as PhysicalSeason);

const evidence = (measurement?: { evidenceRefs?: readonly string[] }): string[] =>
  measurement?.evidenceRefs ? [...measurement.evidenceRefs] : [];

const result = (
  prerequisite: PhysicalPrerequisite,
  met: boolean,
  reasonCode: PrerequisiteReasonCode,
  required: Record<string, unknown>,
  observed?: Record<string, unknown>,
  fact?: { stateRef?: string; evidenceRefs?: readonly string[] },
): PrerequisiteCheck => ({
  prerequisiteId: prerequisite.prerequisiteId,
  type: prerequisite.type,
  met,
  required,
  observed,
  reasonCode,
  stateRef: fact?.stateRef,
  evidenceRefs: evidence(fact),
});

const validatePrerequisite = (prerequisite: PhysicalPrerequisite): void => {
  if (!prerequisite.prerequisiteId.trim()) throw new Error('Physical prerequisite id must be non-empty.');
  if ('minimum' in prerequisite && (!Number.isFinite(prerequisite.minimum) || prerequisite.minimum < 0)) {
    throw new Error(`Physical prerequisite ${prerequisite.prerequisiteId} minimum must be non-negative.`);
  }
  if (prerequisite.type === 'CAPITAL_AVAILABLE' && (!Number.isFinite(prerequisite.amount) || prerequisite.amount < 0)) {
    throw new Error(`Physical prerequisite ${prerequisite.prerequisiteId} amount must be non-negative.`);
  }
  if (prerequisite.type === 'AREA_AVAILABLE' && (!Number.isFinite(prerequisite.areaM2) || prerequisite.areaM2 < 0)) {
    throw new Error(`Physical prerequisite ${prerequisite.prerequisiteId} area must be non-negative.`);
  }
};

const evaluateMeasurement = (
  prerequisite: Extract<PhysicalPrerequisite, { type: 'CAPACITY_AVAILABLE' | 'RESOURCE_AVAILABLE' }>,
  measurement: PhysicalMeasurement | undefined,
  unavailableReason: PrerequisiteReasonCode,
  insufficientReason: PrerequisiteReasonCode,
): PrerequisiteCheck => {
  const required = { minimum: prerequisite.minimum, unit: prerequisite.unit };
  if (!measurement) return result(prerequisite, false, unavailableReason, required);
  const observed = { amount: measurement.amount, unit: measurement.unit };
  if (measurement.unit !== prerequisite.unit) {
    return result(prerequisite, false, unavailableReason, required, observed, measurement);
  }
  return measurement.amount >= prerequisite.minimum
    ? result(prerequisite, true, 'MET', required, observed, measurement)
    : result(prerequisite, false, insufficientReason, required, observed, measurement);
};

const evaluateOne = (prerequisite: PhysicalPrerequisite, facts: PhysicalPrerequisiteFacts): PrerequisiteCheck => {
  validatePrerequisite(prerequisite);

  if (prerequisite.type === 'AREA_AVAILABLE') {
    const required = { areaM2: prerequisite.areaM2, unit: 'm2' };
    if (facts.areaAvailableM2 === undefined) return result(prerequisite, false, 'OBSERVABLE_MISSING', required);
    const observed = { areaM2: facts.areaAvailableM2, unit: 'm2' };
    return facts.areaAvailableM2 + 0.001 >= prerequisite.areaM2
      ? result(prerequisite, true, 'MET', required, observed)
      : result(prerequisite, false, 'INSUFFICIENT_AREA', required, observed);
  }

  if (prerequisite.type === 'CAPACITY_AVAILABLE') {
    return evaluateMeasurement(
      prerequisite,
      facts.capacities?.[prerequisite.domain],
      'CAPACITY_UNKNOWN',
      'INSUFFICIENT_CAPACITY',
    );
  }

  if (prerequisite.type === 'RESOURCE_AVAILABLE') {
    const measurement = facts.resources?.[prerequisite.resourceId];
    if (!measurement) {
      const reason: PrerequisiteReasonCode = facts.resources && facts.resourceCatalogComplete
        ? 'RESOURCE_MISSING'
        : 'OBSERVABLE_MISSING';
      return result(prerequisite, false, reason, { resourceId: prerequisite.resourceId, minimum: prerequisite.minimum, unit: prerequisite.unit });
    }
    return evaluateMeasurement(prerequisite, measurement, 'OBSERVABLE_MISSING', 'RESOURCE_MISSING');
  }

  if (prerequisite.type === 'ENTITY_EXISTS') {
    const required = { entityId: prerequisite.entityId };
    if (!facts.entityIds) return result(prerequisite, false, 'OBSERVABLE_MISSING', required);
    const present = facts.entityIds.includes(prerequisite.entityId);
    if (present) return result(prerequisite, true, 'MET', required, { present: true });
    return result(
      prerequisite,
      false,
      facts.entityCatalogComplete ? 'ENTITY_MISSING' : 'OBSERVABLE_MISSING',
      required,
      { present: false },
    );
  }

  if (prerequisite.type === 'COMPONENT_INSTALLED') {
    const required = { componentId: prerequisite.componentId };
    if (!facts.componentIds) return result(prerequisite, false, 'COMPONENT_STATUS_UNKNOWN', required);
    const installed = facts.componentIds.includes(prerequisite.componentId);
    if (installed) return result(prerequisite, true, 'MET', required, { installed: true });
    return result(
      prerequisite,
      false,
      facts.componentCatalogComplete ? 'COMPONENT_MISSING' : 'COMPONENT_STATUS_UNKNOWN',
      required,
      { installed: false },
    );
  }

  if (prerequisite.type === 'CONFIGURATION_EXISTS') {
    const required = { configurationId: prerequisite.configurationId };
    const configured = facts.configurationIds?.includes(prerequisite.configurationId) ?? false;
    return configured
      ? result(prerequisite, true, 'MET', required, { configured: true })
      : result(prerequisite, false, 'CONFIGURATION_MISSING', required, { configured: false });
  }

  if (prerequisite.type === 'CAPITAL_AVAILABLE') {
    const required = { amount: prerequisite.amount, currency: prerequisite.currency };
    if (!facts.capital || facts.capital.currency !== prerequisite.currency) {
      return result(prerequisite, false, 'CAPITAL_UNKNOWN', required);
    }
    const observed = { amount: facts.capital.available, currency: facts.capital.currency };
    return facts.capital.available >= prerequisite.amount
      ? result(prerequisite, true, 'MET', required, observed, facts.capital)
      : result(prerequisite, false, 'INSUFFICIENT_CAPITAL', required, observed, facts.capital);
  }

  if (prerequisite.type === 'SEASON_VALID') {
    const required = {
      subjectId: prerequisite.subjectId,
      allowedSeasons: prerequisite.allowedSeasons ? [...prerequisite.allowedSeasons] : null,
    };
    if (!facts.season) return result(prerequisite, false, 'SEASON_UNKNOWN', required);
    if (!prerequisite.allowedSeasons) {
      return result(prerequisite, false, 'OBSERVABLE_MISSING', required, { season: facts.season });
    }
    const observed = { season: facts.season };
    return prerequisite.allowedSeasons.includes(facts.season)
      ? result(prerequisite, true, 'MET', required, observed)
      : result(prerequisite, false, 'OUT_OF_SEASON', required, observed);
  }

  if (prerequisite.type === 'PRIOR_SYSTEM_OPERATIONAL') {
    const required = { systemId: prerequisite.systemId };
    if (!facts.operationalSystemIds) return result(prerequisite, false, 'OBSERVABLE_MISSING', required);
    const operational = facts.operationalSystemIds.includes(prerequisite.systemId);
    if (operational) return result(prerequisite, true, 'MET', required, { operational: true });
    return result(
      prerequisite,
      false,
      facts.systemCatalogComplete ? 'SYSTEM_NOT_OPERATIONAL' : 'OBSERVABLE_MISSING',
      required,
      { operational: false },
    );
  }

  const exhaustive: never = prerequisite;
  throw new Error(`Unsupported physical prerequisite: ${String(exhaustive)}.`);
};

export function evaluatePhysicalPrerequisites(
  prerequisites: readonly PhysicalPrerequisite[],
  facts: PhysicalPrerequisiteFacts,
): EligibilityResult {
  const checks = prerequisites.map(prerequisite => evaluateOne(prerequisite, facts));
  return { eligible: checks.every(check => check.met), checks };
}
