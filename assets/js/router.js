import { buildShell, loadComponent, wireNav } from './ui.js';
import { loadArticles, getRelatedArticles } from './articles.js';
import { searchArticles } from './search.js';
import { drawGraph } from './graph.js';

window.appState = { articles: [] };

function renderCard(host, template, article) {
  const frag = template.content.cloneNode(true);
  frag.querySelector('[data-title]').textContent = article.title;
  frag.querySelector('[data-summary]').textContent = article.summary;
  frag.querySelector('[data-date]').textContent = article.date;
  frag.querySelector('[data-tags]').innerHTML = article.tags.map((t) => `<span class="tag">${t}</span>`).join('');
  const link = frag.querySelector('[data-link]');
  link.href = `/article/${article.slug}`;
  host.append(frag);
}

async function renderHome(view) {
  const articles = await loadArticles();
  window.appState.articles = articles;
  const cards = articles.slice(0, 3).map((a) => `<li>${a.title}</li>`).join('');
  view.innerHTML = `<section><h1>Orchade Knowledge Hub</h1><p>Lightweight static research UI.</p><ul>${cards}</ul></section>`;
}

async function renderArticleList(view) {
  const templateHtml = await loadComponent('/components/article-card.html');
  const template = document.createElement('template');
  template.innerHTML = templateHtml;
  const articles = window.appState.articles.length ? window.appState.articles : await loadArticles();
  view.innerHTML = `<section><h1>Articles</h1><div class="search-row"><label for="q">Search</label><input id="q" /><button id="search-btn">Go</button></div><div class="grid" id="cards"></div></section>`;
  const cards = view.querySelector('#cards');
  articles.forEach((article) => renderCard(cards, template, article));
  view.querySelector('#search-btn').addEventListener('click', () => {
    const q = view.querySelector('#q').value;
    const results = searchArticles(articles, q);
    cards.innerHTML = '';
    results.forEach((article) => renderCard(cards, template, article));
  });
}

async function renderArticle(view, slug) {
  const articles = window.appState.articles.length ? window.appState.articles : await loadArticles();
  const article = articles.find((a) => a.slug === slug);
  if (!article) {
    view.innerHTML = '<section><h1>Not found</h1></section>';
    return;
  }
  const related = getRelatedArticles(article, articles, 5)
    .map((a) => `<li><a href="/article/${a.slug}">${a.title}</a></li>`)
    .join('');
  view.innerHTML = `<article><h1>${article.title}</h1><p>${article.author} · ${article.date}</p>${article.content}<section><h2>Related articles</h2><ul>${related}</ul></section></article>`;
}

async function renderResearch(view) {
  view.innerHTML = '<section><h1>Research Explorer</h1><div id="graph-host"></div></section>';
  await drawGraph(view.querySelector('#graph-host'));
}

async function route() {
  const view = document.querySelector('#view');
  const path = window.location.pathname.replace('/public', '') || '/';
  if (path === '/') return renderHome(view);
  if (path === '/articles') return renderArticleList(view);
  if (path === '/research') return renderResearch(view);
  if (path.startsWith('/article/')) return renderArticle(view, path.split('/article/')[1]);
  view.innerHTML = '<section><h1>404</h1></section>';
}

await buildShell();
wireNav(route);
window.addEventListener('popstate', route);
route();
