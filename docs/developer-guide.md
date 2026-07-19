# Developer Guide

## Getting Started

```bash
npm ci
cp .env.example .env
npm run dev
```

## Validation

```bash
npm run lint
npm run build
npm run audit:deps
npm run repo:health
```

## Coding Standards

- Keep behavior-compatible refactors small and reviewable.
- Prefer reusable modules only when duplication is proven.
- Use `src/lib/logger.ts` instead of raw console calls in new code.
- Use `src/lib/retry.ts` for recoverable async operations that can time out.
- Validate runtime configuration through `src/lib/config.ts`.

## Pre-Commit Hook

A local `.git/hooks/pre-commit` hook runs `npm run lint`. CI remains the source of truth for pull requests.

## Troubleshooting

- If Firebase reads fail offline, verify Firebase project config and Firestore database ID.
- If builds warn about chunk size, inspect `docs/performance.md` and split lazy features.
- If `npm audit` fails, upgrade or replace the vulnerable package before release.
