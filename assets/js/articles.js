import { fetchJson, basePath } from './api.js';

export async function loadArticles() {
  return fetchJson(`${basePath()}/data/articles.json`);
}

export function getRelatedArticles(target, all, count = 4) {
  const tags = new Set(target.tags || []);
  return all
    .filter((article) => article.slug !== target.slug)
    .map((article) => ({
      article,
      score: (article.tags || []).reduce((acc, tag) => acc + (tags.has(tag) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((item) => item.article);
}
