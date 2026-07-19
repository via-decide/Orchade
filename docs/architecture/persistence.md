# Persistence

Firebase is the persistence boundary.

- Authentication: Firebase Auth with Google and anonymous guest sign-in.
- Database: Cloud Firestore for player state, rankings, transfers, and global stats.
- Offline: Browser online/offline events are observed, but full offline-first persistence is not implemented.
- Recovery: Firestore errors are serialized with auth context and surfaced through existing error handling.
