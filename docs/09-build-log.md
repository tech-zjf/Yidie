# Build and verification record

Updated 2026-10-15. This file records durable implementation and verification facts. The live feature gates are in [TODO.md](../TODO.md) and the [readiness review](16-readiness-review.md); this is not a release approval.

## Milestones

- **2026-10-13 — foundation:** Expo SDK 57 / React Native 0.86 / TypeScript app, modular domain/data/features layers, local SQLite, native PhotoKit/Vision module, date rules, and UI prototype were established.
- **2026-10-13 — records and import:** editing dates and covers, all-record pagination, batch date review, duplicate checks, durable one-at-a-time processing, pause/retry/recovery, and file ownership rules were added.
- **2026-10-14 — native image lifecycle and UI:** bounded local previews, cache identity, orphan cleanup, animated day sheets, centered Add action, month swiping, English interface, brand artwork, reduced-motion handling, and limited-library management were added.
- **2026-10-14 — sticker styles and count badges:** day stacks show a count badge; users can preview and save local outline color/width variants. Transparent cutouts are stored separately so a style edit does not rerun Vision. SQLite migration v5 stores style attributes and revision.
- **2026-10-14 — local backup and native date picker:** added a user-exported, unencrypted `.yidie` package, SQLite online snapshot, manifest/SHA-256 validation, staged restore with launch recovery, Settings controls and a cancel-safe iOS date picker. Source/static checks exist; failure injection and Simulator acceptance are pending.
- **2026-10-14 — native sharing and acceptance tooling:** added transparent single-sticker sharing and high-resolution month-image sharing through the iOS share sheet, with month layout geometry shared by the calendar and renderer. Deterministic native backup tests now cover corrupt/future packages, storage limits, cancellation and interrupted swaps. Interactive native sheets still need Simulator acceptance.
- **2026-10-15 — optional calendar signature:** added an opt-in, default-off Yidie signature setting for exported month images and a native renderer path that adds the small mark only when requested. Payload tests verify the off-by-default contract; visual export acceptance remains pending with the Simulator walkthrough.

## Latest local checks

For the current development source:

- TypeScript strict checks, ESLint, Prettier, 51 domain/SQLite tests, native backup/file-catalog tests (including a checksum-consistent manifest with a database path-traversal reference) and iOS core typecheck pass.
- `python3 scripts/check_packet.py` passes document/SQL/preview contracts.
- `EXPO_NO_TELEMETRY=1 expo export --platform ios` passes for the current source. Recent UI corrections clear the staged outline preview after a successful save or rejected stale save, and make both custom sheets honor the system Reduce Motion preference through one shared hook. An earlier Simulator Release build installed and launched on iPhone 18 Pro / iOS 27, but that screenshot predates these corrections. A fresh Xcode rebuild and UI walkthrough could not be completed in this run: the Mac is locked and CoreSimulatorService is unavailable. Rebuild and recheck before claiming current-source Simulator acceptance. Populated count-badge, outline-edit, backup and share-sheet flows still need an interactive walkthrough.
- A prior iPhone 17 Pro simulator walkthrough covered local photo import, EXIF date, persistence, day browsing and failure handling. Vision foreground masking failed to create a simulator inference context. Simulator results do not establish physical-device cutout quality.

## Boundaries that remain

- No physical iPhone was changed or accessed in the latest implementation. Real photos were not read for this feature.
- Backup/restore exists in source and deterministic native tests pass, but its Files picker flow has not passed Simulator acceptance. Sticker/month sharing exists in source; the native share sheet has not passed interactive acceptance. Uninstalling without a verified backup can remove Yidie's local records and imported copies.
- Xcode regenerated the ignored local `apps/mobile/ios` project for the current Expo configuration; it remains untracked/ignored and is not part of the repository changes. The Simulator Release build used code signing disabled and touched no physical device, certificate, or keychain state.
- Real-device Vision quality, physical-device offline behavior, accessibility, low-storage recovery and performance are not accepted.
- The detailed, dated developer-signing, device-safety and rollback record is in [the device test runbook](15-device-test-safety-runbook.md). It records prior user-authorized actions and must be updated if any security state changes.
- The early dependency audit recorded upstream advisories in Metro / Expo CLI dependencies. Recheck the lockfile before any distribution build; do not describe the dependency tree as vulnerability-free.

Use the [delivery board](../TODO.md) for the next implementation order. Record new results here only when they add durable evidence that is not already represented in the current readiness table.
