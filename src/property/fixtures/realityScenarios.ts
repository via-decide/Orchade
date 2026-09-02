/**
 * Property Reality acceptance fixtures (Part 21).
 */
import { createPropertyRealitySnapshot, type PropertyRealitySnapshot } from '../reality';

const DECLARED_AT = '2026-08-31T00:00:00.000Z';

/** Scenario A: a user who owns no land creates a fully hypothetical property. */
export function createScenarioAVirtualProperty(): PropertyRealitySnapshot {
  return createPropertyRealitySnapshot({
    propertyId: 'orchade-property-demo-001',
    propertyRevisionId: 'orchade-property-demo-001-rev-001',
    mode: 'VIRTUAL',
    declaredAt: DECLARED_AT,
    declaredBy: 'user:demo',
    basisRefs: ['assumption:hypothetical-10-guntha-parcel'],
    notes: 'Hypothetical 10-guntha property. The user does not own land.',
    entities: [
      { entityId: 'virtual-tank', status: 'VIRTUAL' },
      { entityId: 'virtual-solar', status: 'VIRTUAL' },
      { entityId: 'virtual-vegetable-production', status: 'VIRTUAL' },
      { entityId: 'virtual-orchard', status: 'VIRTUAL' },
      { entityId: 'virtual-irrigation', status: 'VIRTUAL' },
      { entityId: 'virtual-pump', status: 'VIRTUAL' },
    ],
  });
}

/** Scenario B: an actual, physically documented property. REAL never implies every parameter is MEASURED. */
export function createScenarioBRealProperty(): PropertyRealitySnapshot {
  return createPropertyRealitySnapshot({
    propertyId: 'orchade-property-real-001',
    propertyRevisionId: 'orchade-property-real-001-rev-001',
    mode: 'REAL',
    declaredAt: DECLARED_AT,
    declaredBy: 'user:demo',
    basisRefs: ['survey:orchade-property-real-001', 'photo-evidence:orchade-property-real-001'],
    entities: [
      { entityId: 'tank-existing', status: 'PHYSICAL' },
      { entityId: 'tank-level-sensor', status: 'PHYSICAL' },
    ],
  });
}

/** Scenario C: a virtual 10-guntha farm plus a physical LogicHub controller on a bench -- no land owned. */
export function createScenarioCHybridWithoutLand(): PropertyRealitySnapshot {
  return createPropertyRealitySnapshot({
    propertyId: 'orchade-property-demo-001',
    propertyRevisionId: 'orchade-property-demo-001-rev-002-hybrid-bench',
    mode: 'HYBRID',
    declaredAt: DECLARED_AT,
    declaredBy: 'user:demo',
    basisRefs: ['logichub-project:pump-fixture-001', 'bench-log:controller-001'],
    notes: 'Virtual farm remains simulated; the bench controller is a real, physically tested device.',
    entities: [
      { entityId: 'virtual-vegetable-production', status: 'VIRTUAL' },
      { entityId: 'virtual-orchard', status: 'VIRTUAL' },
      { entityId: 'irrigation-controller-bench', status: 'PHYSICAL' },
      { entityId: 'virtual-pump', status: 'VIRTUAL' },
    ],
  });
}

/** Scenario D: a real property considers a Daxini pump candidate. Not purchased, not installed, not PHYSICAL. */
export function createScenarioDHybridDaxiniCandidate(): PropertyRealitySnapshot {
  return createPropertyRealitySnapshot({
    propertyId: 'orchade-property-real-001',
    propertyRevisionId: 'orchade-property-real-001-rev-002-candidate',
    mode: 'HYBRID',
    declaredAt: DECLARED_AT,
    declaredBy: 'user:demo',
    basisRefs: ['daxini-listing:pump-daxini-003'],
    notes: 'Existing tank is real; the Daxini pump is a candidate under evaluation, not purchased.',
    entities: [
      { entityId: 'tank-existing', status: 'PHYSICAL' },
      { entityId: 'pump-daxini-003', status: 'CANDIDATE' },
    ],
  });
}
