export async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

export function basePath() {
  const path = window.location.pathname;
  return path.includes('/public/') ? '..' : '.';
}
