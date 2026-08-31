export interface WaterHydrologyState {
  catchmentSqft: number;          // Total rooftop and slope area capturing precipitation
  currentStoredGallons: number;  // Current cisterns & retention ponds storage
  maxCisternCapacityGallons: number; // Cistern storage threshold
  annualRainfallInches: number;   // e.g. 38 inches/year
  dailyConsumptionGallons: number;// Irrigation + livestock + household demand
  swaleInfiltrationRate: number; // Gallons charged into groundwater per rain event
  graywaterRecycledGallons: number; // Recycled water per day
  irrigationType: 'drip' | 'swale_gravity' | 'overhead_sprinkler' | 'subsurface_ollas';
  keylinePondsCount: number;
}

export interface SolarMicrogridState {
  solarArrayWatts: number;         // e.g. 6400W solar array
  batteryBankKwh: number;          // e.g. 15.0 kWh Lithium/LiFePO4 storage
  currentBatteryStorageKwh: number;// Current charge in kWh
  maxBatteryStorageKwh: number;
  dailyGenerationKwh: number;      // Solar power harvested based on seasonal sunlight hours
  dailyLoadKwh: number;            // Irrigation pumps, greenhouse fans, electric fencing, cold cellar refrigeration
  isOffGridTied: boolean;
  backupBiomassGenActive: boolean;
}

export const WATER_INFRASTRUCTURE_UPGRADES = [
  {
    id: 'rainwater_cistern_1000',
    name: '1,000 Gal Food-Grade Cistern',
    cost: 180,
    storageBonusGallons: 1000,
    type: 'storage',
    desc: 'UV-resistant polyethylene cistern connected to barn & house gutter downspouts.'
  },
  {
    id: 'gravity_drip_manifold',
    name: 'Precision Gravity Drip Irrigation Kit',
    cost: 140,
    efficiencyBoostPct: 40,
    type: 'efficiency',
    desc: 'Replaces evaporative surface spraying with pressure-compensating root emitters (-40% water waste).'
  },
  {
    id: 'keyline_contour_swale',
    name: 'Keyline Earthwork Swale & Spillway',
    cost: 210,
    storageBonusGallons: 3500,
    type: 'earthworks',
    desc: 'Level contour ditches hold passive runoff, creating a subterranean groundwater lens for tree roots.'
  },
  {
    id: 'subsurface_clay_ollas',
    name: 'Terracotta Sub-Surface Ollas Pot Set',
    cost: 95,
    efficiencyBoostPct: 65,
    type: 'efficiency',
    desc: 'Ancient clay pots buried near root systems release moisture strictly via soil osmotic tension.'
  }
];

export const ENERGY_INFRASTRUCTURE_UPGRADES = [
  {
    id: 'solar_panel_array_2kw',
    name: '2.0 kW Monocrystalline PV String',
    cost: 220,
    wattsBonus: 2000,
    type: 'generation',
    desc: 'High-efficiency bifacial solar modules capturing direct and reflected sunlight.'
  },
  {
    id: 'lifepo4_battery_5kwh',
    name: '5.0 kWh LiFePO4 Storage Module',
    cost: 260,
    kwhCapacityBonus: 5.0,
    type: 'storage',
    desc: 'Deep-cycle safe lithium iron phosphate battery bank for nighttime irrigation pumps & refrigeration.'
  },
  {
    id: 'solar_pasture_energizer',
    name: 'Rotational Solar Fence Energizer (0.75J)',
    cost: 85,
    type: 'livestock',
    wattsBonus: 100,
    desc: 'Mobile solar-powered electric netting unit for securing chicken tractors and sheep paddocks.'
  },
  {
    id: 'woodgas_biomass_inverter',
    name: 'Woodgas Biomass Co-Gen Inverter (3kW)',
    cost: 320,
    kwhCapacityBonus: 8.0,
    type: 'backup',
    desc: 'Gasifier converts orchard pruning woodchips into synthesis gas to run backup power during cloudy winter weeks.'
  }
];
