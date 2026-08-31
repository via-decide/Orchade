# Blank-Slate Start + 3-Level Progression — Implementation Spec

## Architecture Overview

```
ACCOUNT
│
├── GLOBAL LEVEL 1/2/3        ← gameplay/progression/
│
├── RESEARCH CREDITS           ← gameplay/research-credits/ (cross-game separable)
│
├── PROJECTS / PLOTS
│     └── PlotPlanner.tsx      ← blank-slate init, season gating, unlock checks
│
└── APPEARANCE
      └── 12 SKINS             ← gameplay/progression/internal/skins.ts

ONE DETERMINISTIC PHYSICAL ENGINE (unchanged)
```

Levels gate interface complexity and available content. They do NOT gate physics. A Level 1 tomato grows with the same equations as a Level 3 tomato.

Skins are presentation + climate presets. They do NOT secretly change equations. A "Kutch" skin has `annualRainfallInches: 14`, not `waterProduction * 0.6`.

---

## Task 1: gameplay/research-credits/ module

### public.ts

```typescript
export type CreditSource = {
  gameId: string;        // 'orchade' | 'skillhex' | 'mars-sim' | ...
  action: string;        // 'harvest' | 'compost_finished' | 'stage_observed' | 'mission_complete'
  timestamp: number;
};

export type DebitReason = {
  gameId: string;
  action: string;        // 'unlock_crop' | 'unlock_breed' | 'unlock_upgrade'
  contentId: string;
  timestamp: number;
};

export type LedgerEntry = {
  id: string;            // monotonic counter or timestamp-based
  type: 'credit' | 'debit';
  amount: number;
  source?: CreditSource;
  reason?: DebitReason;
};

export type UnlockCategory = 'crop' | 'livestock' | 'water_upgrade' | 'energy_upgrade';

export type UnlockableContent = {
  contentId: string;
  category: UnlockCategory;
  displayName: string;
  cost: number;                               // researchCredits
  requiredLevel: 1 | 2 | 3;
  validSeasons?: ('spring' | 'summer' | 'autumn' | 'winter')[];  // null = any season
  prerequisites?: string[];                   // contentIds that must be unlocked first
};

export type UnlockRecord = {
  contentId: string;
  unlockedAt: number;    // game day
  cost: number;
};
```

### state.ts

```typescript
import type { LedgerEntry, UnlockRecord } from './public';

export interface ResearchCreditsState {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  ledger: LedgerEntry[];    // audit trail, capped at last 200 entries
  unlocks: UnlockRecord[];
}

export const initialResearchCreditsState: ResearchCreditsState = {
  balance: 0,
  totalEarned: 0,
  totalSpent: 0,
  ledger: [],
  unlocks: [],
};
```

### internal/ledger.ts

Pure functions, no side effects:

```typescript
credit(state, amount, source) → state   // adds to balance, logs entry
debit(state, amount, reason) → state | { error: 'insufficient' }
getBalance(state) → number
getAuditTrail(state) → LedgerEntry[]
```

### internal/unlocks.ts

Content registry + unlock logic:

