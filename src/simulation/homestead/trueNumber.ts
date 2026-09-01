import type { Project001SimulationRun } from './projectRun';
import { runProject001Scenario } from './projectRun';
import { PROJECT_001_BASELINE_SCENARIO } from './project001Scenario';
import {
  createDerivedValueEvidence,
  createScenarioParameterProvenanceRegistry,
  getParameterProvenance,
  type DerivedValueEvidence,
  type ParameterOrigin,
  type ParameterProvenanceRecord,
  type ParameterProvenanceRegistry,
} from './provenance';

export type MetricDisplayStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'UNSUPPORTED';

export interface MetricDisplayValue {
  metric: string;
  label: string;
  value: number | null;
  unit: string;
  canonicalStatePath: string;
  origin: ParameterOrigin;
  provenanceRef?: string;
  sourceRef?: string;
  derivationRef?: string;
  confidence?: string;
  quality?: string;
  status: MetricDisplayStatus;
}

export interface Project001TrueNumberReadModel {
  scenarioId: string;
  scenarioRevisionId: string;
  simulationVersion: string;
  modelParameterRevisionId: string;
  values: MetricDisplayValue[];
  provenanceRegistry: ParameterProvenanceRegistry;
  derivations: DerivedValueEvidence[];
}

export interface Project001TrueNumberDemonstration {
  run: Project001SimulationRun;
  readModel: Project001TrueNumberReadModel;
}

const requireProvenance = (registry: ParameterProvenanceRegistry, path: string): ParameterProvenanceRecord => {
  const record = getParameterProvenance(registry, path);
  if (!record) throw new Error(`Missing true-number provenance for ${path}.`);
  return record;
};

const recentEventRefs = (run: Project001SimulationRun, types: string[]): string[] => run.events
  .filter(event => types.includes(event.type))
  .slice(-8)
  .map(event => event.id);

