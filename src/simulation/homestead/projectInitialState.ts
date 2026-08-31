import { hashSeed } from '../../engine/random/rng';
import { createHomesteadEvent, type HomesteadSimulationEvent } from './events';
import { calculateSelfSufficiencyMetrics } from './analytics';
import type { FailureRecord, ProjectHomesteadState } from './projectState';
import { validateHomesteadScenario, type HomesteadScenarioDefinition } from './scenario';

export interface ProjectInitialStateResult {
  state: ProjectHomesteadState;
  events: HomesteadSimulationEvent[];
}

export function createProject001InitialState(scenario: HomesteadScenarioDefinition): ProjectInitialStateResult {
  validateHomesteadScenario(scenario);
  const events: HomesteadSimulationEvent[] = [];
  const acceptedPlacementIds: string[] = [];
  const rejectedPlacementIds: string[] = [];
  const failures: FailureRecord[] = [];
  let occupiedAreaM2 = 0;
  const emit = (type: Parameters<typeof createHomesteadEvent>[3], payload: unknown) => {
    const event = createHomesteadEvent(scenario.id, scenario.startDay, events.length, type, payload);
    events.push(event);
    return event;
  };

  scenario.land.placements.forEach(placement => {
    const remainingAreaM2 = scenario.land.usableAreaM2 - occupiedAreaM2;
    if (placement.areaM2 > remainingAreaM2) {
      rejectedPlacementIds.push(placement.id);
      const event = emit('PLACEMENT_REJECTED', { placementId: placement.id, requestedAreaM2: placement.areaM2, remainingAreaM2, reason: 'INSUFFICIENT_AREA' });
      failures.push({
        id: `${scenario.id}:${scenario.startDay}:INSUFFICIENT_AREA:${failures.length}`,
        type: 'INSUFFICIENT_AREA', severity: 'HIGH', tick: scenario.startDay, entityId: placement.id,
        measuredState: placement.areaM2, threshold: remainingAreaM2, unit: 'm2', immediateCause: 'Requested placement exceeds remaining usable land.',
        upstreamCauses: ['Usable land is fully allocated by earlier accepted placements.'], evidenceRefs: [event.id], recovery: 'Reduce component area, remove another component, or increase usable land.',
      });
    } else {
      acceptedPlacementIds.push(placement.id);
      occupiedAreaM2 += placement.areaM2;
      emit('PLACEMENT_ACCEPTED', { placementId: placement.id, areaM2: placement.areaM2, occupiedAreaM2 });
    }
  });

  const initialSeason = scenario.climate.seasons.find(item => scenario.startDay >= item.startDayOfYear && scenario.startDay <= item.endDayOfYear)
    ?? scenario.climate.seasons[0];
  const state: ProjectHomesteadState = {
    day: scenario.startDay - 1,
    date: scenario.startDate,
    rngState: hashSeed(scenario.seed),
    land: {
      totalAreaM2: scenario.land.totalAreaM2,
      usableAreaM2: scenario.land.usableAreaM2,
      reservedAreaM2: scenario.land.reservedAreaM2,
      occupiedAreaM2,
      remainingUsableAreaM2: scenario.land.usableAreaM2 - occupiedAreaM2,
      acceptedPlacementIds,
      rejectedPlacementIds,
    },
    climate: {
      season: initialSeason.season,
      temperatureC: initialSeason.meanTemperatureC,
      rainfallMm: 0,
      solarHours: initialSeason.solarHours,
      solarRadiationIndex: initialSeason.solarHours / 12,
      humidityPercent: initialSeason.humidityPercent,
      frostRisk: initialSeason.frostRisk,
    },
    foodProducers: scenario.foodProducers.filter(item => acceptedPlacementIds.includes(item.placementId)).map(item => ({
      id: item.id, type: item.type, cropId: item.cropId, areaM2: item.areaM2, ageDays: 0, cycleProgressDays: 0,
      soilMoisture: 65, condition: 100, stressDays: 0, harvestCount: 0, totalCaloriesProduced: 0,
      lastHarvestCalories: 0, totalKgProduced: 0, lastHarvestKg: 0,
    })),
    livestock: scenario.livestock.filter(item => acceptedPlacementIds.includes(item.placementId)).map(item => ({
      id: item.id, type: item.type, count: item.count, condition: 100, feedInventoryKg: item.initialFeedKg,
      totalCaloriesProduced: 0, totalManureUnits: 0, shortageDays: 0,
    })),
    water: {
      tankLevelL: scenario.water.initialTankLevelL, tankCapacityL: scenario.water.tankCapacityL,
      pondLevelL: scenario.water.initialPondLevelL, pondCapacityL: scenario.water.pondCapacityL,
      capturedTodayL: 0, householdConsumedTodayL: 0, livestockConsumedTodayL: 0, irrigationTodayL: 0,
      evaporationTodayL: 0, leakageTodayL: 0, overflowTodayL: 0, externalTodayL: 0, shortageTodayL: 0,
      cumulativeCapturedL: 0, cumulativeRecycledL: 0, cumulativeConsumedL: 0, cumulativeExternalL: 0, cumulativeShortageL: 0,
    },
    energy: {
      batteryKwh: scenario.energy.initialBatteryKwh, batteryCapacityKwh: scenario.energy.batteryCapacityKwh,
      solarGeneratedTodayKwh: 0, biomassTodayKwh: 0, gridImportedTodayKwh: 0, householdLoadTodayKwh: 0,
      farmLoadTodayKwh: 0, pumpLoadTodayKwh: 0, lossesTodayKwh: 0, shortageTodayKwh: 0,
      cumulativeLocalGeneratedKwh: 0, cumulativeGridImportedKwh: 0, cumulativeConsumedKwh: 0, cumulativeShortageKwh: 0,
    },
    nutrients: {
      freshMaterialUnits: scenario.nutrients.initialFreshMaterialUnits, activeMaterialUnits: scenario.nutrients.initialActiveMaterialUnits,
      matureCompostUnits: scenario.nutrients.initialMatureCompostUnits, generatedTodayUnits: 0, appliedTodayUnits: 0,
      requiredTodayUnits: 0, externalTodayUnits: 0, deficitTodayUnits: 0, cumulativeInternalSupplyUnits: 0,
      cumulativeExternalSupplyUnits: 0, cumulativeRequirementUnits: 0,
    },
    household: {
      members: scenario.household.members, foodInventoryCalories: scenario.household.initialFoodInventoryCalories,
      foodProducedTodayCalories: 0, foodConsumedTodayCalories: 0, foodPurchasedTodayCalories: 0, foodShortageTodayCalories: 0,
      cumulativeLocalCaloriesConsumed: 0, cumulativePurchasedCaloriesConsumed: 0, cumulativeFoodShortageCalories: 0,
      labourAvailableTodayMinutes: scenario.household.labourMinutesAvailablePerDay, labourRequiredTodayMinutes: 0,
      labourOverloadTodayMinutes: 0, cumulativeLabourRequiredMinutes: 0, cumulativeLabourAvailableMinutes: 0,
    },
    economy: {
      cashBalance: scenario.economy.initialCash, revenueToday: 0, operatingCostToday: 0, householdExpenditureToday: 0,
      cumulativeRevenue: 0, cumulativePropertyOperatingCost: 0, cumulativeHouseholdExpenditure: 0,
      cumulativeInputPurchases: 0, transactions: [],
    },
    knowledge: { observations: [], failures, evidence: events.map(event => ({ id: `evidence:${event.id}`, tick: scenario.startDay, kind: 'EVENT', ref: event.id, scenarioRevisionId: scenario.revision.id })), learnedRules: [] },
    lastEvents: events,
    lastMetrics: { foodSelfSufficiency: 0, waterIndependence: 0, energyIndependence: 0, nutrientCircularity: 0, propertyCostCoverage: 0, householdEconomicCoverage: 0, labourFeasibility: 0 },
  };
  state.lastMetrics = calculateSelfSufficiencyMetrics(state);
  return { state, events };
}
