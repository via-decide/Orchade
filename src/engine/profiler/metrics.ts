export type Metric = { name: string; value: number; tags?: Record<string, string> };
export class Metrics { private metrics: Metric[]=[]; record(metric: Metric): void { this.metrics.push(metric); } all(): readonly Metric[] { return this.metrics; } }
