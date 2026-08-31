export interface GrowthStage {
  id: string;
  name: string;
  days: number;
  color: string;
  icon: string;
}

export interface CropDefinition {
  id: string;
  displayName: string;
  scientificName: string;
  category: 'fruiting' | 'leafy' | 'root' | 'grain' | 'perennial' | 'herb' | 'legume' | 'flower';
  seasons: ('spring' | 'summer' | 'autumn' | 'winter')[];
  isPerennial: boolean;
  perennialYears?: number;
  sunRequirement: 'full' | 'partial' | 'shade';
  frostTolerant: boolean;
  growthStages: GrowthStage[];
  water: { min: number; max: number; ideal: number };
  nutrientDemand: {
    n: 'heavy' | 'medium' | 'light' | 'fixer'; // Nitrogen
    p: 'heavy' | 'medium' | 'light';           // Phosphorus
    k: 'heavy' | 'medium' | 'light';           // Potassium
  };
  preferredPh: { min: number; max: number };
  spacing: {
    sqft: number;
    label: string;
    description: string;
  };
  harvest: {
    itemId: string;
    displayName: string;
    minYield: number;
    maxYield: number;
    unit: string;
    basePrice: number;
    preservationType: 'fresh' | 'cold_cellar' | 'dry' | 'canned';
  };
  companions: {
    beneficial: string[];
    antagonistic: string[];
    effects: {
      cropId: string;
      bonusType: 'pest_repel' | 'flavor_yield' | 'nitrogen_fix' | 'pollination' | 'blight_risk' | 'stunting';
      description: string;
    }[];
  };
  diseases: {
    id: string;
    name: string;
    symptoms: string;
    prevention: string;
  }[];
  fertilizerEffects: Record<string, number>;
}

