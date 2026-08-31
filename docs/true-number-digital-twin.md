# Orchade true-number and digital-twin contracts

## Product boundary

Orchade has one canonical Project 001 homestead engine. PLAN, SIMULATE, LIVE, COMPARE, and CALIBRATE are modes over that model; they are not separate farm engines.

The authoritative simulation path remains:

`scenario -> createProject001InitialState -> advanceProject001Day -> state/events -> replay/checksum`

This contract layer does not change the physical equations, deterministic RNG consumption, daily timestep, replay frames, or canonical state checksum path.

## True numbers

Project 001 already stores explicit physical/economic quantities. New UI and integrations should expose those values directly rather than translating them into points or fictional rewards.

Canonical internal conventions used by this contract layer:

- land: `m2`
- water: `L`, rainfall `mm`
- energy: `kWh`, instantaneous capacity `W` when modeled
- temperature: `degC`
- mass: `kg`
- food: `kcal` and `kg`
- labour: `min`
- money: scenario currency (Project 001 currently uses `INR`)
- time: deterministic day/tick
- normalized state ratios/percentages remain explicitly labelled when physical detail is not modeled

`units.ts` owns acre/m2, sqft/m2, US-gallon/L, inch/mm, Wh/kWh, and flow conversions. UI code should not duplicate these constants.

## Parameter provenance

Runtime state stays numerically lean. Parameter provenance is held in a registry keyed by scenario paths.

Supported origins:

- `MEASURED`
- `RESEARCHED`
- `REGIONAL_DEFAULT`
- `USER_ASSUMPTION`
- `DERIVED`

A `ParameterProvenanceRecord` can carry source/methodology references, confidence, validity, geography, cultivar, notes, and model identity. The checked-in Project 001 fixture is explicitly described by the repository as dogfood assumptions, so `createScenarioParameterProvenanceRegistry()` defaults its parameters to `USER_ASSUMPTION` rather than silently upgrading them to researched facts. A caller may supply source-backed overrides.

Derived values use `DerivedValueEvidence`: model id/version, parameter refs, observation refs, event refs, output metric/value/unit, scenario revision, and parameter revision. `DERIVED` therefore means traceable model output, not an opaque formula result.

## Farm profiles are parameters, not physics

`FarmProfile` packages a scenario parameter set plus descriptive profile metadata and capability declarations. `createScenarioFromFarmProfile()` only clones and validates the scenario. `runFarmProfile()` always calls the normal Project 001 run path.

Two fixtures prove the boundary:

- `SMALL_MIXED_FARM_PROFILE`: the existing ~0.75-acre mixed household system.
- `BROADACRE_FARM_PROFILE`: a large-area, low-diversity parameter fixture.

The broadacre fixture does **not** invent tractor, fuel, harvester, grain-drying, or logistics equations. Those capabilities are declared `NOT_MODELED`. Its labour, water, energy, and cash values are explicit scenario assumptions processed by the same engine.

No code path checks a farm-profile id to select special water/crop/nutrient equations.

## Model capability declaration

`PROJECT_001_MODEL_CAPABILITIES` distinguishes `SUPPORTED`, `ESTIMATE_ONLY`, and `NOT_MODELED` capabilities. Current explicit gaps include mechanized field operations, fuel combustion, grain logistics, detailed ET0, and sub-day energy dispatch.

This is deliberate: absence of a model is represented as absence, not fake precision.

## Canonical observation contract

The existing Project 001 `ObservationRecord` is extended rather than replaced. It now supports:

- simulated sensor evidence
- physical sensor evidence
- manual observations
- imported observations
- simulation tick and wall-clock observation time as distinct concepts
- quality and validation state
- calibration/provenance references
- source trust and verification references
- device sequence/idempotency data

Simulated evidence uses deterministic tick/day as authoritative time. Physical evidence uses caller-supplied `observedAt`/`receivedAt`; physical simulation transitions never call `Date.now()`.

## Observation ingestion

`validateAndNormalizeObservation()` is a pure boundary:

`raw observation -> metric check -> unit normalization -> source/device check -> entity check -> timestamp/tick check -> calibration check -> range check -> canonical ObservationRecord`

It fails closed for unsupported metrics/units, unknown or disabled sources, impossible values, missing required calibration, stale/future physical readings, invalid entities, and non-finite values.

Duplicate observation IDs and duplicate `(sourceId, sequence)` readings return `DUPLICATE` and are idempotent.

Capacity contradictions such as a tank reading above the known physical tank capacity are marked `SUSPECT` by policy rather than silently becoming canonical truth.

No validator function mutates `ProjectHomesteadState`.

## Device identity

`DeviceSource` reserves identity, property/entity attachment, kind, optional protocol label, emitted metrics, calibration reference, enabled state, trust, verification reference, and serializable metadata.

