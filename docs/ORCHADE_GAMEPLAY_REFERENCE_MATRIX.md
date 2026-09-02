# Orchade Gameplay Reference Matrix

> "Game references may inform interaction design and systems presentation.
> They are not evidence for Orchade's physical, agronomic, engineering,
> economic or safety models."

This document freezes which UX/system patterns from eight reference
products Orchade may borrow, and which it must not. It exists so future
work has a standing answer to "can we do it like game X did" without
re-litigating the question each time, and so nothing from a reference
product is ever mistaken for validated physics.

Reference products (UX/system-design references only):

1. Stationeers
2. Eco
3. Farming Simulator 25
4. Ranch Simulator
5. Oxygen Not Included
6. Medieval Dynasty
7. Solarpunk
8. Timberborn

## Classification vocabulary

Every reference pattern uses exactly one of these, or a deliberate
combination:

- **COPY UX** — reuse the interaction/presentation pattern directly.
- **ADAPT SYSTEM** — reuse the systems idea, but only through Orchade's
  canonical Property, resource, evidence, and deterministic simulation
  contracts — never as an independent parallel system.
- **DO NOT COPY** — the mechanic conflicts with Orchade's purpose, or
  would introduce fictional, duplicated, or engagement-driven state.
- **ORCHADE DIFFERENTIATOR** — this capability must remain explicitly
  different from ordinary games; no reference product does this.

## Game-by-game matrix

### Stationeers

| | |
|---|---|
| **COPY UX** | equipment inspection; connection visibility; clear machine state; system dependency visibility |
| **ADAPT SYSTEM** | coupled water/energy/equipment networks; deterministic automation envelopes; resource ports and dependencies |
| **DO NOT COPY** | hardcore complexity as default UX; fictional game physics presented as real engineering; opaque machine formulas |
| **ORCHADE DIFFERENTIATOR** | equipment has exact identity; versioned EquipmentTwin; parameter provenance; explicit model capability; bench/field evidence status |

### Eco

| | |
|---|---|
| **COPY UX** | consequence views; system-impact displays; data-backed state inspection |
| **ADAPT SYSTEM** | ecosystem/resource consequences; evidence-led decisions; production and property dependencies |
| **DO NOT COPY** | meteor objective; government/election systems; fictional currencies as primary progression |
| **ORCHADE DIFFERENTIATOR** | actual property history; expert evidence; plan-vs-real comparison; calibration history |

### Farming Simulator 25

| | |
|---|---|
| **COPY UX** | recognizable equipment catalog; equipment browsing; construction workflow; recognizable agricultural operations |
| **ADAPT SYSTEM** | equipment capacity; crop/livestock systems; weather exposure; farm production dependencies |
| **DO NOT COPY** | vehicle driving as product core; brand collection as progression; adding machinery unsupported by Orchade physics |
| **ORCHADE DIFFERENTIATOR** | test equipment against a specific Property before buying; exact EquipmentTwin revision; impact on water/energy/labour/cash/failures |

### Ranch Simulator

| | |
|---|---|
| **COPY UX** | blank/degraded property → functioning property; clear infrastructure progression |
| **ADAPT SYSTEM** | livestock routines; feed; water; manure; labour; production economics |
| **DO NOT COPY** | hunting/combat; repetitive first-person chores as mandatory interaction |
| **ORCHADE DIFFERENTIATOR** | labour burden is a measured property constraint; routines can become protocols and evidence-backed operations |

### Oxygen Not Included

| | |
|---|---|
| **COPY UX** | overlays; warnings; bottleneck inspection; network tracing; causal failure presentation |
| **ADAPT SYSTEM** | explicit water/energy/material dependency graphs; upstream failure propagation |
| **DO NOT COPY** | game thermodynamics imported as engineering truth; unsupported micro-management models |
| **ORCHADE DIFFERENTIATOR** | unsupported capability remains NOT_MODELED; assumptions and formulas expose provenance |

### Medieval Dynasty

| | |
|---|---|
| **COPY UX** | property growth; building previews; understandable long-term development |
| **ADAPT SYSTEM** | household demand; labour capacity; seasons; property expansion |
| **DO NOT COPY** | quests as product structure; NPC dynasty progression; arbitrary RPG skill trees/XP |
| **ORCHADE DIFFERENTIATOR** | progress comes from evidence, capability, and improved physical state |

