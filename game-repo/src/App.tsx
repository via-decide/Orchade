import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Plant, GlobalUpgrades, Orchard, Tool, Weather } from './types';
import { PLANT_STAGES, INITIAL_UPGRADES, SHOP_ITEMS, INITIAL_TOOLS, getRandomWeather, BASE_PLANT_TYPES } from './constants';
import PlantCard from './components/PlantCard';
import PlantVisualizer from './components/PlantVisualizer';
import { 
  Sprout, 
  FlaskConical, 
  Store, 
  Droplets, 
  Zap, 
  Bug, 
  Flame, 
  TrendingUp, 
  ArrowUpCircle,
  RefreshCw,
  Database,
  Send,
  User,
  LogOut,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Wrench,
  Cpu,
  Library,
  BookOpen,
  Trophy,
  Sun,
  CloudRain,
  CloudLightning,
  Thermometer,
  Cloud,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  doc, 
  setDoc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  increment,
  writeBatch,
  orderBy,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorData;
      try {
        errorData = JSON.parse(this.state.error.message);
      } catch (e) {
        errorData = { error: this.state.error.message };
      }

      return (
        <div className="min-h-screen bg-soil-dark flex items-center justify-center p-6">
          <div className="hardware-panel max-w-lg w-full p-8 space-y-6 border-burn-red/50">
            <div className="flex items-center gap-3 text-burn-red">
              <AlertCircle size={32} />
              <h2 className="text-xl font-bold uppercase tracking-tight">System Critical Error</h2>
            </div>
            <div className="bg-black/40 p-4 rounded-lg font-mono text-xs space-y-2 overflow-auto max-h-64">
              <p className="text-burn-red font-bold">Error: {errorData.error || 'Unknown'}</p>
              {errorData.operationType && <p>Operation: {errorData.operationType}</p>}
              {errorData.path && <p>Path: {errorData.path}</p>}
              {errorData.authInfo && (
                <div className="pt-2 border-t border-bark-brown/30">
                  <p className="text-text-secondary">Auth Context:</p>
                  <p>UID: {errorData.authInfo.userId || 'Not Logged In'}</p>
                  <p>Email: {errorData.authInfo.email || 'N/A'}</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-bark-brown/20 hover:bg-bark-brown/40 text-text-primary font-bold py-3 rounded-xl border border-bark-brown transition-all"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    day: 1,
    credits: 100,
    dataSeeds: 0,
    orchards: [
      {
        id: 'orchard-1',
        name: 'Primary Orchard',
        plants: Array(9).fill(null),
        isUnlocked: true,
        unlockCost: 0,
      },
      {
        id: 'orchard-2',
        name: 'Highland Ridge',
        plants: Array(9).fill(null),
        isUnlocked: false,
        unlockCost: 250,
      },
      {
        id: 'orchard-3',
        name: 'Deep Valley',
        plants: Array(9).fill(null),
        isUnlocked: false,
        unlockCost: 750,
      }
    ],
    activeOrchardId: 'orchard-1',
    selectedPlantIndex: null,
    upgrades: INITIAL_UPGRADES,
    tools: INITIAL_TOOLS,
    activeTab: 'orchard',
    weather: getRandomWeather(),
    user: null,
    isAuthReady: false,
    lastToolEffect: null,
    discoveredTypes: [],
  });

  const [logs, setLogs] = useState<{ msg: string; type: string }[]>([]);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [breedingParents, setBreedingParents] = useState<number[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const lastActivityRef = React.useRef(Date.now());

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const addLog = useCallback((msg: string, type: string = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 20));
  }, []);

  // Auto-save timer (2 minutes of inactivity)
  useEffect(() => {
    if (!state.user?.uid) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current >= 120000) { // 2 minutes
        console.log('Auto-saving due to inactivity...');
        saveState({
          day: state.day,
          credits: state.credits,
          dataSeeds: state.dataSeeds,
          orchards: state.orchards,
          upgrades: state.upgrades,
          tools: state.tools,
          weather: state.weather,
          discoveredTypes: state.discoveredTypes,
        });
        updateActivity(); // Reset timer after save
        addLog('Game auto-saved (inactivity).', 'system');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [state.user?.uid, state.day, state.credits, state.dataSeeds, state.orchards, state.upgrades, state.tools, updateActivity]);

  const handleLogin = async () => {
    setIsLoginLoading(true);
    addLog('Initiating Google Login...', 'system');
    try {
      await signInWithGoogle();
      addLog('Login popup completed.', 'system');
    } catch (error: any) {
      addLog(`Login failed: ${error.message}`, 'danger');
      console.error('Login error:', error);
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Auth Timeout Check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!state.isAuthReady) {
        console.warn('Auth: Initialization timeout reached.');
        addLog('Auth initialization is taking longer than expected. Please check your connection or popup blockers.', 'danger');
        // Fallback: Set isAuthReady to true so the user can see the Auth Overlay and logs
        setState(prev => ({ ...prev, isAuthReady: true }));
      }
    }, 10000); // 10 seconds
    return () => clearTimeout(timer);
  }, [state.isAuthReady, addLog]);

  // Auth Listener
  useEffect(() => {
    console.log('App: Initializing Auth Listener with project:', firebaseConfig.projectId);
    addLog('Initializing Auth Listener...', 'system');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('App: Auth state changed', user ? user.uid : 'No user');
      if (user) {
        addLog(`Auth state changed: User ${user.uid} detected.`, 'system');
        setState(prev => ({
          ...prev,
          user: {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            role: user.email === 'via.decide@gmail.com' ? 'admin' : 'player'
          },
          isAuthReady: true
        }));
      } else {
        addLog('Auth state changed: No user detected.', 'system');
        setState(prev => ({ ...prev, user: null, isAuthReady: true }));
      }
    }, (error) => {
      console.error('App: Auth state error', error);
      addLog(`Auth error: ${error.message}`, 'danger');
      setState(prev => ({ ...prev, isAuthReady: true }));
    });
    return () => unsubscribe();
  }, [addLog]);

  // Firestore Sync
  useEffect(() => {
    if (!state.user?.uid) return;

    const userDocRef = doc(db, 'users', state.user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        addLog(`Synchronized data for ${data.displayName || 'User'}`, 'system');
        setState(prev => ({
          ...prev,
          day: data.day ?? prev.day,
          credits: data.credits ?? prev.credits,
          dataSeeds: data.dataSeeds ?? prev.dataSeeds,
          orchards: data.orchards ?? prev.orchards,
          upgrades: data.upgrades ?? prev.upgrades,
          tools: data.tools ?? prev.tools,
          weather: data.weather ?? prev.weather,
          discoveredTypes: data.discoveredTypes ?? prev.discoveredTypes,
          user: prev.user ? { ...prev.user, role: data.role || (prev.user.email === 'via.decide@gmail.com' ? 'admin' : 'player') } : null
        }));
      } else {
        // Initialize new user document
        const initialState = {
          uid: state.user!.uid,
          displayName: state.user!.displayName,
          email: state.user!.email,
          credits: 100,
          dataSeeds: 0,
          day: 1,
          upgrades: INITIAL_UPGRADES,
          tools: INITIAL_TOOLS,
          orchards: state.orchards,
          weather: state.weather,
          role: state.user!.email === 'via.decide@gmail.com' ? 'admin' : 'player',
          discoveredTypes: [],
          createdAt: serverTimestamp()
        };
        setDoc(userDocRef, initialState).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${state.user!.uid}`));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${state.user!.uid}`));

    return () => unsubscribe();
  }, [state.user?.uid]);

  const saveState = async (updates: Partial<GameState>) => {
    if (!state.user?.uid) return;
    updateActivity();
    const userDocRef = doc(db, 'users', state.user.uid);
    try {
      await updateDoc(userDocRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${state.user.uid}`);
    }
  };

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    setIsLeaderboardLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('credits', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeaderboard(data);
    } catch (e) {
      console.error('Leaderboard fetch error:', e);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (state.activeTab === 'archives') {
      fetchLeaderboard();
    }
  }, [state.activeTab]);

  const handleSellDataSeeds = () => {
    if (state.dataSeeds < 10) {
      addLog('Need at least 10 🧬 to sell.', 'warn');
      return;
    }
    setState(prev => {
      const nextState = { ...prev, dataSeeds: prev.dataSeeds - 10, credits: prev.credits + 50 };
      saveState({ dataSeeds: prev.dataSeeds - 10, credits: prev.credits + 50 });
      return nextState;
    });
    addLog('Sold 10 🧬 for 50 🪙.', 'success');
  };

  const handleTransferCredits = async () => {
    if (!state.user?.uid || !transferTarget || !transferAmount) return;
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      addLog('Invalid transfer amount.', 'danger');
      return;
    }
    if (amount > state.credits) {
      addLog('Insufficient credits for transfer.', 'danger');
      return;
    }
    if (transferTarget === state.user.uid) {
      addLog('Cannot transfer to yourself.', 'warn');
      return;
    }

    setIsTransferring(true);
    try {
      // Find target user
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', transferTarget));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        addLog('Target User ID not found.', 'danger');
        setIsTransferring(false);
        return;
      }

      const targetDoc = querySnapshot.docs[0];
      const batch = writeBatch(db);

      // Deduct from sender
      batch.update(doc(db, 'users', state.user.uid), {
        credits: increment(-amount)
      });

      // Add to receiver
      batch.update(targetDoc.ref, {
        credits: increment(amount)
      });

      // Log transfer
      batch.set(doc(collection(db, 'transfers')), {
        from: state.user.uid,
        to: transferTarget,
        amount,
        timestamp: serverTimestamp()
      });

      await batch.commit();
      addLog(`Successfully transferred ${amount} credits to ${targetDoc.data().displayName || 'User'}.`, 'success');
      setTransferTarget('');
      setTransferAmount('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'transfers');
    } finally {
      setIsTransferring(false);
    }
  };

  const activeOrchard = state.orchards.find(o => o.id === state.activeOrchardId)!;
  const selectedPlant = state.selectedPlantIndex !== null ? activeOrchard.plants[state.selectedPlantIndex] : null;

  const buyTool = (id: string) => {
    const toolIndex = state.tools.findIndex(t => t.id === id);
    if (toolIndex === -1) return;
    const tool = state.tools[toolIndex];
    
    if (tool.level >= tool.maxLevel && tool.maxLevel > 0) {
      addLog(`${tool.name} is already at maximum level.`, 'warn');
      return;
    }

    const cost = Math.round(tool.baseCost * Math.pow(tool.costMultiplier, tool.level));
    if (state.credits < cost) {
      addLog(`Insufficient credits for ${tool.name} acquisition. Need ${cost}🪙.`, 'danger');
      return;
    }

    setState(prev => {
      const newTools = [...prev.tools];
      newTools[toolIndex] = { ...tool, level: tool.level + 1 };
      const nextState = {
        ...prev,
        credits: prev.credits - cost,
        tools: newTools
      };
      saveState({ credits: prev.credits - cost, tools: newTools });
      return nextState;
    });
    addLog(`${tool.name} ${tool.type === 'active' ? 'acquired' : 'upgraded to level ' + (tool.level + 1)}!`, 'success');
  };

  const useActiveTool = (id: string) => {
    const toolIndex = state.tools.findIndex(t => t.id === id);
    if (toolIndex === -1) return;
    const tool = state.tools[toolIndex];

    if (tool.level === 0) {
      addLog(`You must acquire the ${tool.name} first.`, 'warn');
      return;
    }

    if ((tool.currentCooldown || 0) > 0) {
      addLog(`${tool.name} is on cooldown for ${tool.currentCooldown} more cycles.`, 'warn');
      return;
    }

    setState(prev => {
      const newTools = [...prev.tools];
      newTools[toolIndex] = { ...tool, currentCooldown: tool.activeCooldown };
      
      let newOrchards = [...prev.orchards];
      let credits = prev.credits;
      let dataSeeds = prev.dataSeeds;

      if (id === 'pest-repellent-pulse') {
        // Clear all pests in current orchard
        const orchardIndex = newOrchards.findIndex(o => o.id === prev.activeOrchardId);
        const orchard = { ...newOrchards[orchardIndex] };
        orchard.plants = orchard.plants.map(p => p ? { ...p, pests: 0, pestImmunity: 3 } : null);
        newOrchards[orchardIndex] = orchard;
        addLog('Pest Repellent Pulse activated! All pests cleared and immunity granted for 3 cycles.', 'success');
      }

      if (id === 'genetic-scanner') {
        // This effect will be checked in buyPlot
        addLog('Genetic Scanner active! Next plot seeded will have significantly higher rarity chance.', 'success');
      }

      if (id === 'pruning-shears') {
        const orchardIndex = newOrchards.findIndex(o => o.id === prev.activeOrchardId);
        const orchard = { ...newOrchards[orchardIndex] };
        orchard.plants = orchard.plants.map(p => p ? { ...p, stress: Math.max(0, p.stress - 50) } : null);
        newOrchards[orchardIndex] = orchard;
        addLog('Nanotech Pruning Shears used! All plants in the current orchard have significantly reduced stress.', 'success');
      }

      const nextState = {
        ...prev,
        tools: newTools,
        orchards: newOrchards,
        lastToolEffect: id
      };
      
      saveState({ tools: newTools, orchards: newOrchards });
      
      // Reset effect after 2 seconds
      setTimeout(() => {
        setState(p => ({ ...p, lastToolEffect: null }));
      }, 2000);

      return nextState;
    });
  };

  const getToolBonus = (toolId: string) => {
    const tool = state.tools.find(t => t.id === toolId);
    if (!tool || tool.level === 0) return 0;
    return tool.level * tool.bonusValue;
  };

  const handlePlantAction = (action: 'research' | 'water' | 'fertilize' | 'pesticide' | 'harvest') => {
    if (state.selectedPlantIndex === null || !selectedPlant) return;

    setState(prev => {
      const newOrchards = [...prev.orchards];
      const orchardIndex = newOrchards.findIndex(o => o.id === prev.activeOrchardId);
      const orchard = { ...newOrchards[orchardIndex] };
      const newPlants = [...orchard.plants];
      const plant = { ...newPlants[prev.selectedPlantIndex!]! };
      let credits = prev.credits;
      let dataSeeds = prev.dataSeeds;

      // Tool Bonuses
      const stressReduction = getToolBonus('stress-monitor');
      const creditBonus = getToolBonus('data-extractor');

      if (action === 'harvest') {
        if (!plant.isHarvestable) return prev;
        
        const reward = Math.round((500 + (plant.rootStrength * 2)) * (plant.yieldMultiplier || 1));
        credits += reward;
        dataSeeds += 20;
        
        addLog(`Harvested ${plant.type}! Gained ${reward} credits and 20 genetic data.`, 'success');
        
        // Reset plot
        newPlants[prev.selectedPlantIndex!] = null;
        orchard.plants = newPlants;
        newOrchards[orchardIndex] = orchard;
        
        const nextState = { ...prev, orchards: newOrchards, credits, dataSeeds, selectedPlantIndex: null };
        saveState({ orchards: newOrchards, credits, dataSeeds });
        return nextState;
      }

      if (action === 'research') {
        if (plant.water < 5) {
          addLog('Insufficient water for research.', 'warn');
          return prev;
        }
        
        const baseG = Math.floor(Math.random() * 8) + 5;
        const finalG = Math.max(1, Math.round(baseG * (plant.nutrients / 100) * (plant.growthSpeedMultiplier || 1)));
        
        plant.rootStrength += finalG;
        plant.water -= 5;
        plant.nutrients -= 10;
        plant.stress += Math.max(0, 5 - stressReduction);
        credits += (10 + creditBonus);
        
        // Check evolution
        let nextStage = 0;
        for (let i = 0; i < PLANT_STAGES.length; i++) {
          if (plant.rootStrength >= PLANT_STAGES[i].threshold) nextStage = i;
        }
        
        if (nextStage > plant.stageIndex) {
          plant.stageIndex = nextStage;
          addLog(`Evolution! ${plant.type} reached stage: ${PLANT_STAGES[nextStage].name}`, 'success');
          dataSeeds += 5;
          
          // Mark as harvestable at final stage
          if (nextStage === PLANT_STAGES.length - 1) {
            plant.isHarvestable = true;
          }
        }

        // Pest chance
        const pestDefenseBonus = getToolBonus('pest-control');
        const basePestChance = 0.15;
        const finalPestChance = basePestChance * (1 - pestDefenseBonus);
        
        if (plant.pestImmunity === 0 && Math.random() < finalPestChance) {
          plant.pests = Math.min(5, plant.pests + 1);
          addLog('Warning: Pest infestation detected!', 'danger');
        }

        addLog(`Research complete: +${finalG} roots, +${10 + creditBonus} credits.`, 'success');
      }

      if (action === 'water') {
        const stage = PLANT_STAGES[plant.stageIndex];
        const waterBonus = getToolBonus('watering-can');
        const waterGain = Math.round(20 * (1 + waterBonus));
        
        plant.water = Math.min(stage.maxWater, plant.water + waterGain);
        plant.stress = Math.max(0, plant.stress - 5);
        addLog(`Hydration levels increased by ${waterGain}.`, 'info');
        
        // Trigger visual effect
        const nextState = { ...prev, orchards: newOrchards, credits, dataSeeds, lastToolEffect: 'water' };
        saveState({ orchards: newOrchards, credits, dataSeeds });
        setTimeout(() => setState(p => ({ ...p, lastToolEffect: null })), 1000);
        return nextState;
      }

      if (action === 'fertilize' || action === 'pesticide') {
        // These are items, but we can add effects too
        const nextState = { ...prev, orchards: newOrchards, credits, dataSeeds, lastToolEffect: action };
        saveState({ orchards: newOrchards, credits, dataSeeds });
        setTimeout(() => setState(p => ({ ...p, lastToolEffect: null })), 1000);
        return nextState;
      }

      newPlants[prev.selectedPlantIndex!] = plant;
      orchard.plants = newPlants;
      newOrchards[orchardIndex] = orchard;
      
      const nextState = { ...prev, orchards: newOrchards, credits, dataSeeds };
      saveState({ orchards: newOrchards, credits, dataSeeds });
      return nextState;
    });
  };

  const nextDay = () => {
    setState(prev => {
      const nutrientBonus = getToolBonus('soil-tester');
      const newWeather = getRandomWeather();
      
      // Update tool cooldowns
      const newTools = prev.tools.map(t => ({
        ...t,
        currentCooldown: Math.max(0, (t.currentCooldown || 0) - 1)
      }));

      const newOrchards = prev.orchards.map(o => {
        if (!o.isUnlocked) return o;
        const newPlants = o.plants.map(p => {
          if (!p) return null;
          const plant = { ...p };
          
          // Weather Effects (Apply current weather effects before changing to new)
          const weather = prev.weather;
          if (weather.type === 'rain') {
            plant.water = Math.min(PLANT_STAGES[plant.stageIndex].maxWater, plant.water + (15 * weather.intensity));
            plant.stress = Math.max(0, plant.stress - 10);
          } else if (weather.type === 'storm') {
            plant.water = Math.min(PLANT_STAGES[plant.stageIndex].maxWater, plant.water + (30 * weather.intensity));
            plant.stress += (15 * weather.intensity);
          } else if (weather.type === 'heatwave') {
            plant.nutrients = Math.max(0, plant.nutrients - (20 * weather.intensity));
            plant.stress += (25 * weather.intensity);
            plant.water = Math.max(0, plant.water - (20 * weather.intensity));
          } else if (weather.type === 'fog') {
            plant.water = Math.min(PLANT_STAGES[plant.stageIndex].maxWater, plant.water + 5);
            plant.stress = Math.max(0, plant.stress - 5);
          } else if (weather.type === 'clear') {
            plant.nutrients = Math.min(PLANT_STAGES[plant.stageIndex].maxNutrients, plant.nutrients + 5);
            plant.stress = Math.max(0, plant.stress - 15);
          }

          // Overnight effects
          if (plant.pests > 0) {
            const pestDrain = (plant.pests * 10) * (1 - nutrientBonus);
            plant.nutrients = Math.max(0, plant.nutrients - pestDrain);
            plant.stress += (plant.pests * 5);
          } else {
            plant.stress = Math.max(0, plant.stress - 20);
          }

          if (plant.pestImmunity > 0) plant.pestImmunity--;
          
          // Check for crop burn
          if (plant.stress >= 100) {
            addLog(`CRITICAL: ${plant.type} in ${o.name} suffered crop burn!`, 'danger');
            plant.rootStrength = Math.max(0, plant.rootStrength - 50);
            plant.stress = 0;
            // Recalculate stage
            let nextStage = 0;
            for (let i = 0; i < PLANT_STAGES.length; i++) {
              if (plant.rootStrength >= PLANT_STAGES[i].threshold) nextStage = i;
            }
            plant.stageIndex = nextStage;
          }

          return plant;
        });
        return { ...o, plants: newPlants };
      });

      addLog(`Day ${prev.day + 1} started. Weather shifted to ${newWeather.name}.`, 'system');
      const nextState = { ...prev, day: prev.day + 1, orchards: newOrchards, weather: newWeather };
      saveState({ day: prev.day + 1, orchards: newOrchards, weather: newWeather });
      return nextState;
    });
  };

  const buyPlot = (index: number) => {
    if (state.credits < 50) {
      addLog('Insufficient credits to clear plot.', 'danger');
      return;
    }
    setState(prev => {
      const newOrchards = [...prev.orchards];
      const orchardIndex = newOrchards.findIndex(o => o.id === prev.activeOrchardId);
      const orchard = { ...newOrchards[orchardIndex] };
      const newPlants = [...orchard.plants];
      
      const randomType = BASE_PLANT_TYPES[Math.floor(Math.random() * BASE_PLANT_TYPES.length)];
      
      // Check for Genetic Scanner effect
      const scannerActive = prev.tools.find(t => t.id === 'genetic-scanner' && (t.currentCooldown || 0) === t.activeCooldown);
      let rarity: Plant['rarity'] = 'Common';
      const roll = Math.random();
      const bonus = scannerActive ? 0.3 : 0;

      if (roll < 0.02 + bonus/10) rarity = 'Legendary';
      else if (roll < 0.08 + bonus/5) rarity = 'Epic';
      else if (roll < 0.2 + bonus/2) rarity = 'Rare';
      else if (roll < 0.4 + bonus) rarity = 'Uncommon';

      newPlants[index] = {
        id: Math.random().toString(36).substr(2, 9),
        type: randomType.name,
        rootStrength: 0,
        water: 30,
        nutrients: 100,
        stress: 0,
        pests: 0,
        pestImmunity: 0,
        stageIndex: 0,
        isHarvestable: false,
        rarity,
        growthSpeedMultiplier: randomType.baseGrowthSpeed,
        yieldMultiplier: randomType.baseYield,
        color: randomType.color,
      };
      orchard.plants = newPlants;
      newOrchards[orchardIndex] = orchard;
      const newDiscovered = prev.discoveredTypes.includes(randomType.name) 
        ? prev.discoveredTypes 
        : [...prev.discoveredTypes, randomType.name];
      const nextState = { ...prev, orchards: newOrchards, credits: prev.credits - 50, selectedPlantIndex: index, discoveredTypes: newDiscovered };
      saveState({ orchards: newOrchards, credits: prev.credits - 50, discoveredTypes: newDiscovered });
      return nextState;
    });
    addLog('New plot cleared and seeded.', 'success');
  };

  const unlockOrchard = (id: string) => {
    const orchard = state.orchards.find(o => o.id === id);
    if (!orchard) return;
    if (state.credits < orchard.unlockCost) {
      addLog(`Need ${orchard.unlockCost} credits to unlock ${orchard.name}.`, 'danger');
      return;
    }
    setState(prev => {
      const nextOrchards = prev.orchards.map(o => o.id === id ? { ...o, isUnlocked: true } : o);
      const nextState = {
        ...prev,
        credits: prev.credits - orchard.unlockCost,
        orchards: nextOrchards,
        activeOrchardId: id,
        selectedPlantIndex: null
      };
      saveState({ credits: prev.credits - orchard.unlockCost, orchards: nextOrchards });
      return nextState;
    });
    addLog(`${orchard.name} discovered and unlocked!`, 'success');
  };

  const buyUpgrade = (id: keyof GlobalUpgrades) => {
    const cost = 10;
    if (state.dataSeeds < cost) {
      addLog('Insufficient genetic data for upgrade.', 'danger');
      return;
    }
    setState(prev => {
      const nextUpgrades = {
        ...prev.upgrades,
        [id]: id === 'stressResistance' 
          ? (prev.upgrades[id] as number) + 5 
          : (prev.upgrades[id] as number) * 0.9
      };
      const nextState = {
        ...prev,
        dataSeeds: prev.dataSeeds - cost,
        upgrades: nextUpgrades
      };
      saveState({ dataSeeds: prev.dataSeeds - cost, upgrades: nextUpgrades });
      return nextState;
    });
    addLog(`Upgrade acquired: ${id} enhanced.`, 'success');
  };

  const handleCrossPollinate = () => {
    if (breedingParents.length !== 2) return;
    if (state.credits < 100) {
      addLog('Insufficient credits for cross-pollination. Need 100🪙.', 'danger');
      return;
    }

    const p1 = activeOrchard.plants[breedingParents[0]]!;
    const p2 = activeOrchard.plants[breedingParents[1]]!;

    if (p1.stageIndex < 4 || p2.stageIndex < 4) {
      addLog('Only mature plants can be cross-pollinated.', 'warn');
      return;
    }

    setState(prev => {
      const newOrchards = [...prev.orchards];
      const orchardIndex = newOrchards.findIndex(o => o.id === prev.activeOrchardId);
      const orchard = { ...newOrchards[orchardIndex] };
      const newPlants = [...orchard.plants];
      
      // Find empty slot
      const emptySlot = newPlants.findIndex(p => p === null);
      if (emptySlot === -1) {
        addLog('No empty plots available for the hybrid offspring.', 'danger');
        return prev;
      }

      // Breeding Logic
      const rarities: Plant['rarity'][] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
      const p1RarityIdx = rarities.indexOf(p1.rarity);
      const p2RarityIdx = rarities.indexOf(p2.rarity);
      
      let newRarityIdx = Math.floor((p1RarityIdx + p2RarityIdx) / 2);
      if (Math.random() < 0.2) newRarityIdx = Math.min(rarities.length - 1, newRarityIdx + 1);
      
      const blendColors = (c1: string, c2: string) => {
        try {
          const r1 = parseInt(c1.slice(1, 3), 16);
          const g1 = parseInt(c1.slice(3, 5), 16);
          const b1 = parseInt(c1.slice(5, 7), 16);
          const r2 = parseInt(c2.slice(1, 3), 16);
          const g2 = parseInt(c2.slice(3, 5), 16);
          const b2 = parseInt(c2.slice(5, 7), 16);
          const r = Math.floor((r1 + r2) / 2).toString(16).padStart(2, '0');
          const g = Math.floor((g1 + g2) / 2).toString(16).padStart(2, '0');
          const b = Math.floor((b1 + b2) / 2).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        } catch (e) {
          return '#4CAF50';
        }
      };

      const p1Name = p1.type.includes('Hybrid') ? p1.type.split(' ')[1] : p1.type;
      const p2Name = p2.type.includes('Hybrid') ? p2.type.split(' ')[1] : p2.type;
      const hybridName = `Hybrid ${p1Name.split('-')[0]}-${p2Name.split('-')[0]}`;

      const newPlant: Plant = {
        id: Math.random().toString(36).substr(2, 9),
        type: hybridName,
        rootStrength: 0,
        water: 50,
        nutrients: 100,
        stress: 0,
        pests: 0,
        pestImmunity: 0,
        stageIndex: 0,
        isHarvestable: false,
        rarity: rarities[newRarityIdx],
        growthSpeedMultiplier: (p1.growthSpeedMultiplier + p2.growthSpeedMultiplier) / 2 * (1 + (Math.random() * 0.3 - 0.15)),
        yieldMultiplier: (p1.yieldMultiplier + p2.yieldMultiplier) / 2 * (1 + (Math.random() * 0.3 - 0.15)),
        color: blendColors(p1.color || '#4CAF50', p2.color || '#4CAF50'),
      };

      newPlants[emptySlot] = newPlant;
      orchard.plants = newPlants;
      newOrchards[orchardIndex] = orchard;

      const newDiscovered = prev.discoveredTypes.includes(newPlant.type) 
        ? prev.discoveredTypes 
        : [...prev.discoveredTypes, newPlant.type];

      const nextState = {
        ...prev,
        credits: prev.credits - 100,
        orchards: newOrchards,
        breedingParents: [],
        discoveredTypes: newDiscovered
      };
      saveState({ credits: prev.credits - 100, orchards: newOrchards, discoveredTypes: newDiscovered });
      setBreedingParents([]);
      addLog(`Success! A new ${newPlant.rarity} hybrid has been created.`, 'success');
      return nextState;
    });
  };

  const buyItem = (item: typeof SHOP_ITEMS[0]) => {
    if (state.credits < item.cost) {
      addLog(`Insufficient credits for ${item.name}.`, 'danger');
      return;
    }
    if (state.selectedPlantIndex === null || !selectedPlant) {
      addLog('Select a plant to apply items.', 'warn');
      return;
    }

    setState(prev => {
      const newOrchards = [...prev.orchards];
      const orchardIndex = newOrchards.findIndex(o => o.id === prev.activeOrchardId);
      const orchard = { ...newOrchards[orchardIndex] };
      const newPlants = [...orchard.plants];
      const plant = { ...newPlants[prev.selectedPlantIndex!]! };
      
      if (item.type === 'fertilizer') {
        plant.nutrients = Math.min(PLANT_STAGES[plant.stageIndex].maxNutrients, plant.nutrients + (item.nut || 0));
        plant.stress += (item.stress || 0);
      } else if (item.type === 'pesticide') {
        plant.pests = Math.max(0, plant.pests - (item.kills || 0));
        plant.stress += (item.stress || 0);
      }

      newPlants[prev.selectedPlantIndex!] = plant;
      orchard.plants = newPlants;
      newOrchards[orchardIndex] = orchard;
      const nextState = { ...prev, orchards: newOrchards, credits: prev.credits - item.cost };
      saveState({ orchards: newOrchards, credits: prev.credits - item.cost });
      return nextState;
    });
    addLog(`Applied ${item.name} to ${selectedPlant.type}.`, 'success');
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center gap-6 max-w-6xl mx-auto">
      {/* Header Stats */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center hardware-panel p-4 px-6 md:px-8 gap-4">
        <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Temporal Cycle</span>
            <span className="text-lg md:text-xl font-mono font-bold text-leaf-green">DAY {state.day}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Liquid Capital</span>
            <span className="text-lg md:text-xl font-mono font-bold text-mineral-gold">{state.credits} 🪙</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Genetic Data</span>
            <span className="text-lg md:text-xl font-mono font-bold text-water-blue">{state.dataSeeds} 🧬</span>
          </div>
          
          {/* Weather Indicator */}
          <div className="flex items-center gap-3 px-4 py-1 bg-black/20 rounded-xl border border-bark-brown/30 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div 
                key={state.weather.type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex items-center gap-3"
              >
                <div className={`p-2 rounded-lg ${
                  state.weather.type === 'clear' ? 'text-mineral-gold bg-mineral-gold/10' :
                  state.weather.type === 'rain' ? 'text-water-blue bg-water-blue/10' :
                  state.weather.type === 'storm' ? 'text-violet-400 bg-violet-400/10' :
                  state.weather.type === 'heatwave' ? 'text-burn-red bg-burn-red/10' :
                  'text-text-secondary bg-text-secondary/10'
                }`}>
                  {state.weather.type === 'clear' && <Sun size={20} />}
                  {state.weather.type === 'rain' && <CloudRain size={20} />}
                  {state.weather.type === 'storm' && <CloudLightning size={20} />}
                  {state.weather.type === 'heatwave' && <Thermometer size={20} />}
                  {state.weather.type === 'fog' && <Cloud size={20} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Atmosphere</span>
                  <span className="text-xs font-bold uppercase">{state.weather.name}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {state.user && (
            <button 
              onClick={logout}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-burn-red/10 hover:bg-burn-red/20 px-4 py-2 rounded-lg border border-burn-red/30 transition-all text-[10px] font-bold text-burn-red uppercase tracking-widest"
            >
              <LogOut size={14} />
              LOGOUT
            </button>
          )}
          <button 
            onClick={nextDay}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-bark-brown/20 hover:bg-bark-brown/40 px-6 py-2 rounded-lg border border-bark-brown transition-all text-sm font-bold"
          >
            <RefreshCw size={16} />
            END CYCLE
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Rail */}
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-3 md:gap-4 overflow-x-auto pb-2 lg:pb-0">
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'orchard' }))}
            className={`flex-1 lg:flex-none p-4 rounded-xl flex items-center justify-center transition-all ${state.activeTab === 'orchard' ? 'bg-leaf-green text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <Sprout size={24} />
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'lab' }))}
            className={`flex-1 lg:flex-none p-4 rounded-xl flex items-center justify-center transition-all ${state.activeTab === 'lab' ? 'bg-water-blue text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <FlaskConical size={24} />
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'market' }))}
            className={`flex-1 lg:flex-none p-4 rounded-xl flex items-center justify-center transition-all ${state.activeTab === 'market' ? 'bg-mineral-gold text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <Store size={24} />
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'tools' }))}
            className={`flex-1 lg:flex-none p-4 rounded-xl flex items-center justify-center transition-all ${state.activeTab === 'tools' ? 'bg-burn-red text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <Wrench size={24} />
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'leaderboard' }))}
            className={`flex-1 lg:flex-none p-4 rounded-xl flex items-center justify-center transition-all ${state.activeTab === 'leaderboard' ? 'bg-mineral-gold text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <Trophy size={24} />
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'discovery' }))}
            className={`flex-1 lg:flex-none p-4 rounded-xl flex items-center justify-center transition-all ${state.activeTab === 'discovery' ? 'bg-leaf-green text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <BookOpen size={24} />
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'archives' }))}
            className={`flex-1 lg:flex-none p-4 rounded-xl flex items-center justify-center transition-all ${state.activeTab === 'archives' ? 'bg-indigo-500 text-white' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <Library size={24} />
          </button>
          {state.user?.role === 'admin' && (
            <button 
              onClick={() => setState(p => ({ ...p, activeTab: 'admin' }))}
              className={`flex-1 lg:flex-none p-4 rounded-xl flex items-center justify-center transition-all ${state.activeTab === 'admin' ? 'bg-burn-red text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
            >
              <ShieldCheck size={24} />
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-11 space-y-6">
          {/* Main Animation Section (Hero) */}
          <AnimatePresence mode="wait">
            {selectedPlant ? (
              <motion.div 
                key={selectedPlant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="hardware-panel p-6 md:p-8 space-y-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-bark-brown pb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-text-primary">
                        {selectedPlant.type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-black/40 
                        ${selectedPlant.rarity === 'Legendary' ? 'text-mineral-gold' : 
                          selectedPlant.rarity === 'Epic' ? 'text-violet-400' : 
                          selectedPlant.rarity === 'Rare' ? 'text-water-blue' : 
                          selectedPlant.rarity === 'Uncommon' ? 'text-leaf-green' : 'text-text-secondary'}`}
                      >
                        {selectedPlant.rarity}
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold font-serif italic">{PLANT_STAGES[selectedPlant.stageIndex].name}</h3>
                    <p className="text-xs text-text-secondary font-mono tracking-wider">TELEMETRY ID: {selectedPlant.id}</p>
                    <p className="text-xs text-text-secondary mt-2 italic max-w-md">
                      {BASE_PLANT_TYPES.find(t => t.name === selectedPlant.type)?.description || 'A complex genetic cross between two distinct species.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="px-4 py-1.5 rounded-full bg-leaf-green/10 border border-leaf-green/30 text-leaf-green text-[10px] font-bold uppercase tracking-widest">
                      Active Growth Phase
                    </div>
                    <button 
                      onClick={() => setState(p => ({ ...p, selectedPlantIndex: null }))}
                      className="text-text-secondary hover:text-white transition-colors"
                    >
                      <RefreshCw size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="h-[400px] md:h-[500px] bg-black/30 rounded-3xl dashed-border relative overflow-hidden group">
                    {(() => {
                      const currentThreshold = PLANT_STAGES[selectedPlant.stageIndex].threshold;
                      const nextThreshold = PLANT_STAGES[selectedPlant.stageIndex + 1]?.threshold || (currentThreshold * 2);
                      const progress = Math.min(1, Math.max(0, (selectedPlant.rootStrength - currentThreshold) / (nextThreshold - currentThreshold)));
                      
                      return (
                        <PlantVisualizer 
                          stageIndex={selectedPlant.stageIndex} 
                          progress={progress}
                          type={selectedPlant.type}
                          color={selectedPlant.color}
                          hasPests={selectedPlant.pests > 0}
                          isBurning={selectedPlant.stress > 90}
                          stress={selectedPlant.stress}
                          weather={state.weather.type}
                          toolEffect={state.lastToolEffect}
                        />
                      );
                    })()}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />
                    
                    {/* Quick Tools Overlay */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      {state.tools.filter(t => t.type === 'active' && t.level > 0).map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => useActiveTool(tool.id)}
                          disabled={(tool.currentCooldown || 0) > 0}
                          className={`p-3 rounded-xl border backdrop-blur-md transition-all group relative
                            ${(tool.currentCooldown || 0) > 0 
                              ? 'bg-black/40 border-bark-brown/30 text-text-secondary opacity-50' 
                              : 'bg-leaf-green/20 border-leaf-green/40 text-leaf-green hover:bg-leaf-green/40'}`}
                        >
                          {tool.id === 'pest-repellent-pulse' ? <Bug size={20} /> : <Database size={20} />}
                          
                          {/* Tooltip */}
                          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-soil-dark border border-bark-brown rounded-lg text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {tool.name.toUpperCase()} 
                            {(tool.currentCooldown || 0) > 0 && ` (${tool.currentCooldown}c)`}
                          </div>

                          {/* Cooldown Progress */}
                          {(tool.currentCooldown || 0) > 0 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                              <span className="text-[10px] font-bold text-white">{tool.currentCooldown}</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                          <span>Hydration</span>
                          <span className="text-water-blue">{selectedPlant.water} / {PLANT_STAGES[selectedPlant.stageIndex].maxWater}</span>
                        </div>
                        <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-water-blue transition-all duration-1000 ease-out" 
                            style={{ width: `${(selectedPlant.water / PLANT_STAGES[selectedPlant.stageIndex].maxWater) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                          <span>Nutrients</span>
                          <span className="text-mineral-gold">{Math.round(selectedPlant.nutrients)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-mineral-gold transition-all duration-1000 ease-out" 
                            style={{ width: `${(selectedPlant.nutrients / PLANT_STAGES[selectedPlant.stageIndex].maxNutrients) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                          <span>Stress</span>
                          <span className="text-burn-red">{selectedPlant.stress}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-burn-red transition-all duration-1000 ease-out" 
                            style={{ width: `${selectedPlant.stress}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                          <span>Root XP</span>
                          <span className="text-leaf-green">{selectedPlant.rootStrength}</span>
                        </div>
                        <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-leaf-green transition-all duration-1000 ease-out" 
                            style={{ width: `${(selectedPlant.rootStrength / (PLANT_STAGES[selectedPlant.stageIndex + 1]?.threshold || 1000)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
                      {selectedPlant.isHarvestable ? (
                        <button 
                          onClick={() => handlePlantAction('harvest')}
                          className="col-span-2 flex items-center justify-center gap-3 bg-mineral-gold text-soil-dark font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-mineral-gold/10"
                        >
                          <TrendingUp size={20} />
                          HARVEST SPECIMEN
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handlePlantAction('research')}
                            disabled={selectedPlant.water < 5}
                            className="flex items-center justify-center gap-3 bg-leaf-green text-soil-dark font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-leaf-green/10"
                          >
                            <Zap size={20} />
                            RESEARCH
                          </button>
                          <button 
                            onClick={() => handlePlantAction('water')}
                            className="flex items-center justify-center gap-3 bg-water-blue text-soil-dark font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-water-blue/10"
                          >
                            <Droplets size={20} />
                            HYDRATE
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hardware-panel p-12 flex flex-col items-center justify-center text-center gap-6 text-text-secondary border-dashed border-bark-brown/50"
              >
                <div className="w-20 h-20 rounded-full bg-bark-brown/10 flex items-center justify-center animate-pulse">
                  <Sprout size={40} />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-xl font-bold text-text-primary">System Idle</h3>
                  <p className="text-sm leading-relaxed">Select a specimen from the orchard grid below to initiate neural link and access growth telemetry.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Secondary Content (Tabs) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <AnimatePresence mode="wait">
                {state.activeTab === 'orchard' && (
                  <motion.div 
                    key="orchard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center gap-2">
                          <Database size={16} className="text-leaf-green" />
                          <h2 className="font-serif text-xl italic">{activeOrchard.name}</h2>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          {state.orchards.map(o => (
                            <button
                              key={o.id}
                              onClick={() => {
                                if (o.isUnlocked) {
                                  setState(prev => ({ ...prev, activeOrchardId: o.id, selectedPlantIndex: null }));
                                } else {
                                  unlockOrchard(o.id);
                                }
                              }}
                              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                state.activeOrchardId === o.id 
                                  ? 'bg-leaf-green text-soil-dark shadow-lg shadow-leaf-green/20' 
                                  : o.isUnlocked 
                                    ? 'bg-bark-brown/20 text-text-secondary hover:text-white'
                                    : 'bg-burn-red/20 text-burn-red border border-burn-red/30'
                              }`}
                            >
                              {o.isUnlocked ? o.name : `Unlock ${o.name} (${o.unlockCost}🪙)`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {activeOrchard.plants.map((plant, i) => (
                        <PlantCard 
                          key={i} 
                          plant={plant} 
                          index={i} 
                          isSelected={state.selectedPlantIndex === i}
                          onClick={() => plant ? setState(p => ({ ...p, selectedPlantIndex: i })) : buyPlot(i)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'lab' && (
                  <motion.div 
                    key="lab"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="font-serif text-xl italic">Bio-Genetic Lab</h2>
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Global Enhancements</span>
                    </div>

                    {/* Breeding Section */}
                    <div className="hardware-panel p-6 space-y-6 border-leaf-green/30">
                      <div className="flex items-center gap-2 text-leaf-green">
                        <FlaskConical size={18} />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Hybridization Chamber</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {[0, 1].map(idx => (
                          <div key={idx} className="h-32 rounded-xl border-2 border-dashed border-bark-brown flex flex-col items-center justify-center gap-2 bg-black/20">
                            {breedingParents[idx] !== undefined ? (
                              <div className="text-center">
                                <p className="text-[10px] font-bold text-leaf-green uppercase">{activeOrchard.plants[breedingParents[idx]]?.rarity}</p>
                                <p className="text-xs font-bold">{activeOrchard.plants[breedingParents[idx]]?.type}</p>
                                <button 
                                  onClick={() => setBreedingParents(prev => prev.filter((_, i) => i !== idx))}
                                  className="mt-2 text-[10px] text-burn-red hover:underline"
                                >
                                  REMOVE
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] text-text-secondary uppercase">Select Mature Plant</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          Select two mature (Stage 4) specimens from your current orchard to attempt cross-pollination. 
                          Hybridization costs <span className="text-mineral-gold font-bold">100🪙</span> and requires an empty plot.
                        </p>
                        
                        <div className="grid grid-cols-3 gap-2">
                          {activeOrchard.plants.map((p, i) => (
                            p && p.stageIndex >= 4 && !breedingParents.includes(i) && (
                              <button
                                key={i}
                                onClick={() => breedingParents.length < 2 && setBreedingParents(prev => [...prev, i])}
                                className="p-2 rounded-lg bg-bark-brown/20 border border-bark-brown hover:border-leaf-green transition-all text-[10px] font-bold truncate"
                              >
                                {p.type}
                              </button>
                            )
                          ))}
                        </div>

                        <button 
                          onClick={handleCrossPollinate}
                          disabled={breedingParents.length !== 2 || state.credits < 100}
                          className="w-full bg-leaf-green text-soil-dark font-bold py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-leaf-green/10"
                        >
                          INITIATE CROSS-POLLINATION
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'waterEfficiency', name: 'Deep Roots', desc: 'Reduces water consumption by 10%', icon: Droplets },
                        { id: 'nutrientRetention', name: 'Efficient Metabolism', desc: 'Reduces nutrient drain by 10%', icon: TrendingUp },
                        { id: 'stressResistance', name: 'Hardened Bark', desc: 'Reduces stress gain by 5 points', icon: Flame },
                      ].map(u => (
                        <button 
                          key={u.id}
                          onClick={() => buyUpgrade(u.id as keyof GlobalUpgrades)}
                          className="hardware-panel p-4 flex items-center gap-4 hover:border-water-blue transition-all group"
                        >
                          <div className="w-12 h-12 rounded-lg bg-water-blue/10 flex items-center justify-center text-water-blue group-hover:scale-110 transition-transform">
                            <u.icon size={24} />
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-bold text-sm">{u.name}</h4>
                            <p className="text-xs text-text-secondary">{u.desc}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-water-blue">10 🧬</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'market' && (
                  <motion.div 
                    key="market"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="font-serif text-xl italic">Supply Exchange</h2>
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Resource Acquisition</span>
                    </div>

                    {/* Credit Transfer UI */}
                    <div className="hardware-panel p-4 space-y-4 border-water-blue/30">
                      <div className="flex items-center gap-2 text-water-blue">
                        <Send size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Secure Credit Transfer</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          placeholder="Recipient UID"
                          value={transferTarget}
                          onChange={(e) => setTransferTarget(e.target.value)}
                          className="bg-black/40 border border-bark-brown rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-water-blue transition-all"
                        />
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            placeholder="Amount"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            className="flex-1 bg-black/40 border border-bark-brown rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-water-blue transition-all"
                          />
                          <button 
                            onClick={handleTransferCredits}
                            disabled={isTransferring || !transferTarget || !transferAmount}
                            className="bg-water-blue text-soil-dark px-4 py-2 rounded-lg text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            {isTransferring ? '...' : 'SEND'}
                          </button>
                        </div>
                      </div>
                      <div className="p-2 bg-black/20 rounded border border-bark-brown/30">
                        <p className="text-[9px] text-text-secondary leading-relaxed">
                          <ShieldCheck size={10} className="inline mr-1" />
                          TRANSFERS ARE PERMANENT. YOUR UID: <span className="text-water-blue font-mono select-all">{state.user?.uid}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {SHOP_ITEMS.map(item => (
                        <button 
                          key={item.id}
                          onClick={() => buyItem(item)}
                          className="hardware-panel p-4 flex items-center gap-4 hover:border-mineral-gold transition-all group"
                        >
                          <div className="w-12 h-12 rounded-lg bg-mineral-gold/10 flex items-center justify-center text-mineral-gold group-hover:scale-110 transition-transform">
                            {item.type === 'fertilizer' ? <ArrowUpCircle size={24} /> : <Bug size={24} />}
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-bold text-sm">{item.name}</h4>
                            <p className="text-xs text-text-secondary">
                              {item.type === 'fertilizer' ? `+${item.nut}% Nutrients` : `Kills ${item.kills} Pests`}
                              {item.stress !== 0 && `, ${item.stress > 0 ? '+' : ''}${item.stress} Stress`}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-mono font-bold text-mineral-gold">{item.cost} 🪙</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'tools' && (
                  <motion.div 
                    key="tools"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 border-b border-bark-brown pb-4">
                      <Wrench size={24} className="text-burn-red" />
                      <h2 className="font-serif text-2xl italic">Tool Management</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {state.tools.map(tool => {
                        const cost = Math.round(tool.baseCost * Math.pow(tool.costMultiplier, tool.level));
                        const isMax = tool.level >= tool.maxLevel;
                        
                        return (
                          <div key={tool.id} className="hardware-panel p-5 flex flex-col gap-4 relative overflow-hidden group">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <h3 className="font-bold text-lg text-text-primary">{tool.name}</h3>
                                <p className="text-xs text-text-secondary leading-relaxed">{tool.description}</p>
                              </div>
                              <div className="bg-black/40 px-3 py-1 rounded-full border border-bark-brown/30">
                                <span className="text-[10px] font-bold text-leaf-green">LVL {tool.level}</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                                <span>Upgrade Progress</span>
                                <span>{tool.level} / {tool.maxLevel}</span>
                              </div>
                              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-burn-red transition-all duration-500" 
                                  style={{ width: `${(tool.level / tool.maxLevel) * 100}%` }}
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => buyTool(tool.id)}
                              disabled={isMax || state.credits < cost}
                              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                isMax 
                                  ? 'bg-bark-brown/20 text-text-secondary cursor-not-allowed' 
                                  : state.credits >= cost
                                    ? 'bg-burn-red text-soil-dark hover:scale-[1.02] active:scale-[0.98]'
                                    : 'bg-burn-red/10 text-burn-red/50 border border-burn-red/20 cursor-not-allowed'
                              }`}
                            >
                              {isMax ? (
                                <>
                                  <ShieldCheck size={16} />
                                  MAX LEVEL
                                </>
                              ) : (
                                <>
                                  <ArrowUpCircle size={16} />
                                  UPGRADE ({cost}🪙)
                                </>
                              )}
                            </button>
                            
                            {/* Decorative background icon */}
                            <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                              <Cpu size={120} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'leaderboard' && (
                  <motion.div
                    key="leaderboard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 border-b border-bark-brown pb-4">
                      <Trophy size={24} className="text-mineral-gold" />
                      <h2 className="font-serif text-2xl italic">Global Leaderboard</h2>
                    </div>

                    {isLeaderboardLoading ? (
                      <div className="flex justify-center py-20">
                        <RefreshCw className="animate-spin text-mineral-gold" size={48} />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {leaderboard.map((entry, idx) => (
                          <div 
                            key={entry.id}
                            className={`hardware-panel p-4 flex items-center justify-between border ${entry.id === state.user?.uid ? 'border-mineral-gold/50 bg-mineral-gold/5' : 'border-bark-brown/30'}`}
                          >
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-2xl w-8 text-text-secondary">#{idx + 1}</span>
                              <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-text-secondary border border-bark-brown/30">
                                <User size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-text-primary">{entry.displayName || 'Anonymous'}</p>
                                <p className="text-[10px] text-text-secondary font-mono uppercase tracking-widest">{entry.role || 'player'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-mineral-gold">{entry.credits?.toLocaleString()}🪙</p>
                              <p className="text-[10px] text-text-secondary uppercase tracking-widest">{entry.dataSeeds || 0} Seeds</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {state.activeTab === 'discovery' && (
                  <motion.div
                    key="discovery"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 border-b border-bark-brown pb-4">
                      <BookOpen size={24} className="text-leaf-green" />
                      <h2 className="font-serif text-2xl italic">Discovery Log</h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {BASE_PLANT_TYPES.map(type => {
                        const isDiscovered = state.discoveredTypes.includes(type.name);
                        return (
                          <div 
                            key={type.name}
                            className={`hardware-panel p-6 flex flex-col items-center text-center transition-all ${isDiscovered ? 'opacity-100' : 'opacity-40 grayscale'}`}
                          >
                            <div 
                              className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-black/40 border border-bark-brown/30"
                              style={{ color: isDiscovered ? type.color : '#666' }}
                            >
                              <Sprout size={24} />
                            </div>
                            <h3 className="font-bold text-sm mb-1 text-text-primary">{isDiscovered ? type.name : '???'}</h3>
                            <p className="text-[10px] text-text-secondary uppercase tracking-widest">
                              {isDiscovered ? `Growth: ${type.baseGrowthSpeed}x` : 'Undiscovered'}
                            </p>
                          </div>
                        );
                      })}
                      
                      {/* Hybrid Discoveries */}
                      {state.discoveredTypes.filter(t => t.startsWith('Hybrid')).map(typeName => (
                        <div 
                          key={typeName}
                          className="hardware-panel p-6 flex flex-col items-center text-center"
                        >
                          <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-black/40 border border-bark-brown/30 text-water-blue">
                            <FlaskConical size={24} />
                          </div>
                          <h3 className="font-bold text-sm mb-1 text-text-primary">{typeName}</h3>
                          <p className="text-[10px] text-text-secondary uppercase tracking-widest">Hybrid Species</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'archives' && (
                  <motion.div 
                    key="archives"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-bark-brown pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <Library size={24} className="text-indigo-400" />
                        <h2 className="font-serif text-2xl italic">Botanical Archives</h2>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-black/40 px-4 py-2 rounded-xl border border-bark-brown/30 flex items-center gap-2">
                          <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Seeds</span>
                          <span className="text-lg font-mono font-bold text-indigo-400">{state.dataSeeds} 🧬</span>
                        </div>
                        <button 
                          onClick={handleSellDataSeeds}
                          disabled={state.dataSeeds < 10}
                          className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                        >
                          SELL 10 🧬 (50🪙)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Discovered Species */}
                      <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                          <BookOpen size={16} />
                          Discovered Species ({state.discoveredTypes.length})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {state.discoveredTypes.map((type, idx) => (
                            <div key={idx} className="hardware-panel p-3 text-center group hover:border-indigo-500 transition-all">
                              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                <Sprout size={20} />
                              </div>
                              <span className="text-xs font-bold block truncate">{type}</span>
                            </div>
                          ))}
                          {state.discoveredTypes.length === 0 && (
                            <div className="col-span-full py-12 text-center text-text-secondary italic">
                              No species discovered yet. Start planting!
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Leaderboard */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                          <Trophy size={16} />
                          Top Botanists
                        </h3>
                        <div className="hardware-panel p-4 space-y-3">
                          {isLeaderboardLoading ? (
                            <div className="py-8 text-center text-text-secondary animate-pulse">Loading rankings...</div>
                          ) : leaderboard.map((entry, idx) => (
                            <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5">
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-mineral-gold text-soil-dark' : 'bg-bark-brown/30 text-text-secondary'}`}>
                                  {idx + 1}
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold truncate max-w-[100px]">{entry.displayName || 'Unknown'}</span>
                                  <span className="text-[10px] text-text-secondary uppercase">{entry.role || 'Player'}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-mono font-bold text-leaf-green">{entry.credits}🪙</div>
                                <div className="text-[10px] font-mono text-indigo-400">{entry.dataSeeds}🧬</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'admin' && state.user?.role === 'admin' && (
                  <motion.div 
                    key="admin"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3 border-b border-bark-brown pb-4">
                      <ShieldCheck size={24} className="text-burn-red" />
                      <h2 className="font-serif text-2xl italic">Admin Control Center</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Global Stats */}
                      <div className="hardware-panel p-6 space-y-4">
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                          <Database size={16} />
                          System Overview
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Total Players</div>
                            <div className="text-2xl font-mono font-bold text-leaf-green">{leaderboard.length}+</div>
                          </div>
                          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <div className="text-[10px] text-text-secondary uppercase font-bold mb-1">Server Time</div>
                            <div className="text-sm font-mono font-bold text-text-primary">{new Date().toLocaleTimeString()}</div>
                          </div>
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="hardware-panel p-6 space-y-4">
                        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                          <Zap size={16} />
                          Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <button 
                            onClick={() => {
                              setState(prev => ({ ...prev, credits: prev.credits + 1000 }));
                              saveState({ credits: state.credits + 1000 });
                              addLog('Admin: Added 1000 credits to self.', 'success');
                            }}
                            className="bg-burn-red/10 hover:bg-burn-red/20 text-burn-red border border-burn-red/30 p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
                          >
                            <span>Add 1000 Credits (Self)</span>
                            <ArrowUpCircle size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              setState(prev => ({ ...prev, dataSeeds: prev.dataSeeds + 100 }));
                              saveState({ dataSeeds: state.dataSeeds + 100 });
                              addLog('Admin: Added 100 data seeds to self.', 'success');
                            }}
                            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
                          >
                            <span>Add 100 Data Seeds (Self)</span>
                            <Database size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* User Management Table */}
                    <div className="hardware-panel p-6 space-y-4">
                      <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest flex items-center gap-2">
                        <User size={16} />
                        Player Management
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-bark-brown/30">
                              <th className="py-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Name</th>
                              <th className="py-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Role</th>
                              <th className="py-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Credits</th>
                              <th className="py-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Seeds</th>
                              <th className="py-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaderboard.map(user => (
                              <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-4 text-xs font-bold">{user.displayName || 'Anon'}</td>
                                <td className="py-4">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-burn-red/20 text-burn-red' : 'bg-leaf-green/20 text-leaf-green'}`}>
                                    {user.role || 'player'}
                                  </span>
                                </td>
                                <td className="py-4 text-xs font-mono">{user.credits}🪙</td>
                                <td className="py-4 text-xs font-mono">{user.dataSeeds}🧬</td>
                                <td className="py-4">
                                  <button 
                                    onClick={() => {
                                      setTransferTarget(user.id);
                                      setTransferAmount('100');
                                      addLog(`Selected ${user.displayName} for credit transfer.`, 'info');
                                    }}
                                    className="text-[10px] font-bold text-indigo-400 hover:underline"
                                  >
                                    SELECT
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Terminal Log */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-text-secondary">
                <AlertCircle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">System Logs</span>
              </div>
              <div className="hardware-panel p-4 h-64 md:h-full overflow-y-auto font-mono text-[10px] space-y-2 bg-black/40">
                {logs.map((log, i) => (
                  <div key={i} className={
                    log.type === 'success' ? 'text-leaf-green' : 
                    log.type === 'danger' ? 'text-burn-red font-bold' : 
                    log.type === 'system' ? 'text-text-secondary' : 'text-text-primary'
                  }>
                    <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                    {log.msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Auth Overlay */}
      <AnimatePresence>
        {(!state.user && state.isAuthReady) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-soil-dark/95 backdrop-blur-md p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="hardware-panel max-w-md w-full p-8 text-center space-y-8 border-leaf-green/30"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-leaf-green/10 rounded-full flex items-center justify-center mx-auto text-leaf-green">
                  <Database size={40} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-serif italic">Orchard Engine</h1>
                  <p className="text-xs text-text-secondary uppercase tracking-[0.2em]">Growth Milestone Interface</p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-text-secondary leading-relaxed">
                  Establish a secure link to the Bio-Genetic database to persist your orchard telemetry and enable resource exchange.
                </p>
                
                <div className="space-y-4">
                  <button 
                    onClick={handleLogin}
                    disabled={isLoginLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg disabled:opacity-50"
                  >
                    {isLoginLoading ? (
                      <RefreshCw className="animate-spin" size={20} />
                    ) : (
                      <LogIn size={20} />
                    )}
                    {isLoginLoading ? 'CONNECTING...' : 'CONNECT WITH GOOGLE'}
                  </button>

                  <div className="hardware-panel p-3 h-32 overflow-y-auto font-mono text-[9px] space-y-1 bg-black/60 text-left border-bark-brown/20">
                    <div className="text-text-secondary uppercase mb-1 border-b border-bark-brown/20 pb-1 flex items-center gap-1">
                      <Database size={8} /> Auth Telemetry
                    </div>
                    {logs.filter(l => l.type === 'system' || l.type === 'danger').map((log, i) => (
                      <div key={i} className={log.type === 'danger' ? 'text-burn-red' : 'text-text-secondary'}>
                        <span className="opacity-30 mr-1">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                        {log.msg}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-text-secondary italic">
                  Note: Ensure popups are allowed for this domain.
                </p>
              </div>

              <div className="pt-4 border-t border-bark-brown/30">
                <div className="flex items-center justify-center gap-2 text-[10px] text-text-secondary uppercase tracking-widest">
                  <ShieldCheck size={12} />
                  Secure Protocol v2.4.0
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {!state.isAuthReady && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-soil-dark">
          <RefreshCw className="animate-spin text-leaf-green" size={40} />
        </div>
      )}
    </div>
  );
};

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
