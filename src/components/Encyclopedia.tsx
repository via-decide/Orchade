import React, { useState } from 'react';
import { 
  Lock, 
  Sprout, 
  BookOpen, 
  Globe, 
  Activity, 
  Info, 
  Percent,
  Search,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'motion/react';

export type EncyclopediaPlant = {
  type: string;
  name: string;
  cost: number;
  color: string;
  desc: string;
  scientificName: string;
  origin: string;
  category: string;
  optimalHydration: string;
  optimalNutrients: string;
  growthRate: string;
  pestThreat: string;
  dataYield: number;
  creditYield: number;
  lore: string;
  growingTip: string;
};

export const ENCYCLOPEDIA_DATA: EncyclopediaPlant[] = [
  {
    type: 'Basic',
    name: 'Terran Sprout',
    cost: 50,
    color: '#4CAF50',
    desc: 'Standard Earth species. Extremely resilient but low research yields.',
    scientificName: 'Solanum terrani',
    origin: 'Sol-3 (Earth)',
    category: 'Organic Standard',
    optimalHydration: '40% - 60%',
    optimalNutrients: 'Moderate (50% - 75%)',
    growthRate: 'Standard (Medium)',
    pestThreat: 'Low',
    dataYield: 5,
    creditYield: 500,
    lore: 'A relic of Earth\'s organic age, the Terran Sprout represents the baseline of planetary botany. Resilient, humble, and highly adaptive, it utilizes standard photosynthesis and has a robust root network. It has been genetically stabilized to survive in almost any simulated orchard environment, making it the perfect starting point for trainee botanists across the solar system.',
    growingTip: 'Extremely forgiving. It can survive extended dry spells, making it ideal for testing new nutrient combinations or waiting out storms.'
  },
  {
    type: 'Neon-Vine',
    name: 'Neon Vine',
    cost: 100,
    color: '#00E676',
    desc: 'Synthesized jungle creeper. Rapid expansion with bioluminescent properties.',
    scientificName: 'Vitis bioluminescens',
    origin: 'Bioluminescent Biosphere-7',
    category: 'Transgenic Creeper',
    optimalHydration: '70% - 90%',
    optimalNutrients: 'High (80% - 100%)',
    growthRate: 'Rapid',
    pestThreat: 'Medium',
    dataYield: 10,
    creditYield: 600,
    lore: 'Crafted in the deep biolume labs of Biosphere-7, the Neon Vine is a genetic hybrid of tropical jungle creepers and deep-sea marine dinoflagellates. Its veins glow with a highly efficient, neon-green bio-emissive fluid that serves as an energy transport medium. Under low-light or atmospheric conditions, it creates breathtaking networks of light, reflecting its active metabolic state.',
    growingTip: 'Thrives in high-humidity environments. During rainy cycles, its growth rate spikes significantly. Keep hydration levels topped up!'
  },
  {
    type: 'Quartz-Fern',
    name: 'Quartz Fern',
    cost: 150,
    color: '#B2EBF2',
    desc: 'Silicon-based crystalline flora. Exceptionally high-value mineral data.',
    scientificName: 'Silica fractalis',
    origin: 'Silicaceous Asteroid Belt Delta',
    category: 'Silicon-Based Crystalline',
    optimalHydration: '20% - 45%',
    optimalNutrients: 'High (Mineral-Rich)',
    growthRate: 'Slow',
    pestThreat: 'Very Low',
    dataYield: 15,
    creditYield: 750,
    lore: 'A botanical marvel that replaces carbon-based cellulose with crystalline quartz structures. Discovered on silicon-dense asteroid fields, the Quartz Fern absorbs dissolved silica from rocky substrates and crystallizes it in its fractal leaves. Because of its glass-like composition, it reflects light in dazzling spectra and yields high-value geological data when researched.',
    growingTip: 'Consumes water slowly but requires constant, high-grade nutrient infusions to build its mineral leaves. Pests find its glass-like needles impossible to digest.'
  },
  {
    type: 'Shadow-Fungi',
    name: 'Shadow Fungi',
    cost: 120,
    color: '#4527A0',
    desc: 'Subterranean fungal spore. Highly resistant to pests.',
    scientificName: 'Cryptomyces tenebris',
    origin: 'Subterranean Cavities of Kepler-186f',
    category: 'Subterranean Mycelium',
    optimalHydration: '50% - 80%',
    optimalNutrients: 'Moderate-Low',
    growthRate: 'Medium-Fast',
    pestThreat: 'None',
    dataYield: 8,
    creditYield: 550,
    lore: 'Thriving in pitch-black, highly pressured caverns where sunlight is nonexistent, the Shadow Fungi utilizes advanced chemosynthesis. Its deep violet mycelium is coated in a strong bio-toxin that deters all standard organic pests, making it completely immune to infestations. Its spores contain volatile neural data highly prized by laboratory neural links.',
    growingTip: 'Completely immune to pests. Can be left unattended for longer periods without pest defense upgrades, but requires a dark, stable medium to mature.'
  },
  {
    type: 'Cryo-Lily',
    name: 'Cryo Lily',
    cost: 180,
    color: '#81D4FA',
    desc: 'Cold-tempered aquatic hybrid. Absorbs surrounding thermal heat.',
    scientificName: 'Nymphaea glacialis',
    origin: 'Glacial Oceans of Europa',
    category: 'Cryogenic Hydro-hybrid',
    optimalHydration: '80% - 100%',
    optimalNutrients: 'Moderate',
    growthRate: 'Medium',
    pestThreat: 'Low',
    dataYield: 12,
    creditYield: 800,
    lore: 'Discovered beneath the kilometers-thick ice sheets of Europa, the Cryo Lily thrives at near-freezing temperatures. Its biological structure is rich in natural antifreeze proteins, preventing cell crystallization. Paradoxically, it absorbs thermal energy from its surroundings to power its growth, cooling the microclimate around it.',
    growingTip: 'Perfect during heatwaves! Its natural endothermic properties absorb excess heat, lowering overall stress. Ensure it stays thoroughly saturated with water.'
  },
  {
    type: 'Plasma-Orchid',
    name: 'Plasma Orchid',
    cost: 250,
    color: '#AD1457',
    desc: 'Supercharged stellar orchid. Hard to manage but massive yields.',
    scientificName: 'Orchis fulgurata',
    origin: 'Corona-adjacent platforms of Vega',
    category: 'Energetic Charged Flora',
    optimalHydration: '30% - 50%',
    optimalNutrients: 'Extremely High',
    growthRate: 'Highly Volatile',
    pestThreat: 'High',
    dataYield: 22,
    creditYield: 1000,
    lore: 'The Plasma Orchid is a highly volatile species engineered to absorb ionized radiation. Its blossoms crackle with micro-electrical discharges, and it has a voracious appetite for nutrients. Managing its stress is a legendary challenge among botanists, but successful harvests yield raw energy metrics that can power stellar jump drives.',
    growingTip: 'A high-risk, high-reward specimen. It accumulates stress rapidly if its water or nutrients drop even slightly. Keep stabilizers nearby and harvest immediately when ripe.'
  },
  {
    type: 'Void-Willow',
    name: 'Void Willow',
    cost: 300,
    color: '#212121',
    desc: 'Ethereal dark-wood entity. Warps surrounding sensory fields.',
    scientificName: 'Salix singularis',
    origin: 'Singularity Horizon Outer Rim',
    category: 'Gravitational Anomalous',
    optimalHydration: '10% - 30%',
    optimalNutrients: 'Very High',
    growthRate: 'Very Slow',
    pestThreat: 'Low',
    dataYield: 30,
    creditYield: 1200,
    lore: 'An exotic dark-wood organism whose roots absorb localized gravity fields. Cultivating a Void Willow requires precise environmental anchors, as its leaves seem to swallow light itself, casting a persistent shadow. Its wood is highly dense and slightly distorts the local spacetime metric, offering invaluable quantum research.',
    growingTip: 'Requires minimal hydration but thrives on extremely concentrated organic matter. Its growth cycle is long, but the quantum yield is unmatched by any other known species.'
  },
  {
    type: 'Xero-Cactus',
    name: 'Xero Cactus',
    cost: 130,
    color: '#33691E',
    desc: 'Thorny arid species. Consumes virtually no hydration.',
    scientificName: 'Cactaceae xericus',
    origin: 'Super-arid deserts of Mars Prime',
    category: 'Xerophytic Succulent',
    optimalHydration: '5% - 20%',
    optimalNutrients: 'Low',
    growthRate: 'Slow-Medium',
    pestThreat: 'Medium (Thorns block some)',
    dataYield: 8,
    creditYield: 580,
    lore: 'A descendant of terrestrial cacti heavily modified to survive the dry, atmospheric Martian dunes. The Xero Cactus features thick, metallic-sheened skin that stores moisture for hundreds of cycles. It possesses specialized micro-needles that pull water molecules directly from atmospheric moisture, making it incredibly self-sustaining.',
    growingTip: 'Overwatering is lethal! It thrives in near-arid conditions. Its sharp, metallic needles provide a decent natural defense against standard pests.'
  },
  {
    type: 'Aether-Grass',
    name: 'Aether Grass',
    cost: 80,
    color: '#E0F2F1',
    desc: 'High-altitude gas-absorbent blade. Extremely fast lifecycles.',
    scientificName: 'Gramina aetheris',
    origin: 'Floating Skies of Neptune',
    category: 'Gas-Absorbent Aero-Graminoid',
    optimalHydration: '60% - 85%',
    optimalNutrients: 'Low',
    growthRate: 'Very Fast',
    pestThreat: 'Low',
    dataYield: 6,
    creditYield: 480,
    lore: 'Suspended in the upper atmospheres of gas giants, Aether Grass does not require solid soil, anchoring its roots into ambient atmospheric currents. It is a highly efficient bio-filter, absorbing methane and converting it to carbon complexes. Its lifecycle is exceptionally fast, allowing botanists to harvest and replant with lightning-fast turnaround times.',
    growingTip: 'Fastest growing plant in the database. Requires very little nutrients, but drinks steadily. Harvest frequently to maximize quick cash turnarounds.'
  }
];

interface EncyclopediaProps {
  harvestedTypes: string[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 14
    }
  }
};

