import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, signInWithGoogle, handleRedirectResult, logout } from './firebase';
import PlantCard from './components/PlantCard';
import MarketView from './components/MarketView';
import { GameState, Plant, Orchard, GlobalUpgrades } from './types';
import {
  PLANT_STAGES, INITIAL_UPGRADES, SHOP_ITEMS,
  WEATHER_TYPES, getRandomWeather, BASE_PLANT_TYPES, BREEDING_COST, MUTATION_CHANCE, RARITY_COLORS
} from './constants';
import { Sprout, Droplets, FlaskConical, ShoppingBag, Wrench, LogOut, Sun, CloudRain, Zap, Bug, Flame, Trophy, User, Loader } from 'lucide-react';
import { usePersonalityVector } from './hooks/usePersonalityVector';
import { motion } from 'motion/react';
import { dominantQuadrant } from './services/personalityService';

// ─── Constants ───────────────────────────────────────────────
const INITIAL_ORCHARDS: Orchard[] = [
  { id: 'o1', name: 'Alpha Plot', plants: [null, null, null, null], isUnlocked: true, unlockCost: 0 },
  { id: 'o2', name: 'Beta Plot', plants: [null, null, null, null], isUnlocked: false, unlockCost: 500 },
  { id: 'o3', name: 'Gamma Plot', plants: [null, null, null, null], isUnlocked: false, unlockCost: 1500 },
];

const INITIAL_STATE: Omit<GameState, 'user' | 'isAuthReady'> = {
  day: 1,
  credits: 200,
  dataSeeds: 10,
  orchards: INITIAL_ORCHARDS,
  activeOrchardId: 'o1',
  selectedPlantIndex: null,
  upgrades: INITIAL_UPGRADES,
  tools: [],
  activeTab: 'orchard',
  weather: getRandomWeather(),
};