```typescript
// The unlock registry — all unlockable content with costs
export const UNLOCK_REGISTRY: UnlockableContent[] = [
  // STARTER CROPS (free, unlocked at init)
  { contentId: 'tomato',    category: 'crop', displayName: 'Tomato',    cost: 0,  requiredLevel: 1, validSeasons: ['spring', 'summer'] },
  { contentId: 'lettuce',   category: 'crop', displayName: 'Lettuce',   cost: 0,  requiredLevel: 1, validSeasons: ['spring', 'autumn'] },
  { contentId: 'carrot',    category: 'crop', displayName: 'Carrot',    cost: 0,  requiredLevel: 1, validSeasons: ['spring', 'summer'] },
  { contentId: 'basil',     category: 'crop', displayName: 'Basil',     cost: 0,  requiredLevel: 1, validSeasons: ['spring', 'summer'] },

  // UNLOCKABLE CROPS
  { contentId: 'garlic',    category: 'crop', displayName: 'Garlic',    cost: 10, requiredLevel: 1, validSeasons: ['autumn', 'winter', 'spring', 'summer'] },
  { contentId: 'potato',    category: 'crop', displayName: 'Potato',    cost: 10, requiredLevel: 2, validSeasons: ['spring', 'summer'] },
  { contentId: 'corn',      category: 'crop', displayName: 'Sweet Corn', cost: 15, requiredLevel: 2, validSeasons: ['spring', 'summer'] },
  { contentId: 'wheat',     category: 'crop', displayName: 'Wheat',     cost: 15, requiredLevel: 2, validSeasons: ['spring', 'summer', 'autumn'] },
  { contentId: 'apple',     category: 'crop', displayName: 'Apple',     cost: 20, requiredLevel: 2, validSeasons: ['spring', 'summer', 'autumn', 'winter'] },
  { contentId: 'blueberry', category: 'crop', displayName: 'Blueberry', cost: 20, requiredLevel: 2, validSeasons: ['spring', 'summer'] },
  { contentId: 'clover',    category: 'crop', displayName: 'Clover',    cost: 10, requiredLevel: 1, validSeasons: ['spring', 'summer', 'autumn', 'winter'] },
  { contentId: 'marigold',  category: 'crop', displayName: 'Marigold',  cost: 5,  requiredLevel: 1, validSeasons: ['spring', 'summer'] },

  // LIVESTOCK (all Level 2)
  { contentId: 'heritage_chickens', category: 'livestock', displayName: 'Pastured Chickens', cost: 15, requiredLevel: 2 },
  { contentId: 'st_croix_sheep',    category: 'livestock', displayName: 'St. Croix Sheep',   cost: 25, requiredLevel: 2 },
  { contentId: 'kunekune_pigs',     category: 'livestock', displayName: 'KuneKune Pigs',     cost: 30, requiredLevel: 2 },
  { contentId: 'apiculture_bees',   category: 'livestock', displayName: 'Honeybee Colony',   cost: 20, requiredLevel: 2 },

  // WATER INFRASTRUCTURE (Level 2)
  { contentId: 'rainwater_cistern_1000',  category: 'water_upgrade',  displayName: '1,000 Gal Cistern',      cost: 10, requiredLevel: 2 },
  { contentId: 'gravity_drip_manifold',   category: 'water_upgrade',  displayName: 'Gravity Drip Kit',       cost: 10, requiredLevel: 2 },
  { contentId: 'keyline_contour_swale',   category: 'water_upgrade',  displayName: 'Keyline Swale',          cost: 15, requiredLevel: 2 },
  { contentId: 'subsurface_clay_ollas',   category: 'water_upgrade',  displayName: 'Terracotta Ollas Set',   cost: 10, requiredLevel: 2 },

  // ENERGY INFRASTRUCTURE (Level 2)
  { contentId: 'solar_panel_array_2kw',   category: 'energy_upgrade', displayName: '2kW Solar Array',        cost: 15, requiredLevel: 2 },
  { contentId: 'lifepo4_battery_5kwh',    category: 'energy_upgrade', displayName: '5kWh Battery Module',    cost: 20, requiredLevel: 2 },
  { contentId: 'solar_pasture_energizer', category: 'energy_upgrade', displayName: 'Solar Fence Energizer',  cost: 10, requiredLevel: 2 },
  { contentId: 'woodgas_biomass_inverter', category: 'energy_upgrade', displayName: 'Woodgas Co-Gen',        cost: 25, requiredLevel: 2 },
];

// NOTE: All cost values are DESIGN DECISIONS (game-balance choices).
// Relative ratios derived from existing basePrice/cost data in the codebase.
// Absolute scale (5-30 range) needs playtesting.

// Functions:
isUnlocked(state, contentId) → boolean
getUnlockCost(contentId) → number | null
canUnlock(state, contentId, playerLevel, currentSeason) → true | { error: string }
performUnlock(state, contentId, currentDay) → state | { error: string }
getStarterUnlocks() → UnlockRecord[]   // cost-0 items, pre-unlocked at init
getAvailableUnlocks(state, playerLevel, currentSeason) → UnlockableContent[]
```

### api.ts — the cross-game integration surface

```typescript
// Barrel exports
export type { ResearchCreditsState } from './state';
export { initialResearchCreditsState } from './state';
export type { CreditSource, DebitReason, UnlockableContent, UnlockRecord, UnlockCategory } from './public';
export { credit, debit, getBalance, getAuditTrail } from './internal/ledger';
export { isUnlocked, canUnlock, performUnlock, getStarterUnlocks, getAvailableUnlocks, UNLOCK_REGISTRY } from './internal/unlocks';
```