export function buildProject001TrueNumberReadModel(
  run: Project001SimulationRun,
  registry: ParameterProvenanceRegistry = createScenarioParameterProvenanceRegistry(run.scenario),
): Project001TrueNumberReadModel {
  const state = run.finalState;
  const modelParameterRevisionId = registry.modelParameterRevisionId;
  const crop = state.foodProducers[0];
  const cropDefinition = run.scenario.foodProducers.find(item => item.id === crop?.id);
  if (!crop || !cropDefinition) throw new Error('True-number Project 001 read model requires at least one food producer.');

  const cropAreaPath = `foodProducers.${crop.id}.areaM2`;
  const cropAreaProvenance = requireProvenance(registry, cropAreaPath);

  const cropYield = createDerivedValueEvidence({
    scenarioId: run.scenarioId,
    scenarioRevisionId: run.scenario.revision.id,
    modelParameterRevisionId,
    modelId: 'PROJECT001_CROP_YIELD_V1',
    modelVersion: run.simulationVersion,
    inputParameterRefs: [
      requireProvenance(registry, cropAreaPath).id,
      requireProvenance(registry, `foodProducers.${crop.id}.cycleDays`).id,
      requireProvenance(registry, `foodProducers.${crop.id}.expectedKgPerHarvest`).id,
    ],
    inputObservationRefs: [],
    inputEventRefs: recentEventRefs(run, ['CROP_UPDATED', 'CROP_STRESSED', 'CROP_HARVESTED']),
    outputMetric: `${crop.id}.total_harvest_kg`,
    outputValue: crop.totalKgProduced,
    unit: 'kg',
  });

  const tankLevel = createDerivedValueEvidence({
    scenarioId: run.scenarioId,
    scenarioRevisionId: run.scenario.revision.id,
    modelParameterRevisionId,
    modelId: 'PROJECT001_WATER_BALANCE_V1',
    modelVersion: run.simulationVersion,
    inputParameterRefs: [
      requireProvenance(registry, 'water.initialTankLevelL').id,
      requireProvenance(registry, 'water.tankCapacityL').id,
      requireProvenance(registry, 'water.catchmentAreaM2').id,
      requireProvenance(registry, 'water.captureEfficiency').id,
      requireProvenance(registry, 'water.leakageFractionPerDay').id,
      requireProvenance(registry, 'household.waterLitresPerPersonDay').id,
    ],
    inputObservationRefs: [],
    inputEventRefs: recentEventRefs(run, ['WATER_CAPTURED', 'WATER_SHORTAGE', 'IRRIGATION_APPLIED', 'POND_UPDATED']),
    outputMetric: 'tank_level_l',
    outputValue: state.water.tankLevelL,
    unit: 'L',
  });

  const solarGeneration = createDerivedValueEvidence({
    scenarioId: run.scenarioId,
    scenarioRevisionId: run.scenario.revision.id,
    modelParameterRevisionId,
    modelId: 'PROJECT001_ENERGY_BALANCE_V1',
    modelVersion: run.simulationVersion,
    inputParameterRefs: [
      requireProvenance(registry, 'energy.solarCapacityKw').id,
      requireProvenance(registry, 'energy.solarEfficiency').id,
      requireProvenance(registry, 'energy.systemLossFraction').id,
    ],
    inputObservationRefs: [],
    inputEventRefs: recentEventRefs(run, ['SOLAR_GENERATED', 'GRID_IMPORTED', 'ENERGY_SHORTAGE']),
    outputMetric: 'solar_generation_kwh',
    outputValue: state.energy.solarGeneratedTodayKwh,
    unit: 'kWh',
  });

  const labour = createDerivedValueEvidence({
    scenarioId: run.scenarioId,
    scenarioRevisionId: run.scenario.revision.id,
    modelParameterRevisionId,
    modelId: 'PROJECT001_LABOUR_ALLOCATION_V1',
    modelVersion: run.simulationVersion,
    inputParameterRefs: [
      requireProvenance(registry, 'household.labourMinutesAvailablePerDay').id,
      ...run.scenario.foodProducers.map(item => requireProvenance(registry, `foodProducers.${item.id}.labourMinutesPerDay`).id),
    ],
    inputObservationRefs: [],
    inputEventRefs: recentEventRefs(run, ['LABOUR_ALLOCATED', 'LABOUR_OVERLOAD']),
    outputMetric: 'labour_required_minutes',
    outputValue: state.household.labourRequiredTodayMinutes,
    unit: 'min',
  });

  const cash = createDerivedValueEvidence({
    scenarioId: run.scenarioId,
    scenarioRevisionId: run.scenario.revision.id,
    modelParameterRevisionId,
    modelId: 'PROJECT001_ECONOMY_V1',
    modelVersion: run.simulationVersion,
    inputParameterRefs: [
      requireProvenance(registry, 'economy.initialCash').id,
      requireProvenance(registry, 'economy.dailyPropertyOperatingCost').id,
      requireProvenance(registry, 'economy.dailyHouseholdExpenditure').id,
    ],
    inputObservationRefs: [],
    inputEventRefs: recentEventRefs(run, ['REVENUE_RECORDED', 'INPUT_PURCHASED', 'CASH_SHORTAGE']),
    outputMetric: 'cash_balance',
    outputValue: state.economy.cashBalance,
    unit: run.scenario.economy.currency,
  });

  const derivations = [cropYield, tankLevel, solarGeneration, labour, cash];
  const values: MetricDisplayValue[] = [
    {
      metric: `${crop.id}.area`,
      label: `${crop.id} area`,
      value: crop.areaM2,
      unit: 'm2',
      canonicalStatePath: `foodProducers.${crop.id}.areaM2`,
      origin: cropAreaProvenance.origin,
      provenanceRef: cropAreaProvenance.id,
      sourceRef: cropAreaProvenance.sourceRef,
      status: 'NORMAL',
    },
    {
      metric: `${crop.id}.total_harvest_kg`,
      label: `${crop.id} total harvest`,
      value: crop.totalKgProduced,
      unit: 'kg',
      canonicalStatePath: `foodProducers.${crop.id}.totalKgProduced`,
      origin: 'DERIVED',
      derivationRef: cropYield.derivationId,
      quality: 'SIMULATED',
      status: crop.condition <= 20 ? 'CRITICAL' : crop.stressDays > 0 ? 'WARNING' : 'NORMAL',
    },
    {
      metric: 'tank_level_l',
      label: 'Tank level',
      value: state.water.tankLevelL,
      unit: 'L',
      canonicalStatePath: 'water.tankLevelL',
      origin: 'DERIVED',
      derivationRef: tankLevel.derivationId,
      quality: 'SIMULATED',
      status: state.water.shortageTodayL > 0 ? 'WARNING' : 'NORMAL',
    },
    {
      metric: 'solar_generation_kwh',
      label: 'Solar generation today',
      value: state.energy.solarGeneratedTodayKwh,
      unit: 'kWh',
      canonicalStatePath: 'energy.solarGeneratedTodayKwh',
      origin: 'DERIVED',
      derivationRef: solarGeneration.derivationId,
      quality: 'SIMULATED',
      status: state.energy.shortageTodayKwh > 0 ? 'WARNING' : 'NORMAL',
    },
    {
      metric: 'labour_required_minutes',
      label: 'Labour required today',
      value: state.household.labourRequiredTodayMinutes,
      unit: 'min',
      canonicalStatePath: 'household.labourRequiredTodayMinutes',
      origin: 'DERIVED',
      derivationRef: labour.derivationId,
      quality: 'SIMULATED',
      status: state.household.labourOverloadTodayMinutes > 0 ? 'WARNING' : 'NORMAL',
    },
    {
      metric: 'cash_balance',
      label: 'Cash balance',
      value: state.economy.cashBalance,
      unit: run.scenario.economy.currency,
      canonicalStatePath: 'economy.cashBalance',
      origin: 'DERIVED',
      derivationRef: cash.derivationId,
      quality: 'SIMULATED',
      status: state.economy.cashBalance < 0 ? 'CRITICAL' : 'NORMAL',
    },
  ];

  return {
    scenarioId: run.scenarioId,
    scenarioRevisionId: run.scenario.revision.id,
    simulationVersion: run.simulationVersion,
    modelParameterRevisionId,
    values,
    provenanceRegistry: registry,
    derivations,
  };
}

export function runProject001TrueNumberDemonstration(): Project001TrueNumberDemonstration {
  const run = runProject001Scenario(PROJECT_001_BASELINE_SCENARIO, 365);
  return {
    run,
    readModel: buildProject001TrueNumberReadModel(run),
  };
}
