export function scoreArticle(article, query) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  let score = 0;
  if (article.title.toLowerCase().includes(q)) score += 5;
  if (article.summary.toLowerCase().includes(q)) score += 2;
  if ((article.tags || []).some((tag) => tag.toLowerCase().includes(q))) score += 3;
  return score;
}

export function searchArticles(articles, query) {
  return articles
    .map((article) => ({ article, score: scoreArticle(article, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.article);
}