### Tests

**ledger.test.ts:**
- credit() increases balance and logs entry
- debit() decreases balance and logs entry
- debit() with insufficient balance returns error, does not modify state
- audit trail preserves gameId and action from source/reason
- ledger capped at 200 entries (oldest dropped)
- totalEarned and totalSpent track correctly across multiple operations

**unlocks.test.ts:**
- isUnlocked returns true for starter crops, false for locked content
- performUnlock deducts cost and adds UnlockRecord
- performUnlock rejects insufficient balance
- performUnlock rejects already-unlocked content
- performUnlock rejects content above player level
- canUnlock rejects crop outside valid season
- getAvailableUnlocks filters by level and season
- getStarterUnlocks returns 4 starter crops

---

## Task 2: gameplay/progression/ module

### public.ts

```typescript
export type PlayerLevel = 1 | 2 | 3;
export type LevelName = 'BUILD' | 'OPERATE' | 'MASTER';

export const LEVEL_NAMES: Record<PlayerLevel, LevelName> = {
  1: 'BUILD',
  2: 'OPERATE',
  3: 'MASTER',
};

export interface LevelCriteria {
  level: PlayerLevel;
  name: LevelName;
  description: string;
  criteria: LevelCriterion[];
}

export interface LevelCriterion {
  id: string;
  label: string;
  check: string;  // human-readable description of what's checked
}

export interface SkinClimatePreset {
  annualRainfallInches: number;
  avgTempBySeasonF: Record<'spring' | 'summer' | 'autumn' | 'winter', number>;
  solarIrradianceKwhM2: number;
  soilProfile: { defaultPh: number; organicMatter: number };
  frostRiskBySeason: Record<'spring' | 'summer' | 'autumn' | 'winter', number>;
}

export interface EnvironmentSkin {
  id: string;
  name: string;
  description: string;
  climatePreset: SkinClimatePreset;
  visuals: {
    terrainPalette: string[];
    buildingStyle: string;
    vegetationSet: string;
    uiAtmosphere: string;
  };
}
```

### state.ts

```typescript
import type { PlayerLevel } from './public';

export interface ProgressionState {
  level: PlayerLevel;
  skinId: string;
  levelUpHistory: Array<{ level: PlayerLevel; onDay: number }>;
  observedStages: Record<string, number[]>;  // cropId → stageIndexes seen (for research credit grants)
}

export const initialProgressionState: ProgressionState = {
  level: 1,
  skinId: 'default',
  levelUpHistory: [],
  observedStages: {},
};
```

### internal/levels.ts

```typescript
// Check if player meets criteria for next level
export function checkLevelUp(
  currentLevel: PlayerLevel,
  pantryItemCount: number,
  totalReusedLbs: number,          // from wasteState.ledger
  waterStoredGallons: number,
  unlockedCount: number,
  activePaddockCount: number,
  closedLoopPercent: number,
  solarWatts: number,
): PlayerLevel | null {
  if (currentLevel === 1) {
    // Level 1 → 2: BUILD → OPERATE
    const hasHarvested = pantryItemCount > 0;
    const hasComposted = totalReusedLbs > 0;
    const hasWater = waterStoredGallons > 0;
    const hasUnlocks = unlockedCount >= 3;
    if (hasHarvested && hasComposted && hasWater && hasUnlocks) return 2;
  }
  if (currentLevel === 2) {
    // Level 2 → 3: OPERATE → MASTER
    const hasLivestock = activePaddockCount > 0;
    const hasLoop = closedLoopPercent > 50;
    const hasEnergy = solarWatts > 0;
    const hasManyUnlocks = unlockedCount >= 8;
    if (hasLivestock && hasLoop && hasEnergy && hasManyUnlocks) return 3;
  }
  return null;
}

// Get criteria display for UI (shows which criteria are met/unmet)
export function getLevelCriteriaStatus(currentLevel, ...same args...): CriterionStatus[]
```

### internal/skins.ts

