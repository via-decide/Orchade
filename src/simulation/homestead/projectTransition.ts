import { DeterministicRandom } from '../../engine/random/rng';
import { addDaysToIsoDate, calculateSelfSufficiencyMetrics, clamp, safeRatio } from './analytics';
import { createHomesteadEvent, type HomesteadSimulationEvent } from './events';
import type {
  EconomicTransaction,
  FailureRecord,
  HomesteadFailureType,
  ProjectHomesteadState,
} from './projectState';
import { validateHomesteadScenario, type HomesteadScenarioDefinition, type SeasonalClimateProfile } from './scenario';

export interface AdvanceProject001DayResult {
  state: ProjectHomesteadState;
  events: HomesteadSimulationEvent[];
}

const profileForDay = (scenario: HomesteadScenarioDefinition, day: number): SeasonalClimateProfile => {
  const dayOfYear = ((day - scenario.startDay) % 365) + 1;
  return scenario.climate.seasons.find(item => dayOfYear >= item.startDayOfYear && dayOfYear <= item.endDayOfYear)
    ?? scenario.climate.seasons[0];
};

const dueActivity = (day: number, occurrencesPerMonth: number): boolean => {
  if (occurrencesPerMonth <= 0) return false;
  const interval = Math.max(1, Math.floor(30 / occurrencesPerMonth));
  return (day - 1) % interval === 0;
};

