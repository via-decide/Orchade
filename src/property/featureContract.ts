/**
 * FeatureDefinition (section 53 of ORCHADE P0 master task).
 *
 * Every future major feature answers five questions before it may touch
 * Property core: what does it read, what does it write, what capabilities
 * does it require, what evidence does it produce, and what simulation/live
 * state does it affect. A feature that cannot answer these does not merge
 * into Property core (spec: "NO FEATURE WITHOUT PROPERTY INTEGRATION
 * CONTRACT") -- this module is the machine-checkable form of that rule, not
 * just documentation of it. It intentionally does not import any other
 * `src/property/*` module: FeatureDefinition describes features from the
 * outside, and must stay usable to describe a feature that reads/writes
 * Property core itself without creating an import cycle.
 */
import type { PropertyEntityType } from './entity';

export type PropertySimulationImpact = 'NONE' | 'READS_ONLY' | 'AFFECTS_COMPILATION';

export type PropertyLiveImpact = 'NONE' | 'READS_ONLY' | 'WRITES_OBSERVATIONS' | 'ISSUES_CONTROL_COMMANDS';

export type PropertyEvidenceImpact = 'NONE' | 'PRODUCES_EVIDENCE';

export interface FeatureDefinition {
  featureId: string;
  name: string;

  readEntityTypes: PropertyEntityType[];
  writeEntityTypes: PropertyEntityType[];

  readCapabilities: string[];
  writeCapabilities: string[];

  createsEntities: boolean;
  createsObservations: boolean;
  createsExperiments: boolean;

  usesKnowledgeTypes: string[];

  simulationImpact: PropertySimulationImpact;
  liveImpact: PropertyLiveImpact;
  evidenceImpact: PropertyEvidenceImpact;
}

/**
 * A feature that writes an entity type it never declared reading, issues
 * control commands while claiming NONE live impact, or claims it creates
 * observations/experiments without WRITES_OBSERVATIONS/AFFECTS_COMPILATION
 * respectively, has an internally inconsistent contract -- the kind of gap
 * that "no feature without a contract" exists to catch before merge, not
 * after a silent second source of truth appears.
 */
export function validateFeatureDefinition(feature: FeatureDefinition): void {
  if (!feature.featureId?.trim()) throw new Error('FeatureDefinition requires featureId.');
  if (!feature.name?.trim()) throw new Error('FeatureDefinition requires name.');

  for (const entityType of feature.writeEntityTypes) {
    if (!feature.readEntityTypes.includes(entityType)) {
      throw new Error(
        `FeatureDefinition ${feature.featureId} writes entity type ${entityType} it never declared reading. A feature must read what it writes.`,
      );
    }
  }

  if (feature.liveImpact === 'ISSUES_CONTROL_COMMANDS' && feature.writeEntityTypes.length === 0) {
    throw new Error(
      `FeatureDefinition ${feature.featureId} declares liveImpact ISSUES_CONTROL_COMMANDS but no writeEntityTypes -- a feature that controls equipment must declare what it controls.`,
    );
  }

  if (feature.createsObservations && feature.liveImpact === 'NONE') {
    throw new Error(
      `FeatureDefinition ${feature.featureId} claims createsObservations but declares liveImpact NONE.`,
    );
  }

  if (feature.createsExperiments && feature.simulationImpact === 'NONE') {
    throw new Error(
      `FeatureDefinition ${feature.featureId} claims createsExperiments but declares simulationImpact NONE -- an experiment must at least read compiled scenario state.`,
    );
  }

  if (feature.evidenceImpact === 'PRODUCES_EVIDENCE' && !feature.createsObservations && !feature.createsExperiments) {
    throw new Error(
      `FeatureDefinition ${feature.featureId} declares evidenceImpact PRODUCES_EVIDENCE but neither createsObservations nor createsExperiments -- evidence has to come from somewhere.`,
    );
  }
}
