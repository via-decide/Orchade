/**
 * Property Reality acceptance fixtures (Part 21 / Section 65's Final
 * Acceptance Demo Step 1), rebuilt on the real `Property`/`PropertyRevision`
 * foundation. Supersedes the earlier freestanding `PropertyRealitySnapshot`
 * fixtures in `realityScenarios.ts` (kept, unused by new code -- see
 * docs/PROPERTY_MODEL_MIGRATION.md).
 */
import { gunthaToM2 } from '../../simulation/homestead/units';
import { createPropertyEntity, type PropertyEntity } from '../entity';
import type { PropertyIntent } from '../intent';
import { advancePropertyToRevision, createProperty, type Property } from '../property';
import type { PropertyRealityDeclaration } from '../reality';
import { type PropertyResourceConnection } from '../resourceGraph';
import { createPropertyRevision, type PropertyRevision } from '../revision';

const CREATED_AT = '2026-08-31T00:00:00.000Z';
export const DEMO_PROPERTY_PARCEL_AREA_M2 = gunthaToM2(10);

function demoIntent(propertyId: string, seed: string, name: string): PropertyIntent {
  return {
    propertyId,
    name,
    purpose: 'HOMESTEAD',
    measurementSystem: 'metric',
    householdIntent: { size: 4 },
    goals: {
      foodSelfSufficiency: true,
      waterIndependence: true,
      energyIndependence: true,
      nutrientCircularity: true,
      labourFeasibility: true,
      economicCoverage: true,
    },
    planningHorizonDays: 365,
    seed,
  };
}

function realityDeclaration(propertyId: string, mode: PropertyRealityDeclaration['mode'], basisRefs: string[], notes?: string): PropertyRealityDeclaration {
  return { propertyId, mode, declaredAt: CREATED_AT, declaredBy: 'user:demo', basisRefs, notes };
}

/** Section 65, Step 1: a user who owns no land creates a fully hypothetical property. */
export function createVirtualDemoProperty(): { property: Property; revision: PropertyRevision } {
  const propertyId = 'orchade-property-demo-001';
  const intent = demoIntent(propertyId, 'orchade-property-demo-001-fixed', '10-Guntha Sovereign Homestead (Virtual)');

  const entities: PropertyEntity[] = [
    createPropertyEntity({ entityId: 'parcel', propertyId, entityType: 'PARCEL', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: DEMO_PROPERTY_PARCEL_AREA_M2 } }),
    createPropertyEntity({ entityId: 'residence', propertyId, entityType: 'RESIDENCE', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 80 }, resourceInputs: [{ resourceType: 'ENERGY', ratePerDay: 6 }, { resourceType: 'WATER', ratePerDay: 320 }] }),
    createPropertyEntity({ entityId: 'vegetable-beds', propertyId, entityType: 'VEGETABLE_BED', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 60 }, resourceInputs: [{ resourceType: 'WATER', ratePerDay: 84 }] }),
    createPropertyEntity({ entityId: 'orchard', propertyId, entityType: 'ORCHARD', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 80 }, resourceInputs: [{ resourceType: 'WATER', ratePerDay: 20 }] }),
    createPropertyEntity({ entityId: 'rain-catchment', propertyId, entityType: 'RAIN_CATCHMENT', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 60 }, resourceOutputs: [{ resourceType: 'WATER', ratePerDay: 0 }] }),
    createPropertyEntity({ entityId: 'water-tank', propertyId, entityType: 'WATER_TANK', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 4, capacity: 5000 }, resourceInputs: [{ resourceType: 'WATER', ratePerDay: 0 }], resourceOutputs: [{ resourceType: 'WATER', ratePerDay: 0 }] }),
    createPropertyEntity({ entityId: 'solar-array', propertyId, entityType: 'SOLAR_ARRAY', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 12, capacity: 3 } }),
    createPropertyEntity({ entityId: 'battery', propertyId, entityType: 'BATTERY', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 1, capacity: 10 }, resourceInputs: [{ resourceType: 'ENERGY', ratePerDay: 0 }], resourceOutputs: [{ resourceType: 'ENERGY', ratePerDay: 6 }] }),
    createPropertyEntity({ entityId: 'compost', propertyId, entityType: 'COMPOST', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'VIRTUAL', status: 'ACTIVE', physical: { footprintM2: 4 } }),
  ];

  const connections: PropertyResourceConnection[] = [
    { connectionId: 'conn-catchment-tank', propertyId, resourceType: 'WATER', fromEntityId: 'rain-catchment', toEntityId: 'water-tank', mode: 'CONTINUOUS', enabled: true, constraints: [], evidenceRefs: [] },
    { connectionId: 'conn-tank-residence', propertyId, resourceType: 'WATER', fromEntityId: 'water-tank', toEntityId: 'residence', mode: 'CONTINUOUS', enabled: true, constraints: [], evidenceRefs: [] },
    { connectionId: 'conn-tank-beds', propertyId, resourceType: 'WATER', fromEntityId: 'water-tank', toEntityId: 'vegetable-beds', mode: 'CONTINUOUS', enabled: true, constraints: [], evidenceRefs: [] },
    { connectionId: 'conn-tank-orchard', propertyId, resourceType: 'WATER', fromEntityId: 'water-tank', toEntityId: 'orchard', mode: 'CONTINUOUS', enabled: true, constraints: [], evidenceRefs: [] },
    { connectionId: 'conn-solar-battery', propertyId, resourceType: 'ENERGY', fromEntityId: 'solar-array', toEntityId: 'battery', mode: 'CONTINUOUS', enabled: true, constraints: [], evidenceRefs: [] },
    { connectionId: 'conn-battery-residence', propertyId, resourceType: 'ENERGY', fromEntityId: 'battery', toEntityId: 'residence', mode: 'CONTINUOUS', enabled: true, constraints: [], evidenceRefs: [] },
  ];

  const revision = createPropertyRevision({
    revisionId: 'orchade-property-demo-001-rev-001',
    propertyId,
    createdAt: CREATED_AT,
    createdBy: 'user:demo',
    rationale: 'Baseline virtual homestead plan.',
    realityDeclaration: realityDeclaration(propertyId, 'VIRTUAL', ['assumption:hypothetical-10-guntha-parcel'], 'Hypothetical 10-guntha property. The user does not own land.'),
    graph: { propertyId, entities, resourceGraph: { propertyId, connections } },
    intent,
  });

  const property = createProperty({ propertyId, name: intent.name, createdAt: CREATED_AT, createdBy: 'user:demo' }, revision);
  return { property, revision };
}

