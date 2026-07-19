export type SimulationCommand<T = unknown> = { id: string; type: string; tick: number; payload: T };

export class CommandBuffer {
  private commands: SimulationCommand[] = [];

  enqueue<T>(command: SimulationCommand<T>): void { this.commands.push(command); }

  drain(tick: number): SimulationCommand[] {
    const ready = this.commands.filter(command => command.tick <= tick);
    this.commands = this.commands.filter(command => command.tick > tick);
    return ready;
  }

  pending(): readonly SimulationCommand[] { return this.commands; }
}