export const Encyclopedia: React.FC<EncyclopediaProps> = ({ harvestedTypes }) => {
  const [selectedType, setSelectedType] = useState<string>('Basic');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredPlants = ENCYCLOPEDIA_DATA.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPlant = ENCYCLOPEDIA_DATA.find(p => p.type === selectedType) || ENCYCLOPEDIA_DATA[0];
  const isUnlocked = harvestedTypes.includes(selectedPlant.type);

  // Statistics
  const totalSpecies = ENCYCLOPEDIA_DATA.length;
  const unlockedCount = harvestedTypes.length;
  const completionPercentage = Math.round((unlockedCount / totalSpecies) * 100);

  return (
    <div id="encyclopedia-root" className="space-y-6">
      {/* Header Summary Dashboard */}
      <motion.div 
        id="encyclopedia-stats" 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <motion.div variants={itemVariants} className="hardware-panel p-4 flex items-center justify-between bg-black/30 border-fuchsia-500/10">
          <div>
            <p className="text-[9px] text-text-secondary uppercase tracking-widest">Database Sync</p>
            <h3 className="font-serif text-lg italic text-text-primary">Botanical Records</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-500">
            <BookOpen size={20} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="hardware-panel p-4 flex items-center justify-between bg-black/30 border-fuchsia-500/10">
          <div>
            <p className="text-[9px] text-text-secondary uppercase tracking-widest">Taxonomy Cataloged</p>
            <h3 className="font-mono text-xl font-bold text-fuchsia-400">
              {unlockedCount} <span className="text-xs text-text-secondary">/ {totalSpecies} Species</span>
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-500">
            <Sprout size={20} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="hardware-panel p-4 flex items-center justify-between bg-black/30 border-fuchsia-500/10">
          <div>
            <p className="text-[9px] text-text-secondary uppercase tracking-widest">Genome Mapping</p>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-xl font-bold text-leaf-green">{completionPercentage}%</h3>
              <div className="w-24 bg-black/50 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="bg-leaf-green h-full rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-leaf-green/10 flex items-center justify-center text-leaf-green">
            <Percent size={18} />
          </div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Plant Selection List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="relative">
            <input 
              id="encyclopedia-search"
              type="text" 
              placeholder="Search botanical archives..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-bark-brown/20 rounded-lg px-3 py-2 pl-9 text-xs focus:outline-none focus:border-fuchsia-500/50 text-text-primary placeholder:text-text-secondary/50 font-sans"
            />
            <Search size={14} className="absolute left-3 top-3 text-text-secondary/50" />
          </div>

          <motion.div 
            key={`list-${searchTerm}`}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="hardware-panel flex-1 p-2 space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar bg-black/20"
          >
            {filteredPlants.map((plant) => {
              const plantUnlocked = harvestedTypes.includes(plant.type);
              const isSelected = selectedType === plant.type;
              
              return (
                <motion.button
                  variants={itemVariants}
                  whileHover={{ x: 4, transition: { duration: 0.1 } }}
                  id={`encyclopedia-btn-${plant.type}`}
                  key={plant.type}
                  onClick={() => setSelectedType(plant.type)}
                  className={`w-full p-3 rounded-lg text-left transition-all flex items-center justify-between border ${
                    isSelected 
                      ? 'bg-fuchsia-500/10 border-fuchsia-500/50' 
                      : 'bg-black/30 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3 h-3 rounded-full animate-pulse shadow-sm" 
                      style={{ 
                        backgroundColor: plant.color, 
                        boxShadow: `0 0 8px ${plant.color}80` 
                      }} 
                    />
                    <div>
                      <h4 className="text-xs font-bold text-text-primary leading-tight">
                        {plant.name}
                      </h4>
                      <p className="text-[9px] text-text-secondary font-mono">
                        {plantUnlocked ? plant.scientificName : 'Genome Encrypted'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    {plantUnlocked ? (
                      <span className="text-[8px] bg-leaf-green/10 text-leaf-green px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-bold">
                        Discovered
                      </span>
                    ) : (
                      <Lock size={12} className="text-text-secondary/40 mr-1" />
                    )}
                  </div>
                </motion.button>
              );
            })}
            
            {filteredPlants.length === 0 && (
              <div className="text-center py-8 text-xs text-text-secondary italic">
                No matching species found.
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Side: Detailed Stats & Lore */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPlant.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {!isUnlocked ? (
                /* Locked State */
                <div id="encyclopedia-locked" className="hardware-panel p-8 h-full flex flex-col items-center justify-center text-center space-y-6 border-dashed border-bark-brown/30 bg-black/40 min-h-[400px]">
                  <div className="w-16 h-16 rounded-full bg-burn-red/10 flex items-center justify-center text-burn-red/70 border border-burn-red/20 animate-pulse">
                    <Lock size={28} />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <h3 className="font-serif text-lg italic text-text-primary">Genome Encrypted</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Detailed telemetry, genetic metrics, and historical records for <span className="font-bold" style={{ color: selectedPlant.color }}>{selectedPlant.name}</span> will remain locked until this specimen is successfully cultivated and harvested.
                    </p>
                  </div>
                  
                  <div className="w-full max-w-sm p-4 bg-black/50 border border-white/5 rounded-lg text-left space-y-2">
                    <span className="text-[8px] uppercase tracking-widest font-bold text-fuchsia-400 block">De-encryption Directive</span>
                    <ul className="text-[10px] text-text-secondary space-y-1.5 list-disc pl-4 font-sans leading-relaxed">
                      <li>Purchase a seed package in an empty plot for <span className="font-mono text-mineral-gold font-bold">{selectedPlant.cost} 🪙</span>.</li>
                      <li>Nurture the sprout through all stages of growth by keeping it watered and fertilized.</li>
                      <li>Conduct neural scan research to trigger stage evolution until it fruits.</li>
                      <li>Use pruning shears to successfully harvest the ripe specimen.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Unlocked State */
                <div id="encyclopedia-unlocked" className="hardware-panel p-6 space-y-6 bg-black/40 h-full flex flex-col justify-between border-fuchsia-500/20">
                  <div className="space-y-6">
                    {/* Species Banner */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-bark-brown/20 pb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3.5 h-3.5 rounded-full" 
                            style={{ 
                              backgroundColor: selectedPlant.color, 
                              boxShadow: `0 0 12px ${selectedPlant.color}` 
                            }} 
                          />
                          <h2 className="font-serif text-2xl italic text-text-primary">{selectedPlant.name}</h2>
                        </div>
                        <p className="text-xs font-mono text-fuchsia-400 mt-1">{selectedPlant.scientificName}</p>
                      </div>
                      
                      <div className="bg-black/40 px-3 py-1.5 rounded border border-white/5 flex flex-col items-end">
                        <span className="text-[8px] text-text-secondary uppercase tracking-widest">Origin Sector</span>
                        <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 mt-0.5">
                          <Globe size={11} className="text-fuchsia-500" />
                          {selectedPlant.origin}
                        </span>
                      </div>
                    </div>

                    {/* Plant Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-black/30 rounded border border-white/5">
                        <span className="text-[8px] text-text-secondary uppercase tracking-widest block mb-1">Biological Classification</span>
                        <span className="text-xs font-bold text-text-primary truncate block">{selectedPlant.category}</span>
                      </div>
                      
                      <div className="p-3 bg-black/30 rounded border border-white/5">
                        <span className="text-[8px] text-text-secondary uppercase tracking-widest block mb-1">Optimal Hydration</span>
                        <span className="text-xs font-bold text-water-blue block">{selectedPlant.optimalHydration}</span>
                      </div>
                      
                      <div className="p-3 bg-black/30 rounded border border-white/5">
                        <span className="text-[8px] text-text-secondary uppercase tracking-widest block mb-1">Optimal Nutrients</span>
                        <span className="text-xs font-bold text-mineral-gold block">{selectedPlant.optimalNutrients}</span>
                      </div>
                      
                      <div className="p-3 bg-black/30 rounded border border-white/5">
                        <span className="text-[8px] text-text-secondary uppercase tracking-widest block mb-1">Growth Frequency</span>
                        <span className="text-xs font-bold text-leaf-green block">{selectedPlant.growthRate}</span>
                      </div>
                    </div>

                    {/* Historical Lore / Journal */}
                    <div className="space-y-2">
                      <h4 className="text-[9px] uppercase tracking-widest font-bold text-text-secondary flex items-center gap-1.5">
                        <Info size={11} className="text-fuchsia-500" />
                        Botanical Monograph
                      </h4>
                      <div className="bg-black/20 p-4 rounded-lg border border-white/5 text-xs text-text-secondary leading-relaxed font-sans italic">
                        "{selectedPlant.lore}"
                      </div>
                    </div>

                    {/* Growing Tips */}
                    <div className="space-y-2">
                      <h4 className="text-[9px] uppercase tracking-widest font-bold text-text-secondary flex items-center gap-1.5">
                        <Activity size={11} className="text-leaf-green" />
                        Cultivation Intelligence
                      </h4>
                      <div className="bg-leaf-green/5 p-4 rounded-lg border border-leaf-green/15 text-xs text-text-primary leading-relaxed font-sans">
                        <span className="font-bold text-leaf-green block mb-1">PRO-TIP:</span>
                        {selectedPlant.growingTip}
                      </div>
                    </div>
                  </div>

                  {/* Harvest Yields */}
                  <div className="pt-4 border-t border-bark-brown/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-mineral-gold animate-pulse" />
                      <span className="text-[10px] text-text-secondary font-mono">ESTIMATED MATURITY REWARDS</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-white/5">
                        <span className="text-[9px] text-text-secondary font-mono">CREDITS:</span>
                        <span className="text-xs font-mono font-bold text-mineral-gold">+{selectedPlant.creditYield} 🪙</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded border border-white/5">
                        <span className="text-[9px] text-text-secondary font-mono">DATA SEEDS:</span>
                        <span className="text-xs font-mono font-bold text-fuchsia-400">+{selectedPlant.dataYield} 🧬</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