export const EXPANDED_CROP_CATALOG: Record<string, CropDefinition> = {
  tomato: {
    id: 'tomato',
    displayName: 'Heirloom Tomato',
    scientificName: 'Solanum lycopersicum',
    category: 'fruiting',
    seasons: ['spring', 'summer'],
    isPerennial: false,
    sunRequirement: 'full',
    frostTolerant: false,
    growthStages: [
      { id: 'seed',       name: 'Seed Germination', days: 7,  color: '#6d4c41', icon: '🌰' },
      { id: 'seedling',   name: 'True Leaf Emergence', days: 14, color: '#81c784', icon: '🌱' },
      { id: 'vegetative', name: 'Rapid Vine Growth', days: 21, color: '#43a047', icon: '🌿' },
      { id: 'flowering',  name: 'Floral Clusters', days: 14, color: '#fdd835', icon: '🌼' },
      { id: 'fruiting',   name: 'Ripening Fruit', days: 20, color: '#e53935', icon: '🍅' }
    ],
    water: { min: 40, max: 85, ideal: 65 },
    nutrientDemand: { n: 'medium', p: 'heavy', k: 'heavy' },
    preferredPh: { min: 6.0, max: 6.8 },
    spacing: {
      sqft: 4.0,
      label: '4.0 sq ft / vine',
      description: '24" × 24" spacing for staked/caged indeterminate cultivars.'
    },
    harvest: {
      itemId: 'tomato_fruit',
      displayName: 'Heirloom Tomatoes',
      minYield: 5,
      maxYield: 14,
      unit: 'lbs',
      basePrice: 18,
      preservationType: 'canned'
    },
    companions: {
      beneficial: ['basil', 'marigold', 'garlic'],
      antagonistic: ['potato', 'corn'],
      effects: [
        { cropId: 'basil', bonusType: 'flavor_yield', description: 'Repels hornworms & enhances flavor oils (+25% yield).' },
        { cropId: 'marigold', bonusType: 'pest_repel', description: 'Secretes alpha-terthienyl, repelling root-knot nematodes.' },
        { cropId: 'potato', bonusType: 'blight_risk', description: 'Shares Phytophthora infestans (Late Blight) transmission risk (-30% health).' }
      ]
    },
    diseases: [
      { id: 'early_blight', name: 'Early Blight (Alternaria solani)', symptoms: 'Concentric brown bullseye spots on lower foliage', prevention: 'Bottom watering, mulch barrier, crop rotation' },
      { id: 'late_blight', name: 'Late Blight (Phytophthora infestans)', symptoms: 'Water-soaked greasy dark lesions & white mold under leaves', prevention: 'Airflow, copper fungicide, isolate from potatoes' },
      { id: 'blossom_end_rot', name: 'Blossom End Rot', symptoms: 'Black sunken leathery spot at base of fruit', prevention: 'Consistent moisture, adequate calcium intake' }
    ],
    fertilizerEffects: { compost: 1.15, synthetic: 1.25, organic: 1.2, bone_meal: 1.35 }
  },

  lettuce: {
    id: 'lettuce',
    displayName: 'Crisphead Lettuce',
    scientificName: 'Lactuca sativa',
    category: 'leafy',
    seasons: ['spring', 'autumn'],
    isPerennial: false,
    sunRequirement: 'partial',
    frostTolerant: true,
    growthStages: [
      { id: 'seed',     name: 'Radicle Emergence', days: 5,  color: '#6d4c41', icon: '🌰' },
      { id: 'seedling', name: 'Rosette Seedling',  days: 10, color: '#a5d6a7', icon: '🌱' },
      { id: 'leafing',  name: 'Foliage Expansion', days: 15, color: '#66bb6a', icon: '🥬' },
      { id: 'heading',  name: 'Tight Head Formation', days: 20, color: '#2e7d32', icon: '🥗' }
    ],
    water: { min: 30, max: 65, ideal: 50 },
    nutrientDemand: { n: 'heavy', p: 'light', k: 'medium' },
    preferredPh: { min: 6.2, max: 7.0 },
    spacing: {
      sqft: 0.75,
      label: '0.75 sq ft / head',
      description: '~10" × 10" intensive in-bed grid spacing.'
    },
    harvest: {
      itemId: 'lettuce_head',
      displayName: 'Crisp Lettuce Heads',
      minYield: 1,
      maxYield: 2,
      unit: 'heads',
      basePrice: 8,
      preservationType: 'fresh'
    },
    companions: {
      beneficial: ['carrot', 'garlic', 'clover'],
      antagonistic: ['wheat'],
      effects: [
        { cropId: 'carrot', bonusType: 'flavor_yield', description: 'Carrot taproots aerate subsoil without competing for shallow root space.' },
        { cropId: 'clover', bonusType: 'nitrogen_fix', description: 'Draws bioavailable nitrogen fixed by neighboring clover nodules.' }
      ]
    },
    diseases: [
      { id: 'downy_mildew', name: 'Downy Mildew (Bremia lactucae)', symptoms: 'Angular yellow chlorotic leaf lesions with underside downy spores', prevention: 'Morning irrigation, wide spacing' },
      { id: 'bottom_rot', name: 'Bottom Rot (Rhizoctonia)', symptoms: 'Rust-colored sunken lesions on lowest petioles touching wet soil', prevention: 'Raised beds, clean cultivation' }
    ],
    fertilizerEffects: { compost: 1.2, synthetic: 1.15, organic: 1.25, blood_meal: 1.4 }
  },

  potato: {
    id: 'potato',
    displayName: 'Heritage Russet Potato',
    scientificName: 'Solanum tuberosum',
    category: 'root',
    seasons: ['spring', 'summer'],
    isPerennial: false,
    sunRequirement: 'full',
    frostTolerant: false,
    growthStages: [
      { id: 'sprout',        name: 'Seed Chitting & Sprout', days: 14, color: '#795548', icon: '🥔' },
      { id: 'vegetative',    name: 'Stem & Foliage Canopy', days: 21, color: '#4caf50', icon: '🌿' },
      { id: 'tuber_init',    name: 'Stolon & Tuber Initiation', days: 20, color: '#388e3c', icon: '🌱' },
      { id: 'tuber_bulking', name: 'Tuber Bulking Phase', days: 35, color: '#2e7d32', icon: '🪴' },
      { id: 'maturation',    name: 'Skin Setting & Vine Dieback', days: 20, color: '#8d6e63', icon: '🥔' }
    ],
    water: { min: 45, max: 90, ideal: 70 },
    nutrientDemand: { n: 'medium', p: 'heavy', k: 'heavy' },
    preferredPh: { min: 5.2, max: 6.2 },
    spacing: {
      sqft: 2.5,
      label: '2.5 sq ft / hill',
      description: '12" in-row spacing with 30" mounding ridges.'
    },
    harvest: {
      itemId: 'potato_tuber',
      displayName: 'Russet Potato Yield',
      minYield: 6,
      maxYield: 15,
      unit: 'lbs',
      basePrice: 12,
      preservationType: 'cold_cellar'
    },
    companions: {
      beneficial: ['marigold', 'garlic', 'clover'],
      antagonistic: ['tomato', 'apple'],
      effects: [
        { cropId: 'marigold', bonusType: 'pest_repel', description: 'Suppresses Colorado potato beetle activity (+15% tuber mass).' },
        { cropId: 'apple', bonusType: 'stunting', description: 'Apple trees and potatoes mutually inhibit growth & exacerbate blight.' }
      ]
    },
    diseases: [
      { id: 'late_blight', name: 'Late Blight', symptoms: 'Dark rotting lesions on leaves and tubers', prevention: 'Certified seed tubers, avoid nightshade proximity' },
      { id: 'scab', name: 'Common Scab (Streptomyces scabies)', symptoms: 'Corky pits on tuber skin in alkaline soils', prevention: 'Maintain soil pH below 5.5' }
    ],
    fertilizerEffects: { compost: 1.15, synthetic: 1.25, organic: 1.2, wood_ash: 1.35 }
  },

  wheat: {
    id: 'wheat',
    displayName: 'Hard Red Spring Wheat',
    scientificName: 'Triticum aestivum',
    category: 'grain',
    seasons: ['spring', 'summer'],
    isPerennial: false,
    sunRequirement: 'full',
    frostTolerant: true,
    growthStages: [
      { id: 'germination',      name: 'Coleoptile Emergence', days: 10, color: '#8d6e63', icon: '🌾' },
      { id: 'tillering',        name: 'Crown Tillering',      days: 25, color: '#81c784', icon: '🌱' },
      { id: 'jointing_booting', name: 'Stem Elongation (Jointing)', days: 30, color: '#4caf50', icon: '🌿' },
      { id: 'heading_flowering',name: 'Spike Emergence & Anthesis', days: 20, color: '#c0ca33', icon: '🌾' },
      { id: 'grain_fill',       name: 'Dough to Hard Grain Fill', days: 35, color: '#fbc02d', icon: '🍞' }
    ],
    water: { min: 20, max: 55, ideal: 40 },
    nutrientDemand: { n: 'heavy', p: 'medium', k: 'light' },
    preferredPh: { min: 6.0, max: 7.0 },
    spacing: {
      sqft: 0.15,
      label: '0.15 sq ft / stalk',
      description: 'Standard grain drill / broadcast density (~6-7 stalks/sq ft).'
    },
    harvest: {
      itemId: 'wheat_grain',
      displayName: 'Golden Wheat Sheaves',
      minYield: 10,
      maxYield: 24,
      unit: 'bundles',
      basePrice: 20,
      preservationType: 'dry'
    },
    companions: {
      beneficial: ['clover'],
      antagonistic: ['tomato'],
      effects: [
        { cropId: 'clover', bonusType: 'nitrogen_fix', description: 'Underseeded clover fixes nitrogen and suppresses weed competition.' }
      ]
    },
    diseases: [
      { id: 'stem_rust', name: 'Stem Rust (Puccinia graminis)', symptoms: 'Reddish-orange pustules erupting through stem epidermal layers', prevention: 'Resistant cultivars, eradicate barberry alternate hosts' },
      { id: 'powdery_mildew', name: 'Powdery Mildew', symptoms: 'White talcum-like patches across lower blade canopy', prevention: 'Crop rotation and balanced nitrogen' }
    ],
    fertilizerEffects: { compost: 1.1, synthetic: 1.25, organic: 1.15, blood_meal: 1.3 }
  },

  apple: {
    id: 'apple',
    displayName: 'Honeycrisp Apple (Dwarf M9)',
    scientificName: 'Malus domestica',
    category: 'perennial',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    isPerennial: true,
    perennialYears: 3,
    sunRequirement: 'full',
    frostTolerant: true,
    growthStages: [
      { id: 'sapling',       name: 'Year 1: Root Establishment', days: 365, color: '#5d4037', icon: '🌲' },
      { id: 'young_tree',    name: 'Year 2: Scaffold Branching',  days: 365, color: '#33691e', icon: '🌳' },
      { id: 'first_bearing', name: 'Year 3+: Mature Fruit Bearing', days: 365, color: '#1b5e20', icon: '🍎' }
    ],
    water: { min: 25, max: 60, ideal: 45 },
    nutrientDemand: { n: 'light', p: 'medium', k: 'heavy' },
    preferredPh: { min: 6.0, max: 7.0 },
    spacing: {
      sqft: 100.0,
      label: '100 sq ft / dwarf tree',
      description: '10\' × 10\' intensive high-density dwarf orchard spacing.'
    },
    harvest: {
      itemId: 'apple_fruit',
      displayName: 'Bushels of Crisp Apples',
      minYield: 30,
      maxYield: 75,
      unit: 'bushels',
      basePrice: 65,
      preservationType: 'cold_cellar'
    },
    companions: {
      beneficial: ['clover', 'marigold', 'garlic'],
      antagonistic: ['potato', 'tomato'],
      effects: [
        { cropId: 'clover', bonusType: 'nitrogen_fix', description: 'Orchard understory clover sod fixes 50-100 lbs N/acre annually.' },
        { cropId: 'garlic', bonusType: 'pest_repel', description: 'Under-canopy alliums repel borers and suppress apple scab fungal spores.' }
      ]
    },
    diseases: [
      { id: 'apple_scab', name: 'Apple Scab (Venturia inaequalis)', symptoms: 'Velvety olive-green spots becoming dark corky scabs on fruit', prevention: 'Sulfur spray, rake fallen autumn leaves' },
      { id: 'fire_blight', name: 'Fire Blight (Erwinia amylovora)', symptoms: 'Shoots rapidly wilt and blacken looking scorched (shepherd\'s crook)', prevention: 'Prune infected branches 12" below margin in dry weather' }
    ],
    fertilizerEffects: { compost: 1.25, synthetic: 1.15, organic: 1.3, bone_meal: 1.3 }
  },

  basil: {
    id: 'basil',
    displayName: 'Genovese Sweet Basil',
    scientificName: 'Ocimum basilicum',
    category: 'herb',
    seasons: ['spring', 'summer'],
    isPerennial: false,
    sunRequirement: 'full',
    frostTolerant: false,
    growthStages: [
      { id: 'seed',       name: 'Imbibition & Radicle', days: 7,  color: '#6d4c41', icon: '🌰' },
      { id: 'seedling',   name: 'Paired Cotyledons',   days: 14, color: '#a5d6a7', icon: '🌱' },
      { id: 'vegetative', name: 'Aromatic Branching',   days: 15, color: '#4caf50', icon: '🌿' },
      { id: 'mature',     name: 'Volatile Oil Peak',    days: 14, color: '#2e7d32', icon: '🍃' }
    ],
    water: { min: 35, max: 65, ideal: 50 },
    nutrientDemand: { n: 'medium', p: 'light', k: 'medium' },
    preferredPh: { min: 6.0, max: 7.5 },
    spacing: {
      sqft: 1.0,
      label: '1.0 sq ft / bush',
      description: '12" × 12" herb bush spacing for bush development.'
    },
    harvest: {
      itemId: 'basil_leaf',
      displayName: 'Aromatic Basil Leaves',
      minYield: 4,
      maxYield: 10,
      unit: 'bunches',
      basePrice: 15,
      preservationType: 'dry'
    },
    companions: {
      beneficial: ['tomato', 'marigold', 'garlic'],
      antagonistic: [],
      effects: [
        { cropId: 'tomato', bonusType: 'flavor_yield', description: 'Essential partner: repels thrips & hornworms while boosting tomato sweetness.' }
      ]
    },
    diseases: [
      { id: 'downy_mildew', name: 'Basil Downy Mildew (Peronospora belbahrii)', symptoms: 'Yellowing interveinal leaf chlorosis with dark gray fuzz below', prevention: 'Drip irrigation, seed sanitation' },
      { id: 'fusarium_wilt', name: 'Fusarium Wilt', symptoms: 'Sudden wilting, twisted shoots, brown stem vascular streaking', prevention: 'Fusarium-tested seeds and 3-year rotation' }
    ],
    fertilizerEffects: { compost: 1.2, synthetic: 1.1, organic: 1.25 }
  },

  clover: {
    id: 'clover',
    displayName: 'Crimson Clover (Green Manure)',
    scientificName: 'Trifolium incarnatum',
    category: 'legume',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    isPerennial: false,
    sunRequirement: 'partial',
    frostTolerant: true,
    growthStages: [
      { id: 'germination', name: 'Radicle & Hypocotyl', days: 5,  color: '#5d4037', icon: '🌰' },
      { id: 'nodulation',  name: 'Rhizobia Nodulation',  days: 15, color: '#81c784', icon: '🌱' },
      { id: 'biomass',     name: 'Vigorous Canopy & N-Fixing', days: 25, color: '#388e3c', icon: '☘️' },
      { id: 'bloom',       name: 'Crimson Inflorescence', days: 20, color: '#c2185b', icon: '🌸' }
    ],
    water: { min: 20, max: 60, ideal: 40 },
    nutrientDemand: { n: 'fixer', p: 'light', k: 'light' },
    preferredPh: { min: 6.0, max: 7.0 },
    spacing: {
      sqft: 0.1,
      label: '0.1 sq ft / plant',
      description: 'Dense living mulch broadcast cover (15-20 lbs seed/acre).'
    },
    harvest: {
      itemId: 'clover_green_manure',
      displayName: 'Nitrogen Green Manure (Bio-Fertilizer)',
      minYield: 15,
      maxYield: 30,
      unit: 'lbs N eq',
      basePrice: 25,
      preservationType: 'fresh'
    },
    companions: {
      beneficial: ['wheat', 'apple', 'lettuce', 'corn', 'potato'],
      antagonistic: [],
      effects: [
        { cropId: 'wheat', bonusType: 'nitrogen_fix', description: 'Pours fixed atmospheric nitrogen directly into adjacent rhizosphere (+30% N).' },
        { cropId: 'apple', bonusType: 'nitrogen_fix', description: 'Living orchard floor sod provides erosion protection and weed suppression.' }
      ]
    },
    diseases: [
      { id: 'clover_rot', name: 'Sclerotinia Crown Rot', symptoms: 'Brown decay of lower crown during damp cool weather', prevention: 'Avoid excessive nitrogen fertilization' }
    ],
    fertilizerEffects: { compost: 1.05, synthetic: 1.0, organic: 1.1 }
  },

  corn: {
    id: 'corn',
    displayName: 'Golden Bantam Sweet Corn',
    scientificName: 'Zea mays',
    category: 'grain',
    seasons: ['spring', 'summer'],
    isPerennial: false,
    sunRequirement: 'full',
    frostTolerant: false,
    growthStages: [
      { id: 'emergence', name: 'Spike Emergence', days: 8,  color: '#795548', icon: '🌽' },
      { id: 'whorl',     name: 'Rapid Stalk Whorl', days: 25, color: '#4caf50', icon: '🌿' },
      { id: 'tasseling', name: 'Pollen Tassel & Silking', days: 20, color: '#cddc39', icon: '🌾' },
      { id: 'milk_stage',name: 'Kernels at Milk Stage', days: 25, color: '#fbc02d', icon: '🌽' }
    ],
    water: { min: 50, max: 95, ideal: 75 },
    nutrientDemand: { n: 'heavy', p: 'heavy', k: 'heavy' },
    preferredPh: { min: 5.8, max: 6.8 },
    spacing: {
      sqft: 1.5,
      label: '1.5 sq ft / stalk',
      description: 'Block planting in 4×4 clusters for wind pollination.'
    },
    harvest: {
      itemId: 'sweet_corn_ears',
      displayName: 'Fresh Sweet Corn Ears',
      minYield: 8,
      maxYield: 20,
      unit: 'ears',
      basePrice: 16,
      preservationType: 'canned'
    },
    companions: {
      beneficial: ['clover', 'marigold'],
      antagonistic: ['tomato'],
      effects: [
        { cropId: 'clover', bonusType: 'nitrogen_fix', description: 'Crucial companion: offsets heavy nitrogen starvation from corn feeding.' },
        { cropId: 'tomato', bonusType: 'blight_risk', description: 'Shares corn earworm / tomato fruitworm (Helicoverpa zea) pest pressure.' }
      ]
    },
    diseases: [
      { id: 'corn_smut', name: 'Corn Smut (Ustilago maydis)', symptoms: 'Silvery galls swelling on ears that rupture with dark spores', prevention: 'Sanitize equipment, culinary harvest of young huitlacoche' }
    ],
    fertilizerEffects: { compost: 1.2, synthetic: 1.35, organic: 1.25, blood_meal: 1.45 }
  },

  carrot: {
    id: 'carrot',
    displayName: 'Danvers Half Long Carrot',
    scientificName: 'Daucus carota',
    category: 'root',
    seasons: ['spring', 'autumn'],
    isPerennial: false,
    sunRequirement: 'full',
    frostTolerant: true,
    growthStages: [
      { id: 'seed',       name: 'Hypocotyl Hook', days: 12, color: '#6d4c41', icon: '🌰' },
      { id: 'feathery',   name: 'Lacy Foliage Top', days: 20, color: '#81c784', icon: '🌱' },
      { id: 'taproot',    name: 'Taproot Thickening', days: 30, color: '#ff9800', icon: '🥕' },
      { id: 'sweetening', name: 'Sugar Accumulation', days: 15, color: '#e65100', icon: '🥕' }
    ],
    water: { min: 30, max: 70, ideal: 50 },
    nutrientDemand: { n: 'light', p: 'heavy', k: 'heavy' },
    preferredPh: { min: 6.0, max: 6.8 },
    spacing: {
      sqft: 0.25,
      label: '0.25 sq ft / carrot',
      description: '3" in-row spacing in loose, rock-free crumbly loam.'
    },
    harvest: {
      itemId: 'carrot_bunch',
      displayName: 'Sweet Crisp Carrots',
      minYield: 8,
      maxYield: 18,
      unit: 'lbs',
      basePrice: 14,
      preservationType: 'cold_cellar'
    },
    companions: {
      beneficial: ['lettuce', 'garlic', 'marigold'],
      antagonistic: ['clover'],
      effects: [
        { cropId: 'garlic', bonusType: 'pest_repel', description: 'Pungent allium aroma completely masks carrot scent from rust flies.' }
      ]
    },
    diseases: [
      { id: 'cavity_spot', name: 'Cavity Spot (Pythium)', symptoms: 'Sunken elliptical black horizontal craters on mature roots', prevention: 'Good drainage, avoid over-liming' }
    ],
    fertilizerEffects: { compost: 1.15, synthetic: 1.1, organic: 1.2, bone_meal: 1.4 }
  },

  marigold: {
    id: 'marigold',
    displayName: 'French Petal Marigold',
    scientificName: 'Tagetes patula',
    category: 'flower',
    seasons: ['spring', 'summer', 'autumn'],
    isPerennial: false,
    sunRequirement: 'full',
    frostTolerant: false,
    growthStages: [
      { id: 'seed',      name: 'Seed Sprout', days: 5,  color: '#5d4037', icon: '🌰' },
      { id: 'seedling',  name: 'Bushy Foliage', days: 14, color: '#8bc34a', icon: '🌱' },
      { id: 'budding',   name: 'Flower Buds', days: 14, color: '#ffb300', icon: '🌼' },
      { id: 'full_bloom',name: 'Vibrant Insect Barrier', days: 30, color: '#ff6f00', icon: '🏵️' }
    ],
    water: { min: 25, max: 60, ideal: 45 },
    nutrientDemand: { n: 'light', p: 'medium', k: 'medium' },
    preferredPh: { min: 6.0, max: 7.5 },
    spacing: {
      sqft: 0.8,
      label: '0.8 sq ft / flower',
      description: 'Interplanted perimeter or bed-border spacing.'
    },
    harvest: {
      itemId: 'marigold_blossoms',
      displayName: 'Botanical Marigold Petals',
      minYield: 6,
      maxYield: 15,
      unit: 'oz',
      basePrice: 12,
      preservationType: 'dry'
    },
    companions: {
      beneficial: ['tomato', 'potato', 'corn', 'basil', 'carrot', 'apple'],
      antagonistic: [],
      effects: [
        { cropId: 'tomato', bonusType: 'pest_repel', description: 'Universal companion: root exudates eliminate nematodes; flowers attract hoverflies.' },
        { cropId: 'potato', bonusType: 'pest_repel', description: 'Deters flea beetles and potato beetles (+20% stress defense).' }
      ]
    },
    diseases: [
      { id: 'botrytis', name: 'Botrytis Grey Mould', symptoms: 'Fuzzy grey spore growth on blossoms during wet cold spells', prevention: 'Deadhead spent blooms' }
    ],
    fertilizerEffects: { compost: 1.1, synthetic: 1.1, organic: 1.15 }
  },

  garlic: {
    id: 'garlic',
    displayName: 'Hardneck Porcelain Garlic',
    scientificName: 'Allium sativum',
    category: 'root',
    seasons: ['autumn', 'winter', 'spring', 'summer'],
    isPerennial: false,
    sunRequirement: 'full',
    frostTolerant: true,
    growthStages: [
      { id: 'clove_root', name: 'Autumn Clove Rooting', days: 45, color: '#5d4037', icon: '🧄' },
      { id: 'dormancy',   name: 'Winter Chill Vernalization', days: 75, color: '#78909c', icon: '❄️' },
      { id: 'spring_spear',name: 'Spring Scape & Spear', days: 60, color: '#4caf50', icon: '🌿' },
      { id: 'bulb_cure',  name: 'Bulb Swell & Curing', days: 30, color: '#d7ccc8', icon: '🧄' }
    ],
    water: { min: 25, max: 65, ideal: 45 },
    nutrientDemand: { n: 'heavy', p: 'medium', k: 'heavy' },
    preferredPh: { min: 6.5, max: 7.2 },
    spacing: {
      sqft: 0.5,
      label: '0.5 sq ft / bulb',
      description: '6" × 6" grid planted in late autumn before ground freezes.'
    },
    harvest: {
      itemId: 'garlic_bulbs',
      displayName: 'Cured Hardneck Garlic Bulbs',
      minYield: 8,
      maxYield: 20,
      unit: 'bulbs',
      basePrice: 22,
      preservationType: 'dry'
    },
    companions: {
      beneficial: ['tomato', 'carrot', 'apple', 'lettuce'],
      antagonistic: ['clover'],
      effects: [
        { cropId: 'apple', bonusType: 'pest_repel', description: 'Sulfur secretions in soil deter fungal scab and burrowing pests.' },
        { cropId: 'carrot', bonusType: 'pest_repel', description: 'Repels carrot rust fly through strong volatile sulfur emissions.' }
      ]
    },
    diseases: [
      { id: 'white_rot', name: 'White Rot (Stromatinia cepivora)', symptoms: 'White fluffy fungal mycelium on stem plate studded with black sclerotia', prevention: '8-year rotation, clean certified cloves' }
    ],
    fertilizerEffects: { compost: 1.25, synthetic: 1.15, organic: 1.3, wood_ash: 1.3 }
  },

  blueberry: {
    id: 'blueberry',
    displayName: 'Highbush Patriot Blueberry',
    scientificName: 'Vaccinium corymbosum',
    category: 'perennial',
    seasons: ['spring', 'summer', 'autumn', 'winter'],
    isPerennial: true,
    perennialYears: 3,
    sunRequirement: 'full',
    frostTolerant: true,
    growthStages: [
      { id: 'dormant_cane', name: 'Year 1: Acid Soil Rooting', days: 365, color: '#4e342e', icon: '🪵' },
      { id: 'bud_break',    name: 'Year 2: Floral Cane Branching', days: 365, color: '#3949ab', icon: '🫐' },
      { id: 'fruit_cluster',name: 'Year 3+: Heavy Indigo Berry Cluster', days: 365, color: '#1a237e', icon: '🫐' }
    ],
    water: { min: 40, max: 80, ideal: 60 },
    nutrientDemand: { n: 'medium', p: 'light', k: 'medium' },
    preferredPh: { min: 4.5, max: 5.2 }, // Acid lover!
    spacing: {
      sqft: 16.0,
      label: '16.0 sq ft / bush',
      description: '4\' × 4\' spacing in peat-acidified mounds with pine bark mulch.'
    },
    harvest: {
      itemId: 'blueberry_pint',
      displayName: 'Pints of Wild Sweet Blueberries',
      minYield: 12,
      maxYield: 32,
      unit: 'pints',
      basePrice: 35,
      preservationType: 'cold_cellar'
    },
    companions: {
      beneficial: ['marigold'],
      antagonistic: ['garlic', 'lettuce'], // Acid clashes with neutral-ph plants
      effects: [
        { cropId: 'marigold', bonusType: 'pest_repel', description: 'Attracts native bumblebee pollinators necessary for bell flower pollination.' }
      ]
    },
    diseases: [
      { id: 'mummy_berry', name: 'Mummy Berry (Monilinia vaccinii-corymbosi)', symptoms: 'Infected berries turn pinkish-tan, shrivel into hard mummies and drop', prevention: 'Thick pine needle mulch, remove mummies before spring' }
    ],
    fertilizerEffects: { compost: 1.1, synthetic: 1.1, organic: 1.35, sulfur: 1.5 }
  }
};

