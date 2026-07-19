# GitHub Project Board Structure

## Columns

1. Backlog
2. Ready
3. In Progress
4. Review
5. Testing
6. Done
7. Blocked

## Automation Rules

- New issues enter Backlog.
- Issues with `Ready` label move to Ready.
- Linked PR opened moves issue to In Progress.
- PR marked ready for review moves issue to Review.
- PR with successful CI moves issue to Testing.
- PR merged moves linked issue to Done.
- Issues with `Blocked` label move to Blocked.

## Implementation Note

Full GitHub Projects automation requires the repository's project ID and token permissions. The workflow placeholder should be completed once the project is created in GitHub.
