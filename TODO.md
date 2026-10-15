# Yidie delivery board

This is the single working checklist for the first public, installable release. A box is checked only when its acceptance evidence is recorded. Simulator behavior and physical-device behavior are reported separately.

## Completed

- [x] iOS-first Expo/React Native app with local PhotoKit import, confirmed dates, persistent processing queue, SQLite records, and Apple Vision sticker generation.
- [x] Calendar-first interaction: sticker stacks, count badges, horizontal month/day browsing, animated sheets, centered Add action, English UI, and local identity.
- [x] Local sticker outline editing: preserve the transparent cutout, preview and save color/width variants without rerunning Vision.
- [x] Automated domain/SQLite, TypeScript, lint, formatting, native file-catalog, and documentation-contract checks.

## P0 — keep user data safe

- [x] Implement a user-controlled `.yidie` package with a consistent SQLite snapshot and app-owned image assets; the Files picker lets users choose its destination.
- [x] Validate package layout, format/schema versions, checksums, file paths, counts, SQLite integrity, and size limits before restore.
- [x] Stage restores separately and use a startup-recoverable directory swap; rollback retains the current library if activation fails before commit.
- [x] Make backup/restore discoverable in Settings and explain that backup packages are unencrypted and uninstalling without a backup can remove local records.
- [x] Add deterministic native tests for package corruption, path traversal, future versions, storage limits, cancellation, and interrupted swaps; run the standalone backup harness. The Files picker end-to-end flow still needs Simulator interaction.

## P1 — finish the promised user flows

- [x] Implement local sharing of a single transparent sticker and a high-resolution month image using the calendar's shared layout geometry. The native share-sheet interaction remains to be accepted in Simulator.
- [x] Add an optional, default-off Yidie signature to month exports; draw it in the native renderer only when requested. The visual export and share flow still need Simulator acceptance.
- [x] Add native date selection to record editing, with cancel-safe behavior and correct calendar relocation after confirmation; Simulator acceptance remains due.
- [x] Rebuild the latest source as an unsigned iOS Simulator Release app. The generated workspace and Expo Pods link successfully with Xcode 27; signing was disabled and temporary build products were removed after verification.
- [x] Launch the latest source in a dedicated iPhone 18 Pro / iOS 27 Simulator using synthetic preview data. Visually confirm the same-day stack/count badge, open a ten-outfit day, choose a dark outline, preview it, save it, and return to the updated sticker. Confirm the empty-month and populated-month layouts and arrow-based month navigation. No Photos permission or real library data was used.
- [x] Inspect All Records and synthetic processing/failure states in the Simulator; the date-ordered card grid, queue summary, original-photo safety message, and Resume action are visible. This does not accept real imports or run a real processing job.
- [x] Recheck Import Review after hiding its development-only scene switcher. A fresh iPhone 18 Pro Simulator session shows the full review list and fixed bottom action with no preview control covering the content.
- [x] Re-run the local outline editor end to end with synthetic preview data: change to a dark 4 px outline, generate an unsaved preview, save it, and confirm the updated sticker in the day sheet. The source photo and cutout remain unchanged; no Vision/API/model call or real Photos data is involved.
- [ ] Confirm horizontal touch paging in the day sheet and swipe-to-change-month on an actual simulator touch surface. Device Hub accepted taps but its drag input did not change the page/month, so the gestures are not yet verified by this walkthrough.
- [ ] Verify native Files backup/restore, share/cancel, date-picker, and sheet-dismissal motion flows on a supported Simulator. Xcode 27.0 has iOS 27.0 and iOS 26.1 runtimes installed, and an unsigned Release build launches on iOS 27.0. Device Hub supports taps, but its drag input did not provide verifiable touch paging; native system-picker flows still need careful Simulator acceptance.
- [ ] Validate VoiceOver labels/focus, large text, reduced motion, smallest supported screen, and six-week months.
- [ ] Run a physical-device acceptance with only a user-selected test photo; verify orientation, Vision success/failure, outline quality, offline use, responsiveness, and memory. Never use or upload private photos without direct consent.
- [ ] Record and publish only verified measurements and supported iOS/build requirements.

## P2 — make the public project easy to trust and contribute to

- [x] Replace stale/duplicated status prose with one README, one live delivery board, one current release-gate document, and a short chronological changelog.
- [x] Document local setup, architecture, privacy/data boundaries, known limitations, test commands, signing, and troubleshooting in concise English; link Chinese project notes where useful.
- [x] Add a native CI job on the stable `macos-26` image, explicitly select Xcode 26.6, run the Swift safety/backup tests and iOS core typecheck, then generate CocoaPods and build the unsigned Simulator Release app. The standalone native checks pass locally; the hosted full build still needs a pushed workflow run.
- [ ] Publish `.github/workflows/ci.yml` and confirm both the lockfile-based JavaScript job and pinned native job run green. The owner approved reauthorization, but the current GitHub OAuth credential still lacks `workflow`; GitHub rejected the push. Reconnect the GitHub app with that scope before retrying; do not bypass the scope check.
- [x] Add issue templates, security contact/reporting guidance, and contribution instructions that protect personal data.
- [ ] Capture a populated app-screen demo for the README and X after the simulator walkthrough is visually verified; include captions and use synthetic or explicitly consented imagery. A clearly labeled empty-calendar screenshot is available meanwhile.
- [x] Prepare an honest X launch sequence and measurement plan: product problem, demo copy, local-only architecture, one engineering lesson, and a bounded tester invitation. Actual external posts wait for a verified recording and an explicit posting request.

## Definition of done

The first public release is done when P0 and P1 code items pass automated checks, all core screens pass a repeatable simulator walkthrough, one opt-in physical-device photo test passes or produces a clearly bounded fallback, all user data flows have rollback behavior, docs agree with the shipped app, CI is green, and a versioned build can be reproduced from the repository. Until then, call it a development build and keep this board current.
