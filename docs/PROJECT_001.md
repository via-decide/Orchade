# PROJECT 001 — deterministic self-sufficient homestead loop

PROJECT 001 turns the Plot Planner into the user-facing adapter for one deterministic homestead simulation subsystem.

```text
Plot / scenario input
↓
Canonical schema-v2 scenario + immutable revision
↓
Existing DeterministicRandom snapshot
↓
Daily coupled transition
↓
Machine-readable events and causal failures
↓
Analysis-ready daily records
↓
Existing replay frames + checksums
↓
Evidence-backed revision comparison
```

## Daily system order

One tick equals one day:

1. select the explicit seasonal climate profile and sample deterministic weather;
2. capture rainfall, route overflow, and subtract leakage/evaporation;
3. satisfy household and livestock water before irrigation;
4. reconcile solar, biomass, battery, grid, loads, losses, and pump availability;
5. apply irrigation only when both water and pump energy exist;
6. consume livestock feed/water and collect food/manure;
7. mature and apply normalized compost, recording any nutrient deficit;
8. allocate finite household labour across farm, harvest, animal, and revenue work;
9. advance crop condition and harvest output under water, energy, nutrient, frost, and labour constraints;
10. reconcile household calories, explicit food purchases, and shortages;
11. post explicit revenue activities and defined costs to cash;
12. record observations, failures, component metrics, replay frame, and checksum.

## Balance boundaries

Water uses litres and never goes negative:

```text
previous storage + captured rainfall + explicit external water
- household use - livestock use - energy-authorized irrigation
- evaporation - leakage = bounded tank + pond storage + overflow
```

Energy uses kWh and gates irrigation:

```text
solar + biomass + battery discharge + permitted grid import
= household load + farm load + pump load + losses + shortage
```

Nutrients use normalized units. This avoids claiming unsupported N/P/K precision while still measuring internal compost supply against total crop requirement.

Revenue occurs only when an activity has an explicit frequency, capacity, price, cost, labour requirement, and evidence level. Merely enabling a revenue category does not create income.

## Component metrics

The engine exposes food self-sufficiency, water independence, energy independence, nutrient circularity, property cost coverage, household economic coverage, and labour feasibility separately. Labour values above `1` mean the plan requires more labour than the scenario supplies. No composite score is generated.

## Dogfood demonstration

The checked-in demonstration runs a four-person, 0.75-acre baseline for 365 days with seed `orchade-project-001-fixed`, then creates revision `project-001-rev-002`, changing only storage from 5,000 L to 12,000 L while holding weather, household, crops, livestock, energy, and policy constant.

| Evidence | Baseline | Storage revision |
|---|---:|---:|
| Scenario hash | `93f2fcc9` | `f83ae8d3` |
| Final state hash | `e9b4b178` | `cc4e9785` |
| Water-shortage failures | 512 | 499 |
| Food self-sufficiency | 71.89% | 72.86% |
| Household economic coverage | 27.79% | 27.95% |

The result supports the bounded claim that additional starting storage reduced shortage events under this explicit assumption set. It does not prove that 0.75 acre guarantees self-sufficiency or that storage is the only constraint. The first recorded baseline constraint is a day-1 labour overload: 770 required minutes against 480 available minutes.

## Evidence and revisions

Failures carry measured state, threshold, entity, immediate cause, upstream causes, evidence references, and a recovery option. Scenario revisions never overwrite their parent and record changes, rationale, evidence references, parent revision, and a caller-supplied timestamp. Learned rules are rejected unless every evidence reference exists in the simulation run.

## Scientific boundary

All coefficients are explicit scenario assumptions. Determinism makes them testable; it does not make them validated. Climate imports, physical sensors, calibration, detailed soil chemistry, veterinary models, actuator control, and unrestricted AI control remain outside PROJECT 001.
