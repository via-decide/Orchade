# Blank-slate progression design proposal

Status: **proposal only — implementation requires confirmation**

## Decision summary

Orchade should stop treating a researched, operating homestead as the new-game
state. A new save starts with empty land, a small toolkit, no placed zones, no
livestock, no stored output, and no unlocked crop, livestock, or infrastructure
knowledge. The existing presets remain useful as planning templates, but applying
one must become a sequence of gated placement requests rather than replacing the
player's state with free, populated infrastructure.

This proposal deliberately wraps the existing placement, adjacency, growth, and
closed-loop output rules. It does not change their mathematics.

## What is being replaced

There are currently two independent new-game paths:

- `App` creates day-one state with 100 credits, one unlocked nine-slot orchard,
  and two later orchards. Firestore repeats the 100-credit initialization when a
  user document does not exist.
- `PlotPlanner` separately creates a much richer reference farm: 420 credits,
  fourteen preset zones, two occupied paddocks, mature water and solar systems,
  and a stocked pantry. Its state is local to the component rather than part of
  the persisted player save.

Implementation should introduce one versioned `createNewGameState()` factory and
use it for local guests, authenticated users, reset/new-game actions, and save
migration defaults. No UI component should carry a second implicit start state.

## 1. Minute-zero player state

The proposed persisted state is conceptually:

```ts
type NewGameState = {
  schemaVersion: number;
  clock: { day: 1; season: 'spring' };
  land: { acreage: number; zones: [] };
  wallet: { credits: 0 };
  researchWalletId: string;
  knowledge: {
    unlocked: [];
    projects: [];
  };
  inventory: {
    field_hoe: 1;
    // No seeds, animals, materials, harvest, manure, residue, or greywater.
  };
  livestock: [];
  water: { storedGallons: 0; greywaterGallons: 0; infrastructure: [] };
  energy: { storedKwh: 0; infrastructure: [] };
  pantry: [];
};
```

The field hoe is the only repository-backed starter tool in
`item-definitions.json`; adding more starter tools should wait for corresponding
item definitions. The initial acreage may retain the current 3.5-acre UI default
because it describes empty land rather than granted infrastructure, but whether
land size itself is a progression lever is a separate balance decision.

Both ordinary credits and research credits start at zero. This is intentional:
the player receives a toolkit, not capital or knowledge. To prevent a deadlock,
the first eligible research project must support a **time-only discovery task**
(survey soil, observe the site, or inspect a seed catalogue). Completing that
task earns research credits through the same public credit API described below;
it does not silently grant an unlock.

The same onboarding completion also grants a one-time, idempotent **first
placement voucher**. After the player chooses an eligible starter project, the
voucher is redeemed against that project's versioned supply recipe and deposits
the quoted consumable items (for example, its seed pack) plus exactly the
ordinary credits required by its first placement quote. Voucher redemption and
the inventory/wallet deposits are one save transaction, keyed by the onboarding
event, and the voucher cannot be exchanged for cash or applied to a different
recipe. If no starter recipe is priced, onboarding cannot be published as
complete. This guarantees one affordable placement without inventing a second
economy or giving every new save unrestricted capital. Later projects may
require time, research credits, ordinary credits, or a declared combination.

The existing `dataSeeds` field is the closest implemented progression currency:
it purchases upgrades and can be converted to ordinary credits. Preserve old
saves by migrating `dataSeeds` into the research wallet at a documented 1:1
unit mapping, then retire direct `dataSeeds` mutations. Do **not** keep the current
unrestricted research-to-cash liquidation unless product design explicitly
confirms it, because a shared ecosystem currency needs centrally auditable sinks
and exchange policy.

### Save migration

This pivot applies to genuinely new saves. Existing saves should not have their
farms erased. A schema migration should:

1. identify saves created before the blank-slate schema;
2. preserve their zones, inventory, credits, and simulation state;
3. mark knowledge for already owned crops, animals, and infrastructure as
   `legacy_grant`, so existing placements remain valid; and
4. migrate `dataSeeds` into the research wallet once, with an idempotent migration
   marker.

## 2. Research unlock flow

### Knowledge records

Unlock state belongs to a progression/knowledge capsule, not to crop definitions
or placed zones:

