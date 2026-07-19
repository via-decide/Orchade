import { EventBus } from './events';
import { GameplaySystem, SimulationContext, SimulationPhase } from './types';

const PHASES: SimulationPhase[] = [
  'boot',
  'main-menu',
  'world-generation',
  'player-spawn',
  'simulation-tick',
  'input',
  'gameplay-systems',
  'render',
  'autosave',
  'shutdown',
];

export class GameLoopOrchestrator {
  private systems: GameplaySystem[] = [];
  readonly events = new EventBus();
  readonly phases = PHASES;

  register(system: GameplaySystem): void {
    this.systems = [...this.systems.filter(existing => existing.id !== system.id), system]
      .sort((left, right) => left.order - right.order);
  }

  boot(worldSeed = 'orchade-alpha'): SimulationContext {
    const context: SimulationContext = {
      tick: 0,
      day: 1,
      deltaMs: 0,
      events: this.events,
      worldSeed,
      flags: {},
    };

    this.events.emit('GAME_BOOTED', { worldSeed }, context.tick);
    this.events.emit('MAIN_MENU_OPENED', {}, context.tick);
    this.events.emit('WORLD_GENERATED', { worldSeed }, context.tick);
    this.events.emit('PLAYER_SPAWNED', { spawnId: 'homestead-origin' }, context.tick);
    return context;
  }

  tick(context: SimulationContext, deltaMs: number): SimulationContext {
    const next = { ...context, tick: context.tick + 1, deltaMs };
    this.events.emit('SIMULATION_TICKED', { deltaMs }, next.tick);
    this.events.emit('INPUT_RECEIVED', { source: 'queued-actions' }, next.tick);
    this.systems.forEach(system => system.update(next));
    this.events.emit('RENDER_REQUESTED', { tick: next.tick }, next.tick);
    if (next.tick % 120 === 0) {
      this.events.emit('AUTOSAVE_COMPLETED', { slot: 'autosave', schemaVersion: 1 }, next.tick);
    }
    return next;
  }

  shutdown(context: SimulationContext): void {
    this.events.emit('SHUTDOWN_STARTED', { tick: context.tick }, context.tick);
  }
}
