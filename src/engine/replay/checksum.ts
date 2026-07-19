export function checksum(value: unknown): string { const text=JSON.stringify(value); let hash=0; for (let i=0;i<text.length;i++) hash=(hash*31+text.charCodeAt(i))|0; return (hash>>>0).toString(16); }
