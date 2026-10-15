# Current review and release gate

Review date: 2026-10-15. This describes the current development build, not a release approval. Implementation, automated checks, Simulator interaction, and physical-device acceptance are tracked separately.

## Implemented in source

| Area | Implementation | Evidence and remaining boundary |
| --- | --- | --- |
| Calendar and brand | English iOS calendar, display typography, sticker-first occupied days, horizontal month/day browsing, animated sheets, centered Add action, app icon | Dedicated iPhone 18 Pro / iOS 27 Simulator visibly passed populated and empty preview scenes; arrows changed the month; drag gestures still need a touch-surface check |
| Same-day stacks | Up to three offset, rotated stickers; count badge uses the total number of entries | Shared pure layout feeds UI and export; geometry tests cover narrow cells, six-week months, rotations and badge bounds; simulator showed a ten-entry stack and count badge |
| Sticker editing | Local outline preview/save, 0–8 px, white/dark/blue, preserved transparent cutout | Synthetic simulator flow selected, previewed, and saved a dark outline; no-outline preview regression is tested. Real Vision input quality requires an opt-in physical-device photo |
| Day and record browsing | Animated bottom sheet with handle, horizontal photo paging; all-record grid and revision-safe editor | The ten-entry day sheet and editor opened in Simulator; All Records rendered a date-ordered card grid. Device Hub did not deliver a verifiable drag gesture, so horizontal paging remains unaccepted |
| Import and processing | User-selected PhotoKit assets, date review, duplicate handling, local persistent serial queue, retry and recovery | Synthetic waiting/paused/failed states were inspected. Import Review was rechecked after removing the preview switcher overlap; its list and bottom action are unobstructed. Domain/SQLite tests pass; Vision quality and the system photo picker still need an opt-in physical-device check |
| Date editing | Native date picker, cancel-safe selection and date relocation | Source builds and static tests pass; native picker interaction remains to be accepted |
| Local backup | User-controlled `.yidie` package, SQLite snapshot, checksums, strict path/schema validation, staged restore and startup rollback | Deterministic native tests cover corruption, database path traversal, future schema, storage limits, cancellation, current-library preservation and interrupted swaps; Files picker end-to-end flow remains open |
| Image sharing | Transparent sticker PNG and 3× month PNG rendered from shared calendar geometry; optional default-off Yidie signature; native share sheet | Payload tests cover the opt-in default; interactive signature and share/cancel behavior remain open |
| Privacy and product boundaries | No backend, account, analytics or cloud inference; app-owned local records and explicit backup warning | Source review; never uninstall without a user-verified backup |

## Acceptance still required

| Priority | Gate | Completion evidence |
| --- | --- | --- |
| P0 | Simulator UI walkthrough | Completed: populated stack/count badge, day sheet, outline preview/save, empty month, arrow navigation, Import Review, synthetic failure states, and All Records. Remaining: confirm horizontal day paging/month swipe and animated dismissal with native touch input; Xcode currently reports CoreSimulatorService disconnected |
| P0 | Backup and share system flows | In Simulator, export and restore a synthetic `.yidie` library; cancel and reject a corrupt package without changing current data; share/cancel sticker and month images |
| P1 | Supported-size and accessibility pass | Smallest supported iPhone, 4/5/6-week months, large text, VoiceOver focus/labels, reduced motion, no unintended scroll indicator or clipped controls |
| P1 | Physical-device photo acceptance | Only a photo deliberately selected by the user; validate orientation, Vision cutout and outline, offline behavior, failure recovery, responsiveness and memory |
| P1 | Open-source CI and reproducibility | GitHub CI green, clean lockfile install, JS export and documented Simulator Release build reproduced from source |
| P2 | Public demo and launch material | Capture only verified flows with synthetic or explicitly consented material; publish no message on X without a separate user instruction |

## Verified in this worktree

- TypeScript, ESLint, Prettier, all 53 domain/SQLite/preview tests, native backup/file-inventory tests, Swift core typecheck, repository/SQL contracts, and packet checks pass. Clean and scene-switching preview bundles both export; the normal Release JavaScript export was checked for and contains no preview scene or fixture code. The packet check needs the configured Node runtime on PATH. The standalone Swift exporter typecheck checks API/type correctness, not the rendered image.
- iOS JavaScript export and unsigned iOS Simulator Release and Debug builds passed in the previous successful Xcode 27 build session. The latest preview source ran on a dedicated iPhone 18 Pro / iOS 27 Simulator. Taps opened a populated month, a same-day ten-entry stack, the day sheet, and the style editor; a dark outline preview was saved and visible on return. This uses synthetic stand-ins and does not verify real Vision cutout quality. Device Hub drag gestures did not change the page or month. A later read-only Xcode workspace query failed after CoreSimulatorService reported a disconnected connection; no restart or reset was attempted.
- No physical iPhone, Photos library, Developer Mode, signing identity, certificate, or keychain was accessed or changed. Xcode regenerated the ignored local iOS project; the Simulator build had code signing disabled.

This is suitable as a **development milestone** for GitHub, not a complete or generally installable v0.1 release. The principal blockers are Simulator interaction coverage and a user-authorized real-device Vision photo test. The detailed security-state history is in [the device test safety runbook](15-device-test-safety-runbook.md); the active checklist is [TODO.md](../TODO.md).
