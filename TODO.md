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
- [ ] Rebuild the latest source and verify same-day stack/count badge, horizontal browsing, sticker outline preview/save, empty/error/loading states, and sheet motion on supported simulator sizes. Earlier Release empty-calendar launch passed; the current editor-state and Reduce Motion corrections have a successful JS export but no fresh Xcode build. `xcodebuild` rejects the current generated workspace, while a direct project build cannot find Expo Pods modules; inspect the workspace/Pods after the Mac is unlocked. CoreSimulatorService is also unavailable. Populated scenarios have not been interactively accepted.
- [ ] Validate VoiceOver labels/focus, large text, reduced motion, smallest supported screen, and six-week months.
- [ ] Run a physical-device acceptance with only a user-selected test photo; verify orientation, Vision success/failure, outline quality, offline use, responsiveness, and memory. Never use or upload private photos without direct consent.
- [ ] Record and publish only verified measurements and supported iOS/build requirements.

## P2 — make the public project easy to trust and contribute to

- [x] Replace stale/duplicated status prose with one README, one live delivery board, one current release-gate document, and a short chronological changelog.
- [x] Document local setup, architecture, privacy/data boundaries, known limitations, test commands, signing, and troubleshooting in concise English; link Chinese project notes where useful.
- [ ] Publish the prepared `.github/workflows/ci.yml` and confirm it runs green for lockfile install, static checks, tests, and JS export. GitHub currently rejects workflow writes because the connected OAuth app lacks the `workflow` scope; do not change that authorization until the owner approves. Add native build checks only on a pinned supported macOS/Xcode runner.
- [x] Add issue templates, security contact/reporting guidance, and contribution instructions that protect personal data.
- [ ] Capture a populated app-screen demo for the README and X after the simulator walkthrough is visually verified; include captions and use synthetic or explicitly consented imagery. A clearly labeled empty-calendar screenshot is available meanwhile.
- [ ] Publish a small, honest launch sequence: product problem and demo, local-only architecture, one engineering lesson, invitation to test/contribute; track repository visits, stars, issues, and tester feedback without promising reach.

## Definition of done

The first public release is done when P0 and P1 code items pass automated checks, all core screens pass a repeatable simulator walkthrough, one opt-in physical-device photo test passes or produces a clearly bounded fallback, all user data flows have rollback behavior, docs agree with the shipped app, CI is green, and a versioned build can be reproduced from the repository. Until then, call it a development build and keep this board current.
