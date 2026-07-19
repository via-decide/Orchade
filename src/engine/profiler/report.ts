import type { FrameProfile } from './frame';
export function performanceJson(frames: FrameProfile[]): string { return JSON.stringify(frames, null, 2); }
export function performanceCsv(frames: FrameProfile[]): string { return ['tick,fps,tickDurationMs', ...frames.map(f => `${f.tick},${f.fps},${f.tickDurationMs}`)].join('\n'); }
export function performanceMarkdown(frames: FrameProfile[]): string { return `# Performance Report\n\nFrames: ${frames.length}\n`; }
