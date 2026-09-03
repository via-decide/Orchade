/**
 * PropertyEquipmentInstance (Part 14 of ORCHADE P0).
 *
 * Describes ONE use/placement/installation of one exact EquipmentTwin
 * revision inside one property revision. This is never the same object as
 * EquipmentTwinDefinition -- a twin describes a model; an instance
 * describes a specific deployment of it, pinned to an exact revision so
 * that updating the twin catalog can never rewrite a historical property.
 */
import type { EntityRealityStatus } from './reality';
import { type EquipmentTwinRegistry, getEquipmentTwinRevision } from './equipmentTwin';

export interface PropertyEquipmentInstance {
  instanceId: string;
  propertyId: string;
  propertyRevisionId: string;
  equipmentTwinId: string;
  equipmentTwinRevisionId: string;
  realityStatus: EntityRealityStatus;
  quantity: number;
  geometryRef?: string;
  configuration: Record<string, string | number | boolean>;
  resourceConnectionRefs: string[];
  deviceSourceRefs: string[];
  active: boolean;
  installedAt?: string;
  purchaseSnapshotRef?: string;
  evidenceRefs: string[];
}

function requireNonEmpty(value: string, field: string): void {
  if (!value || !value.trim()) throw new Error(`PropertyEquipmentInstance requires ${field}.`);
}

export function validatePropertyEquipmentInstance(instance: PropertyEquipmentInstance, twinRegistry: EquipmentTwinRegistry): void {
  requireNonEmpty(instance.instanceId, 'instanceId');
  requireNonEmpty(instance.propertyId, 'propertyId');
  requireNonEmpty(instance.propertyRevisionId, 'propertyRevisionId');
  requireNonEmpty(instance.equipmentTwinId, 'equipmentTwinId');
  requireNonEmpty(instance.equipmentTwinRevisionId, 'equipmentTwinRevisionId');

  if (!Number.isInteger(instance.quantity) || instance.quantity < 1) {
    throw new Error(`PropertyEquipmentInstance ${instance.instanceId} quantity must be a positive integer.`);
  }

  const twin = getEquipmentTwinRevision(twinRegistry, instance.equipmentTwinId, instance.equipmentTwinRevisionId);
  if (!twin) {
    throw new Error(`PropertyEquipmentInstance ${instance.instanceId} references unknown equipment twin revision ${instance.equipmentTwinId}@${instance.equipmentTwinRevisionId}.`);
  }

  if (!(['VIRTUAL', 'PHYSICAL', 'CANDIDATE'] as const).includes(instance.realityStatus)) {
    throw new Error(`Unsupported entity reality status: ${String(instance.realityStatus)}.`);
  }
  if (instance.realityStatus === 'PHYSICAL' && !instance.installedAt?.trim()) {
    throw new Error(`PHYSICAL instance ${instance.instanceId} requires installedAt.`);
  }
  if (instance.realityStatus !== 'PHYSICAL' && instance.installedAt) {
    throw new Error(`Only a PHYSICAL instance may declare installedAt (got realityStatus=${instance.realityStatus}).`);
  }
}

export interface CreatePropertyEquipmentInstanceInput extends Omit<PropertyEquipmentInstance, 'resourceConnectionRefs' | 'deviceSourceRefs' | 'evidenceRefs' | 'configuration'> {
  resourceConnectionRefs?: string[];
  deviceSourceRefs?: string[];
  evidenceRefs?: string[];
  configuration?: Record<string, string | number | boolean>;
}

/** The only sanctioned way to create a PropertyEquipmentInstance. Rejects a nonexistent twin revision (fail closed). */
export function createPropertyEquipmentInstance(
  input: CreatePropertyEquipmentInstanceInput,
  twinRegistry: EquipmentTwinRegistry,
): PropertyEquipmentInstance {
  const instance: PropertyEquipmentInstance = {
    ...input,
    configuration: { ...(input.configuration ?? {}) },
    resourceConnectionRefs: [...(input.resourceConnectionRefs ?? [])],
    deviceSourceRefs: [...(input.deviceSourceRefs ?? [])],
    evidenceRefs: [...(input.evidenceRefs ?? [])],
  };
  validatePropertyEquipmentInstance(instance, twinRegistry);
  return instance;
}

export function removePropertyEquipmentInstance(
  instances: readonly PropertyEquipmentInstance[],
  instanceId: string,
): PropertyEquipmentInstance[] {
  return instances.filter(item => item.instanceId !== instanceId);
}
