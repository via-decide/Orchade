export type DebugPanel = { title: string; rows: Array<{ label: string; value: string | number }> };
export function createDebugPanel(title: string, rows: DebugPanel['rows']): DebugPanel { return { title, rows }; }
