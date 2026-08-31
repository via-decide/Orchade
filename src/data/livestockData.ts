export interface LivestockBreed {
  id: string;
  name: string;
  species: 'poultry' | 'sheep' | 'swine' | 'cattle' | 'apiculture';
  icon: string;
  cost: number;
  feedDailyUnits: number;
  waterDailyUnits: number;
  carryingCapacitySqftPerUnit: number;
  outputs: {
    resourceId: string;
    name: string;
    qtyPerCycle: number;
    unit: string;
    cycleDays: number;
    basePrice: number;
    manureNpk: { n: number; p: number; k: number; om: number };
  };
  grazingImpact: {
    weedSuppression: number;   // % boost to neighbor cleanliness
    soilCompactionRisk: number; // % if overgrazed
    manureFertilityBoost: number; // N-P-K points added to neighboring zones
  };
  rotationalDays: number; // recommended paddock stay before moving
  description: string;
}

export interface PaddockState {
  id: string;
  zoneId: number;
  breedId: string;
  population: number;
  health: number; // 0-100
  pastureBiomass: number; // 0-100% available forage
  daysInPaddock: number;
  manureAccumulation: number; // 0-100 units
  cycleProgress: number; // days toward output
  shelterStatus: 'tarp' | 'coop' | 'barn' | 'solar_fence';
}

export const LIVESTOCK_BREEDS: Record<string, LivestockBreed> = {
  heritage_chickens: {
    id: 'heritage_chickens',
    name: 'Pastured Dual-Purpose Chickens',
    species: 'poultry',
    icon: '🐔',
    cost: 45,
    feedDailyUnits: 0.25,
    waterDailyUnits: 0.5,
    carryingCapacitySqftPerUnit: 15,
    outputs: {
      resourceId: 'pastured_eggs',
      name: 'Pastured Golden Yolk Eggs',
      qtyPerCycle: 12,
      unit: 'dozen',
      cycleDays: 3,
      basePrice: 18,
      manureNpk: { n: 18, p: 14, k: 10, om: 3 } // High Nitrogen hot manure
    },
    grazingImpact: {
      weedSuppression: 45,
      soilCompactionRisk: 5,
      manureFertilityBoost: 22
    },
    rotationalDays: 4,
    description: 'Rotational chicken tractors scratch up weed seeds, consume pest larvae (hornworms/beetles), and deposit high-nitrogen manure.'
  },

  st_croix_sheep: {
    id: 'st_croix_sheep',
    name: 'Hair Sheep (Parasite Resistant)',
    species: 'sheep',
    icon: '🐑',
    cost: 160,
    feedDailyUnits: 2.5,
    waterDailyUnits: 3.0,
    carryingCapacitySqftPerUnit: 800,
    outputs: {
      resourceId: 'sheep_fleece_manure',
      name: 'Sheep Compost Wool & Pellets',
      qtyPerCycle: 4,
      unit: 'sacks',
      cycleDays: 7,
      basePrice: 45,
      manureNpk: { n: 14, p: 8, k: 12, om: 5 } // Cool, slow-release manure pellets
    },
    grazingImpact: {
      weedSuppression: 60,
      soilCompactionRisk: 10,
      manureFertilityBoost: 18
    },
    rotationalDays: 5,
    description: 'Gentle grazers for silvopasture understory beneath dwarf apple orchards. Mows down orchard grass and terminates winter pest pupae.'
  },

  kunekune_pigs: {
    id: 'kunekune_pigs',
    name: 'Pasture Grazing KuneKune Pigs',
    species: 'swine',
    icon: '🐖',
    cost: 220,
    feedDailyUnits: 3.0,
    waterDailyUnits: 4.5,
    carryingCapacitySqftPerUnit: 1200,
    outputs: {
      resourceId: 'rich_swine_compost',
      name: 'Deep Bioreactor Compost Mass',
      qtyPerCycle: 6,
      unit: 'tons eq',
      cycleDays: 14,
      basePrice: 80,
      manureNpk: { n: 20, p: 16, k: 15, om: 8 }
    },
    grazingImpact: {
      weedSuppression: 80,
      soilCompactionRisk: 25,
      manureFertilityBoost: 30
    },
    rotationalDays: 7,
    description: 'Short upturned snouts graze pasture grasses without destructive rooting. Excellent for converting spent crop stubble into rich compost.'
  },

  apiculture_bees: {
    id: 'apiculture_bees',
    name: 'Italian Honeybee Langstroth Colony',
    species: 'apiculture',
    icon: '🐝',
    cost: 110,
    feedDailyUnits: 0.0, // Forages from flowering zones
    waterDailyUnits: 0.2,
    carryingCapacitySqftPerUnit: 50,
    outputs: {
      resourceId: 'raw_wildflower_honey',
      name: 'Raw Wildflower Honey & Beeswax',
      qtyPerCycle: 8,
      unit: 'jars',
      cycleDays: 10,
      basePrice: 55,
      manureNpk: { n: 2, p: 5, k: 4, om: 1 }
    },
    grazingImpact: {
      weedSuppression: 0,
      soilCompactionRisk: 0,
      manureFertilityBoost: 35 // Pollination boost to all fruiting zones within 8 tiles
    },
    rotationalDays: 90,
    description: 'Universal pollinator. Increases fruiting set and seed yield by +35% for tomatoes, apples, berries, and melons within a wide radius.'
  }
};
