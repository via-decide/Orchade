export interface PresetZoneBlueprint {
  name: string;
  type: string;
  col: number;
  row: number;
  w: number;
  h: number;
  color: string;
  cropId?: string | null;
  buildingType?: string | null;
  soilPh?: number;
  elevation?: 'high' | 'mid' | 'low';
}

export interface HomesteadPreset {
  id: string;
  name: string;
  acreage: number;
  description: string;
  philosophy: string;
  badge: string;
  zones: PresetZoneBlueprint[];
}

export const HOMESTEAD_PRESETS: HomesteadPreset[] = [
  {
    id: 'resilient_3_5',
    name: '3.5-Acre Resilient Permaculture Homestead',
    acreage: 3.5,
    badge: 'Balanced Homestead',
    philosophy: 'Maximizes closed-loop fertility with companion guilds, livestock integration, and rainwater swales.',
    description: 'A diversified multi-zone homestead combining a high-yield vegetable market garden, dwarf orchard with understory clover, rotational livestock paddocks, composting hub, and water retention ponds.',
    zones: [
      { name: "Family Residence & Herb Garden", type: "building", col: 1, row: 1, w: 4, h: 4, color: "#a87d4f", buildingType: "house", cropId: "basil" },
      { name: "Heirloom Tomato & Basil Guild", type: "crop", col: 5, row: 1, w: 4, h: 5, color: "#6f8f4e", cropId: "tomato", soilPh: 6.5 },
      { name: "Companion Marigold & Garlic Border", type: "crop", col: 9, row: 1, w: 3, h: 5, color: "#c9a227", cropId: "garlic", soilPh: 6.8 },
      { name: "Rain Catchment & Gravity Pond", type: "water", col: 12, row: 1, w: 4, h: 4, color: "#3d7391" },
      { name: "Equipment Shed & Seed Vault", type: "building", col: 16, row: 1, w: 3, h: 3, color: "#8a7f68", buildingType: "shed" },
      { name: "Greenhouse & Propagation Nursery", type: "building", col: 19, row: 1, w: 4, h: 4, color: "#4a7a68", buildingType: "greenhouse" },
      
      { name: "High-Density Dwarf Apple Orchard", type: "crop", col: 1, row: 5, w: 6, h: 6, color: "#2f5a2a", cropId: "apple", soilPh: 6.5 },
      { name: "Nitrogen-Fixing Clover Understory", type: "crop", col: 7, row: 6, w: 5, h: 5, color: "#388e3c", cropId: "clover", soilPh: 6.4 },
      { name: "Heritage Potato Ridge Field", type: "crop", col: 12, row: 5, w: 5, h: 6, color: "#795548", cropId: "potato", soilPh: 5.6 },
      { name: "Golden Sweet Corn Cluster", type: "crop", col: 17, row: 5, w: 6, h: 6, color: "#fbc02d", cropId: "corn", soilPh: 6.5 },

      { name: "Rotational Small Livestock Paddock", type: "livestock", col: 1, row: 11, w: 7, h: 6, color: "#b5651d" },
      { name: "Thermal Composting & Bio-Digester", type: "compost", col: 8, row: 11, w: 4, h: 4, color: "#4a3525" },
      { name: "Hard Red Spring Wheat Field", type: "crop", col: 12, row: 11, w: 7, h: 6, color: "#c9a227", cropId: "wheat", soilPh: 6.5 },
      { name: "Acid Peat Blueberry Patch", type: "crop", col: 19, row: 11, w: 4, h: 6, color: "#3949ab", cropId: "blueberry", soilPh: 4.8 }
    ]
  },

  {
    id: 'market_garden_1_0',
    name: '1.0-Acre Intensive Market Farm',
    acreage: 1.0,
    badge: 'High Cash Flow',
    philosophy: 'Focuses on rapid succession cool-season greens, high-value culinary herbs, and premium heirloom berries.',
    description: 'Engineered for maximum revenue per square foot with tight 30" bio-intensive bed grids, season-extending propagation tunnels, and direct-to-restaurant produce.',
    zones: [
      { name: "Farmstand & Cold Storage", type: "building", col: 1, row: 1, w: 4, h: 3, color: "#a87d4f", buildingType: "shed" },
      { name: "Active Propagation Tunnel", type: "building", col: 5, row: 1, w: 5, h: 4, color: "#4a7a68", buildingType: "greenhouse" },
      { name: "Drip Water Cistern", type: "water", col: 10, row: 1, w: 3, h: 3, color: "#3d7391" },
      { name: "Aromatic Basil & Culinary Herb Bed", type: "crop", col: 13, row: 1, w: 5, h: 4, color: "#4caf50", cropId: "basil", soilPh: 6.6 },
      { name: "Marigold Pest Deterrent Screen", type: "crop", col: 18, row: 1, w: 5, h: 3, color: "#ff9800", cropId: "marigold", soilPh: 6.5 },

      { name: "Continuous Crisphead Salad Beds", type: "crop", col: 1, row: 4, w: 7, h: 7, color: "#66bb6a", cropId: "lettuce", soilPh: 6.6 },
      { name: "Danvers Half Long Carrot Matrix", type: "crop", col: 8, row: 4, w: 6, h: 7, color: "#ff9800", cropId: "carrot", soilPh: 6.4 },
      { name: "Heirloom Vine Greenhouse", type: "crop", col: 14, row: 5, w: 9, h: 6, color: "#e53935", cropId: "tomato", soilPh: 6.5 },

      { name: "Highbush Blueberry Hedge", type: "crop", col: 1, row: 11, w: 6, h: 6, color: "#3949ab", cropId: "blueberry", soilPh: 4.9 },
      { name: "Hardneck Garlic Winter Storage", type: "crop", col: 7, row: 11, w: 6, h: 6, color: "#8d6e63", cropId: "garlic", soilPh: 6.8 },
      { name: "Microbe Vermicompost Station", type: "compost", col: 13, row: 11, w: 4, h: 5, color: "#4a3525" },
      { name: "Cover Crop Regeneration Strip", type: "crop", col: 17, row: 11, w: 6, h: 6, color: "#388e3c", cropId: "clover", soilPh: 6.4 }
    ]
  },

  {
    id: 'agroforestry_5_0',
    name: '5.0-Acre Permaculture Agroforestry & Grain Pasture',
    acreage: 5.0,
    badge: 'Broadscale Agroforestry',
    philosophy: 'Large-scale staple food autonomy combining silvopasture, broadscale grains, and durable perennial trees.',
    description: 'Designed for broadscale self-sufficiency with expansive hard wheat fields, extensive dwarf apple tree alleys, nitrogen-fixing pastures, and cattle/sheep rotation.',
    zones: [
      { name: "Homestead Hub & Processing Barn", type: "building", col: 1, row: 1, w: 5, h: 5, color: "#a87d4f", buildingType: "house" },
      { name: "Central Irrigation Reservoir", type: "water", col: 6, row: 1, w: 6, h: 5, color: "#3d7391" },
      { name: "Heritage Orchard Alley 1", type: "crop", col: 12, row: 1, w: 6, h: 7, color: "#2f5a2a", cropId: "apple", soilPh: 6.5 },
      { name: "Heritage Orchard Alley 2", type: "crop", col: 18, row: 1, w: 5, h: 7, color: "#2f5a2a", cropId: "apple", soilPh: 6.5 },

      { name: "Heavy Grain Breadbasket (Wheat)", type: "crop", col: 1, row: 6, w: 11, h: 6, color: "#c9a227", cropId: "wheat", soilPh: 6.5 },
      { name: "Living Clover Silvopasture", type: "crop", col: 12, row: 8, w: 11, h: 5, color: "#388e3c", cropId: "clover", soilPh: 6.4 },

      { name: "Multi-Species Livestock Meadow", type: "livestock", col: 1, row: 12, w: 8, h: 5, color: "#b5651d" },
      { name: "Large-Scale Windrow Composting", type: "compost", col: 9, row: 12, w: 4, h: 5, color: "#4a3525" },
      { name: "Staple Russet Potato Field", type: "crop", col: 13, row: 13, w: 5, h: 4, color: "#795548", cropId: "potato", soilPh: 5.8 },
      { name: "Sweet Corn Windbreak", type: "crop", col: 18, row: 13, w: 5, h: 4, color: "#fbc02d", cropId: "corn", soilPh: 6.5 }
    ]
  },

  {
    id: 'urban_kitchen_0_5',
    name: '0.5-Acre Bio-Intensive Kitchen Garden',
    acreage: 0.5,
    badge: 'Micro-Homestead',
    philosophy: 'Maximum nutrition and sensory delight in an urban or suburban plot using companion guilds and vertical trellising.',
    description: 'A compact garden paradise featuring raised culinary beds, dwarf fruit espaliers, vertical tomato vine trellises, and compact composting.',
    zones: [
      { name: "Urban Cottage & Rain Barrels", type: "building", col: 1, row: 1, w: 5, h: 5, color: "#a87d4f", buildingType: "house" },
      { name: "Potting Shed & Cold Frame", type: "building", col: 6, row: 1, w: 4, h: 4, color: "#8a7f68", buildingType: "shed" },
      { name: "Sunken Rain Garden", type: "water", col: 10, row: 1, w: 3, h: 3, color: "#3d7391" },
      { name: "Trellised Heirloom Tomatoes", type: "crop", col: 13, row: 1, w: 5, h: 6, color: "#e53935", cropId: "tomato", soilPh: 6.5 },
      { name: "Aromatic Basil & Flower Guild", type: "crop", col: 18, row: 1, w: 5, h: 6, color: "#4caf50", cropId: "basil", soilPh: 6.6 },

      { name: "Espalier Dwarf Apple Fence", type: "crop", col: 1, row: 6, w: 6, h: 6, color: "#2f5a2a", cropId: "apple", soilPh: 6.5 },
      { name: "Cut-and-Come-Again Salad Greens", type: "crop", col: 7, row: 5, w: 6, h: 6, color: "#66bb6a", cropId: "lettuce", soilPh: 6.7 },
      { name: "Sweet Carrot & Garlic Duo", type: "crop", col: 13, row: 7, w: 5, h: 5, color: "#ff9800", cropId: "carrot", soilPh: 6.4 },
      { name: "Petal Marigold Insect Barrier", type: "crop", col: 18, row: 7, w: 5, h: 5, color: "#ff9800", cropId: "marigold", soilPh: 6.5 },

      { name: "Micro Chicken Coop & Run", type: "livestock", col: 1, row: 12, w: 6, h: 5, color: "#b5651d" },
      { name: "Tumbler Compost Station", type: "compost", col: 7, row: 11, w: 4, h: 4, color: "#4a3525" },
      { name: "Acid Peat Blueberry Tubs", type: "crop", col: 11, row: 12, w: 6, h: 5, color: "#3949ab", cropId: "blueberry", soilPh: 4.8 },
      { name: "Crimson Clover Soil Restorer", type: "crop", col: 17, row: 12, w: 6, h: 5, color: "#388e3c", cropId: "clover", soilPh: 6.4 }
    ]
  }
];
