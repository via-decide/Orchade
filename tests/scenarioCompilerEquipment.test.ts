import { applyEquipmentInstanceDeltas } from '../src/property/scenarioCompiler';
import { PROJECT_001_BASELINE_SCENARIO } from '../src/simulation/homestead/project001Scenario';
import type { PropertyEquipmentInstance } from '../src/property/propertyEquipment';

const PROPERTY_ID = 'property-test-001';
const REVISION_ID = 'revision-test-001';

function instance(overrides: Partial<PropertyEquipmentInstance> & { configuration: PropertyEquipmentInstance['configuration'] }): PropertyEquipmentInstance {
  return {
    instanceId: 'instance-default',
    propertyId: PROPERTY_ID,
    propertyRevisionId: REVISION_ID,
    equipmentTwinId: 'twin-default',
    equipmentTwinRevisionId: 'twin-rev-default',
    realityStatus: 'VIRTUAL',
    quantity: 1,
    resourceConnectionRefs: [],
    deviceSourceRefs: [],
    active: true,
    evidenceRefs: [],
    ...overrides,
  };
}

export function runScenarioCompilerEquipmentTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (condition) passed += 1;
    else { failed += 1; errors.push(message); console.error('  ❌ ' + message); }
  };

  const scenario = PROJECT_001_BASELINE_SCENARIO;

  // 1. Two offsetting instances (a large production instance, then a smaller
  // consumption instance) must sum BEFORE the floor is applied, not clamp
  // each step individually. If the production instance's negative delta is
  // clamped to zero before the consumption instance is folded in, the
  // consumption-only result is wrong (too high). The correct total is
  // baseline + sum(deltas), floored once.
  {
    const production = instance({
      instanceId: 'instance-large-producer',
      configuration: { energyProductionKwhPerDay: scenario.energy.farmBaseLoadKwhPerDay + 20 },
    });
    const consumption = instance({
      instanceId: 'instance-small-consumer',
      configuration: { energyConsumptionKwhPerDay: 8 },
    });

    const resultProductionFirst = applyEquipmentInstanceDeltas(scenario, [production, consumption], PROPERTY_ID, REVISION_ID);
    const resultConsumptionFirst = applyEquipmentInstanceDeltas(scenario, [consumption, production], PROPERTY_ID, REVISION_ID);

    const expected = Math.max(0, scenario.energy.farmBaseLoadKwhPerDay + (8 - (scenario.energy.farmBaseLoadKwhPerDay + 20)));

    assert(
      resultProductionFirst.energy.farmBaseLoadKwhPerDay === expected,
      `1. Order-independent sum-then-floor: production-first order gives ${resultProductionFirst.energy.farmBaseLoadKwhPerDay}, expected ${expected}`,
    );
    assert(
      resultConsumptionFirst.energy.farmBaseLoadKwhPerDay === expected,
      `1. Order-independent sum-then-floor: consumption-first order gives ${resultConsumptionFirst.energy.farmBaseLoadKwhPerDay}, expected ${expected}`,
    );
    assert(
      resultProductionFirst.energy.farmBaseLoadKwhPerDay === resultConsumptionFirst.energy.farmBaseLoadKwhPerDay,
      '1. Instance processing order must not change the compiled result',
    );
  }

  // 2. An instance belonging to a different property is rejected, not silently folded in.
  {
    const foreign = instance({ instanceId: 'instance-foreign', propertyId: 'property-other', configuration: {} });
    let threw = false;
    try { applyEquipmentInstanceDeltas(scenario, [foreign], PROPERTY_ID, REVISION_ID); } catch { threw = true; }
    assert(threw, '2. Equipment instance from a different property is rejected');
  }

  // 3. An instance belonging to a different (e.g. stale) revision of the same property is rejected.
  {
    const stale = instance({ instanceId: 'instance-stale-revision', propertyRevisionId: 'revision-old', configuration: {} });
    let threw = false;
    try { applyEquipmentInstanceDeltas(scenario, [stale], PROPERTY_ID, REVISION_ID); } catch { threw = true; }
    assert(threw, '3. Equipment instance from a stale/different revision of the same property is rejected');
  }

  // 4. Zero instances is a no-op that returns the baseline scenario's own values unchanged.
  {
    const result = applyEquipmentInstanceDeltas(scenario, [], PROPERTY_ID, REVISION_ID);
    assert(result.energy.farmBaseLoadKwhPerDay === scenario.energy.farmBaseLoadKwhPerDay, '4. No equipment instances leaves energy demand unchanged');
    assert(result.water.externalWaterLPerDay === scenario.water.externalWaterLPerDay, '4. No equipment instances leaves water supply unchanged');
  }

  return { passed, failed, errors };
}
