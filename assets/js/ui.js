import { basePath } from './api.js';

export async function loadComponent(path) {
  const res = await fetch(`${basePath()}${path}`);
  if (!res.ok) throw new Error(`Component load failed: ${path}`);
  return res.text();
}

export async function buildShell() {
  const app = document.querySelector('#app');
  const [header, footer] = await Promise.all([
    loadComponent('/components/header.html'),
    loadComponent('/components/footer.html'),
  ]);
  app.innerHTML = `${header}<main class="container" id="view" tabindex="-1"></main>${footer}`;
}

export function wireNav(onNavigate) {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href.startsWith('/')) return;
    event.preventDefault();
    history.pushState({}, '', href);
    onNavigate();
  });
}
