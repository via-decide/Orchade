export type HomesteadControllerMode = 'manual' | 'deterministic' | 'ai-shadow';

export interface HomesteadScenarioDefinition {
  id: string;
  schemaVersion: number;
  seed: string;
  startDay: number;
  durationDays?: number;
  controllerMode: HomesteadControllerMode;
  metadata?: {
    name?: string;
    description?: string;
  };
}

export const HOMESTEAD_SCENARIO_SCHEMA_VERSION = 1;

export const DEFAULT_PLOT_PLANNER_SCENARIO: HomesteadScenarioDefinition = {
  id: 'plot-planner-default',
  schemaVersion: HOMESTEAD_SCENARIO_SCHEMA_VERSION,
  seed: 'orchade-plot-planner-default',
  startDay: 1,
  controllerMode: 'manual',
};

const CONTROLLER_MODES: readonly HomesteadControllerMode[] = ['manual', 'deterministic', 'ai-shadow'];

export function validateHomesteadScenario(scenario: HomesteadScenarioDefinition): void {
  if (!scenario || typeof scenario !== 'object') throw new Error('Homestead scenario is required.');
  if (!scenario.id.trim()) throw new Error('Homestead scenario id must be non-empty.');
  if (scenario.schemaVersion !== HOMESTEAD_SCENARIO_SCHEMA_VERSION) {
    throw new Error(`Unsupported homestead scenario schema version: ${scenario.schemaVersion}.`);
  }
  if (!scenario.seed.trim()) throw new Error('Homestead scenario seed must be non-empty.');
  if (!Number.isInteger(scenario.startDay) || scenario.startDay < 1) {
    throw new Error('Homestead scenario startDay must be a positive integer.');
  }
  if (scenario.durationDays !== undefined && (!Number.isInteger(scenario.durationDays) || scenario.durationDays < 1)) {
    throw new Error('Homestead scenario durationDays must be a positive integer when provided.');
  }
  if (!CONTROLLER_MODES.includes(scenario.controllerMode)) {
    throw new Error(`Unsupported homestead controller mode: ${String(scenario.controllerMode)}.`);
  }
}
