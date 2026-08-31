export type PhysicalSeason = 'winter' | 'spring' | 'summer' | 'autumn';
export type PhysicalCapacityDomain = 'LAND' | 'WATER' | 'ENERGY' | 'LABOUR';

export interface PhysicalMeasurement {
  amount: number;
  unit: string;
  stateRef?: string;
  evidenceRefs?: readonly string[];
}

export interface PhysicalPrerequisiteFacts {
  season?: PhysicalSeason;
  areaAvailableM2?: number;
  capacities?: Partial<Record<PhysicalCapacityDomain, PhysicalMeasurement>>;
  resources?: Readonly<Record<string, PhysicalMeasurement>>;
  resourceCatalogComplete?: boolean;
  entityIds?: readonly string[];
  entityCatalogComplete?: boolean;
  componentIds?: readonly string[];
  componentCatalogComplete?: boolean;
  configurationIds?: readonly string[];
  operationalSystemIds?: readonly string[];
  systemCatalogComplete?: boolean;
  capital?: {
    currency: 'INR';
    available: number;
    stateRef?: string;
    evidenceRefs?: readonly string[];
  };
}

interface PrerequisiteBase {
  prerequisiteId: string;
}

export type PhysicalPrerequisite =
  | (PrerequisiteBase & { type: 'ENTITY_EXISTS'; entityId: string })
  | (PrerequisiteBase & { type: 'CAPACITY_AVAILABLE'; domain: PhysicalCapacityDomain; minimum: number; unit: string })
  | (PrerequisiteBase & { type: 'RESOURCE_AVAILABLE'; resourceId: string; minimum: number; unit: string })
  | (PrerequisiteBase & { type: 'COMPONENT_INSTALLED'; componentId: string })
  | (PrerequisiteBase & { type: 'CONFIGURATION_EXISTS'; configurationId: string })
  | (PrerequisiteBase & { type: 'CAPITAL_AVAILABLE'; amount: number; currency: 'INR' })
  | (PrerequisiteBase & { type: 'SEASON_VALID'; subjectId: string; allowedSeasons?: readonly PhysicalSeason[] })
  | (PrerequisiteBase & { type: 'AREA_AVAILABLE'; areaM2: number })
  | (PrerequisiteBase & { type: 'PRIOR_SYSTEM_OPERATIONAL'; systemId: string });

export type PrerequisiteReasonCode =
  | 'MET'
  | 'ENTITY_MISSING'
  | 'INSUFFICIENT_CAPACITY'
  | 'CAPACITY_UNKNOWN'
  | 'RESOURCE_MISSING'
  | 'INSUFFICIENT_RESOURCE'
  | 'COMPONENT_MISSING'
  | 'COMPONENT_STATUS_UNKNOWN'
  | 'CONFIGURATION_MISSING'
  | 'INSUFFICIENT_CAPITAL'
  | 'CAPITAL_UNKNOWN'
  | 'OUT_OF_SEASON'
  | 'SEASON_UNKNOWN'
  | 'INSUFFICIENT_AREA'
  | 'SYSTEM_NOT_OPERATIONAL'
  | 'OBSERVABLE_MISSING';

export interface PrerequisiteCheck {
  prerequisiteId: string;
  type: PhysicalPrerequisite['type'];
  met: boolean;
  required: Record<string, unknown>;
  observed?: Record<string, unknown>;
  reasonCode: PrerequisiteReasonCode;
  stateRef?: string;
  evidenceRefs: string[];
}

export interface EligibilityResult {
  eligible: boolean;
  checks: PrerequisiteCheck[];
}
