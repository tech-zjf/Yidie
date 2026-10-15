# Current review and release gates

Review date: 2026-10-16. Yidie is a development build. Implementation, automated checks, Simulator behavior, and physical-device acceptance are distinct gates. This is not release approval.

## Current state

| Area | Implemented | Evidence and boundary |
| --- | --- | --- |
| Calendar and records | English calendar, custom display typography, same-day sticker stacks/count badge, All Records, date editing, bottom sheets, centered Add action | Calendar routes, arrows, empty sheets, and synthetic populated layouts were inspected on iOS Simulators. Horizontal touch paging, month swipe, exact sheet exit motion, smallest-screen and accessibility behavior are not accepted. |
| Photo import and queue | Explicit PhotoKit selection, date review, duplicate handling, local persistent queue, retry, and failure recovery | An Apple-provided Simulator sample was imported under Limited access. Vision was unavailable; Yidie retained the original and showed a retryable failure. Real subject extraction and recovery from device conditions remain open. |
| Sticker extraction and styles | VisionKit subject lift with Vision segmentation fallback; tight alpha crop; user-selectable subject candidates; revisioned cutouts; local Original, Outline, Comic, 3D, and Shimmer rendering | An earlier renderer snapshot passed synthetic pixel assertions on an isolated iOS 26.1 Simulator. The current tree's pixel check is unverified: this host cannot render even a 1×1 Core Image and the Simulator app/runtime is unavailable. No successful Vision cutout has been produced in this work, and Photos' private effect pipeline is not publicly exposed; exact 1:1 parity is not a valid claim. |
| Local data and recovery | SQLite records, app-owned image copies, revision-safe edits, staged `.yidie` backups, checksums and rollback | Automated migration, queue, file-boundary, backup, and crash-recovery tests pass. An empty backup round trip passed in Simulator. Corrupt-package UI and a deliberate native SQLite close/WAL stress run remain open. |
| Sharing | Transparent sticker PNG and high-resolution month image; optional default-off signature | Empty-month export was saved and opened in Simulator Files/Preview. Populated export, signature-on output, and sticker payload still need acceptance. |
| Privacy and safety | No app backend/account/analytics; photos selected explicitly; originals kept; simulator-only launch helpers reject phone IDs | Static and unit checks cover boundaries. No physical device or personal photo has been touched in this work. A user-selected real photo test needs the user's explicit go-ahead. |
| Build and open source | Expo/React Native, focused Swift module, English docs, contributor/security guidance, CI workflow, and public-packet cleanup | Current JS/native static checks and production JS export pass. A clean prebuild and CocoaPods install completed; Xcode then refused the generated workspace while CoreSimulatorService and `Simulator.app` were unavailable. The current tree has no accepted full build or runtime launch. An earlier source snapshot launched on Simulator. The current diff has not yet passed CI. |

## Required before a public release

1. Restore a complete Xcode Simulator installation (the runtime is imported, but the Simulator app and service are still missing) and repeat the current unsigned build; run the checked-in sticker renderer fixture and exercise the current editor, sheet gestures, date picker, populated export/share, corrupt-backup rejection, accessibility, and reduced-motion flows.
2. Resolve the SQLite lifecycle concern with a deliberate native Simulator test that holds a read, queues a write, closes/reopens, and checks data integrity.
3. Only after the owner explicitly opts in, test one user-selected real photo on a physical iPhone. Check subject grouping, alpha edges, image orientation, offline behavior, fallback, memory, and latency. Never use that image in public materials without separate permission.
4. Reconcile all docs with the accepted behavior, run clean installation and hosted CI against the reviewed diff, preserve existing Git history, and update the draft PR.
5. Capture a public demo only from verified app behavior, with an owner-approved real-photo screen recording. Do not use the retired browser prototypes or generated people. X launch notes are drafts only; no external post has been made.

The live checklist, including lower-priority dependency and launch work, is [TODO.md](../TODO.md). Build evidence and reproducible commands are in [the build record](09-build-log.md); device-test boundaries are in [the safety guide](15-device-test-safety-runbook.md).
