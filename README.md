# Orchade (Vanilla JS Static Build)

This project is now a framework-free static web application.

## Run

### Option 1: Open directly
Open `index.html` in a modern browser.

### Option 2: Static server
```bash
python -m http.server
```
Then visit `http://localhost:8000`.

## Architecture

- HTML pages: `index.html`, `public/index.html`, `public/research.html`, `public/article.html`
- CSS: `assets/css/base.css`, `assets/css/layout.css`, `assets/css/components.css`
- JS modules: `assets/js/router.js`, `api.js`, `ui.js`, `articles.js`, `search.js`, `graph.js`
- Data: `data/articles.json`, `data/graph.json`
- Components: `components/header.html`, `components/footer.html`, `components/article-card.html`

## Routing

- `/` homepage
- `/articles` article list
- `/article/:slug` article detail page
- `/research` research explorer graph
