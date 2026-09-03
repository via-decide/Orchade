/**
 * GENERATED FILE — do not hand-edit.
 * Source: kup-program contracts/stack/v1/generated/interop-envelope.schema.json
 * Regenerate: npm run generate:consumer-types (in kup-program)
 * Then copy this file verbatim into the consuming repo's interop/generated/.
 */

export interface KupInteropEnvelope {
  contractVersion: string;
  envelopeId: string;
  eventType:
    | 'ENGINEERING_REVISION_RELEASED'
    | 'PROPERTY_REQUIREMENT_RAISED'
    | 'CANDIDATE_SYSTEM_PROPOSED'
    | 'SIMULATION_RUN_COMPLETED'
    | 'EVIDENCE_ACCEPTED'
    | 'DECISION_CASE_CREATED'
    | 'DECISION_RESOLVED'
    | 'ENGINEERING_REQUIREMENT_CREATED'
    | 'PROPERTY_REVISION_FROZEN'
    | 'MODEL_REVISION_SUPERSEDED';
  producer: KupCanonicalRef;
  producedAt: string;
  causationId?: string;
  correlationId?: string;
  sourceRef: KupCanonicalRef;
  targetSystem?: string;
  payload?: unknown;
  evidenceRefs: KupCanonicalRef[];
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