export function advanceProject001Day(
  scenario: HomesteadScenarioDefinition,
  previous: ProjectHomesteadState,
): AdvanceProject001DayResult {
  validateHomesteadScenario(scenario);
  const day = previous.day + 1;
  const date = addDaysToIsoDate(scenario.startDate, day - scenario.startDay);
  const rng = new DeterministicRandom();
  rng.restore(previous.rngState);
  const events: HomesteadSimulationEvent[] = [];
  const failures: FailureRecord[] = [...previous.knowledge.failures];
  const transactions: EconomicTransaction[] = [...previous.economy.transactions];
  const emit = (type: Parameters<typeof createHomesteadEvent>[3], payload: unknown) => {
    const event = createHomesteadEvent(scenario.id, day, events.length, type, payload);
    events.push(event);
    return event;
  };
  const recordFailure = (
    type: HomesteadFailureType,
    entityId: string,
    measuredState: number,
    threshold: number,
    unit: string,
    immediateCause: string,
    upstreamCauses: string[],
    evidenceRefs: string[],
    recovery: string,
    severity: FailureRecord['severity'] = 'HIGH',
  ) => {
    const failure: FailureRecord = {
      id: `${scenario.id}:${day}:${type}:${failures.length}`,
      type, severity, tick: day, entityId, measuredState, threshold, unit,
      immediateCause, upstreamCauses, evidenceRefs, recovery,
    };
    failures.push(failure);
    emit('SYSTEM_FAILED', failure);
    return failure;
  };

  emit('BEGIN_DAY', { date, revisionId: scenario.revision.id });

  // Climate: all stochastic values consume the existing deterministic RNG.
  const profile = profileForDay(scenario, day);
  const rainfallSample = rng.next();
  const temperatureSample = rng.next();
  const solarSample = rng.next();
  const frostSample = rng.next();
  const rainfallMm = scenario.climate.deterministicStress === 'zero-rainfall'
    ? 0
    : rainfallSample < profile.rainfallProbability ? profile.rainfallMmWhenWet : 0;
  const solarHours = scenario.climate.deterministicStress === 'solar-deficit'
    ? 0
    : Math.max(0, profile.solarHours + (solarSample - 0.5) * 1.5);
  const climate = {
    season: profile.season,
    temperatureC: profile.meanTemperatureC + (temperatureSample - 0.5) * 4,
    rainfallMm,
    solarHours,
    solarRadiationIndex: solarHours / 12,
    humidityPercent: profile.humidityPercent,
    frostRisk: profile.frostRisk,
  };
  emit('WEATHER_SAMPLED', { rainfallSample, temperatureSample, solarSample, frostSample, profileId: scenario.climate.profileId });
  if (rainfallMm > 0) emit('RAIN_OCCURRED', { rainfallMm, season: profile.season });

  // Rain capture and continuous storage balance.
  const capturedToTankL = rainfallMm * scenario.water.catchmentAreaM2 * scenario.water.captureEfficiency;
  const runoffToPondL = rainfallMm * scenario.water.runoffAreaM2 * scenario.water.runoffCoefficient;
  const externalWaterL = scenario.operatingPolicy.allowExternalWater ? scenario.water.externalWaterLPerDay : 0;
  const tankLeakageL = previous.water.tankLevelL * scenario.water.leakageFractionPerDay;
  const tankEvaporationL = Math.min(previous.water.tankLevelL, scenario.water.tankEvaporationLPerDay);
  const pondEvaporationL = Math.min(previous.water.pondLevelL, scenario.water.pondEvaporationLPerDay);
  const tankBeforeOverflowL = Math.max(0, previous.water.tankLevelL - tankLeakageL - tankEvaporationL) + capturedToTankL + externalWaterL;
  const tankOverflowL = Math.max(0, tankBeforeOverflowL - scenario.water.tankCapacityL);
  let tankLevelL = Math.min(scenario.water.tankCapacityL, tankBeforeOverflowL);
  let pondLevelL = Math.min(scenario.water.pondCapacityL, Math.max(0, previous.water.pondLevelL - pondEvaporationL) + runoffToPondL + tankOverflowL);
  if (capturedToTankL > 0 || runoffToPondL > 0) emit('WATER_CAPTURED', { capturedToTankL, runoffToPondL });
  if (tankOverflowL > 0) emit('TANK_OVERFLOW', { overflowL: tankOverflowL, routedToPond: true });

  const withdrawWater = (requestedL: number): number => {
    const fromTankL = Math.min(requestedL, tankLevelL);
    tankLevelL -= fromTankL;
    const remainingL = requestedL - fromTankL;
    const fromPondL = Math.min(remainingL, pondLevelL);
    pondLevelL -= fromPondL;
    return fromTankL + fromPondL;
  };

  const householdWaterDemandL = scenario.household.members * scenario.household.waterLitresPerPersonDay;
  const householdWaterL = withdrawWater(householdWaterDemandL);
  const householdWaterShortageL = householdWaterDemandL - householdWaterL;
  if (householdWaterShortageL > 0) {
    const event = emit('WATER_SHORTAGE', { entityId: 'household', demandL: householdWaterDemandL, suppliedL: householdWaterL, shortageL: householdWaterShortageL });
    recordFailure('WATER_SHORTAGE', 'household', householdWaterL, householdWaterDemandL, 'L/day', 'Stored water could not meet household demand.', ['Low rainfall or insufficient catchment/storage.', 'Household demand was prioritized before irrigation.'], [event.id], 'Increase capture/storage, reduce demand, or enable explicit external water.');
  }

  const livestockWaterDemandL = scenario.livestock.reduce((sum, item) => sum + item.count * item.waterLitresPerAnimalDay, 0);
  const livestockWaterL = withdrawWater(livestockWaterDemandL);
  const livestockWaterRatio = clamp(safeRatio(livestockWaterL, livestockWaterDemandL), 0, 1);

  const producerIrrigationDemand = previous.foodProducers.map(producer => {
    const definition = scenario.foodProducers.find(item => item.id === producer.id)!;
    const moistureGap = clamp((scenario.operatingPolicy.irrigationSoilMoistureTarget - producer.soilMoisture) / scenario.operatingPolicy.irrigationSoilMoistureTarget, 0.2, 1);
    return { id: producer.id, requestedL: definition.areaM2 * definition.waterLitresPerM2Day * moistureGap };
  });
  const irrigationRequestedL = producerIrrigationDemand.reduce((sum, item) => sum + item.requestedL, 0);

  // Energy balance gates the pump before irrigation can withdraw water.
  const solarGeneratedKwh = scenario.energy.solarCapacityKw * solarHours * scenario.energy.solarEfficiency;
  const biomassKwh = scenario.energy.biomassKwhPerDay;
  const localAfterLossKwh = (solarGeneratedKwh + biomassKwh) * (1 - scenario.energy.systemLossFraction);
  const baseLoadKwh = scenario.energy.householdLoadKwhPerDay + scenario.energy.farmBaseLoadKwhPerDay;
  const pumpRequestedKwh = irrigationRequestedL * scenario.energy.pumpKwhPerLitre;
  const totalRequestedKwh = baseLoadKwh + pumpRequestedKwh;
  let batteryKwh = previous.energy.batteryKwh;
  let gridImportedKwh = 0;
  let energyShortageKwh = 0;
  if (localAfterLossKwh >= totalRequestedKwh) {
    batteryKwh = Math.min(scenario.energy.batteryCapacityKwh, batteryKwh + localAfterLossKwh - totalRequestedKwh);
    if (batteryKwh > previous.energy.batteryKwh) emit('BATTERY_CHARGED', { chargedKwh: batteryKwh - previous.energy.batteryKwh, batteryKwh });
  } else {
    let deficitKwh = totalRequestedKwh - localAfterLossKwh;
    const dischargeKwh = Math.min(deficitKwh, batteryKwh);
    batteryKwh -= dischargeKwh;
    deficitKwh -= dischargeKwh;
    if (dischargeKwh > 0 && batteryKwh === 0) emit('BATTERY_DEPLETED', { dischargedKwh: dischargeKwh });
    if (deficitKwh > 0 && scenario.energy.gridEnabled && scenario.operatingPolicy.allowGridImport) {
      gridImportedKwh = deficitKwh;
      deficitKwh = 0;
      emit('GRID_IMPORTED', { importedKwh: gridImportedKwh });
    }
    energyShortageKwh = deficitKwh;
  }
  const pumpDeliveredKwh = Math.max(0, pumpRequestedKwh - energyShortageKwh);
  const pumpAvailabilityRatio = pumpRequestedKwh > 0 ? clamp(pumpDeliveredKwh / pumpRequestedKwh, 0, 1) : 1;
  emit('SOLAR_GENERATED', { generatedKwh: solarGeneratedKwh, usableAfterLossKwh: localAfterLossKwh });
  if (energyShortageKwh > 0) {
    const event = emit('ENERGY_SHORTAGE', { requestedKwh: totalRequestedKwh, shortageKwh: energyShortageKwh, pumpAvailabilityRatio });
    recordFailure('ENERGY_SHORTAGE', 'microgrid', totalRequestedKwh - energyShortageKwh, totalRequestedKwh, 'kWh/day', 'Local generation and battery could not meet loads; grid import was unavailable.', ['Solar deficit.', 'Battery depleted.', 'Grid disabled or import prohibited.'], [event.id], 'Reduce load, add generation/storage, or explicitly enable grid backup.');
  }

  const irrigationEnergyLimitedL = irrigationRequestedL * pumpAvailabilityRatio;
  const irrigationAppliedL = withdrawWater(irrigationEnergyLimitedL);
  const irrigationAvailabilityRatio = irrigationRequestedL > 0 ? clamp(irrigationAppliedL / irrigationRequestedL, 0, 1) : 1;
  if (irrigationAppliedL > 0) emit('IRRIGATION_APPLIED', { requestedL: irrigationRequestedL, appliedL: irrigationAppliedL });
  if (irrigationAppliedL + 0.001 < irrigationRequestedL) {
    const immediateCause = pumpAvailabilityRatio < 1 ? 'Insufficient electricity for irrigation pump.' : 'Insufficient stored water for irrigation.';
    const event = emit('IRRIGATION_SKIPPED', { requestedL: irrigationRequestedL, appliedL: irrigationAppliedL, immediateCause });
    if (pumpAvailabilityRatio >= 1) recordFailure('WATER_SHORTAGE', 'irrigation-system', irrigationAppliedL, irrigationRequestedL, 'L/day', immediateCause, ['Tank and pond storage were depleted after priority household/livestock demand.'], [event.id], 'Increase water capture/storage or reduce irrigation demand.', 'MEDIUM');
  }
  const totalWaterShortageL = householdWaterShortageL + Math.max(0, livestockWaterDemandL - livestockWaterL) + Math.max(0, irrigationEnergyLimitedL - irrigationAppliedL);
  emit('POND_UPDATED', { tankLevelL, pondLevelL });

  // Livestock consumes feed and water before producing food/manure.
  let cashBalance = previous.economy.cashBalance;
  let inputPurchasesToday = 0;
  let livestockCalories = 0;
  let manureGeneratedUnits = 0;
  const livestock = previous.livestock.map(animal => {
    const definition = scenario.livestock.find(item => item.id === animal.id)!;
    const feedDemandKg = definition.count * definition.feedKgPerAnimalDay;
    let feedInventoryKg = animal.feedInventoryKg;
    let feedPurchasedKg = 0;
    if (feedInventoryKg < feedDemandKg && scenario.operatingPolicy.allowFeedPurchases) {
      const neededKg = feedDemandKg - feedInventoryKg;
      const purchaseCost = neededKg * scenario.economy.feedCostPerKg;
      if (cashBalance >= purchaseCost) {
        feedPurchasedKg = neededKg;
        feedInventoryKg += feedPurchasedKg;
        cashBalance -= purchaseCost;
        inputPurchasesToday += purchaseCost;
        transactions.push({ id: `${scenario.id}:${day}:PURCHASE:FEED:${transactions.length}`, day, type: 'PURCHASE', category: 'FEED', amount: purchaseCost });
        emit('INPUT_PURCHASED', { category: 'FEED', quantityKg: feedPurchasedKg, amount: purchaseCost });
      }
    }
    const feedConsumedKg = Math.min(feedDemandKg, feedInventoryKg);
    feedInventoryKg -= feedConsumedKg;
    const feedRatio = clamp(safeRatio(feedConsumedKg, feedDemandKg), 0, 1);
    const resourceRatio = Math.min(feedRatio, livestockWaterRatio);
    const condition = clamp(animal.condition + (resourceRatio >= 0.999 ? 1 : -8 * (1 - resourceRatio)), 0, 100);
    const caloriesProduced = definition.caloriesProducedPerDay * resourceRatio;
    const manureUnits = definition.manureUnitsPerDay * resourceRatio;
    livestockCalories += caloriesProduced;
    manureGeneratedUnits += manureUnits;
    const shortage = resourceRatio < 0.999;
    if (shortage) {
      const event = emit('LIVESTOCK_RESOURCE_SHORTAGE', { livestockId: animal.id, feedRatio, waterRatio: livestockWaterRatio });
      recordFailure('LIVESTOCK_RESOURCE_SHORTAGE', animal.id, resourceRatio, 1, 'ratio', 'Feed or water supply was insufficient for livestock demand.', ['Feed inventory/purchase capacity or stored water was insufficient.'], [event.id], 'Add feed inventory/cash reserve, reduce stock count, or improve water supply.', 'MEDIUM');
    }
    if (manureUnits > 0) emit('MANURE_COLLECTED', { livestockId: animal.id, manureUnits });
    return {
      ...animal, condition, feedInventoryKg,
      totalCaloriesProduced: animal.totalCaloriesProduced + caloriesProduced,
      totalManureUnits: animal.totalManureUnits + manureUnits,
      shortageDays: animal.shortageDays + (shortage ? 1 : 0),
    };
  });

  // Compost and normalized nutrient circularity; no false N/P/K precision.
  const organicWasteUnits = scenario.household.members * scenario.nutrients.organicWasteUnitsPerPersonDay;
  const generatedMaterialUnits = organicWasteUnits + manureGeneratedUnits;
  const activatedUnits = previous.nutrients.freshMaterialUnits * scenario.nutrients.freshToActiveFractionPerDay;
  const maturedUnits = previous.nutrients.activeMaterialUnits * scenario.nutrients.activeToMatureFractionPerDay;
  let freshMaterialUnits = previous.nutrients.freshMaterialUnits - activatedUnits + generatedMaterialUnits;
  let activeMaterialUnits = previous.nutrients.activeMaterialUnits - maturedUnits + activatedUnits;
  let matureCompostUnits = previous.nutrients.matureCompostUnits + maturedUnits;
  if (maturedUnits > 0) emit('COMPOST_MATURED', { maturedUnits });
  const nutrientRequiredUnits = scenario.foodProducers
    .filter(item => previous.land.acceptedPlacementIds.includes(item.placementId))
    .reduce((sum, item) => sum + item.areaM2 * item.nutrientUnitsPerM2Cycle / item.cycleDays, 0);
  const internalAppliedUnits = scenario.operatingPolicy.applyMatureCompost ? Math.min(nutrientRequiredUnits, matureCompostUnits) : 0;
  matureCompostUnits -= internalAppliedUnits;
  const externalNutrientUnits = Math.min(Math.max(0, nutrientRequiredUnits - internalAppliedUnits), scenario.nutrients.externalNutrientUnitsPerDay);
  const nutrientDeficitUnits = Math.max(0, nutrientRequiredUnits - internalAppliedUnits - externalNutrientUnits);
  if (internalAppliedUnits > 0) emit('COMPOST_APPLIED', { appliedUnits: internalAppliedUnits });
  if (nutrientDeficitUnits > 0) {
    const event = emit('NUTRIENT_DEFICIT', { requiredUnits: nutrientRequiredUnits, internalAppliedUnits, externalNutrientUnits, deficitUnits: nutrientDeficitUnits });
    recordFailure('NUTRIENT_DEFICIT', 'food-system', nutrientRequiredUnits - nutrientDeficitUnits, nutrientRequiredUnits, 'normalized-unit/day', 'Available mature compost and explicit external nutrients did not meet crop requirement.', ['Compost maturation or organic input flow was insufficient.'], [event.id], 'Increase compost inputs/maturation capacity, reduce crop demand, or add an explicit external nutrient assumption.', 'MEDIUM');
  }
  const nutrientAvailabilityRatio = nutrientRequiredUnits > 0 ? clamp((nutrientRequiredUnits - nutrientDeficitUnits) / nutrientRequiredUnits, 0, 1) : 1;

  // Labour demand includes operations, harvests, livestock, and explicit revenue work.
  const activeDefinitions = scenario.foodProducers.filter(item => previous.land.acceptedPlacementIds.includes(item.placementId));
  const harvestDueIds = previous.foodProducers.filter(producer => {
    const definition = scenario.foodProducers.find(item => item.id === producer.id)!;
    const established = producer.ageDays + 1 >= (definition.establishmentDays ?? 0);
    return day >= definition.plantingDay && established && producer.cycleProgressDays + 1 >= definition.cycleDays;
  }).map(item => item.id);
  const revenueActivitiesDue = scenario.economy.activities.filter(activity => activity.enabled && dueActivity(day, activity.occurrencesPerMonth));
  const labourRequiredMinutes = activeDefinitions.reduce((sum, item) => sum + item.labourMinutesPerDay + (harvestDueIds.includes(item.id) ? item.harvestLabourMinutes : 0), 0)
    + scenario.livestock.reduce((sum, item) => sum + item.labourMinutesPerDay, 0)
    + revenueActivitiesDue.reduce((sum, item) => sum + item.labourMinutesPerOccurrence, 0);
  const labourAvailableMinutes = scenario.household.labourMinutesAvailablePerDay;
  const labourRatio = labourRequiredMinutes > 0 ? clamp(labourAvailableMinutes / labourRequiredMinutes, 0, 1) : 1;
  const labourOverloadMinutes = Math.max(0, labourRequiredMinutes - labourAvailableMinutes);
  emit('LABOUR_ALLOCATED', { requiredMinutes: labourRequiredMinutes, availableMinutes: labourAvailableMinutes, allocationRatio: labourRatio });
  if (labourOverloadMinutes > 0) {
    const event = emit('LABOUR_OVERLOAD', { requiredMinutes: labourRequiredMinutes, availableMinutes: labourAvailableMinutes, overloadMinutes: labourOverloadMinutes });
    recordFailure('LABOUR_OVERLOAD', 'household', labourRequiredMinutes, labourAvailableMinutes, 'minutes/day', 'Scheduled farm and revenue work exceeded household labour capacity.', ['Harvest/maintenance/livestock/revenue activities overlapped.'], [event.id], 'Reschedule activities, reduce system scope, or add explicit labour capacity.', 'MEDIUM');
  }

  // Crop state and harvest output follow water, energy, nutrient, and labour constraints.
  let cropCalories = 0;
  let cropResidueUnits = 0;
  const foodProducers = previous.foodProducers.map(producer => {
    const definition = scenario.foodProducers.find(item => item.id === producer.id)!;
    const requestedL = producerIrrigationDemand.find(item => item.id === producer.id)?.requestedL ?? 0;
    const irrigationShareL = requestedL * irrigationAvailabilityRatio;
    const rainfallGain = definition.type === 'greenhouse' ? 0 : rainfallMm * 1.5;
    const irrigationGain = definition.areaM2 > 0 ? irrigationShareL / (definition.areaM2 * 0.2) : 0;
    const dailyLoss = definition.type === 'greenhouse' ? 2.5 : profile.season === 'summer' ? 5 : 3;
    const soilMoisture = clamp(producer.soilMoisture - dailyLoss + rainfallGain + irrigationGain, 0, 100);
    const waterStressed = soilMoisture < scenario.operatingPolicy.minimumCropMoisture;
    const frostApplied = frostSample < profile.frostRisk && definition.type !== 'greenhouse';
    const condition = clamp(producer.condition + (waterStressed ? -4 : 1) - (frostApplied ? 6 : 0) - nutrientDeficitUnits * 0.1, 0, 100);
    const ageDays = day >= definition.plantingDay ? producer.ageDays + 1 : producer.ageDays;
    let cycleProgressDays = day >= definition.plantingDay ? producer.cycleProgressDays + 1 : producer.cycleProgressDays;
    let harvestCount = producer.harvestCount;
    let lastHarvestCalories = 0;
    let lastHarvestKg = 0;
    const established = ageDays >= (definition.establishmentDays ?? 0);
    if (waterStressed) emit('CROP_STRESSED', { producerId: producer.id, soilMoisture, threshold: scenario.operatingPolicy.minimumCropMoisture, cause: irrigationAvailabilityRatio < 1 ? 'IRRIGATION_CONSTRAINED' : 'MOISTURE_LOSS' });
    if (cycleProgressDays >= definition.cycleDays && established) {
      const stressPenalty = clamp(1 - ((producer.stressDays + (waterStressed ? 1 : 0)) / definition.cycleDays) * 0.5, 0.4, 1);
      const yieldRatio = clamp((condition / 100) * stressPenalty * nutrientAvailabilityRatio * labourRatio, 0, 1);
      lastHarvestCalories = definition.expectedCaloriesPerHarvest * yieldRatio;
      lastHarvestKg = definition.expectedKgPerHarvest * yieldRatio;
      cropCalories += lastHarvestCalories;
      cropResidueUnits += definition.residueUnitsPerHarvest * yieldRatio;
      harvestCount += 1;
      cycleProgressDays = 0;
      emit('CROP_HARVESTED', { producerId: producer.id, calories: lastHarvestCalories, kg: lastHarvestKg, yieldRatio });
    }
    if (condition <= 20 && producer.condition > 20) {
      const event = emit('CROP_STRESSED', { producerId: producer.id, condition, cause: 'MULTI_DOMAIN_STRESS' });
      recordFailure('CROP_FAILURE', producer.id, condition, 20, 'condition-index', 'Crop condition reached the failure threshold.', ['Irrigation, nutrients, frost, or labour constrained crop performance.'], [event.id], 'Inspect causal events and revise the limiting resource or crop plan.', 'HIGH');
    }
    return {
      ...producer, ageDays, cycleProgressDays, soilMoisture, condition,
      stressDays: producer.stressDays + (waterStressed ? 1 : 0), harvestCount,
      totalCaloriesProduced: producer.totalCaloriesProduced + lastHarvestCalories,
      lastHarvestCalories, totalKgProduced: producer.totalKgProduced + lastHarvestKg, lastHarvestKg,
    };
  });
  freshMaterialUnits += cropResidueUnits;

  // Household food demand is reconciled against local inventory, explicit purchases, then shortage.
  const locallyProducedCalories = cropCalories + livestockCalories;
  let foodInventoryCalories = previous.household.foodInventoryCalories + locallyProducedCalories;
  const foodDemandCalories = scenario.household.members * scenario.household.caloriesPerPersonDay;
  const localCaloriesConsumed = Math.min(foodDemandCalories, foodInventoryCalories);
  foodInventoryCalories -= localCaloriesConsumed;
  let missingCalories = foodDemandCalories - localCaloriesConsumed;
  let foodPurchasedCalories = 0;
  if (missingCalories > 0 && scenario.operatingPolicy.allowFoodPurchases) {
    const purchaseCost = missingCalories / 1000 * scenario.economy.purchasedFoodCostPer1000Calories;
    const affordableRatio = purchaseCost > 0 ? clamp(cashBalance / purchaseCost, 0, 1) : 1;
    foodPurchasedCalories = missingCalories * affordableRatio;
    const paid = purchaseCost * affordableRatio;
    cashBalance -= paid;
    inputPurchasesToday += paid;
    missingCalories -= foodPurchasedCalories;
    transactions.push({ id: `${scenario.id}:${day}:PURCHASE:FOOD:${transactions.length}`, day, type: 'PURCHASE', category: 'FOOD', amount: paid });
    emit('FOOD_PURCHASED', { calories: foodPurchasedCalories, amount: paid });
  }
  if (missingCalories > 0) {
    const event = emit('FOOD_SHORTAGE', { demandCalories: foodDemandCalories, localCaloriesConsumed, purchasedCalories: foodPurchasedCalories, shortageCalories: missingCalories });
    recordFailure('FOOD_SHORTAGE', 'household', foodDemandCalories - missingCalories, foodDemandCalories, 'kcal/day', 'Local food inventory plus affordable purchases could not meet household calorie demand.', ['Crop/livestock output was insufficient.', 'Cash or purchase policy constrained replacement food.'], [event.id], 'Increase reliable calorie production, maintain reserves, reduce demand, or budget explicit food purchases.');
  }
  emit('FOOD_CONSUMED', { localCalories: localCaloriesConsumed, purchasedCalories: foodPurchasedCalories, shortageCalories: missingCalories });

  // Explicit revenue assumptions; enabling a category alone never creates income.
  let revenueToday = 0;
  let activityCostToday = 0;
  revenueActivitiesDue.forEach(activity => {
    const grossRevenue = activity.capacityPerOccurrence * activity.unitPrice * labourRatio;
    revenueToday += grossRevenue;
    activityCostToday += activity.operatingCostPerOccurrence;
    transactions.push({ id: `${scenario.id}:${day}:REVENUE:${activity.id}:${transactions.length}`, day, type: 'REVENUE', category: activity.type, amount: grossRevenue, evidenceLevel: activity.evidenceLevel });
    emit('REVENUE_RECORDED', { activityId: activity.id, type: activity.type, grossRevenue, operatingCost: activity.operatingCostPerOccurrence, evidenceLevel: activity.evidenceLevel });
  });
  cashBalance += revenueToday;
  const gridCostToday = gridImportedKwh * scenario.economy.gridCostPerKwh;
  const waterCostToday = externalWaterL / 1000 * scenario.economy.externalWaterCostPer1000L;
  const nutrientCostToday = externalNutrientUnits * scenario.economy.externalNutrientCostPerUnit;
  const propertyOperatingCost = scenario.economy.dailyPropertyOperatingCost + activityCostToday + gridCostToday + waterCostToday + nutrientCostToday;
  const householdExpenditure = scenario.economy.dailyHouseholdExpenditure;
  const scheduledCashCosts = propertyOperatingCost + householdExpenditure;
  const paidCashCosts = Math.min(cashBalance, scheduledCashCosts);
  const cashShortage = scheduledCashCosts - paidCashCosts;
  cashBalance -= paidCashCosts;
  transactions.push({ id: `${scenario.id}:${day}:COST:PROPERTY:${transactions.length}`, day, type: 'COST', category: 'PROPERTY', amount: propertyOperatingCost });
  transactions.push({ id: `${scenario.id}:${day}:COST:HOUSEHOLD:${transactions.length}`, day, type: 'COST', category: 'HOUSEHOLD', amount: householdExpenditure });
  if (cashShortage > 0) {
    const event = emit('CASH_SHORTAGE', { required: scheduledCashCosts, paid: paidCashCosts, shortage: cashShortage });
    recordFailure('CASH_SHORTAGE', 'property-economy', paidCashCosts, scheduledCashCosts, scenario.economy.currency, 'Available cash could not cover scheduled property and household expenditure.', ['Property revenue and opening cash were below explicit costs.'], [event.id], 'Reduce expenditure, add funded revenue assumptions, or add starting capital.');
  }

  const waterConsumedTodayL = householdWaterL + livestockWaterL + irrigationAppliedL;
  const energyConsumedTodayKwh = totalRequestedKwh - energyShortageKwh;
  const provisional: ProjectHomesteadState = {
    ...previous,
    day, date, rngState: rng.snapshot(), climate, foodProducers, livestock,
    water: {
      ...previous.water, tankLevelL: clamp(tankLevelL, 0, scenario.water.tankCapacityL), pondLevelL: clamp(pondLevelL, 0, scenario.water.pondCapacityL),
      capturedTodayL: capturedToTankL + runoffToPondL, householdConsumedTodayL: householdWaterL, livestockConsumedTodayL: livestockWaterL,
      irrigationTodayL: irrigationAppliedL, evaporationTodayL: tankEvaporationL + pondEvaporationL, leakageTodayL: tankLeakageL,
      overflowTodayL: tankOverflowL, externalTodayL: externalWaterL, shortageTodayL: totalWaterShortageL,
      cumulativeCapturedL: previous.water.cumulativeCapturedL + capturedToTankL + runoffToPondL,
      cumulativeRecycledL: previous.water.cumulativeRecycledL,
      cumulativeConsumedL: previous.water.cumulativeConsumedL + waterConsumedTodayL,
      cumulativeExternalL: previous.water.cumulativeExternalL + externalWaterL,
      cumulativeShortageL: previous.water.cumulativeShortageL + totalWaterShortageL,
    },
    energy: {
      ...previous.energy, batteryKwh: clamp(batteryKwh, 0, scenario.energy.batteryCapacityKwh),
      solarGeneratedTodayKwh: solarGeneratedKwh, biomassTodayKwh: biomassKwh, gridImportedTodayKwh: gridImportedKwh,
      householdLoadTodayKwh: scenario.energy.householdLoadKwhPerDay, farmLoadTodayKwh: scenario.energy.farmBaseLoadKwhPerDay,
      pumpLoadTodayKwh: pumpDeliveredKwh, lossesTodayKwh: solarGeneratedKwh + biomassKwh - localAfterLossKwh, shortageTodayKwh: energyShortageKwh,
      cumulativeLocalGeneratedKwh: previous.energy.cumulativeLocalGeneratedKwh + localAfterLossKwh,
      cumulativeGridImportedKwh: previous.energy.cumulativeGridImportedKwh + gridImportedKwh,
      cumulativeConsumedKwh: previous.energy.cumulativeConsumedKwh + energyConsumedTodayKwh,
      cumulativeShortageKwh: previous.energy.cumulativeShortageKwh + energyShortageKwh,
    },
    nutrients: {
      freshMaterialUnits, activeMaterialUnits, matureCompostUnits, generatedTodayUnits: generatedMaterialUnits + cropResidueUnits,
      appliedTodayUnits: internalAppliedUnits, requiredTodayUnits: nutrientRequiredUnits, externalTodayUnits: externalNutrientUnits,
      deficitTodayUnits: nutrientDeficitUnits,
      cumulativeInternalSupplyUnits: previous.nutrients.cumulativeInternalSupplyUnits + internalAppliedUnits,
      cumulativeExternalSupplyUnits: previous.nutrients.cumulativeExternalSupplyUnits + externalNutrientUnits,
      cumulativeRequirementUnits: previous.nutrients.cumulativeRequirementUnits + nutrientRequiredUnits,
    },
    household: {
      ...previous.household, foodInventoryCalories, foodProducedTodayCalories: locallyProducedCalories,
      foodConsumedTodayCalories: foodDemandCalories - missingCalories, foodPurchasedTodayCalories: foodPurchasedCalories,
      foodShortageTodayCalories: missingCalories,
      cumulativeLocalCaloriesConsumed: previous.household.cumulativeLocalCaloriesConsumed + localCaloriesConsumed,
      cumulativePurchasedCaloriesConsumed: previous.household.cumulativePurchasedCaloriesConsumed + foodPurchasedCalories,
      cumulativeFoodShortageCalories: previous.household.cumulativeFoodShortageCalories + missingCalories,
      labourAvailableTodayMinutes: labourAvailableMinutes, labourRequiredTodayMinutes: labourRequiredMinutes,
      labourOverloadTodayMinutes: labourOverloadMinutes,
      cumulativeLabourRequiredMinutes: previous.household.cumulativeLabourRequiredMinutes + labourRequiredMinutes,
      cumulativeLabourAvailableMinutes: previous.household.cumulativeLabourAvailableMinutes + labourAvailableMinutes,
    },
    economy: {
      cashBalance: Math.max(0, cashBalance), revenueToday, operatingCostToday: propertyOperatingCost,
      householdExpenditureToday: householdExpenditure,
      cumulativeRevenue: previous.economy.cumulativeRevenue + revenueToday,
      cumulativePropertyOperatingCost: previous.economy.cumulativePropertyOperatingCost + propertyOperatingCost,
      cumulativeHouseholdExpenditure: previous.economy.cumulativeHouseholdExpenditure + householdExpenditure,
      cumulativeInputPurchases: previous.economy.cumulativeInputPurchases + inputPurchasesToday,
      transactions,
    },
    knowledge: {
      ...previous.knowledge,
      failures,
      observations: [...previous.knowledge.observations],
      evidence: [...previous.knowledge.evidence],
    },
    lastEvents: events,
    lastMetrics: previous.lastMetrics,
  };
  provisional.lastMetrics = calculateSelfSufficiencyMetrics(provisional);
  const metricEvent = emit('METRIC_SNAPSHOT_RECORDED', provisional.lastMetrics);
  const observation = {
    id: `${scenario.id}:${day}:observation:water-storage`, tick: day, metric: 'tank_level_l', value: provisional.water.tankLevelL,
    unit: 'L', sourceType: 'SIMULATED_SENSOR' as const, sourceId: 'simulated-tank-level', quality: 'SIMULATED' as const,
    relatedEntity: 'water-tank', evidenceRefs: [metricEvent.id],
  };
  provisional.knowledge.observations.push(observation);
  provisional.knowledge.evidence.push(
    { id: `evidence:${metricEvent.id}`, tick: day, kind: 'METRIC', ref: metricEvent.id, scenarioRevisionId: scenario.revision.id },
    ...failures.slice(previous.knowledge.failures.length).map(failure => ({ id: `evidence:${failure.id}`, tick: day, kind: 'FAILURE' as const, ref: failure.id, scenarioRevisionId: scenario.revision.id })),
  );
  emit('OBSERVATION_RECORDED', observation);
  emit('END_DAY', { date, failuresToday: failures.length - previous.knowledge.failures.length });
  provisional.lastEvents = events;
  return { state: provisional, events };
}
