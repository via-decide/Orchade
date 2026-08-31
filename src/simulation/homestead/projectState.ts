import type { HomesteadSimulationEvent } from './events';
import type { FoodProducerType, HomesteadSeasonName, RevenueActivityType } from './scenario';

export type HomesteadFailureType =
  | 'INSUFFICIENT_AREA'
  | 'WATER_SHORTAGE'
  | 'ENERGY_SHORTAGE'
  | 'FOOD_SHORTAGE'
  | 'NUTRIENT_DEFICIT'
  | 'LABOUR_OVERLOAD'
  | 'CROP_FAILURE'
  | 'LIVESTOCK_RESOURCE_SHORTAGE'
  | 'CASH_SHORTAGE'
  | 'INFRASTRUCTURE_CAPACITY_EXCEEDED'
  | 'MAINTENANCE_FAILURE';

export interface ProjectLandState {
  totalAreaM2: number;
  usableAreaM2: number;
  reservedAreaM2: number;
  occupiedAreaM2: number;
  remainingUsableAreaM2: number;
  acceptedPlacementIds: string[];
  rejectedPlacementIds: string[];
}

export interface ProjectClimateState {
  season: HomesteadSeasonName;
  temperatureC: number;
  rainfallMm: number;
  solarHours: number;
  solarRadiationIndex: number;
  humidityPercent: number;
  frostRisk: number;
}

export interface ProjectFoodProducerState {
  id: string;
  type: FoodProducerType;
  cropId: string;
  areaM2: number;
  ageDays: number;
  cycleProgressDays: number;
  soilMoisture: number;
  condition: number;
  stressDays: number;
  harvestCount: number;
  totalCaloriesProduced: number;
  lastHarvestCalories: number;
  totalKgProduced: number;
  lastHarvestKg: number;
}

export interface ProjectLivestockState {
  id: string;
  type: string;
  count: number;
  condition: number;
  feedInventoryKg: number;
  totalCaloriesProduced: number;
  totalManureUnits: number;
  shortageDays: number;
}

export interface ProjectWaterState {
  tankLevelL: number;
  tankCapacityL: number;
  pondLevelL: number;
  pondCapacityL: number;
  capturedTodayL: number;
  householdConsumedTodayL: number;
  livestockConsumedTodayL: number;
  irrigationTodayL: number;
  evaporationTodayL: number;
  leakageTodayL: number;
  overflowTodayL: number;
  externalTodayL: number;
  shortageTodayL: number;
  cumulativeCapturedL: number;
  cumulativeRecycledL: number;
  cumulativeConsumedL: number;
  cumulativeExternalL: number;
  cumulativeShortageL: number;
}

export interface ProjectEnergyState {
  batteryKwh: number;
  batteryCapacityKwh: number;
  solarGeneratedTodayKwh: number;
  biomassTodayKwh: number;
  gridImportedTodayKwh: number;
  householdLoadTodayKwh: number;
  farmLoadTodayKwh: number;
  pumpLoadTodayKwh: number;
  lossesTodayKwh: number;
  shortageTodayKwh: number;
  cumulativeLocalGeneratedKwh: number;
  cumulativeGridImportedKwh: number;
  cumulativeConsumedKwh: number;
  cumulativeShortageKwh: number;
}

export interface ProjectNutrientState {
  freshMaterialUnits: number;
  activeMaterialUnits: number;
  matureCompostUnits: number;
  generatedTodayUnits: number;
  appliedTodayUnits: number;
  requiredTodayUnits: number;
  externalTodayUnits: number;
  deficitTodayUnits: number;
  cumulativeInternalSupplyUnits: number;
  cumulativeExternalSupplyUnits: number;
  cumulativeRequirementUnits: number;
}

export interface ProjectHouseholdState {
  members: number;
  foodInventoryCalories: number;
  foodProducedTodayCalories: number;
  foodConsumedTodayCalories: number;
  foodPurchasedTodayCalories: number;
  foodShortageTodayCalories: number;
  cumulativeLocalCaloriesConsumed: number;
  cumulativePurchasedCaloriesConsumed: number;
  cumulativeFoodShortageCalories: number;
  labourAvailableTodayMinutes: number;
  labourRequiredTodayMinutes: number;
  labourOverloadTodayMinutes: number;
  cumulativeLabourRequiredMinutes: number;
  cumulativeLabourAvailableMinutes: number;
}