export const SOIL_AMENDMENTS = [
  { id: 'compost',   name: 'Rich Microbe Compost', cost: 15, npk: { n: 25, p: 20, k: 25 }, phShift: 0.0,  om: 5, desc: 'Balanced organic matter & bio-active soil microbes.' },
  { id: 'blood_meal',name: 'Blood Meal (High-N)',   cost: 25, npk: { n: 60, p: 0,  k: 0 },  phShift: -0.1, om: 1, desc: 'Rapid nitrogen surge for heavy vegetative feeders.' },
  { id: 'bone_meal', name: 'Bone Meal (High-P)',    cost: 25, npk: { n: 5,  p: 60, k: 0 },  phShift: 0.1,  om: 1, desc: 'Phosphorus powerhouse for root bulking & flower sets.' },
  { id: 'wood_ash',  name: 'Wood Ash (High-K & Ca)',cost: 20, npk: { n: 0,  p: 10, k: 50 }, phShift: 0.3,  om: 0, desc: 'Potassium boost + naturally raises acidic soil pH.' },
  { id: 'sulfur',    name: 'Elemental Sulfur',      cost: 30, npk: { n: 0,  p: 0,  k: 0 },  phShift: -0.5, om: 0, desc: 'Acidifies soil pH for blueberries, potatoes, acid crops.' },
  { id: 'lime',      name: 'Agricultural Dolomite', cost: 20, npk: { n: 0,  p: 0,  k: 0 },  phShift: 0.5,  om: 0, desc: 'Raises acidic pH and supplies essential Calcium & Magnesium.' }
];

