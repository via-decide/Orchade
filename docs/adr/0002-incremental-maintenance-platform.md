# ADR 0002: Incremental Maintenance Platform

## Status

Accepted

## Problem

The repository needs maintainability improvements without destabilizing gameplay while AI Studio continues to build.

## Decision

Add small, reviewable platform utilities and documentation before behavior-changing refactors. Do not rewrite gameplay unless a documented risk or measurable benefit justifies it.

## Alternatives

- Rewrite the app architecture immediately.
- Add AI features unrelated to engineering maintenance.
- Delay automation until gameplay stabilizes.

## Tradeoffs

Incremental work leaves known debt in place longer, but it preserves backwards compatibility and creates safer review checkpoints.