```ts
type KnowledgeId = `crop:${string}` | `livestock:${string}` | `infrastructure:${string}`;

type KnowledgeGrant = {
  knowledgeId: KnowledgeId;
  unlockedAt: string;
  source: 'research' | 'legacy_grant' | 'external_grant';
  transactionId?: string;
};

type ResearchProject = {
  projectId: string;
  knowledgeId: KnowledgeId;
  status: 'available' | 'in_progress' | 'complete';
  elapsedResearchTime: number;
  requiredResearchTime: number;
  researchCreditCost: number;
  ordinaryCreditCost?: number;
  ordinaryCreditReservationId?: string;
  completionTransactionId?: string;
  prerequisites: KnowledgeId[];
};
```

Definitions remain immutable content. Unlocks reveal and authorize those
definitions; they never copy agronomy values into player state. Stable namespaced
IDs prevent collisions when another game participates later.

### Flow and authorization order

1. The research catalogue lists projects and a locked preview. Crop projects are
   filtered by current season (see below); non-crop projects use their own
   prerequisites.
2. `startProject` validates season and prerequisites. If the quote has a nonzero
   ordinary-credit cost, the economy service atomically reserves that amount and
   the project records the reservation ID in the same save transaction. Reserved
   credits are unavailable to other purchases. Cancelling or invalidating a
   project releases them; starting does not grant the knowledge early.
3. Existing game-time/event infrastructure contributes research time. On
   completion, the progression service asks the research-credit service to spend
   the quoted amount with an idempotency key and asks the economy service to
   capture the recorded ordinary-credit reservation. Capture, project completion,
   and the grant are coordinated by the durable completion transaction described
   below; an absent or invalid reservation prevents completion.
4. Only successful research-credit debit **and** ordinary-credit capture produce
   the `KnowledgeGrant`. Definitions then become visible to placement and detailed
   encyclopaedia views.
5. Placement requests must independently re-check the grant; hiding a locked
   button is not authorization.

### Atomic and recoverable project completion

Each completion uses a stable ID derived from the account and project attempt.
Before either ledger is called, progression durably records a completion record
with that ID, the exact costs, reservation ID, knowledge ID, and status
`pending`. Research-credit `spend` and ordinary-credit reservation capture both
use that completion ID as their idempotency key. An `applied` receipt **or a
`duplicate` receipt whose transaction ID and request fingerprint match this
completion record** is proof that the corresponding debit succeeded. A duplicate
for any other request is an error and never authorizes a grant.

After both receipts are durably attached, one save transaction writes the
`KnowledgeGrant` (including the completion transaction ID), marks the project
complete, and marks the completion record `granted`. A crash at any boundary is
safe: an outbox worker retries every non-`granted` record, recovers matching
receipts from the ledgers, and finishes the grant without charging again. If a
debit cannot be completed, the record remains reconcilable and no grant is made;
compensation/release policy must be explicit rather than silently abandoning a
successful debit. Completion records and ledger receipts are retained for audit
and reconciliation.

The repository currently has researched crop data in `src/data/cropCatalog.ts`
and a smaller canonical `data/crops/crop-definitions.json`, but the named
`crop-definitions-researched.json` file is not present in this checkout.
Implementation must first designate or restore one canonical file rather than
silently merging divergent catalogues. `data/zone-research.json` contains research
for livestock, energy, water catchment, and composting, while explicitly leaving
some infrastructure unresearched.

### Supply gate after research

Research authorizes a type; it does not pay for it. A placement command should
request one atomic quote/reservation from inventory/economy:

```ts
type PlacementQuote = {
  knowledgeId: KnowledgeId;
  ordinaryCredits: number;
  items: Array<{ itemId: string; quantity: number }>;
  quoteBasis: Array<{ sourceId: string; field: string }>;
};
```

The placement transaction validates knowledge, season, inventory, credits, and
the unchanged spatial rules; consumes the quote; then calls the existing
placement operation. If placement fails, nothing is consumed.

Repository-backed pricing inputs are:

- current seed prices in `SEED_TYPES`, pending conversion into data-driven seed
  item definitions;
- livestock purchase costs in `LIVESTOCK_BREEDS`;
- crop harvest `basePrice`, yield, spacing, and the seasonal market model for
  relative seed/output valuation; and
- existing shop item costs for amendments and crop care.

These inputs establish relative values, but they do **not** currently define
seed-pack coverage, whether livestock `cost` is per animal or starter group, or
material recipes/prices for buildings, water, compost, and energy zones. Those
are explicit game-balance decisions. Implementation must not fabricate them:
affected placement actions remain `unpriced`/disabled with a diagnostic until a
versioned supply recipe supplies quantities and basis metadata.

