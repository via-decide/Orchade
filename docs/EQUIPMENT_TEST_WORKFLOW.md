# Equipment Test Workflow (Test Before Buy / Build)

`src/property/equipmentCandidateTest.ts`. Parts 15, 16, 18, 19 of ORCHADE P0.

## Pipeline

```
BASELINE SCENARIO (an existing HomesteadScenarioDefinition)
  -> resolve EquipmentTwinDefinition@revision from the registry
  -> check every REQUIRED resource port is in intent.connectedPortIds
       unconnected required port -> INFEASIBLE (stop)
  -> check performanceModel.modelType
       NOT_MODELED -> UNKNOWN (stop)
  -> clone scenario, additively apply the instance's configuration deltas
       (applyEquipmentInstanceToScenario) -- invalid result (e.g. cannot
       afford the purchase) -> INFEASIBLE (stop)
  -> compareProject001Scenarios(baseline, candidate)   <- THE existing engine,
                                                           same seed, enforced
  -> classify BENEFICIAL / HARMFUL / NO_MEANINGFUL_CHANGE from the deltas
```

There is no second simulation path. `compareProject001Scenarios` already
runs `runProject001Scenario` on both scenarios under the same seed and
duration; this module never calls a day-transition function directly.

## Commerce and simulation are separate

`runEquipmentCandidateTest` reads exactly the twin's `resourcePorts`
(for the connectivity check) and `performanceModel.modelType` (for the
NOT_MODELED check), plus whatever numeric levers the caller puts in
`intent.configuration`. It never reads `source.daxiniProductRef`,
`source.logicHubProjectRef`, `name`, `source.manufacturer`,
`economics.purchaseCostEstimate`, or any other descriptive/commercial
field. A twin's *listed* price (`economics.purchaseCostEstimate`) is
display data; only a number explicitly placed into
`instance.configuration.purchaseCostINR` ever reaches the scenario. This
is why swapping a Daxini-sourced twin for an otherwise-identical
user-defined or LogicHub-sourced twin, or changing its name/URL/listed
price, produces a byte-identical `changedMetrics` result (see the
determinism tests in `tests/equipmentCandidateTest.test.ts`).

## Configuration levers

`intent.configuration` is a flat, documented, equipment-class-agnostic set
of optional numeric keys (`applyEquipmentInstanceToScenario`). Any key not
present contributes zero. All deltas scale by `instance.quantity`.

| Key | Applied to | Direction |
|---|---|---|
| `energyConsumptionKwhPerDay` | `energy.farmBaseLoadKwhPerDay` | adds (it's a demand quantity) |
| `energyProductionKwhPerDay` | `energy.farmBaseLoadKwhPerDay` | subtracts |
| `waterConsumptionLitresPerDay` | `water.externalWaterLPerDay` | subtracts (it's a supply quantity -- opposite convention from energy) |
| `waterProductionLitresPerDay` | `water.externalWaterLPerDay` | adds |
| `labourMinutesPerDay` | `household.labourMinutesAvailablePerDay` | subtracts (equipment operator time is no longer available for other tasks) |
| `purchaseCostINR` | `economy.initialCash` | one-time subtraction |
| `dailyOperatingCostINR` | `economy.dailyPropertyOperatingCost` | adds |

`water.externalWaterLPerDay` is clamped at zero. If the resulting scenario
fails `validateHomesteadScenario` (negative cash, negative available
labour, etc.), the test returns `INFEASIBLE` rather than throwing.

## Why the pump fixture doesn't always look good

`ORCHADE-PUMP-FIXTURE-001`'s `dailyWaterMovementCapacityL` is declared on
the twin but is **not** one of the configuration levers above, because the
current Project 001 engine has no pump-throughput constraint to relax --
water availability is already governed by tank/pond/catchment fields
regardless of whether a pump exists. Testing this fixture therefore adds
real cost and energy draw with no modeled water benefit, and can honestly
return `HARMFUL` or `NO_MEANINGFUL_CHANGE`. That is correct, not a bug: an
unresolved capability (no pump-capacity model) is exactly the signal that
should escalate to a LogicHub requirement package (Part 16), not something
this system should paper over with an invented formula.

## Result classification

`EquipmentCandidateTestResult.result` is derived only from measured
deltas, never a single opaque "recommended" score:

1. **INFEASIBLE** -- a required port is unconnected, or the candidate
   scenario is invalid.
2. **UNKNOWN** -- the twin's performance model is `NOT_MODELED`.
3. **BENEFICIAL** -- failure-day counts (`FailureDelta[]`) net decrease.
   This wins even if a self-sufficiency ratio metric (e.g.
   `waterIndependence`) dips: buying in external water to clear a
   shortage is a real, reportable trade-off, not a reason to call the fix
   harmful. Failures are what a household actually experiences.
4. **HARMFUL** -- failures net increase, or (when failures are unchanged)
   more of the seven `SelfSufficiencyMetrics` ratios worsen than improve.
5. **NO_MEANINGFUL_CHANGE** -- failures unchanged and metrics wash out.

`evidenceCoverage` is a simple tally of the twin's `parameterOrigins`
values (fractions of measured/researched/assumed/derived) plus an
`unsupported` bucket when `performanceModel.modelType === 'NOT_MODELED'`.
It is presentation evidence, not an input to the classification above.

## What this does not do

No marketplace checkout, no automatic purchase, no installation, no
mutation of the baseline scenario (verified by test: running any number of
candidate tests never changes the baseline's own replay checksum), and no
privileged physics for any `source.type`.