// ─── Helpers ──────────────────────────────────────────────────
function makePlant(type: string): Plant {
  const base = BASE_PLANT_TYPES.find(b => b.name === type) ?? BASE_PLANT_TYPES[0];
  return {
    id: `plant_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: base.name,
    rootStrength: 50,
    water: 20,
    nutrients: 60,
    stress: 0,
    pests: 0,
    pestImmunity: 0,
    stageIndex: 0,
    isHarvestable: false,
    rarity: 'Common',
    growthSpeedMultiplier: base.baseGrowthSpeed,
    yieldMultiplier: base.baseYield,
    color: base.color,
  };
}

function getUserDocRef(uid: string) {
  return doc(db, 'users', uid);
}

// ─── Main Component ───────────────────────────────────────────
export default function App() {
  const [gs, setGs] = useState<GameState>({
    ...INITIAL_STATE,
    user: null,
    isAuthReady: false,
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState(BASE_PLANT_TYPES[0].name);
  const { vector, identityHash, recordAction } = usePersonalityVector(gs.user?.uid);

  // ── Notification helper ──
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  // ── Persist game state to Firestore ──
  const saveState = useCallback(async (state: GameState) => {
    if (!state.user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(getUserDocRef(state.user.uid), {
        credits: state.credits,
        dataSeeds: state.dataSeeds,
        day: state.day,
        orchards: state.orchards,
        upgrades: state.upgrades,
      });
    } catch (e) {
      // doc may not exist yet on first save — create it
      try {
        await setDoc(getUserDocRef(state.user!.uid), {
          uid: state.user!.uid,
          displayName: state.user!.displayName,
          email: state.user!.email,
          credits: state.credits,
          dataSeeds: state.dataSeeds,
          day: state.day,
          orchards: state.orchards,
          upgrades: state.upgrades,
        });
      } catch (err) {
        console.error('saveState error:', err);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Auth bootstrap ──
  useEffect(() => {
    // ✅ FIX: Pick up redirect sign-in result on every app load
    handleRedirectResult().catch(console.error);

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const ref = getUserDocRef(firebaseUser.uid);
        const snap = await getDoc(ref);
        const saved = snap.exists() ? snap.data() : null;

        setGs(prev => ({
          ...prev,
          ...(saved ? {
            credits: saved.credits ?? prev.credits,
            dataSeeds: saved.dataSeeds ?? prev.dataSeeds,
            day: saved.day ?? prev.day,
            orchards: saved.orchards ?? prev.orchards,
            upgrades: saved.upgrades ?? prev.upgrades,
          } : {}),
          user: {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
          },
          isAuthReady: true,
        }));
      } else {
        setGs(prev => ({ ...prev, user: null, isAuthReady: true }));
      }
      setAuthLoading(false);
    });

    return unsub;
  }, []);

  // ── Auto-advance day every 60s (dev: 10s) ──
  useEffect(() => {
    if (!gs.user) return;
    const t = setInterval(() => {
      setGs(prev => {
        const next = tickDay(prev);
        saveState(next);
        return next;
      });
    }, 60_000);
    return () => clearInterval(t);
  }, [gs.user, saveState]);

  // ── Game tick logic ──
  function tickDay(prev: GameState): GameState {
    const weather = getRandomWeather();
    const orchards = prev.orchards.map(orch => ({
      ...orch,
      plants: orch.plants.map(p => {
        if (!p) return null;
        const stage = PLANT_STAGES[p.stageIndex];
        let water = p.water - (weather.type === 'heatwave' ? 8 : weather.type === 'rain' ? -6 : 4);
        let nutrients = p.nutrients - (weather.type === 'heatwave' ? 6 : 2);
        let stress = p.stress + (weather.type === 'storm' ? 10 : weather.type === 'heatwave' ? 8 : -2);
        let pests = p.pests + (Math.random() < 0.1 ? 1 : 0);
        water = Math.max(0, Math.min(water, stage.maxWater));
        nutrients = Math.max(0, Math.min(nutrients, stage.maxNutrients));
        stress = Math.max(0, Math.min(stress, 100));
        pests = Math.max(0, pests);

        // Growth
        const rootStrength = p.rootStrength + (water > 10 && nutrients > 20 ? p.growthSpeedMultiplier * 5 : 1);
        const nextStage = PLANT_STAGES[p.stageIndex + 1];
        const stageIndex = nextStage && rootStrength >= nextStage.threshold
          ? p.stageIndex + 1 : p.stageIndex;
        const isHarvestable = stageIndex >= PLANT_STAGES.length - 1;

        return { ...p, water, nutrients, stress, pests, rootStrength, stageIndex, isHarvestable };
      }),
    }));

    return { ...prev, day: prev.day + 1, weather, orchards };
  }

  // ── Actions ──
  const activeOrchard = gs.orchards.find(o => o.id === gs.activeOrchardId)!;

  function updatePlant(fn: (p: Plant) => Plant) {
    if (gs.selectedPlantIndex === null) return;
    setGs(prev => {
      const orchards = prev.orchards.map(o => {
        if (o.id !== prev.activeOrchardId) return o;
        const plants = o.plants.map((p, i) =>
          i === prev.selectedPlantIndex && p ? fn(p) : p
        );
        return { ...o, plants };
      });
      const next = { ...prev, orchards };
      saveState(next);
      return next;
    });
  }

  function handleWater() {
    const plant = activeOrchard.plants[gs.selectedPlantIndex!];
    if (!plant) return notify('Select a plant first.');
    const stage = PLANT_STAGES[plant.stageIndex];
    if (plant.water >= stage.maxWater) return notify('Already fully hydrated!');
    updatePlant(p => ({ ...p, water: Math.min(p.water + 25, PLANT_STAGES[p.stageIndex].maxWater) }));
    notify('💧 Watered!');
  }

  function handleFeed() {
    if (gs.credits < 15) return notify('Not enough credits!');
    const plant = activeOrchard.plants[gs.selectedPlantIndex!];
    if (!plant) return notify('Select a plant first.');
    updatePlant(p => ({ ...p, nutrients: Math.min(p.nutrients + 40, PLANT_STAGES[p.stageIndex].maxNutrients), stress: Math.max(0, p.stress - 5) }));
    setGs(prev => ({ ...prev, credits: prev.credits - 15 }));
    notify('🌿 Fed! -15 credits');
  }

  function handlePestControl() {
    const plant = activeOrchard.plants[gs.selectedPlantIndex!];
    if (!plant) return notify('Select a plant first.');
    if (plant.pests === 0) return notify('No pests detected.');
    if (gs.credits < 15) return notify('Not enough credits!');
    updatePlant(p => ({ ...p, pests: 0 }));
    setGs(prev => ({ ...prev, credits: prev.credits - 15 }));
    notify('🐛 Pests cleared! -15 credits');
  }

  function handleHarvest() {
    const plant = activeOrchard.plants[gs.selectedPlantIndex!];
    if (!plant) return notify('Select a plant first.');
    if (!plant.isHarvestable) return notify('Plant not ready to harvest yet.');
    const reward = Math.floor(100 * plant.yieldMultiplier * (plant.stress < 30 ? 1.2 : 1));
    const seeds = Math.random() < 0.3 ? 1 : 0;
    setGs(prev => {
      const orchards = prev.orchards.map(o => {
        if (o.id !== prev.activeOrchardId) return o;
        const plants = [...o.plants];
        plants[prev.selectedPlantIndex!] = null;
        return { ...o, plants };
      });
      const next = { ...prev, credits: prev.credits + reward, dataSeeds: prev.dataSeeds + seeds, selectedPlantIndex: null, orchards };
      saveState(next);
      return next;
    });
    recordAction('harvest');
    notify(`🌾 Harvested! +${reward} credits${seeds ? ' +1 seed' : ''}`);
  }

  function handlePlant() {
    if (gs.selectedPlantIndex === null) return notify('Select an empty plot first.');
    if (activeOrchard.plants[gs.selectedPlantIndex] !== null) return notify('Plot is occupied.');
    if (gs.dataSeeds < 1) return notify('No data seeds left!');
    const plant = makePlant(selectedType);
    setGs(prev => {
      const orchards = prev.orchards.map(o => {
        if (o.id !== prev.activeOrchardId) return o;
        const plants = [...o.plants];
        plants[prev.selectedPlantIndex!] = plant;
        return { ...o, plants };
      });
      const next = { ...prev, dataSeeds: prev.dataSeeds - 1, orchards };
      saveState(next);
      return next;
    });
    recordAction('planting');
    notify(`🌱 Planted ${selectedType}!`);
  }

  function handleUnlockOrchard(orchardId: string) {
    const orchard = gs.orchards.find(o => o.id === orchardId);
    if (!orchard || orchard.isUnlocked) return;
    if (gs.credits < orchard.unlockCost) return notify(`Need ${orchard.unlockCost} credits.`);
    setGs(prev => {
      const orchards = prev.orchards.map(o =>
        o.id === orchardId ? { ...o, isUnlocked: true } : o
      );
      const next = { ...prev, credits: prev.credits - orchard.unlockCost, orchards };
      saveState(next);
      return next;
    });
    notify(`🔓 ${orchard.name} unlocked!`);
  }

  // ── Weather icon ──
  const WeatherIcon = () => {
    const w = gs.weather;
    if (!w) return null;
    const icons: Record<string, React.ReactNode> = {
      clear: <Sun size={14} className="text-mineral-gold" />,
      rain: <CloudRain size={14} className="text-water-blue" />,
      storm: <Zap size={14} className="text-purple-400" />,
      heatwave: <Flame size={14} className="text-burn-red" />,
      fog: <Sun size={14} className="text-gray-400" />,
    };
    return icons[w.type] ?? null;
  };

  // ── Loading screen ──
  if (authLoading) {
    return (
      <div className="min-h-screen bg-soil-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader size={32} className="text-leaf-green animate-spin" />
          <span className="text-text-secondary text-sm font-mono">Initializing Orchard...</span>
        </div>
      </div>
    );
  }

  // ── Sign-in screen ──
  if (!gs.user) {
    return (
      <div className="min-h-screen bg-soil-dark flex items-center justify-center p-4">
        <div className="hardware-panel p-8 max-w-sm w-full flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-leaf-green/10 flex items-center justify-center">
            <Sprout size={32} className="text-leaf-green" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary">Orchade</h1>
            <p className="text-text-secondary text-sm mt-1">Growth Milestone Engine</p>
          </div>
          <button
            onClick={() => signInWithGoogle().catch(e => notify(e.message))}
            className="w-full py-3 px-6 rounded-xl bg-leaf-green text-soil-dark font-bold text-sm hover:bg-leaf-dark transition-colors flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
            Continue with Google
          </button>
          <p className="text-[10px] text-text-secondary text-center">Your progress is saved to your account.</p>
        </div>
      </div>
    );
  }

  // ── Main game UI ──
  const selectedPlant = gs.selectedPlantIndex !== null ? activeOrchard.plants[gs.selectedPlantIndex] : null;

  return (
    <div className="min-h-screen bg-soil-dark text-text-primary flex flex-col">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-soil-light border border-leaf-green/30 text-text-primary text-sm font-medium px-4 py-2 rounded-xl shadow-lg animate-pulse">
          {notification}
        </div>
      )}

      {/* Header */}
      <header className="hardware-panel mx-3 mt-3 px-4 py-3 flex items-center justify-between rounded-xl">
        <div className="flex items-center gap-2">
          <Sprout size={18} className="text-leaf-green" />
          <span className="font-bold text-sm">Orchade</span>
          <span className="text-[10px] font-mono text-text-secondary ml-1">Day {gs.day}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs">
            <WeatherIcon />
            <span className="text-text-secondary hidden sm:inline">{gs.weather?.name}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-mineral-gold">⬡ {gs.credits}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono">
            <span className="text-leaf-green">🌱 {gs.dataSeeds}</span>
          </div>
          {saving && <Loader size={12} className="text-text-secondary animate-spin" />}
          <button onClick={() => logout()} className="text-text-secondary hover:text-text-primary transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <nav className="flex gap-1 px-3 mt-2">
        {(['orchard', 'lab', 'market', 'rankings', 'profile'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setGs(prev => ({ ...prev, activeTab: tab }))}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors
              ${gs.activeTab === tab ? 'bg-leaf-green text-soil-dark' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {tab === 'orchard' ? <Sprout size={12} className="mx-auto" /> :
             tab === 'lab' ? <FlaskConical size={12} className="mx-auto" /> :
             tab === 'market' ? <ShoppingBag size={12} className="mx-auto" /> :
             tab === 'rankings' ? <Trophy size={12} className="mx-auto" /> :
             <User size={12} className="mx-auto" />}
            <span className="block mt-0.5">{tab}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <motion.main className="flex-1 px-3 py-3 overflow-y-auto pb-6" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>

        {/* ── ORCHARD TAB ── */}
        {gs.activeTab === 'orchard' && (
          <div className="space-y-4">
            {/* Orchard selector */}
            <div className="flex gap-2">
              {gs.orchards.map(o => (
                <button
                  key={o.id}
                  onClick={() => o.isUnlocked
                    ? setGs(prev => ({ ...prev, activeOrchardId: o.id, selectedPlantIndex: null }))
                    : handleUnlockOrchard(o.id)
                  }
                  className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-colors
                    ${o.id === gs.activeOrchardId ? 'bg-leaf-green/20 border border-leaf-green text-leaf-green' :
                      o.isUnlocked ? 'border border-bark-brown text-text-secondary hover:border-leaf-green/40' :
                      'border border-dashed border-bark-brown text-text-secondary/50'}`}
                >
                  {o.isUnlocked ? o.name : `🔒 ${o.unlockCost}⬡`}
                </button>
              ))}
            </div>

            {/* Plant grid */}
            <div className="grid grid-cols-2 gap-3">
              {activeOrchard.plants.map((plant, i) => (
                <PlantCard
                  key={i}
                  plant={plant}
                  index={i}
                  isSelected={gs.selectedPlantIndex === i}
                  onClick={() => setGs(prev => ({ ...prev, selectedPlantIndex: prev.selectedPlantIndex === i ? null : i }))}
                />
              ))}
            </div>

            {/* Action panel */}
            <div className="hardware-panel p-4 space-y-3">
              {selectedPlant ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{selectedPlant.type}</p>
                      <p className="text-[10px] text-text-secondary">{PLANT_STAGES[selectedPlant.stageIndex].name}</p>
                    </div>
                    <div className="flex gap-1">
                      {selectedPlant.pests > 0 && <Bug size={14} className="text-toxic-green" />}
                      {selectedPlant.stress > 50 && <Flame size={14} className="text-burn-red" />}
                      {selectedPlant.isHarvestable && <span className="text-[10px] text-mineral-gold font-bold">READY</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleWater} className="action-btn py-2 px-3 rounded-lg bg-water-blue/10 border border-water-blue/30 text-water-blue text-xs font-bold flex items-center justify-center gap-1 hover:bg-water-blue/20 transition-colors">
                      <Droplets size={12} /> Water
                    </button>
                    <button onClick={handleFeed} className="py-2 px-3 rounded-lg bg-mineral-gold/10 border border-mineral-gold/30 text-mineral-gold text-xs font-bold flex items-center justify-center gap-1 hover:bg-mineral-gold/20 transition-colors">
                      <Sprout size={12} /> Feed (15⬡)
                    </button>
                    <button onClick={handlePestControl} className="py-2 px-3 rounded-lg bg-toxic-green/10 border border-toxic-green/30 text-toxic-green text-xs font-bold flex items-center justify-center gap-1 hover:bg-toxic-green/20 transition-colors">
                      <Bug size={12} /> Pest (15⬡)
                    </button>
                    <button onClick={handleHarvest} disabled={!selectedPlant.isHarvestable}
                      className="py-2 px-3 rounded-lg bg-leaf-green/10 border border-leaf-green/30 text-leaf-green text-xs font-bold flex items-center justify-center gap-1 hover:bg-leaf-green/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      🌾 Harvest
                    </button>
                  </div>
                </>
              ) : gs.selectedPlantIndex !== null && activeOrchard.plants[gs.selectedPlantIndex] === null ? (
                <div className="space-y-3">
                  <p className="text-xs text-text-secondary">Select plant type to seed:</p>
                  <select
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    className="w-full bg-soil-dark border border-bark-brown rounded-lg px-3 py-2 text-sm text-text-primary"
                  >
                    {BASE_PLANT_TYPES.map(t => (
                      <option key={t.name} value={t.name}>{t.name} — {t.description}</option>
                    ))}
                  </select>
                  <button onClick={handlePlant}
                    className="w-full py-2 rounded-lg bg-leaf-green text-soil-dark font-bold text-sm hover:bg-leaf-dark transition-colors flex items-center justify-center gap-2">
                    <Sprout size={14} /> Plant Seed (1🌱)
                  </button>
                </div>
              ) : (
                <p className="text-xs text-text-secondary text-center py-2">Select a plot to get started.</p>
              )}
            </div>
          </div>
        )}

        {/* ── LAB TAB ── */}
        {gs.activeTab === 'lab' && (
          <div className="hardware-panel p-4 space-y-4">
            <h2 className="font-bold text-sm">Genetic Lab</h2>
            <p className="text-text-secondary text-xs">Breed two plants to create a hybrid with combined traits. Costs {BREEDING_COST} credits. Mutation chance: {MUTATION_CHANCE * 100}%.</p>
            <div className="text-text-secondary text-xs text-center py-8 dashed-border rounded-xl">
              Plant a full orchard to unlock breeding.
            </div>
            <button
              onClick={() => {
                recordAction('research');
                notify('🔬 Research logged to the Personality Vector Engine.');
              }}
              className="w-full py-2 rounded-lg bg-water-blue/10 border border-water-blue/30 text-water-blue text-xs font-bold hover:bg-water-blue/20 transition-colors"
            >
              Run Research Cycle
            </button>
          </div>
        )}

        {/* ── MARKET TAB ── */}
        {gs.activeTab === 'market' && (
          <div className="space-y-4">
            <MarketView />
            <div className="space-y-3">
              <h2 className="font-bold text-sm px-1">Supply Actions</h2>
              {SHOP_ITEMS.map(item => (
                <div key={item.id} className="hardware-panel p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{item.name}</p>
                    <p className="text-[10px] text-text-secondary capitalize">{item.type}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (gs.credits < item.cost) return notify('Not enough credits.');
                      if (!selectedPlant) return notify('Select a plant first.');
                      updatePlant(p => ({
                        ...p,
                        nutrients: item.nut ? Math.min(p.nutrients + item.nut, PLANT_STAGES[p.stageIndex].maxNutrients) : p.nutrients,
                        stress: item.stress ? Math.max(0, p.stress + item.stress) : p.stress,
                        pests: item.kills ? Math.max(0, p.pests - item.kills) : p.pests,
                      }));
                      setGs(prev => ({ ...prev, credits: prev.credits - item.cost }));
                      recordAction('exchange');
                      notify(`✅ Used ${item.name}! -${item.cost}⬡`);
                    }}
                    className="py-1.5 px-4 rounded-lg bg-leaf-green/10 border border-leaf-green/30 text-leaf-green text-xs font-bold hover:bg-leaf-green/20 transition-colors"
                  >
                    {item.cost}⬡
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ── RANKINGS TAB ── */}
        {gs.activeTab === 'rankings' && (
          <div className="hardware-panel p-4 text-center space-y-3">
            <Trophy size={32} className="text-mineral-gold mx-auto" />
            <h2 className="font-bold">Leaderboards</h2>
            <p className="text-text-secondary text-xs">Global rankings coming in the next update.</p>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {gs.activeTab === 'profile' && (
          <div className="space-y-3">
            <div className="hardware-panel p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-leaf-green/20 flex items-center justify-center">
                <User size={24} className="text-leaf-green" />
              </div>
              <div>
                <p className="font-bold">{gs.user?.displayName ?? 'Gardener'}</p>
                <p className="text-text-secondary text-xs">{gs.user?.email}</p>
              </div>
            </div>
            <div className="hardware-panel p-4 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-lg font-bold text-mineral-gold">{gs.credits}</p><p className="text-[10px] text-text-secondary">Credits</p></div>
              <div><p className="text-lg font-bold text-leaf-green">{gs.dataSeeds}</p><p className="text-[10px] text-text-secondary">Seeds</p></div>
              <div><p className="text-lg font-bold text-water-blue">{gs.day}</p><p className="text-[10px] text-text-secondary">Days</p></div>
            </div>
            <div className="hardware-panel p-4 space-y-2">
              <p className="text-xs font-bold">World Map — Personality Vector</p>
              <p className="text-[10px] text-text-secondary">Dominant archetype: {dominantQuadrant(vector)}</p>
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center gap-2"><span className="w-20">Patel</span><div className="flex-1 h-2 bg-soil-dark rounded"><div className="h-2 bg-leaf-green rounded" style={{ width: `${Math.round(vector.patel * 100)}%` }} /></div><span>{Math.round(vector.patel * 100)}%</span></div>
                <div className="flex items-center gap-2"><span className="w-20">Socrates</span><div className="flex-1 h-2 bg-soil-dark rounded"><div className="h-2 bg-water-blue rounded" style={{ width: `${Math.round(vector.socrates * 100)}%` }} /></div><span>{Math.round(vector.socrates * 100)}%</span></div>
                <div className="flex items-center gap-2"><span className="w-20">Singh</span><div className="flex-1 h-2 bg-soil-dark rounded"><div className="h-2 bg-mineral-gold rounded" style={{ width: `${Math.round(vector.singh * 100)}%` }} /></div><span>{Math.round(vector.singh * 100)}%</span></div>
              </div>
              {identityHash && <p className="text-[10px] text-text-secondary break-all">Sovereign Identity: {identityHash}</p>}
            </div>
            <button onClick={() => logout()} className="w-full py-2 rounded-lg border border-burn-red/30 text-burn-red text-sm font-bold hover:bg-burn-red/10 transition-colors">
              Sign Out
            </button>
          </div>
        )}
      </motion.main>
    </div>
  );
}