Harvest, livestock output/manure, residue, and greywater continue to be emitted
by the existing closed-loop system. Adapters may route those outputs to inventory,
sell them for ordinary credits using existing market values, or award research
credits through `earn`; the underlying output calculations are not changed.

## 3. Seasonal research and placement gates

The crop definition's `seasons` array is authoritative. One shared policy function
must be called by both research and planting paths:

```ts
evaluateCropAvailability({ cropId, season, operation: 'research' | 'plant' }):
  | { allowed: true }
  | { allowed: false; code: 'OUT_OF_SEASON'; validSeasons: Season[] };
```

- A crop project cannot be **started or completed** outside a valid season.
  Progress pauses at the boundary; it is not lost and no credits are debited
  until completion is legal.
- A crop cannot be planted or used to create a crop zone outside a valid season,
  even if its knowledge is unlocked and seed is owned.
- Existing planted crops are not deleted when the season changes. Their response
  remains the responsibility of existing growth/weather rules.
- Non-crop livestock and infrastructure are not given invented seasons.
- The same rejection code drives UI messaging, tests, and command/API responses.

The lower-level world simulation already checks crop/season compatibility. Keep
that defense, but add the shared gate at the player command boundary used by the
live `PlotPlanner`; otherwise the current component and simulation capsule can
disagree. Preset application must submit each crop through this same path and
report unavailable entries rather than bypassing it.

## 4. Separable research-credit service

Research credits should be a standalone ledger-backed capsule, not a numeric
field that farming components mutate. Orchade depends only on this public port:

```ts
type ResearchCreditAmount = number; // non-negative integer minor units

interface ResearchCreditService {
  getBalance(accountId: string): Promise<{ balance: ResearchCreditAmount; version: string }>;
  earn(request: {
    accountId: string;
    amount: ResearchCreditAmount;
    reason: string;
    source: { system: string; eventId: string };
    idempotencyKey: string;
  }): Promise<ResearchCreditReceipt>;
  spend(request: {
    accountId: string;
    amount: ResearchCreditAmount;
    reason: string;
    idempotencyKey: string;
    expectedVersion?: string;
  }): Promise<ResearchCreditReceipt>;
  listTransactions(accountId: string, cursor?: string): Promise<ResearchCreditPage>;
}
```

`ResearchCreditReceipt` contains transaction ID, account ID, signed delta,
resulting balance/version, timestamp, and an outcome such as `applied`,
`duplicate`, or `insufficient_funds`. Amount validation, non-negative balance,
idempotency, and concurrency control live behind the port.

The first adapter can store the ledger with the Orchade save/Firebase account.
Gameplay code receives the interface through dependency injection and never
imports Firebase or edits a balance directly. A future HTTP adapter can implement
the identical interface for a shared via-decide account; Orchade's research and
output adapters will not change. External awards use `source.system` plus an
externally unique `eventId`, making retries safe and the ledger auditable.

The currency capsule owns balances and transactions only. It does not know what a
tomato, manure, mission, season, or unlock is. Progression decides why to spend;
output/economy adapters decide why to earn; the currency service only applies the
ledger operation.

## Proposed module boundaries

| Module | Owns | Must not own |
| --- | --- | --- |
| `gameplay/new-game` | Versioned blank state and migrations | UI defaults, simulation math |
| `gameplay/research-credits` | Accounts, ledger, `earn`/`spend` port and adapters | Unlock rules, crop data |
| `gameplay/progression` | Projects, prerequisites, time progress, knowledge grants | Currency balance, placement |
| `gameplay/availability` | Shared season policy and reason codes | Growth effects |
| `gameplay/supply` | Data-driven placement recipes, quotes, atomic consumption | Spatial validation, invented prices |
| Existing farming/world/closed-loop modules | Their current simulation rules and outputs | Research or supply authorization |

## Confirmation points before implementation

1. Confirm zero ordinary credits and zero research credits at save creation, with
   the first research credits and restricted first-placement voucher earned
   through a time-only discovery task.
2. Confirm whether spring remains the deterministic starting season and whether
   3.5 acres remains free starting land.
3. Choose the canonical researched crop dataset, since the requested
   `crop-definitions-researched.json` is absent from this checkout.
4. Supply or approve balance rules for seed coverage, livestock purchase unit,
   and infrastructure material recipes. Until then, implementation will label
   those entries `unpriced` rather than guess.
5. Confirm that legacy `dataSeeds` migrate 1:1 into research credits and that the
   current direct research-currency-to-cash conversion is retired.
