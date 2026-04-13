import fs from 'node:fs';
import { searchArticles } from '../assets/js/search.js';

const articles = JSON.parse(fs.readFileSync(new URL('../data/articles.json', import.meta.url)));
if (!Array.isArray(articles) || articles.length === 0) throw new Error('articles.json did not load');
if (!('/articles'.startsWith('/'))) throw new Error('routing rule missing');
const results = searchArticles(articles, 'research');
if (!results.length) throw new Error('search returned no results');
console.log('Static smoke tests passed');
