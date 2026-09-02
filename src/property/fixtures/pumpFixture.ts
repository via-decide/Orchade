/**
 * ORCHADE-PUMP-FIXTURE-001 (Part 20).
 *
 * A bounded WATER_PUMP twin that exercises water/energy/labour/equipment/
 * telemetry/control/economics/provenance/candidate-testing without
 * inventing pump curves, head-loss hydraulics, cavitation physics, sub-day
 * dispatch, or motor transients -- those remain NOT_MODELED and are named
 * explicitly in `performanceModel.limitations`.
 */
import { createEquipmentTwinRevision, type EquipmentTwinDefinition } from '../equipmentTwin';

export const PUMP_FIXTURE_RATED_POWER_W = 250;
export const PUMP_FIXTURE_DAILY_RUNTIME_MINUTES = 60;
export const PUMP_FIXTURE_DAILY_WATER_MOVEMENT_CAPACITY_L = 6000;
export const PUMP_FIXTURE_ENERGY_CONSUMPTION_KWH_PER_DAY = (PUMP_FIXTURE_RATED_POWER_W * PUMP_FIXTURE_DAILY_RUNTIME_MINUTES) / 60_000;
export const PUMP_FIXTURE_PURCHASE_COST_INR = 18_000;
export const PUMP_FIXTURE_MAINTENANCE_COST_INR_PER_YEAR = 2_000;
export const PUMP_FIXTURE_DAILY_OPERATING_COST_INR = PUMP_FIXTURE_MAINTENANCE_COST_INR_PER_YEAR / 365;

export function createPumpFixtureTwin(): EquipmentTwinDefinition {
  return createEquipmentTwinRevision({
    twinId: 'ORCHADE-PUMP-FIXTURE-001',
    revisionId: 'v1',
    name: 'Orchade Fixture Pump v1',
    equipmentClass: 'WATER_PUMP',
    source: {
      type: 'LOGICHUB',
      logicHubProjectRef: 'logichub-project:pump-fixture-001',
      manufacturer: 'Orchade LogicHub',
      model: 'Fixture Pump v1',
    },
    capabilities: ['MOVE_WATER', 'REPORT_TELEMETRY'],
    resourcePorts: [
      { portId: 'energy-in', resourceType: 'ENERGY', direction: 'INPUT', required: true, canonicalUnit: 'kWh/day', capacity: { nominal: PUMP_FIXTURE_ENERGY_CONSUMPTION_KWH_PER_DAY }, provenanceRefs: ['pump-fixture-001:energy-in'] },
      { portId: 'water-in', resourceType: 'WATER', direction: 'INPUT', required: true, canonicalUnit: 'L', capacity: { maximum: PUMP_FIXTURE_DAILY_WATER_MOVEMENT_CAPACITY_L }, provenanceRefs: ['pump-fixture-001:water-in'] },
      { portId: 'water-out', resourceType: 'WATER', direction: 'OUTPUT', required: false, canonicalUnit: 'L', capacity: { maximum: PUMP_FIXTURE_DAILY_WATER_MOVEMENT_CAPACITY_L }, provenanceRefs: ['pump-fixture-001:water-out'] },
      { portId: 'data-out', resourceType: 'DATA', direction: 'OUTPUT', required: false, provenanceRefs: [] },
    ],
    physical: { weightKg: 8, provenanceRefs: ['pump-fixture-001:physical'] },
    operatingEnvelope: {
      ratedPowerW: PUMP_FIXTURE_RATED_POWER_W,
      maximumContinuousRuntimeMinutes: 240,
      additionalConstraints: [],
      provenanceRefs: ['pump-fixture-001:envelope'],
    },
    performanceModel: {
      modelId: 'pump-fixture-001-constant-model',
      modelVersion: '1.0.0',
      modelType: 'CONSTANT',
      inputs: ['ratedPowerW', 'dailyAvailableRuntimeMinutes'],
      outputs: ['energyConsumptionKwhPerDay'],
      parameterRefs: ['pump-fixture-001:ratedPowerW', 'pump-fixture-001:dailyAvailableRuntimeMinutes'],
      evidenceRefs: [],
      limitations: [
        'No pump curve, head-loss, or hydraulic model.',
        'No cavitation or motor transient behaviour.',
        'No sub-day dispatch: energy consumption is a flat daily figure.',
        'dailyWaterMovementCapacityL is a declared assumption; the current engine does not enforce it as a throughput constraint.',
      ],
    },
    telemetry: [
      { label: 'Pump load', observationMetric: 'pump_load_kwh', canonicalUnit: 'kWh', provenanceRefs: [] },
    ],
    controls: [
      { actuatorCommandType: 'START_PUMP', description: 'Start the pump.', safetyEnvelopeRef: 'safety:pump-fixture-001', provenanceRefs: [] },
      { actuatorCommandType: 'STOP_PUMP', description: 'Stop the pump.', safetyEnvelopeRef: 'safety:pump-fixture-001', provenanceRefs: [] },
    ],
    maintenance: {
      recommendedIntervalDays: 180,
      estimatedMinutesPerService: 60,
      costPerServiceEstimate: PUMP_FIXTURE_MAINTENANCE_COST_INR_PER_YEAR / 2,
      provenanceRefs: ['pump-fixture-001:maintenance'],
    },
    economics: {
      currency: 'INR',
      purchaseCostEstimate: PUMP_FIXTURE_PURCHASE_COST_INR,
      dailyOperatingCostEstimate: PUMP_FIXTURE_DAILY_OPERATING_COST_INR,
      provenanceRefs: ['pump-fixture-001:economics'],
    },
    failureModes: [
      { id: 'pump-dry-run', description: 'Pump runs dry or loses prime.', severity: 'MEDIUM', detectable: true, relatedTelemetryLabels: ['Pump load'], provenanceRefs: [] },
    ],
    parameterProvenanceRefs: ['pump-fixture-001:ratedPowerW', 'pump-fixture-001:dailyAvailableRuntimeMinutes', 'pump-fixture-001:dailyWaterMovementCapacityL', 'pump-fixture-001:purchaseCostINR', 'pump-fixture-001:maintenanceCostAssumption'],
    parameterOrigins: {
      ratedPowerW: 'MEASURED',
      dailyAvailableRuntimeMinutes: 'USER_ASSUMPTION',
      dailyWaterMovementCapacityL: 'RESEARCHED',
      energyConsumptionKwhPerDay: 'DERIVED',
      purchaseCostINR: 'RESEARCHED',
      maintenanceCostAssumption: 'USER_ASSUMPTION',
    },
    evidenceRefs: [],
    modelCapabilityStatus: 'ESTIMATE_ONLY',
    lifecycleStatus: 'SIMULATION_READY',
  });
}

/** Default candidate-test configuration derived from this fixture's own declared parameters. */
export function pumpFixtureCandidateConfiguration(): Record<string, number> {
  return {
    energyConsumptionKwhPerDay: PUMP_FIXTURE_ENERGY_CONSUMPTION_KWH_PER_DAY,
    purchaseCostINR: PUMP_FIXTURE_PURCHASE_COST_INR,
    dailyOperatingCostINR: PUMP_FIXTURE_DAILY_OPERATING_COST_INR,
  };
}
