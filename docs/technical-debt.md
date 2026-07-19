# Technical Debt Register

| Priority | Item | Difficulty | Risk | Impact |
| --- | --- | --- | --- | --- |
| Critical | Duplicate root app and `game-repo/` app | Medium | High | High |
| High | No automated tests | Medium | High | High |
| High | Oversized production bundle | Medium | Medium | High |
| High | Firestore rules lack automated tests | Medium | High | High |
| Medium | Possible unused dependencies | Low | Medium | Medium |
| Medium | Remote font dependency | Low | Low | Medium |
| Medium | CSS import ordering warning | Low | Low | Low |
| Low | Generated class snapshot text files need ownership decision | Low | Low | Low |

## Operating Rule

Debt should be paid down through small pull requests that include a measurable maintenance, reliability, or performance benefit.
