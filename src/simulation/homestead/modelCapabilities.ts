export type ModelCapabilityStatus = 'SUPPORTED' | 'ESTIMATE_ONLY' | 'NOT_MODELED';

export interface ModelCapabilityDeclaration {
  status: ModelCapabilityStatus;
  notes?: string;
}

export interface ModelCapabilities {
  cropGrowth: ModelCapabilityDeclaration;
  irrigation: ModelCapabilityDeclaration;
  householdWater: ModelCapabilityDeclaration;
  livestock: ModelCapabilityDeclaration;
  solarMicrogrid: ModelCapabilityDeclaration;
  nutrientCircularity: ModelCapabilityDeclaration;
  labourAllocation: ModelCapabilityDeclaration;
  cashEconomy: ModelCapabilityDeclaration;
  mechanizedFieldOperations: ModelCapabilityDeclaration;
  fuelCombustion: ModelCapabilityDeclaration;
  grainLogistics: ModelCapabilityDeclaration;
  detailedET0: ModelCapabilityDeclaration;
  subDayEnergyDispatch: ModelCapabilityDeclaration;
  liveSensorReconciliation: ModelCapabilityDeclaration;
}

export const PROJECT_001_MODEL_CAPABILITIES: ModelCapabilities = {
  cropGrowth: { status: 'SUPPORTED' },
  irrigation: { status: 'SUPPORTED' },
  householdWater: { status: 'SUPPORTED' },
  livestock: { status: 'SUPPORTED' },
  solarMicrogrid: { status: 'SUPPORTED' },
  nutrientCircularity: { status: 'SUPPORTED' },
  labourAllocation: { status: 'SUPPORTED' },
  cashEconomy: { status: 'SUPPORTED' },
  mechanizedFieldOperations: {
    status: 'NOT_MODELED',
    notes: 'Farm profiles may declare mechanization context, but Project 001 does not simulate machinery operations or machine-hours.',
  },
  fuelCombustion: {
    status: 'NOT_MODELED',
    notes: 'No deterministic fuel-consumption or combustion model exists in Project 001.',
  },
  grainLogistics: {
    status: 'NOT_MODELED',
    notes: 'Storage, handling, drying, hauling, and grain logistics are outside the current engine.',
  },
  detailedET0: {
    status: 'NOT_MODELED',
    notes: 'Current crop water demand uses explicit scenario litres-per-square-metre values, not a FAO-56 ET0 model.',
  },
  subDayEnergyDispatch: {
    status: 'NOT_MODELED',
    notes: 'The authoritative Project 001 timestep remains one day.',
  },
  liveSensorReconciliation: {
    status: 'ESTIMATE_ONLY',
    notes: 'This contract layer can validate and propose reconciliation, but it does not autonomously mutate live canonical state.',
  },
};

export interface TemporalResolutionBoundary {
  authoritativeSimulationTimestep: 'day';
  futureSubDayDomains: Array<'energy' | 'irrigation' | 'sensor-telemetry'>;
}

export const PROJECT_001_TEMPORAL_RESOLUTION: TemporalResolutionBoundary = {
  authoritativeSimulationTimestep: 'day',
  futureSubDayDomains: ['energy', 'irrigation', 'sensor-telemetry'],
};
