import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Plant, GlobalUpgrades, Orchard } from './types';
import { PLANT_STAGES, INITIAL_UPGRADES, SHOP_ITEMS } from './constants';
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
  Trophy,
  Hammer,
  HelpCircle
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
  const [state, setState] = useState<GameState & { globalStats: any }>({
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
    activeTab: 'orchard',
    user: null,
    isAuthReady: false,
    globalStats: null,
  });

  const [logs, setLogs] = useState<{ msg: string; type: string }[]>([]);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [rankings, setRankings] = useState<{ uid: string; displayName: string; credits: number; dataSeeds: number }[]>([]);

  const addLog = useCallback((msg: string, type: string = 'info') => {
    setLogs(prev => [{ msg, type }, ...prev].slice(0, 20));
  }, []);

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
        addLog('System Note: If you experience redirects to GitHub, your Gemini API quota may be exhausted. Please deploy the app for a stable experience.', 'system');
        setState(prev => ({
          ...prev,
          user: {
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
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
          orchards: state.orchards,
          createdAt: serverTimestamp()
        };
        setDoc(userDocRef, initialState).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${state.user!.uid}`));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${state.user!.uid}`));

    return () => unsubscribe();
  }, [state.user?.uid]);

  // Rankings & Global Stats Sync
  useEffect(() => {
    if (state.activeTab !== 'rankings') return;

    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('credits', 'desc'), limit(10));
    
    const unsubRankings = onSnapshot(q, (snapshot) => {
      const topUsers = snapshot.docs
        .map(doc => ({
          uid: doc.data().uid,
          displayName: doc.data().displayName || 'Anonymous Specimen',
          credits: doc.data().credits || 0,
          dataSeeds: doc.data().dataSeeds || 0,
        }))
        .sort((a, b) => (b.credits + b.dataSeeds * 10) - (a.credits + a.dataSeeds * 10))
        .slice(0, 10);
      
      setRankings(topUsers);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users_rankings'));

    const unsubStats = onSnapshot(doc(db, 'system', 'global_stats'), (snapshot) => {
      if (snapshot.exists()) {
        setState(prev => ({ ...prev, globalStats: snapshot.data() }));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'system/global_stats'));

    return () => {
      unsubRankings();
      unsubStats();
    };
  }, [state.activeTab]);

  // Daily Reward Logic
  useEffect(() => {
    if (!state.user?.uid || !state.isAuthReady) return;

    const checkDailyReward = async () => {
      const userRef = doc(db, 'users', state.user!.uid);
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', state.user!.uid), limit(1)));
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        const lastReward = userData.lastDailyReward?.toDate();
        const now = new Date();
        
        if (!lastReward || lastReward.toDateString() !== now.toDateString()) {
          const reward = 100;
          const batch = writeBatch(db);
          
          batch.update(userDoc.docs[0].ref, {
            credits: increment(reward),
            lastDailyReward: serverTimestamp()
          });

          const statsRef = doc(db, 'system', 'global_stats');
          batch.set(statsRef, {
            totalCredits: increment(reward),
            totalUsers: increment(lastReward ? 0 : 1)
          }, { merge: true });

          await batch.commit();
          addLog(`Daily Login Reward: +${reward} credits!`, 'success');
        }
      }
    };

    checkDailyReward();
  }, [state.user?.uid, state.isAuthReady, addLog]);

  const saveState = async (updates: Partial<GameState>) => {
    if (!state.user?.uid) return;
    const userDocRef = doc(db, 'users', state.user.uid);
    try {
      await updateDoc(userDocRef, updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${state.user.uid}`);
    }
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
      const q = query(usersRef, where('uid', '==', transferTarget), limit(1));
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

      // Log transfer with predictable ID for security rules verification
      const transferId = `${state.user.uid}_${transferTarget}`;
      batch.set(doc(db, 'transfers', transferId), {
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

      if (action === 'research') {
        if (plant.water < 5) {
          addLog('Insufficient water for research.', 'warn');
          return prev;
        }
        
        const baseG = Math.floor(Math.random() * 8) + 5;
        const finalG = Math.max(1, Math.round(baseG * (plant.nutrients / 100)));
        
        plant.rootStrength += finalG;
        plant.water -= 5;
        plant.nutrients -= 10;
        plant.stress += 5;
        credits += 10;
        
        // Check evolution
        let nextStage = 0;
        for (let i = 0; i < PLANT_STAGES.length; i++) {
          if (plant.rootStrength >= PLANT_STAGES[i].threshold) nextStage = i;
        }
        
        if (nextStage > plant.stageIndex) {
          plant.stageIndex = nextStage;
          addLog(`Evolution! ${plant.type} reached stage: ${PLANT_STAGES[nextStage].name}`, 'success');
          dataSeeds += 5;
        }

        // Pest chance (reduced by pestDefense upgrade)
        const pestChance = 0.15 * (1 - (prev.upgrades.pestDefense / 100));
        if (plant.pestImmunity === 0 && Math.random() < pestChance) {
          plant.pests = Math.min(5, plant.pests + 1);
          addLog('Warning: Pest infestation detected!', 'danger');
        }

        addLog(`Research complete: +${finalG} roots, +10 credits.`, 'success');
      }

      if (action === 'water') {
        const stage = PLANT_STAGES[plant.stageIndex];
        plant.water = Math.min(stage.maxWater, plant.water + 20);
        plant.stress = Math.max(0, plant.stress - (5 + prev.upgrades.stressResistance));
        addLog('Hydration levels increased.', 'info');
      }

      if (action === 'fertilize') {
        plant.nutrients = Math.min(PLANT_STAGES[plant.stageIndex].maxNutrients, plant.nutrients + 30);
        plant.stress += 10;
        addLog('Nutrient levels boosted.', 'success');
      }

      if (action === 'pesticide') {
        plant.pests = 0;
        plant.pestImmunity = 3;
        plant.stress += 15;
        addLog('Pests eradicated. Immunity active for 3 cycles.', 'success');
      }

      if (action === 'harvest') {
        if (plant.stageIndex < 4) {
          addLog('Plant is not ready for harvest.', 'warn');
          return prev;
        }
        const reward = 500 + (plant.rootStrength * 0.5);
        const dataReward = 5;
        credits += reward;
        dataSeeds += dataReward;
        newPlants[prev.selectedPlantIndex!] = null;
        addLog(`Harvest complete! Gained ${Math.floor(reward)} credits and ${dataReward} data seeds.`, 'success');
      }

      if (action !== 'harvest') {
        newPlants[prev.selectedPlantIndex!] = plant;
      }
      
      orchard.plants = newPlants;
      newOrchards[orchardIndex] = orchard;
      
      const nextState = { ...prev, orchards: newOrchards, credits, dataSeeds, selectedPlantIndex: action === 'harvest' ? null : prev.selectedPlantIndex };
      saveState({ orchards: newOrchards, credits, dataSeeds });
      return nextState;
    });
  };

  const nextDay = () => {
    setState(prev => {
      const newOrchards = prev.orchards.map(o => {
        if (!o.isUnlocked) return o;
        const newPlants = o.plants.map(p => {
          if (!p) return null;
          const plant = { ...p };
          
          // Overnight effects
          if (plant.pests > 0) {
            plant.nutrients = Math.max(0, plant.nutrients - (plant.pests * 10));
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

      addLog(`Day ${prev.day + 1} started. All orchards processed.`, 'system');
      const nextState = { ...prev, day: prev.day + 1, orchards: newOrchards };
      saveState({ day: prev.day + 1, orchards: newOrchards });
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
      newPlants[index] = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'Basic',
        rootStrength: 0,
        water: 30,
        nutrients: 100,
        stress: 0,
        pests: 0,
        pestImmunity: 0,
        stageIndex: 0,
        isHarvestable: false,
      };
      orchard.plants = newPlants;
      newOrchards[orchardIndex] = orchard;
      const nextState = { ...prev, orchards: newOrchards, credits: prev.credits - 50, selectedPlantIndex: index };
      saveState({ orchards: newOrchards, credits: prev.credits - 50 });
      return nextState;
    });
    addLog('New plot cleared and seeded. Neural link established.', 'success');
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
        <div className="lg:col-span-1 flex flex-row lg:flex-col gap-3 md:gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'orchard' }))}
            className={`flex-1 lg:flex-none p-3 rounded-xl flex flex-col items-center justify-center transition-all gap-1 ${state.activeTab === 'orchard' ? 'bg-leaf-green text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <Sprout size={24} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Orchard</span>
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'lab' }))}
            className={`flex-1 lg:flex-none p-3 rounded-xl flex flex-col items-center justify-center transition-all gap-1 ${state.activeTab === 'lab' ? 'bg-water-blue text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <FlaskConical size={24} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Research</span>
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'market' }))}
            className={`flex-1 lg:flex-none p-3 rounded-xl flex flex-col items-center justify-center transition-all gap-1 ${state.activeTab === 'market' ? 'bg-mineral-gold text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <Store size={24} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Tools</span>
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'rankings' }))}
            className={`flex-1 lg:flex-none p-3 rounded-xl flex flex-col items-center justify-center transition-all gap-1 ${state.activeTab === 'rankings' ? 'bg-burn-red text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <Trophy size={24} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Rankings</span>
          </button>
          <button 
            onClick={() => setState(p => ({ ...p, activeTab: 'profile' }))}
            className={`flex-1 lg:flex-none p-3 rounded-xl flex flex-col items-center justify-center transition-all gap-1 ${state.activeTab === 'profile' ? 'bg-text-primary text-soil-dark' : 'bg-card-bg text-text-secondary hover:text-white'}`}
          >
            <User size={24} />
            <span className="text-[8px] font-bold uppercase tracking-tighter">Profile</span>
          </button>
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
                    <h3 className="text-2xl md:text-3xl font-bold font-serif italic">{PLANT_STAGES[selectedPlant.stageIndex].name}</h3>
                    <p className="text-xs text-text-secondary font-mono tracking-wider">TELEMETRY ID: {selectedPlant.id}</p>
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
                  <div className="h-[400px] md:h-[500px] bg-[#0a0a0a] rounded-3xl dashed-border relative overflow-hidden group">
                    {(() => {
                      const currentThreshold = PLANT_STAGES[selectedPlant.stageIndex].threshold;
                      const nextThreshold = PLANT_STAGES[selectedPlant.stageIndex + 1]?.threshold || (currentThreshold * 2);
                      const progress = Math.min(1, Math.max(0, (selectedPlant.rootStrength - currentThreshold) / (nextThreshold - currentThreshold)));
                      
                      console.log(`Specimen ${selectedPlant.id} Telemetry - Stage: ${selectedPlant.stageIndex}, Progress: ${progress.toFixed(4)}`);

                      return (
                        <PlantVisualizer 
                          stageIndex={selectedPlant.stageIndex} 
                          progress={progress}
                          hasPests={selectedPlant.pests > 0}
                          isBurning={selectedPlant.stress > 90}
                        />
                      );
                    })()}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />
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

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto w-full">
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
                      <button 
                        onClick={() => handlePlantAction('fertilize')}
                        className="flex items-center justify-center gap-3 bg-mineral-gold text-soil-dark font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-mineral-gold/10"
                      >
                        <ArrowUpCircle size={20} />
                        BOOST
                      </button>
                      <button 
                        onClick={() => handlePlantAction('pesticide')}
                        className="flex items-center justify-center gap-3 bg-burn-red text-soil-dark font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-burn-red/10"
                      >
                        <Bug size={20} />
                        DEFEND
                      </button>
                      <button 
                        onClick={() => handlePlantAction('harvest')}
                        disabled={selectedPlant.stageIndex < 4}
                        className="flex items-center justify-center gap-3 bg-white text-soil-dark font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-white/10"
                      >
                        <Database size={20} />
                        HARVEST
                      </button>
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

                    {/* Quick Tools Section */}
                    <div className="hardware-panel p-4 space-y-4 border-mineral-gold/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-mineral-gold">
                          <Hammer size={16} />
                          <h4 className="text-xs font-bold uppercase tracking-widest">Field Tools</h4>
                        </div>
                        <span className="text-[10px] text-text-secondary uppercase tracking-widest">Quick Access</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {SHOP_ITEMS.map(item => (
                          <button 
                            key={item.id}
                            onClick={() => buyItem(item)}
                            disabled={!selectedPlant || state.credits < item.cost}
                            className="flex items-center gap-3 p-3 bg-black/40 border border-bark-brown rounded-xl hover:border-mineral-gold transition-all disabled:opacity-50 group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-mineral-gold/10 flex items-center justify-center text-mineral-gold group-hover:scale-110 transition-transform">
                              {item.type === 'fertilizer' ? <ArrowUpCircle size={16} /> : <Bug size={16} />}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-[10px] font-bold leading-none mb-1">{item.name}</p>
                              <p className="text-[9px] text-text-secondary">{item.cost}🪙</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'lab' && (
                  <motion.div 
                    key="lab"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="font-serif text-xl italic">Bio-Genetic Lab</h2>
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Global Enhancements</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'waterEfficiency', name: 'Deep Roots', desc: 'Reduces water consumption by 10%', icon: Droplets },
                        { id: 'nutrientRetention', name: 'Efficient Metabolism', desc: 'Reduces nutrient drain by 10%', icon: TrendingUp },
                        { id: 'stressResistance', name: 'Hardened Bark', desc: 'Reduces stress gain by 5 points', icon: Flame },
                        { id: 'pestDefense', name: 'Natural Repellent', desc: 'Reduces pest infestation chance by 10%', icon: ShieldCheck },
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
                        <p className="text-[9px] text-text-secondary leading-relaxed flex items-center justify-between">
                          <span>
                            <ShieldCheck size={10} className="inline mr-1" />
                            TRANSFERS ARE PERMANENT. YOUR UID: <span className="text-water-blue font-mono select-all">{state.user?.uid}</span>
                          </span>
                          <button 
                            onClick={() => {
                              if (state.user?.uid) {
                                navigator.clipboard.writeText(state.user.uid);
                                addLog('Your UID copied to clipboard.', 'success');
                              }
                            }}
                            className="text-water-blue hover:text-white transition-colors ml-2"
                          >
                            COPY
                          </button>
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

                      <div className="hardware-panel p-6 space-y-4 border-leaf-green/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-leaf-green">
                            <Database size={16} />
                            <h4 className="text-xs font-bold uppercase tracking-widest">Data Liquidation</h4>
                          </div>
                          <span className="text-[10px] font-mono text-text-secondary">Rate: 1 Data = 50 Credits</span>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => {
                              if (state.dataSeeds >= 1) {
                                setState(p => ({ ...p, dataSeeds: p.dataSeeds - 1, credits: p.credits + 50 }));
                                saveState({ dataSeeds: state.dataSeeds - 1, credits: state.credits + 50 });
                                addLog('Liquidated 1 Data Seed for 50 credits.', 'success');
                              }
                            }}
                            className="flex-1 p-3 bg-black/40 border border-leaf-green/20 rounded-lg text-[10px] font-bold hover:bg-leaf-green/10 transition-all"
                          >
                            SELL 1 DATA
                          </button>
                          <button 
                            onClick={() => {
                              if (state.dataSeeds >= 10) {
                                setState(p => ({ ...p, dataSeeds: p.dataSeeds - 10, credits: p.credits + 500 }));
                                saveState({ dataSeeds: state.dataSeeds - 10, credits: state.credits + 500 });
                                addLog('Liquidated 10 Data Seeds for 500 credits.', 'success');
                              }
                            }}
                            className="flex-1 p-3 bg-black/40 border border-leaf-green/20 rounded-lg text-[10px] font-bold hover:bg-leaf-green/10 transition-all"
                          >
                            SELL 10 DATA
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'rankings' && (
                  <motion.div 
                    key="rankings"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="font-serif text-xl italic">Global Rankings</h2>
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Top Specimen Managers</span>
                    </div>

                    {state.globalStats && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="hardware-panel p-3 text-center">
                          <p className="text-[8px] text-text-secondary uppercase font-bold tracking-widest mb-1">Total Credits</p>
                          <p className="font-mono text-mineral-gold text-sm">{state.globalStats.totalCredits?.toLocaleString() || 0}</p>
                        </div>
                        <div className="hardware-panel p-3 text-center">
                          <p className="text-[8px] text-text-secondary uppercase font-bold tracking-widest mb-1">Total Plants</p>
                          <p className="font-mono text-leaf-green text-sm">{state.globalStats.totalPlants?.toLocaleString() || 0}</p>
                        </div>
                        <div className="hardware-panel p-3 text-center">
                          <p className="text-[8px] text-text-secondary uppercase font-bold tracking-widest mb-1">Active Users</p>
                          <p className="font-mono text-water-blue text-sm">{state.globalStats.totalUsers?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    )}

                    <div className="hardware-panel overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-black/40 text-text-secondary uppercase tracking-widest font-bold">
                            <th className="p-4">Rank</th>
                            <th className="p-4">Manager</th>
                            <th className="p-4 text-right">Credits</th>
                            <th className="p-4 text-right">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-bark-brown/20">
                          {rankings.map((r, i) => (
                            <tr key={r.uid} className={`hover:bg-white/5 transition-colors ${r.uid === state.user?.uid ? 'bg-leaf-green/5' : ''}`}>
                              <td className="p-4 font-mono text-leaf-green">#{i + 1}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-bark-brown/20 flex items-center justify-center text-[8px]">
                                    {r.displayName.charAt(0)}
                                  </div>
                                  <span className="font-bold">{r.displayName}</span>
                                  {r.uid === state.user?.uid && <span className="text-[8px] bg-leaf-green text-soil-dark px-1 rounded">YOU</span>}
                                </div>
                              </td>
                              <td className="p-4 text-right font-mono text-mineral-gold">{r.credits}</td>
                              <td className="p-4 text-right font-mono text-water-blue">{r.dataSeeds}</td>
                            </tr>
                          ))}
                          {rankings.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-text-secondary italic">
                                Scanning neural network for active managers...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {state.activeTab === 'profile' && (
                  <motion.div 
                    key="profile"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="font-serif text-xl italic">Manager Profile</h2>
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Neural Link Identity</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="hardware-panel p-6 space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-leaf-green/10 flex items-center justify-center text-leaf-green">
                            <User size={32} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold">{state.user?.displayName || 'Unknown Manager'}</h4>
                            <p className="text-xs text-text-secondary font-mono">{state.user?.uid}</p>
                          </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-bark-brown/20">
                          <div className="flex justify-between text-xs">
                            <span className="text-text-secondary">Email:</span>
                            <span>{state.user?.email || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-text-secondary">Status:</span>
                            <span className="text-leaf-green font-bold">ACTIVE LINK</span>
                          </div>
                        </div>
                      </div>

                      <div className="hardware-panel p-6 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Lifetime Statistics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-black/20 rounded-lg">
                            <span className="block text-[10px] text-text-secondary uppercase">Total Cycles</span>
                            <span className="text-xl font-mono text-leaf-green">{state.day}</span>
                          </div>
                          <div className="p-3 bg-black/20 rounded-lg">
                            <span className="block text-[10px] text-text-secondary uppercase">Orchards</span>
                            <span className="text-xl font-mono text-water-blue">{state.orchards.filter(o => o.isUnlocked).length}</span>
                          </div>
                          <div className="p-3 bg-black/20 rounded-lg">
                            <span className="block text-[10px] text-text-secondary uppercase">Total Plants</span>
                            <span className="text-xl font-mono text-mineral-gold">
                              {state.orchards.reduce((acc, o) => acc + o.plants.filter(p => p !== null).length, 0)}
                            </span>
                          </div>
                          <div className="p-3 bg-black/20 rounded-lg">
                            <span className="block text-[10px] text-text-secondary uppercase">Genetic Upgrades</span>
                            <span className="text-xl font-mono text-burn-red">
                              {Object.values(state.upgrades).filter(v => v !== 1 && v !== 0).length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="hardware-panel p-6 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">System Settings & Help</h4>
                      <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                        <div>
                          <h5 className="text-sm font-bold">Neural Link Stability</h5>
                          <p className="text-[10px] text-text-secondary">Adjust visual fidelity for lower-end hardware</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1 bg-leaf-green text-soil-dark text-[10px] font-bold rounded">HIGH</button>
                          <button className="px-3 py-1 bg-bark-brown/20 text-text-secondary text-[10px] font-bold rounded">LOW</button>
                        </div>
                      </div>

                      <div className="p-4 bg-black/20 rounded-lg space-y-3">
                        <h5 className="text-sm font-bold flex items-center gap-2">
                          <HelpCircle size={14} className="text-water-blue" />
                          Operational Manual
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] leading-relaxed">
                          <div className="space-y-1">
                            <p className="text-text-primary font-bold">GROWTH CYCLE</p>
                            <p className="text-text-secondary">Plants grow via <span className="text-water-blue">RESEARCH</span>. Each research cycle extracts genetic data and increases root strength. Plants progress through 5 stages: Sprout, Sapling, Mature, Flowering, and Fruiting.</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-text-primary font-bold">VITAL SIGNS</p>
                            <p className="text-text-secondary">Maintain <span className="text-water-blue">HYDRATION</span> and <span className="text-mineral-gold">NUTRIENTS</span>. Low vitals increase <span className="text-burn-red">STRESS</span>. High stress leads to crop burn and root degradation.</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-text-primary font-bold">HARVESTING</p>
                            <p className="text-text-secondary">Only <span className="text-burn-red">FRUITING</span> plants can be harvested. Harvesting yields high credit rewards and valuable Data Seeds.</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-text-primary font-bold">DATA SEEDS</p>
                            <p className="text-text-secondary">Used in the <span className="text-water-blue">LAB</span> for global genetic upgrades or liquidated in the <span className="text-mineral-gold">MARKET</span> for credits.</p>
                          </div>
                        </div>
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