export interface EconomicTransaction {
  id: string;
  day: number;
  type: 'REVENUE' | 'COST' | 'PURCHASE';
  category: RevenueActivityType | 'PROPERTY' | 'HOUSEHOLD' | 'FOOD' | 'FEED' | 'GRID' | 'WATER' | 'NUTRIENT';
  amount: number;
  evidenceLevel?: string;
}

export interface ProjectEconomyState {
  cashBalance: number;
  revenueToday: number;
  operatingCostToday: number;
  householdExpenditureToday: number;
  cumulativeRevenue: number;
  cumulativePropertyOperatingCost: number;
  cumulativeHouseholdExpenditure: number;
  cumulativeInputPurchases: number;
  transactions: EconomicTransaction[];
}

export interface FailureRecord {
  id: string;
  type: HomesteadFailureType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  tick: number;
  entityId: string;
  measuredState: number;
  threshold: number;
  unit: string;
  immediateCause: string;
  upstreamCauses: string[];
  evidenceRefs: string[];
  recovery?: string;
}

export type ObservationSourceType = 'SIMULATED_SENSOR' | 'PHYSICAL_SENSOR' | 'MANUAL' | 'IMPORT';
export type ObservationQuality = 'SIMULATED' | 'MEASURED' | 'ESTIMATED' | 'VALIDATED' | 'SUSPECT' | 'INVALID';
export type ObservationSourceTrust = 'TRUSTED' | 'UNVERIFIED' | 'REVOKED';
export type ObservationValidationStatus = 'ACCEPTED' | 'REJECTED' | 'SUSPECT' | 'DUPLICATE';

export interface ObservationValidationSummary {
  status: ObservationValidationStatus;
  reasonCodes: string[];
  normalizedUnit?: string;
}

export interface ObservationRecord {
  id: string;
  /** Legacy alias retained for compatibility with simulated Project 001 evidence. */
  tick?: number;
  propertyId?: string;
  scenarioId?: string;
  entityId?: string;
  simulationTick?: number;
  observedAt?: string;
  receivedAt?: string;
  metric: string;
  value: number;
  unit: string;
  sourceType: ObservationSourceType;
  sourceId: string;
  quality: ObservationQuality;
  relatedEntity?: string;
  calibrationRef?: string;
  provenanceRef?: string;
  sequence?: number;
  evidenceRefs: string[];
  validationResult?: ObservationValidationSummary;
  sourceTrust?: ObservationSourceTrust;
  verificationRef?: string;
}

export interface EvidenceRecord {
  id: string;
  tick: number;
  kind: 'EVENT' | 'METRIC' | 'FAILURE' | 'CHECKSUM';
  ref: string;
  scenarioRevisionId: string;
}

export interface LearnedRule {
  id: string;
  condition: string;
  outcome: string;
  evidenceRefs: string[];
  status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'REFUTED' | 'INCONCLUSIVE';
}

export interface ProjectKnowledgeState {
  observations: ObservationRecord[];
  failures: FailureRecord[];
  evidence: EvidenceRecord[];
  learnedRules: LearnedRule[];
}

export interface SelfSufficiencyMetrics {
  foodSelfSufficiency: number;
  waterIndependence: number;
  energyIndependence: number;
  nutrientCircularity: number;
  propertyCostCoverage: number;
  householdEconomicCoverage: number;
  labourFeasibility: number;
}

export interface ProjectDailyRecord extends SelfSufficiencyMetrics {
  date: string;
  day: number;
  scenarioRevision: string;
  rainfallMm: number;
  capturedWaterL: number;
  tankLevelL: number;
  pondLevelL: number;
  irrigationL: number;
  householdWaterL: number;
  soilMoisture: number;
  solarGeneratedKwh: number;
  batterySoc: number;
  gridImportKwh: number;
  cropAreaM2: number;
  harvestKg: number;
  harvestCalories: number;
  foodConsumedCalories: number;
  foodPurchasedCalories: number;
  manureKg: number;
  compostMatureKg: number;
  labourRequiredMinutes: number;
  labourAvailableMinutes: number;
  revenue: number;
  operatingCost: number;
  cashBalance: number;
}

export interface ProjectHomesteadState {
  day: number;
  date: string;
  rngState: number;
  land: ProjectLandState;
  climate: ProjectClimateState;
  foodProducers: ProjectFoodProducerState[];
  livestock: ProjectLivestockState[];
  water: ProjectWaterState;
  energy: ProjectEnergyState;
  nutrients: ProjectNutrientState;
  household: ProjectHouseholdState;
  economy: ProjectEconomyState;
  knowledge: ProjectKnowledgeState;
  lastEvents: HomesteadSimulationEvent[];
  lastMetrics: SelfSufficiencyMetrics;
}
