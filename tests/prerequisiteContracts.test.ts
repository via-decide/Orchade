import { initialInventoryState } from '../gameplay/inventory/api';
import {
  evaluatePhysicalPrerequisites,
  type PhysicalPrerequisite,
  type PhysicalPrerequisiteFacts,
} from '../gameplay/prerequisites/api';
import { createFarmWorld, plantCropFromInventory } from '../gameplay/world/api';
import {
  PROJECT_001_BASELINE_SCENARIO,
  createProject001InitialState,
  deriveProjectPrerequisiteFacts,
  evaluateProjectPhysicalPrerequisites,
} from '../src/simulation/homestead';

const collectObjectKeys = (value: unknown, keys: string[] = []): string[] => {
  if (!value || typeof value !== 'object') return keys;
  if (Array.isArray(value)) {
    value.forEach(item => collectObjectKeys(item, keys));
    return keys;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
    keys.push(key.toLowerCase());
    collectObjectKeys(nested, keys);
  });
  return keys;
};

export function runPrerequisiteContractTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else {
      failed += 1;
      errors.push(message);
      console.error(`❌ Test failed: ${message}`);
    }
  };

  const baseFacts: PhysicalPrerequisiteFacts = {
    season: 'spring',
    areaAvailableM2: 120,
    capacities: {
      LAND: { amount: 120, unit: 'm2', stateRef: 'land.remaining' },
      LABOUR: { amount: 90, unit: 'min/day', stateRef: 'labour.headroom' },
    },
    resources: {
      'water:stored': { amount: 1800, unit: 'L', stateRef: 'water.storage' },
    },
    resourceCatalogComplete: false,
    entityIds: ['greenhouse-1'],
    entityCatalogComplete: true,
    componentIds: ['greenhouse-1'],
    componentCatalogComplete: false,
    capital: { currency: 'INR', available: 10000, stateRef: 'economy.cashBalance' },
  };

  const deterministicRequirements: PhysicalPrerequisite[] = [
    { prerequisiteId: 'area', type: 'AREA_AVAILABLE', areaM2: 80 },
    { prerequisiteId: 'cash', type: 'CAPITAL_AVAILABLE', amount: 9000, currency: 'INR' },
    { prerequisiteId: 'season', type: 'SEASON_VALID', subjectId: 'tomato', allowedSeasons: ['spring', 'summer'] },
  ];
  const factsBefore = JSON.stringify(baseFacts);
  const first = evaluatePhysicalPrerequisites(deterministicRequirements, baseFacts);
  const second = evaluatePhysicalPrerequisites(deterministicRequirements, baseFacts);
  assert(JSON.stringify(first) === JSON.stringify(second), 'Same prerequisite facts must produce identical eligibility output.');
  assert(JSON.stringify(baseFacts) === factsBefore, 'Prerequisite evaluation must not mutate source facts.');
  assert(first.eligible, 'All met physical prerequisites should produce eligible=true.');

  const insufficientArea = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'area-large', type: 'AREA_AVAILABLE', areaM2: 180 },
  ], baseFacts);
  assert(insufficientArea.checks[0]?.reasonCode === 'INSUFFICIENT_AREA', 'Area shortfall must fail with INSUFFICIENT_AREA.');

  const insufficientCapital = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'capital-large', type: 'CAPITAL_AVAILABLE', amount: 18000, currency: 'INR' },
  ], baseFacts);
  assert(insufficientCapital.checks[0]?.reasonCode === 'INSUFFICIENT_CAPITAL', 'INR capital shortfall must fail with INSUFFICIENT_CAPITAL.');

  const unknownEnergy = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'energy-headroom', type: 'CAPACITY_AVAILABLE', domain: 'ENERGY', minimum: 620, unit: 'W' },
  ], baseFacts);
  assert(!unknownEnergy.eligible && unknownEnergy.checks[0]?.reasonCode === 'CAPACITY_UNKNOWN', 'Unmodeled power headroom must fail closed as CAPACITY_UNKNOWN.');

  const resourceAvailable = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'stored-water', type: 'RESOURCE_AVAILABLE', resourceId: 'water:stored', minimum: 1000, unit: 'L' },
  ], baseFacts);
  assert(resourceAvailable.eligible, 'Known sufficient physical resource inventory should satisfy RESOURCE_AVAILABLE.');

  const resourceInsufficient = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'stored-water-short', type: 'RESOURCE_AVAILABLE', resourceId: 'water:stored', minimum: 2000, unit: 'L' },
  ], baseFacts);
  assert(resourceInsufficient.checks[0]?.reasonCode === 'INSUFFICIENT_RESOURCE', 'Known quantitative resource shortfalls must be distinct from missing resources.');

  const resourceUnknown = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'steel-stock', type: 'RESOURCE_AVAILABLE', resourceId: 'material:steel', minimum: 4, unit: 'kg' },
  ], baseFacts);
  assert(resourceUnknown.checks[0]?.reasonCode === 'OBSERVABLE_MISSING', 'Unknown resource catalogs must fail closed rather than assume zero or availability.');

  const knownEntityMissing = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'missing-entity', type: 'ENTITY_EXISTS', entityId: 'pond-99' },
  ], baseFacts);
  assert(knownEntityMissing.checks[0]?.reasonCode === 'ENTITY_MISSING', 'Complete entity catalogs must report a missing entity explicitly.');

  const componentUnknown = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'sensor-package', type: 'COMPONENT_INSTALLED', componentId: 'greenhouse-sensor-package' },
  ], baseFacts);
  assert(componentUnknown.checks[0]?.reasonCode === 'COMPONENT_STATUS_UNKNOWN', 'Incomplete component catalogs must not infer missing hardware.');

  const configurationMissing = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'control-rules', type: 'CONFIGURATION_EXISTS', configurationId: 'greenhouse-control-rules' },
  ], baseFacts);
  assert(configurationMissing.checks[0]?.reasonCode === 'CONFIGURATION_MISSING', 'Missing control configuration must fail closed.');

  const validSeason = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'tomato-season', type: 'SEASON_VALID', subjectId: 'tomato', allowedSeasons: ['spring', 'summer'] },
  ], { season: 'spring' });
  assert(validSeason.eligible, 'A crop in a canonical valid season must pass season eligibility.');

  const invalidSeason = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'tomato-season', type: 'SEASON_VALID', subjectId: 'tomato', allowedSeasons: ['spring', 'summer'] },
  ], { season: 'winter' });
  assert(invalidSeason.checks[0]?.reasonCode === 'OUT_OF_SEASON', 'A crop outside canonical seasons must fail with OUT_OF_SEASON.');

  const unknownSeason = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'tomato-season', type: 'SEASON_VALID', subjectId: 'tomato', allowedSeasons: ['spring', 'summer'] },
  ], {});
  assert(unknownSeason.checks[0]?.reasonCode === 'SEASON_UNKNOWN', 'Missing current season must fail closed with SEASON_UNKNOWN.');

  const missingSeasonContract = evaluatePhysicalPrerequisites([
    { prerequisiteId: 'unknown-crop-season', type: 'SEASON_VALID', subjectId: 'unknown-crop' },
  ], { season: 'spring' });
  assert(missingSeasonContract.checks[0]?.reasonCode === 'OBSERVABLE_MISSING', 'Missing canonical crop season data must fail closed.');

  const initial = createProject001InitialState(PROJECT_001_BASELINE_SCENARIO).state;
  const stateBefore = JSON.stringify(initial);
  const projectFacts = deriveProjectPrerequisiteFacts(initial);
  const projectCapital = projectFacts.capital;
  assert(JSON.stringify(initial) === stateBefore, 'Project prerequisite fact derivation must not mutate Project 001 state.');
  assert(projectFacts.areaAvailableM2 === initial.land.remainingUsableAreaM2, 'Project facts must derive available area from canonical land state.');
  assert(projectCapital?.available === initial.economy.cashBalance && projectCapital?.currency === 'INR', 'Project facts must derive real INR cash from Project 001 economy state.');
  assert(projectFacts.season === initial.climate.season, 'Project facts must derive season from canonical climate state.');
  assert(projectFacts.capacities?.ENERGY === undefined, 'Project facts must not invent peak electrical capacity or spare watts.');

  const greenhousePlacement = PROJECT_001_BASELINE_SCENARIO.land.placements.find(item => item.type === 'greenhouse');
  const greenhouseRequirements: PhysicalPrerequisite[] = [
    { prerequisiteId: 'greenhouse-exists', type: 'ENTITY_EXISTS', entityId: greenhousePlacement?.id ?? 'greenhouse-missing' },
    { prerequisiteId: 'spare-power', type: 'CAPACITY_AVAILABLE', domain: 'ENERGY', minimum: 620, unit: 'W' },
    { prerequisiteId: 'sensor-package', type: 'COMPONENT_INSTALLED', componentId: 'greenhouse-sensor-package' },
    { prerequisiteId: 'control-rules', type: 'CONFIGURATION_EXISTS', configurationId: 'greenhouse-control-rules' },
    { prerequisiteId: 'capital', type: 'CAPITAL_AVAILABLE', amount: 18000, currency: 'INR' },
  ];
  const greenhouseEligibility = evaluateProjectPhysicalPrerequisites(initial, greenhouseRequirements);
  const greenhouseCodes = greenhouseEligibility.checks.map(check => check.reasonCode);
  assert(!greenhouseEligibility.eligible, 'Greenhouse automation example must remain ineligible while real prerequisites are unmet or unknown.');
  assert(greenhouseCodes[0] === 'MET', 'Existing greenhouse placement should satisfy the physical entity prerequisite.');
  assert(greenhouseCodes.includes('CAPACITY_UNKNOWN'), 'Greenhouse automation must not infer 620 W spare power from generation capacity.');
  assert(greenhouseCodes.includes('COMPONENT_STATUS_UNKNOWN'), 'Greenhouse sensor-package status must remain unknown until modeled.');
  assert(greenhouseCodes.includes('CONFIGURATION_MISSING'), 'Greenhouse control rules must be explicitly configured.');
  assert(greenhouseCodes.includes('INSUFFICIENT_CAPITAL'), 'Baseline ₹10,000 cash must not satisfy an illustrative ₹18,000 capital prerequisite.');

  const contractKeys = collectObjectKeys({ projectFacts, greenhouseRequirements });
  const forbiddenKeys = new Set(['level', 'requiredlevel', 'paidunlockcount', 'credit', 'credits', 'researchcredits', 'dataseeds']);
  assert(!contractKeys.some(key => forbiddenKeys.has(key)), 'Physical prerequisite contract fields must contain no level or credit semantics.');

  const seedInventory = {
    ...initialInventoryState,
    backpack: {
      ...initialInventoryState.backpack,
      stacks: [{ stackId: 'tomato-seed-stack', itemId: 'tomato-seed', quantity: 2 }],
    },
  };
  const springWorld = createFarmWorld(1, 1, 7);
  const planted = plantCropFromInventory(springWorld, seedInventory, 'tile-0-0', 'tomato-seed');
  assert(planted.eligibility?.eligible === true, 'Planting a tomato in spring must pass the typed season prerequisite.');
  assert(Boolean(planted.crop) && planted.world.tiles[0]?.plantedCropId === planted.crop?.id, 'Valid-season planting must create and place the crop.');
  assert(planted.inventory.backpack.stacks.find(stack => stack.itemId === 'tomato-seed')?.quantity === 1, 'Valid-season planting must consume exactly one seed after eligibility passes.');

  const winterWorld = { ...createFarmWorld(1, 1, 7), clock: { ...springWorld.clock, season: 'winter' as const } };
  const winterInventoryBefore = JSON.stringify(seedInventory);
  const rejectedWinter = plantCropFromInventory(winterWorld, seedInventory, 'tile-0-0', 'tomato-seed');
  assert(rejectedWinter.eligibility?.checks[0]?.reasonCode === 'OUT_OF_SEASON', 'Task 4 must reject tomato planting in winter using canonical crop seasons.');
  assert(rejectedWinter.world === winterWorld && JSON.stringify(rejectedWinter.inventory) === winterInventoryBefore, 'Wrong-season rejection must occur before any world or seed mutation.');

  const unknownSeedInventory = {
    ...initialInventoryState,
    backpack: {
      ...initialInventoryState.backpack,
      stacks: [{ stackId: 'mystery-seed-stack', itemId: 'mystery-seed', quantity: 1 }],
    },
  };
  const unknownBefore = JSON.stringify(unknownSeedInventory);
  const unknownCrop = plantCropFromInventory(springWorld, unknownSeedInventory, 'tile-0-0', 'mystery-seed');
  assert(unknownCrop.eligibility?.checks[0]?.reasonCode === 'OBSERVABLE_MISSING', 'Unknown crop definitions must fail closed because canonical season data is unavailable.');
  assert(JSON.stringify(unknownCrop.inventory) === unknownBefore && unknownCrop.world === springWorld, 'Unknown crop rejection must not consume inventory or mutate the world.');

  const legacySeedInventory = {
    ...initialInventoryState,
    backpack: {
      ...initialInventoryState.backpack,
      stacks: [{ stackId: 'terran-sprout-seed-stack', itemId: 'terran_sprout_seed', quantity: 1 }],
    },
  };
  const legacyGeneric = plantCropFromInventory(winterWorld, legacySeedInventory, 'tile-0-0', 'terran_sprout_seed');
  assert(legacyGeneric.eligibility?.eligible === true && legacyGeneric.eligibility.checks.length === 0, 'Canonical legacy Terran Sprout seed must retain the generic non-crop planting path without invented season data.');
  assert(Boolean(legacyGeneric.crop) && legacyGeneric.crop?.definitionId === 'terran_sprout', 'Legacy underscore seed ids must resolve to the existing generic definition id format.');

  return { passed, failed, errors };
}
