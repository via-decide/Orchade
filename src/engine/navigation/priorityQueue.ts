export class PriorityQueue<T> {
  private heap: Array<{ item: T; priority: number }> = [];

  push(item: T, priority: number): void { this.heap.push({ item, priority }); this.bubbleUp(this.heap.length - 1); }

  pop(): T | undefined {
    if (!this.heap.length) return undefined;
    const root = this.heap[0].item;
    const tail = this.heap.pop()!;
    if (this.heap.length) { this.heap[0] = tail; this.sinkDown(0); }
    return root;
  }

  get size(): number { return this.heap.length; }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].priority <= this.heap[index].priority) break;
      [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
      index = parent;
    }
  }

  private sinkDown(index: number): void {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) smallest = left;
      if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) smallest = right;
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}
