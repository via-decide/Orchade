# Security Review

## Findings

- Firebase client configuration is public by design, but environment-specific setup needs validation and documentation.
- Firestore rules are a critical control plane and require scenario tests.
- Browser-exposed API keys must not authorize privileged operations.
- `npm run audit:deps` now fails on moderate/high/critical vulnerabilities while warning on registry endpoint failures.

## Required Follow-Up

1. Add Firestore rules tests for owner-only writes, transfer constraints, leaderboard reads, and guest behavior.
2. Remove unused dependencies to reduce attack surface.
3. Keep all privileged AI or payment operations off the browser client.
4. Add secret scanning in repository settings or CI.
