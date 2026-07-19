import { EntityRegistry } from '../entities/registry';
import { WorldStreamer } from '../streaming/streaming';

export class SimulationWorld {
  readonly entities = new EntityRegistry();
  readonly streaming = new WorldStreamer();

  snapshot(): unknown {
    return { entities: this.entities.snapshot() };
  }

  restore(snapshot: unknown): void {
    const data = snapshot as { entities: unknown };
    this.entities.restore(data.entities);
  }
}
