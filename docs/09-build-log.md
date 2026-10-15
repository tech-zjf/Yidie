# Build and verification record

Updated 2026-10-15. This is a compact record of verified build and runtime evidence. The active feature gates and next actions live in [TODO.md](../TODO.md); the broader product and release assessment lives in [the readiness review](16-readiness-review.md). Git history retains the detailed implementation chronology.

## Latest verified source

- The lockfile resolves ESLint 9.39.5, which is now beyond the ESLint team's support window. A trial upgrade to ESLint 10.12.0 failed: Expo's current `eslint-config-expo` resolves `eslint-plugin-react` 7.37.5, whose React rule crashes on the ESLint 10 rule context. The working ESLint 9 toolchain was restored and all 60 checks pass. Revisit only after Expo and the React plugin publish supported ESLint 10 compatibility; do not silence or remove the affected lint rule to hide the incompatibility.
- After commit `00efa87`, `npm run check` passes strict TypeScript, ESLint, Prettier, and all 60 domain, SQLite, and preview tests; `npm run export:ios` bundles 700 modules successfully from the updated source. Runtime month-swipe behavior still needs a real touch-surface check. The latest standard `git push origin main` reached GitHub and was rejected for the active OAuth credential's missing `workflow` scope; no remote ref changed.
- After the month-swipe classifier change, `npm run export:ios` bundled 700 modules successfully. The Hermes bundle contains `monthSwipeDelta` and the expected `YidieNative` bridge reference, and contains no `Preview scenes`/`preview-only` markers. This verifies JavaScript production entry selection and bundling, not a native compile or on-device swipe. `npm run check` passes strict TypeScript, ESLint, Prettier, and all 59 domain, SQLite, and preview tests. Runtime touch acceptance remains open.
- The day-to-import modal handoff now waits for React Native's iOS `Modal.onDismiss` callback before presenting the import sheet. The subsequent iOS JS export and all source checks pass; the native presentation sequence still needs Simulator acceptance.
- `sh scripts/check_native.sh` passes native file-catalog, backup/restore safety, and Swift core typecheck checks. `python3 scripts/check_packet.py` passes repository documentation, SQL, and prototype contracts.
- Rechecked on 2026-10-15 after the native modal-handoff change: `npm run check` passes all 59 tests and formatting/type/lint gates; `npm run export:ios` bundles 700 modules into a 1.8 MB Hermes bundle. The native safety/typecheck and packet checks pass again. A standard `git push origin main` could not resolve `github.com`; the previous scope-specific rejection remains unresolved, and no remote ref changed.
- The day-sheet horizontal list now gives VoiceOver a swipe hint and labels each photo with its position. Source checks pass; focus order and spoken output have not been verified with VoiceOver.
- Import-picker photo checkboxes now announce the item as an outfit photo and format its capture timestamp using the device locale; missing timestamps have explicit spoken copy. All 59 JS tests and static checks pass; native VoiceOver behavior remains unverified.
- After those accessibility changes, `npm run export:ios` again bundled 700 modules into a 1.8 MB Hermes bundle successfully.
- The no-photo-access state no longer uses a flexible spacer between the top privacy note and permission action, keeping the explanation and button together. `npm run check`, packet validation, and iOS JS export pass; the revised grouping still needs a Simulator visual check.
- Calendar accessibility now exposes the brand as a heading and reads date cells as month/day/year plus an outfit count, rather than raw ISO strings. The day-sheet title uses a readable date label. All 59 tests and iOS JS export pass; VoiceOver focus and pronunciation still need runtime acceptance.
- A complete unsigned iOS Simulator Release build succeeded with Xcode 27 using the generated CocoaPods workspace and `CODE_SIGNING_ALLOWED=NO`. It compiled and linked the Expo native module and bundled JavaScript; it used no signing identity.
- The Release build was installed on the dedicated iPhone 17 Pro / iOS 26.1 QA Simulator. Empty calendar, month arrows, day sheet, All Records, Add explainer, and Settings were inspected. A Files backup round-trip with an empty package (0 records, 0 images) closed, replaced, and reopened the database, then returned to the October calendar.
- Synthetic preview data on the dedicated iPhone 18 Pro / iOS 27 Simulator was used to inspect a ten-entry day stack/count badge, outline preview/save, empty month, Import Review and processing states. This does not validate Apple Vision output on a physical iPhone.
- Repository close/read regression tests hold a read and a serialized queued write while `close()` runs. They verify shutdown waits for active work, rejects later requests, and closes once. The post-fix Simulator backup restore is lifecycle smoke coverage; it does not deliberately stall a query at the exact close boundary.

## Important boundaries

- The supplied crash report is from the iOS Simulator at 2026-10-15 13:25:42 +0800, before the lifecycle fix was committed at 13:44:44. Thread 4 reset a statement while another Expo SQLite queue task closed the database and checkpointed its WAL. This supports a connection-lifecycle race, but the report does not identify which app action initiated close. The report has no source revision/build fingerprint, so it cannot prove whether an uncommitted local rebuild already contained the fix. The repository now fences new operations and waits for in-flight work before closing; the controlled regression passes. This is a Simulator crash, not a physical-device report.
- The backup UI was exercised only with a synthetic empty library. Invalid-package UI rejection, populated-data restore, and rollback from a deliberately interrupted runtime swap still need acceptance. Native safety tests cover malformed packages, live-WAL snapshots, cancellation, and interrupted swaps.
- Native export and share-sheet presentation/cancellation were inspected. Successful delivery and the contents of a shared sticker/month image have not been verified through a destination.
- Device Hub accessibility taps verified sheet content and buttons, but did not deliver a reliable touch drag. Horizontal date paging, month swipe, and frame-accurate sheet dismissal animation remain unaccepted.
- The native date picker has not been exercised in the running app. VoiceOver, large text, reduced motion, smallest supported display, six-week layout, low-storage recovery, and real-device performance need further acceptance.
- No physical iPhone or personal Photos library was accessed for this validation. The test backup contained no records or images. No Developer Mode, signing identity, certificate, or keychain state was changed.
- The exact Xcode 26.6 hosted CI job has not run. The owner authorized a push, but GitHub rejected it because the active integration lacks the `workflow` scope required to publish `.github/workflows/ci.yml`; no remote ref changed. Current local `main` is ahead of `origin/main`.

## Reproduce local checks

From `apps/mobile`:

```sh
npm ci
npm run check
npm run export:ios
```

From the repository root:

```sh
sh scripts/check_native.sh
python3 scripts/check_packet.py
```

For the complete unsigned Xcode Simulator build procedure and signing boundaries, see the [mobile build guide](../apps/mobile/README.md). For device security and rollback history, see the [device test safety runbook](15-device-test-safety-runbook.md).
