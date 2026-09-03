/**
 * GENERATED FILE — do not hand-edit.
 * Source: kup-program contracts/stack/v1/generated/canonical-ref.schema.json
 * Regenerate: npm run generate:consumer-types (in kup-program)
 * Then copy this file verbatim into the consuming repo's interop/generated/.
 */

export interface KupCanonicalRef {
  system: 'KUP' | 'LOGICHUB' | 'ORCHADE' | 'VIADECIDE';
  entityType: string;
  entityId: string;
  revisionId?: string;
  contentHash?: string;
  schemaVersion: string;
}
