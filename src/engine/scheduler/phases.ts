export const SIMULATION_PHASES = [
  'INPUT','COMMANDS','WORLD','WEATHER','FARMING','ECOLOGY','NPC','AI','ECONOMY','QUESTS','EVENTS','SAVE','RENDER',
] as const;

export type SimulationPhase = (typeof SIMULATION_PHASES)[number];

export const PHASE_INDEX = new Map<SimulationPhase, number>(
  SIMULATION_PHASES.map((phase, index) => [phase, index]),
);
