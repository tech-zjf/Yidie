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
- **2026-10-15 — simulator scene and outline-editor acceptance:** ran the latest Debug build on a dedicated iPhone 18 Pro / iOS 27 Simulator with synthetic preview data. Confirmed the ten-record stack and count badge, day sheet, dark-outline preview/save, changed sticker on return, empty month, and month arrows. A preview-only no-outline mismatch was fixed and covered by a regression test. Device Hub drag input did not produce a verifiable swipe, so month/day gesture acceptance remains open.
- **2026-10-15 — records/failure review and preview overlap fix:** visually inspected All Records and synthetic waiting/paused/failed states in the dedicated Simulator. Import Review exposed the development-only scene switcher over its content; hiding that control was verified in a fresh Simulator launch, where the list and fixed action are unobstructed. The same run rechecked the local outline editor: select dark 4 px, preview without saving, save, and see the changed sticker in the day sheet. This used in-memory sample data only; no Photos or Vision access. A focused regression assertion now protects the source-photo and cutout preservation contract.
- **2026-10-15 — clean demo entry:** added an explicit, fixture-only preview mode with scene controls disabled for clean capture; the regular preview keeps the selector. Verified both iOS development exports, and the normal Release JavaScript export contains no preview scenes or fixture identifiers. No production-entry branch or runtime service was added.
- **2026-10-15 — pinned native CI:** added a `macos-26` GitHub Actions job that selects and checks Xcode 26.6 before running the native file-safety tests, backup/restore harness, and iOS core typecheck. The same script passes locally; the hosted job cannot be confirmed until the workflow commit is pushed and Actions runs it.

## Latest local checks

For the current development source:

- TypeScript strict checks, ESLint, Prettier, 53 domain/SQLite/preview tests, native backup/file-catalog tests (including a checksum-consistent manifest with a database path-traversal reference) and iOS core typecheck pass.
- `python3 scripts/check_packet.py` passes document/SQL/preview contracts.
- The changed `CalendarExporter.swift` passes an isolated Swift typecheck against the iOS 27 SDK with temporary stubs for `YidieError` and `NativeFileStore`. This catches Swift/API errors in the signature path, but does not prove the Expo app links or that the rendered PNG looks correct.
- `EXPO_NO_TELEMETRY=1 expo export --platform ios` passes for the current source. Unsigned iOS Simulator Release and Debug builds completed with the generated CocoaPods workspace (`CODE_SIGNING_ALLOWED=NO`). The latest Debug build launched in the dedicated Simulator. Synthetic populated and empty calendar, ten-outfit count badge, dark-outline preview/save, and month-arrow flows were visibly exercised. This does not establish physical-device photo processing or quality. Touch swipes and native backup/share sheets still need interactive acceptance.
- A prior iPhone 17 Pro simulator walkthrough covered local photo import, EXIF date, persistence, day browsing and failure handling. Vision foreground masking failed to create a simulator inference context. Simulator results do not establish physical-device cutout quality.

## Boundaries that remain

- No physical iPhone was changed or accessed in the latest implementation. Real photos were not read for this feature.
- Backup/restore exists in source and deterministic native tests pass, but its Files picker flow has not passed Simulator acceptance. Sticker/month sharing exists in source; the native share sheet has not passed interactive acceptance. Uninstalling without a verified backup can remove Yidie's local records and imported copies.
- Xcode regenerated the ignored local `apps/mobile/ios` project for the current Expo configuration; it remains untracked/ignored and is not part of the repository changes. The latest generic Simulator Release build used code signing disabled and touched no physical device, certificate, or keychain state.
- Real-device Vision quality, physical-device offline behavior, accessibility, low-storage recovery and performance are not accepted.
- The detailed, dated developer-signing, device-safety and rollback record is in [the device test runbook](15-device-test-safety-runbook.md). It records prior user-authorized actions and must be updated if any security state changes.
- The early dependency audit recorded upstream advisories in Metro / Expo CLI dependencies. Recheck the lockfile before any distribution build; do not describe the dependency tree as vulnerability-free.

Use the [delivery board](../TODO.md) for the next implementation order. Record new results here only when they add durable evidence that is not already represented in the current readiness table.