```typescript
// Only the "default" skin is fully defined now.
// The other 11 are placeholder entries with the architecture ready.
export const ENVIRONMENT_SKINS: EnvironmentSkin[] = [
  {
    id: 'default',
    name: 'Temperate Homestead',
    description: 'A balanced temperate climate with moderate rainfall and four distinct seasons.',
    climatePreset: {
      annualRainfallInches: 38,       // matches current waterState default
      avgTempBySeasonF: { spring: 58, summer: 82, autumn: 55, winter: 32 },
      solarIrradianceKwhM2: 4.5,
      soilProfile: { defaultPh: 6.5, organicMatter: 6.0 },
      frostRiskBySeason: { spring: 0.15, summer: 0, autumn: 0.1, winter: 0.35 },
    },
    visuals: {
      terrainPalette: ['#4a6741', '#6f8f4e', '#8fae6b'],
      buildingStyle: 'american_farmhouse',
      vegetationSet: 'temperate_deciduous',
      uiAtmosphere: 'warm_earth',
    },
  },
  // Placeholder entries for skins 2-12 (architecture ready, data TBD):
  // { id: 'kutch', name: 'Kutch Semi-Arid Homestead', ... climatePreset.annualRainfallInches: 14 ... },
  // { id: 'pacific_northwest', ... },
  // { id: 'mediterranean', ... },
  // ... etc.
];
```

---

## Task 3: Blank-slate PlotPlanner.tsx changes

### Current → New initial values

| State | Current | New |
|---|---|---|
| `credits` | `420` | `100` |
| `zones` | `defaultPreset.zones.map(...)` (14 zones) | `[]` |
| `paddocks` | `[{chickens}, {bees}]` | `[]` |
| `waterState` | Full system (4200 gal, drip, etc.) | `{ catchmentSqft: 0, currentStoredGallons: 0, maxCisternCapacityGallons: 0, annualRainfallInches: 38, dailyConsumptionGallons: 0, swaleInfiltrationRate: 0, graywaterRecycledGallons: 0, irrigationType: 'drip', keylinePondsCount: 0 }` |
| `solarState` | Full 6.4kW system | `{ solarArrayWatts: 0, batteryBankKwh: 0, currentBatteryStorageKwh: 0, maxBatteryStorageKwh: 0, dailyGenerationKwh: 0, dailyLoadKwh: 0, isOffGridTied: false, backupBiomassGenActive: false }` |
| `pantry` | `[5 items]` | `[]` |
| `wasteState` | `initialWasteEconomyState` (already empty) | No change |
| `selectedZoneId` | `2` | `null` or first zone when placed |

### New state hooks to add

```typescript
const [researchState, setResearchState] = useState<ResearchCreditsState>(() => {
  const initial = { ...initialResearchCreditsState };
  // Pre-unlock starter crops
  const starters = getStarterUnlocks();
  initial.unlocks = starters;
  return initial;
});

const [progressionState, setProgressionState] = useState<ProgressionState>(initialProgressionState);
```

### Guarding against empty zones

Many existing functions iterate `zones` — verify they handle empty arrays gracefully:
- `getZoneSynergies()` — neighbors filter on empty → returns []  ✓
- `handleAdvanceDay()` zone loop — maps over empty → no-op  ✓
- wasteState init with compost zones — `zones.filter(z => z.type === 'compost')` on empty → []  ✓
- `selectedZone` — needs null guard: `zones.find(z => z.id === selectedZoneId) || null`
- Grid rendering — needs to handle no zones (shows empty grid with "Place your first zone" prompt)

---

## Task 4: Season enforcement locations

### In crop assignment handler (find where cropId is set on a zone)

```typescript
// Before setting cropId:
if (crop.seasons && !crop.seasons.includes(currentSeason)) {
  addLog(`Cannot plant ${crop.displayName} in ${currentSeason}. Available: ${crop.seasons.join(', ')}.`, 'alert');
  return;
}
```

### In handleAdvanceDay zone crop loop (around line 730)

```typescript
// After getting crop definition, before growth step:
if (crop.seasons && !crop.seasons.includes(newSeason)) {
  // Out-of-season penalty — health drain
  return {
    ...z,
    plant: {
      ...z.plant,
      health: Math.max(0, z.plant.health - 5),
    },
  };
}
// ... continue normal growth
```

### In crop picker UI

Show crops with season availability. Grayed out + "(Available: Spring, Summer)" if current season doesn't match.

---

## Task 7: Supply costs — derived values

### Seed costs (derived from harvest.basePrice)

Formula: `seedCost = Math.round(crop.harvest.basePrice * 0.3)`