/** An actual, physically documented property. REAL never implies every parameter is MEASURED. */
export function createRealDemoProperty(): { property: Property; revision: PropertyRevision } {
  const propertyId = 'orchade-property-real-001';
  const intent = demoIntent(propertyId, 'orchade-property-real-001-fixed', 'Documented Real Homestead');
  const entities: PropertyEntity[] = [
    createPropertyEntity({ entityId: 'parcel', propertyId, entityType: 'PARCEL', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'PHYSICAL', status: 'ACTIVE', physical: { footprintM2: DEMO_PROPERTY_PARCEL_AREA_M2 } }),
    createPropertyEntity({ entityId: 'tank-existing', propertyId, entityType: 'WATER_TANK', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'PHYSICAL', status: 'INSTALLED', physical: { footprintM2: 4, capacity: 5000 } }),
  ];
  const revision = createPropertyRevision({
    revisionId: 'orchade-property-real-001-rev-001',
    propertyId,
    createdAt: CREATED_AT,
    createdBy: 'user:demo',
    rationale: 'Documented real property baseline.',
    realityDeclaration: realityDeclaration(propertyId, 'REAL', ['survey:orchade-property-real-001', 'photo-evidence:orchade-property-real-001']),
    graph: { propertyId, entities, resourceGraph: { propertyId, connections: [] } },
    intent,
  });
  const property = createProperty({ propertyId, name: intent.name, createdAt: CREATED_AT, createdBy: 'user:demo' }, revision);
  return { property, revision };
}

/** Section 65 / Part 2 Case 1: a virtual 10-guntha farm plus a physical LogicHub bench device -- no land owned. */
export function createHybridBenchDemoProperty(): { property: Property; revision: PropertyRevision } {
  const virtual = createVirtualDemoProperty();
  const propertyId = virtual.property.propertyId;
  const entities: PropertyEntity[] = [
    ...virtual.revision.graph.entities,
    createPropertyEntity({ entityId: 'bench-pump-controller', propertyId, entityType: 'PUMP', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'PHYSICAL', status: 'INSTALLED', physical: {}, evidenceRefs: ['bench-log:controller-001'] }),
  ];
  const revision = createPropertyRevision({
    revisionId: 'orchade-property-demo-001-rev-002-hybrid-bench',
    propertyId,
    parentRevisionId: virtual.revision.revisionId,
    createdAt: CREATED_AT,
    createdBy: 'user:demo',
    rationale: 'A physical LogicHub bench controller now exists; the farm itself remains virtual.',
    realityDeclaration: realityDeclaration(propertyId, 'HYBRID', ['logichub-project:pump-fixture-001', 'bench-log:controller-001'], 'Virtual farm remains simulated; the bench controller is a real, physically tested device.'),
    graph: { propertyId, entities, resourceGraph: virtual.revision.graph.resourceGraph },
    intent: virtual.revision.intent,
    changeSet: [{ description: 'VIRTUAL -> HYBRID: introduced physical bench controller.', entityRefs: ['bench-pump-controller'] }],
  });
  const property = advancePropertyToRevision(virtual.property, revision);
  return { property, revision };
}

/** Part 2 Case 3: a real property considers a Daxini pump candidate. Not purchased, not installed, not PHYSICAL. */
export function createHybridDaxiniCandidateProperty(): { property: Property; revision: PropertyRevision } {
  const real = createRealDemoProperty();
  const propertyId = real.property.propertyId;
  const entities: PropertyEntity[] = [
    ...real.revision.graph.entities,
    createPropertyEntity({ entityId: 'pump-daxini-003', propertyId, entityType: 'PUMP', createdAt: CREATED_AT, createdBy: 'user:demo', realityStatus: 'CANDIDATE', status: 'PLANNED', physical: {}, evidenceRefs: ['daxini-listing:pump-daxini-003'] }),
  ];
  const revision = createPropertyRevision({
    revisionId: 'orchade-property-real-001-rev-002-candidate',
    propertyId,
    parentRevisionId: real.revision.revisionId,
    createdAt: CREATED_AT,
    createdBy: 'user:demo',
    rationale: 'Evaluating a candidate Daxini pump before purchase.',
    realityDeclaration: realityDeclaration(propertyId, 'HYBRID', ['daxini-listing:pump-daxini-003'], 'Existing tank is real; the Daxini pump is a candidate under evaluation, not purchased.'),
    graph: { propertyId, entities, resourceGraph: real.revision.graph.resourceGraph },
    intent: real.revision.intent,
    changeSet: [{ description: 'REAL -> HYBRID: added candidate Daxini pump for evaluation.', entityRefs: ['pump-daxini-003'] }],
  });
  const property = advancePropertyToRevision(real.property, revision);
  return { property, revision };
}