Protocol strings are metadata only. This PR contains no RS-485, Modbus, CAN, GPIO, LoRaWAN, MQTT, cloud IoT, inverter, BMS, or camera driver.

## Observation is not state

A validated physical observation still does not directly become canonical state.

`evaluateObservationReconciliation()` produces an auditable `ReconciliationDecision`:

- `ACCEPT`
- `REJECT`
- `HOLD`
- `SUSPECT`

An accepted decision may name a target state path, previous value, and proposed value. It still does not apply the mutation. That future state transition must be explicit and replayable from ordered evidence.

Simulated observations are held rather than treated as LIVE state input.

## Prediction and comparison

`PredictionRecord` identifies:

- property/scenario/entity/metric
- predicted value/unit
- prediction tick/time
- originating state hash when available
- derivation reference
- simulator version
- scenario revision
- model-parameter revision
- seed

`comparePredictionToObservation()` produces deterministic signed error, absolute error, and relative error (when the predicted denominator is non-zero). Prediction and observation must already use the same normalized metric/unit.

## Calibration

A comparison may create a `CalibrationCandidate`, but candidates start as `PROPOSED`.

A candidate can list possible parameter refs without claiming which one caused an error. It may optionally contain one explicit proposed parameter change after analysis.

`createModelParameterRevision()` refuses to create a revision unless:

1. the candidate has been explicitly marked `ACCEPTED`, and
2. a concrete parameter change is present.

The function returns a revision object; it does not mutate an existing scenario or historical run. Old Project 001 simulation results therefore remain immutable.

## Digital-twin modes

### PLAN

Scenario design. No assumption of live property telemetry.

### SIMULATE

Canonical state advances through deterministic Project 001 transitions. Simulated observations can be emitted from the same observation metric namespace.

### LIVE

Physical observations arrive as evidence. Validation and reconciliation are explicit. Wall-clock time is input evidence, while the simulator may continue deterministic forecasts from a known state.

### COMPARE

A model prediction is compared with a normalized measured observation using a pinned model/scenario identity.

### CALIBRATE

Prediction error becomes diagnostic evidence. Parameter changes are proposed, reviewed, and accepted into a new explicit revision; history is never rewritten.

LIVE is intentionally not a boolean that lets sensors overwrite simulation fields.

## Simulation as forecast

The future LIVE path is:

`current reconciled state -> fork deterministic simulation -> 1/7/30-day forecast -> prediction records -> later measured observations -> comparison`

This PR defines the identity/reference contracts, not a forecasting scheduler.

## Local-first control boundary

The target edge path is:

`sensor/meter -> MCU/PLC/edge node -> local gateway -> normalize/validate -> local evidence log -> Orchade live evidence -> optional cloud sync`

Internet access must never be a prerequisite for local safety interlocks.

`ActuatorCommand` and `ControlDecision` are future-safe representations only. `evaluateControlDecision()` authorizes a command only when all required checks are explicitly `PASS`; any `FAIL` rejects and any missing/unknown check defers.

This enforces the architectural rule:

`high-level proposal -> deterministic safety envelope -> authorized/rejected command`

No LLM receives unrestricted actuator authority.

## Post-action evidence

`PostActionVerification` represents the future distinction between command transmission and physical success:

`authorized -> sent -> acknowledged -> post-action observation -> expected change? -> verified/failed`

No actuator transport is implemented here.

## Replay distinction

Simulation replay remains:

`same scenario + seed + model revision -> same deterministic result`

Future live-world reconstruction is different:

`same ordered external observations + same reconciliation rules + same model version -> same reconstructed canonical history`

Wall-clock hardware behaviour itself is not made deterministic. Processing recorded evidence is.

## True-number demonstration

`runProject001TrueNumberDemonstration()` runs the existing Project 001 scenario for 365 days and exposes at least:

- crop area and total harvested kg
- tank level in litres
- solar generation in kWh
- labour requirement in minutes
- cash balance in INR

Each display value points either to parameter provenance or a derivation record and canonical state path. No game-unit conversion is introduced.

## Digital-twin fixture demonstration

`runDigitalTwinFixtureDemonstration()`:

1. runs the same deterministic Project 001 engine,
2. records a tank-level prediction,
3. injects a fixed fixture `PHYSICAL_SENSOR` reading,
4. validates/normalizes it,
5. creates a reconciliation proposal without mutating state,
6. compares prediction vs observation,
7. creates a `PROPOSED` calibration candidate,
8. explicitly does not claim the discrepancy's root cause.

The fixture is test evidence, not a claim about a real property.

## Non-goals preserved

No firmware, fieldbus stack, network service, cloud IoT platform, real pump/valve authority, autonomous calibration, weather API, computer vision, detailed ET0 engine, machinery simulator, GIS, drone integration, or hidden reward currency is introduced by this contract layer.
