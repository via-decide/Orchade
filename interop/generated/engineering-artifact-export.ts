/**
 * GENERATED FILE — do not hand-edit.
 * Source: kup-program contracts/stack/v1/generated/engineering-artifact-export.schema.json
 * Regenerate: npm run generate:consumer-types (in kup-program)
 * Then copy this file verbatim into the consuming repo's interop/generated/.
 */

export type EngineeringInterface =
  | {
      category: 'UNKNOWN';
      name: string;
      sourceInterfaceRef: string;
      note?: string;
    }
  | {
      category: 'ELECTRICAL' | 'MECHANICAL' | 'FLUID' | 'THERMAL' | 'DATA';
      name: string;
      quantities?: PhysicalQuantity[];
    };

export interface EngineeringArtifactExport {
  engineeringProjectRef: KupCanonicalRef;
  engineeringRevisionRef: KupCanonicalRef;
  artifactType: string;
  capabilities: string[];
  interfaces: EngineeringInterface[];
  physicalParameters?: PhysicalQuantity[];
  operatingEnvelope?: PhysicalQuantity[];
  resourceRequirements?: PhysicalQuantity[];
  modelCapabilityStatus: 'SUPPORTED' | 'ESTIMATE_ONLY' | 'NOT_MODELED';
  evidenceRefs: KupCanonicalRef[];
  limitations: string[];
  contentHash: string;
}
export interface KupCanonicalRef {
  system: 'KUP' | 'LOGICHUB' | 'ORCHADE' | 'VIADECIDE';
  entityType: string;
  entityId: string;
  revisionId?: string;
  contentHash?: string;
  schemaVersion: string;
}
export interface PhysicalQuantity {
  metric:
    | 'MASS'
    | 'POWER'
    | 'FLOW_RATE'
    | 'RUNTIME'
    | 'DUTY_CYCLE'
    | 'PRESSURE'
    | 'HEAD'
    | 'ENERGY'
    | 'TEMPERATURE'
    | 'VOLTAGE'
    | 'CURRENT'
    | 'EFFICIENCY'
    | 'AREA'
    | 'CAPACITY';
  value: number;
  unit:
    | 'KG'
    | 'W'
    | 'KW'
    | 'L_PER_MIN'
    | 'M3_PER_HOUR'
    | 'MINUTES'
    | 'HOURS'
    | 'PERCENT'
    | 'BAR'
    | 'PA'
    | 'M'
    | 'KWH'
    | 'J'
    | 'CELSIUS'
    | 'KELVIN'
    | 'V'
    | 'A'
    | 'M2'
    | 'L'
    | 'DIMENSIONLESS';
  basis: 'RATED' | 'NAMEPLATE' | 'MEASURED' | 'DESIGN' | 'CALCULATED';
  status: 'CONFIRMED' | 'ESTIMATE' | 'UNKNOWN';
  sourceRef?: string;
}
