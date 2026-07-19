# ADR 0001: GitHub-Native Engineering Dashboard

## Status

Accepted

## Problem

Maintainers need to understand what changed, why it changed, risks, priorities, and health without reading every file after AI-generated work.

## Decision

Use GitHub-native surfaces: README dashboard, PR template, issue templates, CODEOWNERS, labels, GitHub Actions, generated docs, changelog, metrics, and engineering logs.

## Alternatives

- Build a custom dashboard app.
- Rely on commit history and source code only.
- Use an external project-management tool as the primary status surface.

## Tradeoffs

GitHub-native Markdown is easy to review and version, but some live metrics require CI generation or GitHub API enrichment later.