### Solarpunk

| | |
|---|---|
| **COPY UX** | approachable building; readable renewable-energy status; calm systems presentation |
| **ADAPT SYSTEM** | solar; storage; automation; weather-dependent production |
| **DO NOT COPY** | fantasy world dependency; crafting grind; exploration as system progression |
| **ORCHADE DIFFERENTIATOR** | simulated energy system can later become a real monitored installation |

### Timberborn

| | |
|---|---|
| **COPY UX** | water overlays; drought warnings; storage visibility; scarcity visualization |
| **ADAPT SYSTEM** | catchment; storage; irrigation; resilience scenarios |
| **DO NOT COPY** | copying its water physics into Orchade; claiming high-fidelity hydraulics without evidence |
| **ORCHADE DIFFERENTIATOR** | explicit assumptions; deterministic same-seed stress tests; later measured validation |

## Feature decision matrix

| Feature | Reference | Decision | Rule |
|---|---|---|---|
| Drag/place infrastructure | FS25 / Ranch / Medieval Dynasty / Solarpunk | COPY UX | placement should be tactile and obvious |
| Inspect selected object | Stationeers / ONI | COPY UX | show inputs, outputs, state, limits, evidence |
| Resource overlays | ONI / Timberborn | COPY UX | water / energy / nutrients / access / labour |
| Resource connection graph | Stationeers / ONI | ADAPT SYSTEM | canonical Property relationships only |
| Water resilience | Timberborn / ONI | ADAPT SYSTEM | tank / pond / catchment / irrigation / shortage |
| Renewable microgrid | Solarpunk / Stationeers | ADAPT SYSTEM | Project 001 physics remains authoritative |
| Equipment catalog | Farming Simulator | COPY UX | browse by purpose/capability, not only product name |
| Equipment technical behaviour | Stationeers | ADAPT SYSTEM | EquipmentTwin + provenance + capability status |
| Crops + seasons | FS25 / Eco / Medieval Dynasty | ADAPT SYSTEM | existing Orchade season/prerequisite contracts remain authoritative |
| Livestock | Ranch / FS25 | ADAPT SYSTEM | feed + water + labour + manure + cash remain coupled |
| Ecological consequences | Eco | ADAPT SYSTEM | resource/evidence relationships |
| Failure diagnosis | ONI / Stationeers | COPY UX + ADAPT SYSTEM | WHAT FAILED → WHY → UPSTREAM CAUSE |
| Time advancement | simulation games | COPY UX | fast-forward is presentation only; authoritative Project 001 timestep remains deterministic |
| XP / arbitrary unlocks | — | DO NOT COPY | — |
| Artificial scarcity for engagement | — | DO NOT COPY | — |
| Generic crafting grind | — | DO NOT COPY | — |
| Hidden formulas | — | DO NOT COPY | — |
| Real property geometry | — | ORCHADE DIFFERENTIATOR | — |
| Real physical evidence | — | ORCHADE DIFFERENTIATOR | — |
| Expert model revisions | — | ORCHADE DIFFERENTIATOR | — |
| Same-seed revision comparison | — | ORCHADE DIFFERENTIATOR | — |
| PLAN ↔ ACTUAL | — | ORCHADE DIFFERENTIATOR | — |
| Test equipment before buying | — | ORCHADE DIFFERENTIATOR | — |
| Build equipment before buying | — | ORCHADE DIFFERENTIATOR | — |
| Explicit UNKNOWN | — | ORCHADE DIFFERENTIATOR | — |

## PR governance template

Any future PR that introduces a substantial Orchade UI/interaction pattern
must answer these fields in its description:

```
REFERENCE
  Which reference product/pattern influenced this?

CLASSIFICATION
  COPY UX | ADAPT SYSTEM | DO NOT COPY | ORCHADE DIFFERENTIATOR

PROPERTY INTEGRATION
  Which canonical Property entities/capabilities are read or changed?

MODEL IMPACT
  Does this alter simulation physics? YES / NO
  If YES: name the model/revision/contracts affected.

EVIDENCE IMPACT
  Does this create, change, or display evidence?
```

A PR that cannot answer "PROPERTY INTEGRATION" and "MODEL IMPACT" plainly
is very likely building a parallel system instead of adapting the
canonical one, and should be reworked before merge.