| Crop | basePrice | Seed Cost |
|---|---|---|
| Tomato | 18 | 5 |
| Lettuce | 8 | 2 |
| Carrot | 12 | 4 |
| Basil | 15 | 5 |
| Garlic | 22 | 7 |
| Potato | 20 | 6 |
| Corn | 16 | 5 |
| Wheat | 14 | 4 |
| Apple | 65 | 20 |
| Blueberry | 25 | 8 |
| Clover | 12 | 4 |
| Marigold | 35 | 11 |

DESIGN DECISION: The 0.3 multiplier is a game-balance choice. It means ~3 harvests to break even on seed investment, which feels reasonable.

### Zone placement costs

| Zone Type | Cost (credits) | Rationale |
|---|---|---|
| crop | 0 | Just designating land |
| building (house) | 200 | Major structure, high value (sets up greywater, daily consumption) |
| building (shed) | 80 | Tool storage |
| building (greenhouse) | 150 | Season extension value |
| water | 100 | Cistern/pond infrastructure |
| compost | 50 | Simple bin construction |
| livestock | 60 | Fencing/paddock infrastructure (animal cost separate via breed.cost) |

DESIGN DECISION: All these are game-balance choices. Relative ratios based on infrastructure upgrade costs (95-320 range in homesteadEngineering.ts).

---

## Task 8: Level criteria — exact checks

### Level 1 → 2 (BUILD → OPERATE)

```
pantry.length > 0                              // has harvested something
wasteState.ledger.totalReusedLbs > 0           // has composted
waterState.currentStoredGallons > 0            // has water system
researchState.unlocks.length >= 3              // has researched 3+ items (starters don't count since they're free)
```

Wait — starters are pre-unlocked with cost 0, so `unlocks.length` starts at 4. Adjust: count unlocks with `cost > 0` >= 3.

### Level 2 → 3 (OPERATE → MASTER)

```
paddocks.length > 0                            // has livestock
wasteState.ledger.closedLoopPercent > 50       // closed-loop metric healthy
solarState.solarArrayWatts > 0                 // has energy system
researchState.unlocks.filter(u => u.cost > 0).length >= 8  // 8+ paid unlocks
```

---

## Cross-game integration surface summary

Another game (SkillHex, Mars sim) integrates with Orchade's research credits by calling:

```typescript
import { credit, debit, getBalance } from 'orchade/gameplay/research-credits/api';

// Grant credits from another game
const newState = credit(state, 10, {
  gameId: 'skillhex',
  action: 'mission_complete',
  timestamp: Date.now(),
});

// Spend credits from another game
const result = debit(state, 5, {
  gameId: 'mars-sim',
  action: 'unlock_habitat',
  contentId: 'mars_greenhouse',
  timestamp: Date.now(),
});
```

All functions are pure (state in, state out). No Orchade-specific dependencies. The module can be extracted to a shared package with zero refactoring.

---

## Files touched summary

### New files (Tasks 1-2)
```
gameplay/research-credits/public.ts
gameplay/research-credits/state.ts
gameplay/research-credits/api.ts
gameplay/research-credits/internal/ledger.ts
gameplay/research-credits/internal/unlocks.ts
gameplay/research-credits/tests/ledger.test.ts
gameplay/research-credits/tests/unlocks.test.ts
gameplay/research-credits/tests/runner.ts
gameplay/progression/public.ts
gameplay/progression/state.ts
gameplay/progression/api.ts
gameplay/progression/internal/levels.ts
gameplay/progression/internal/skins.ts
gameplay/progression/tests/runner.ts
```

### Modified files (Tasks 3-11)
```
src/components/PlotPlanner.tsx          — blank init, season gating, unlock checks, research UI, level UI
src/data/homesteadPresets.ts            — sandbox level field, new "New Homesteader" preset
gameplay/module-manifest.json           — register research-credits and progression modules
src/types.ts                            — dataSeeds → researchCredits
gameplay/economy/internal/transactions.ts — dataSeeds → researchCredits
docs/game-design.md                     — Data Seeds → Research Credits terminology
```

### Unchanged (must verify still work)
```
gameplay/waste-economy/**              — no changes
src/data/cropCatalog.ts                — no changes (seasons field already exists)
src/data/livestockData.ts              — no changes (cost field already exists)
src/data/homesteadEngineering.ts       — no changes (cost field already exists)
```
