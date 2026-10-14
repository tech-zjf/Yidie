# Current review and release gate

Review date: 2026-10-15. This describes the current development build, not a release approval. Implementation, automated checks, Simulator interaction, and physical-device acceptance are tracked separately.

## Implemented in source

| Area | Implementation | Evidence and remaining boundary |
| --- | --- | --- |
| Calendar and brand | English iOS calendar, display typography, sticker-first occupied days, horizontal month/day browsing, animated sheets, centered Add action, app icon | Release app launched on iPhone 18 Pro / iOS 27 Simulator; only the empty-calendar home has a current native screenshot |
| Same-day stacks | Up to three offset, rotated stickers; count badge uses the total number of entries | Shared pure layout feeds UI and export; geometry tests cover narrow cells, six-week months, rotations and badge bounds; populated visual acceptance remains open |
| Sticker editing | Local outline preview/save, 0–8 px, white/dark/blue, preserved transparent cutout | SQLite revision and native paths covered by automated tests; real Vision input quality requires an opt-in physical-device photo |
| Day and record browsing | Animated bottom sheet with handle, horizontal photo paging; all-record grid and revision-safe editor | Domain/SQLite scenarios pass; interactive native gestures still need Simulator acceptance |
| Import and processing | User-selected PhotoKit assets, date review, duplicate handling, local persistent serial queue, retry and recovery | Domain/SQLite tests pass; Vision quality and system photo-picker behavior are not accepted on this Simulator |
| Date editing | Native date picker, cancel-safe selection and date relocation | Source builds and static tests pass; native picker interaction remains to be accepted |
| Local backup | User-controlled `.yidie` package, SQLite snapshot, checksums, strict path/schema validation, staged restore and startup rollback | Deterministic native tests cover corruption, database path traversal, future schema, storage limits, cancellation, current-library preservation and interrupted swaps; Files picker end-to-end flow remains open |
| Image sharing | Transparent sticker PNG and 3× month PNG rendered from shared calendar geometry; native share sheet | Source and build checks; interactive share/cancel behavior remains open |
| Privacy and product boundaries | No backend, account, analytics or cloud inference; app-owned local records and explicit backup warning | Source review; never uninstall without a user-verified backup |

## Acceptance still required

| Priority | Gate | Completion evidence |
| --- | --- | --- |
| P0 | Simulator UI walkthrough | Verify day stack/count badge, horizontal photo paging, month swipe/arrows, editor preview/save, empty/loading/failure states, sheet motion, Add and All Records |
| P0 | Backup and share system flows | In Simulator, export and restore a synthetic `.yidie` library; cancel and reject a corrupt package without changing current data; share/cancel sticker and month images |
| P1 | Supported-size and accessibility pass | Smallest supported iPhone, 4/5/6-week months, large text, VoiceOver focus/labels, reduced motion, no unintended scroll indicator or clipped controls |
| P1 | Physical-device photo acceptance | Only a photo deliberately selected by the user; validate orientation, Vision cutout and outline, offline behavior, failure recovery, responsiveness and memory |
| P1 | Open-source CI and reproducibility | GitHub CI green, clean lockfile install, JS export and documented Simulator Release build reproduced from source |
| P2 | Public demo and launch material | Capture only verified flows with synthetic or explicitly consented material; publish no message on X without a separate user instruction |

## Verified in this worktree

- TypeScript, ESLint, Prettier, 51 domain/SQLite tests, native backup/file inventory tests, Swift core typecheck, repository/SQL contracts, and packet checks pass once run with the configured Node runtime.
- iOS JavaScript Release export passes for the current source. An earlier iPhone 18 Pro / iOS 27 Simulator Release build, install, and launch passed, but its screenshot predates the latest editor-state and Reduce Motion corrections and shows only the empty home. The Mac is currently locked and CoreSimulatorService is unavailable, so a fresh Xcode build and interactive walkthrough remain unverified.
- No physical iPhone, Photos library, Developer Mode, signing identity, certificate, or keychain was accessed or changed. Xcode regenerated the ignored local iOS project; the Simulator build had code signing disabled.

This is suitable as a **development milestone** for GitHub, not a complete or generally installable v0.1 release. The principal blockers are Simulator interaction coverage and a user-authorized real-device Vision photo test. The detailed security-state history is in [the device test safety runbook](15-device-test-safety-runbook.md); the active checklist is [TODO.md](../TODO.md).
