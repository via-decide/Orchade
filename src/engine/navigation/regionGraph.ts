export type RegionNode = { id: string; neighbors: string[]; cost: number };
export class RegionGraph { private nodes = new Map<string, RegionNode>(); add(node: RegionNode): void { this.nodes.set(node.id, node); } get(id: string): RegionNode | undefined { return this.nodes.get(id); } }
