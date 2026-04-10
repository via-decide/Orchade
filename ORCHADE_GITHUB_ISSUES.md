# Auto-generated GitHub Issue Drafts

> Note: `gh` CLI is unavailable in this execution environment, so issues are generated as ready-to-paste drafts.

## 1) fix: credits desync due to split state updates

**Description**
Multiple action handlers mutate plant state and persist it, then decrement credits in a second `setState` call. This can persist stale credits and create cross-device inconsistencies.

**Affected files**
- `src/App.tsx`

**Recommended fix**
Refactor `handleFeed`, `handlePestControl`, and market purchase handlers so each action computes one `next` game state snapshot, calls `saveState(next)` once, and returns `next` from a single `setGs` updater.

---

## 2) fix: harden active orchard lookup against corrupted persisted state

**Description**
`activeOrchard` is asserted with a non-null `!`. If user data contains an unknown `activeOrchardId` (migration/manual edit), render can crash.

**Affected files**
- `src/App.tsx`

**Recommended fix**
Use a safe fallback (`o1` or first unlocked orchard), and normalize persisted state during bootstrap before rendering.

---

## 3) security: restrict write access to system/global_stats

**Description**
Any authenticated user can write `system/global_stats`, allowing market manipulation and unauthorized economic state changes.

**Affected files**
- `firestore.rules`

**Recommended fix**
Allow writes only from trusted server/admin paths; enforce strict field validation and value bounds.

---

## 4) fix: repair broken Firestore transfer rule expressions

**Description**
Transfer validation functions include detached post-semicolon conditions and duplicated logic that can invalidate intended checks.

**Affected files**
- `firestore.rules`

**Recommended fix**
Rewrite `isWithinDailyLimit` and `isValidTransfer` into single coherent boolean expressions, remove duplicates, and add emulator tests for all transfer edge cases.

---

## 5) fix: service worker should return explicit offline fallback response

**Description**
Fetch handler uses `catch(() => cached)` where `cached` can be `undefined`, producing invalid response handling in offline/network-error paths.

**Affected files**
- `public/sw.js`

**Recommended fix**
Return a real fallback `Response` (or cached shell) when no cached match exists.

---

## 6) fix: support subpath hosting for PWA assets and service worker

**Description**
Absolute paths (`/manifest.json`, `/sw.js`, `/icons/...`) can break when deployed under non-root paths.

**Affected files**
- `index.html`
- `src/main.tsx`

**Recommended fix**
Use `import.meta.env.BASE_URL` or relative paths aligned with Vite base config.
