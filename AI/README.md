# AI Contribution Protocol

Every AI contribution should be auditable and locally scoped.

## Pull request review mode
Include these sections in AI-generated PRs:
- Summary
- Objective
- Files Modified
- Systems Affected
- Reason
- Architectural Impact
- Breaking Changes
- Rollback Plan
- Manual Review Checklist
- Risk Assessment
- Confidence Score
- Testing Performed
- Future Follow-ups

## Operating rules
- Prefer capsule-local edits.
- Update the affected module `TODO.md`, `TESTS.md`, and `CHANGELOG.md` when behavior changes.
- Update ADRs for architecture changes.
- Do not import from another capsule's `internal/` directory.