export const SEASON_METADATA = {
  spring: {
    id: 'spring',
    name: 'Spring',
    icon: '🌱',
    avgTempF: 62,
    sunlightHours: 13,
    frostRisk: 0.25,
    description: 'Awakening season. Optimal soil moisture, seedling emergence, and orchard bud burst.',
    themeBg: '#1e2417',
    themeAccent: '#81c784'
  },
  summer: {
    id: 'summer',
    name: 'Summer',
    icon: '☀️',
    avgTempF: 84,
    sunlightHours: 15,
    frostRisk: 0.0,
    description: 'High photosynthetic peak. Rapid vegetative transpiration, fruiting swell, heatwave risks.',
    themeBg: '#262013',
    themeAccent: '#fbc02d'
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn',
    icon: '🍂',
    avgTempF: 55,
    sunlightHours: 11,
    frostRisk: 0.4,
    description: 'Bountiful harvest peak. Cool nights sweeten root crops; curing garlic and apples.',
    themeBg: '#271c14',
    themeAccent: '#e07a5f'
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    icon: '❄️',
    avgTempF: 32,
    sunlightHours: 9,
    frostRisk: 0.85,
    description: 'Dormancy & vernalization. Perennials sleep; garlic roots underground; cover crops hold topsoil.',
    themeBg: '#151c24',
    themeAccent: '#90caf9'
  }
};
