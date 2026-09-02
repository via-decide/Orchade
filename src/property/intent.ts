/**
 * PropertyIntent (section 4 of ORCHADE P0 master task).
 * Goals are measurement targets the simulator reports against -- never
 * promises of achievement.
 */
export type MeasurementSystem = 'metric' | 'imperial';

export type PropertyPurpose = 'HOMESTEAD' | 'FARM' | 'RESEARCH' | 'WORKSHOP';

export interface PropertyGoals {
  foodSelfSufficiency: boolean;
  waterIndependence: boolean;
  energyIndependence: boolean;
  nutrientCircularity: boolean;
  labourFeasibility: boolean;
  economicCoverage: boolean;
}

export interface PropertyHouseholdIntent {
  size: number;
  notes?: string;
}

export interface PropertyIntent {
  propertyId: string;
  name: string;
  purpose: PropertyPurpose;
  measurementSystem: MeasurementSystem;
  householdIntent: PropertyHouseholdIntent;
  goals: PropertyGoals;
  planningHorizonDays: number;
  /**
   * The property's deterministic simulation seed. Lives on intent (not on
   * each PropertyRevision) so that baseline and candidate revisions of the
   * same property share it by construction -- test-before-buy/build
   * (section 40) requires "SAME_AS_BASELINE" seed policy across revisions
   * with different revisionIds, which a revision-derived seed could not
   * guarantee.
   */
  seed: string;
}

export function validatePropertyIntent(intent: PropertyIntent): void {
  if (!intent.propertyId?.trim()) throw new Error('PropertyIntent requires propertyId.');
  if (!intent.name?.trim()) throw new Error('PropertyIntent requires name.');
  if (!(['HOMESTEAD', 'FARM', 'RESEARCH', 'WORKSHOP'] as const).includes(intent.purpose)) {
    throw new Error(`Unsupported PropertyIntent purpose: ${String(intent.purpose)}.`);
  }
  if (!Number.isInteger(intent.householdIntent.size) || intent.householdIntent.size < 1) {
    throw new Error('PropertyIntent householdIntent.size must be a positive integer.');
  }
  if (!Number.isInteger(intent.planningHorizonDays) || intent.planningHorizonDays < 1) {
    throw new Error('PropertyIntent planningHorizonDays must be a positive integer.');
  }
  if (!intent.seed?.trim()) throw new Error('PropertyIntent requires a non-empty seed.');
}
