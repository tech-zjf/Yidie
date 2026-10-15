# Release readiness

Updated 2026-10-15. Yidie is an offline-first iOS development build, not a release candidate. The [delivery board](../TODO.md) is the single source for feature acceptance and remaining work; this page summarizes the current evidence and release boundary.

## Implemented

- An Expo/React Native calendar with same-day sticker stacks, count badges, month navigation, animated sheets, record browsing, English copy, and a centered Add action.
- On-device photo processing and transparent sticker editing with locally rendered outline color and width options. No remote API, account, analytics, or cloud image processing is used.
- Photo-library access states, a persistent local processing queue, date editing, local sticker/month exports, and optional default-off export signature.
- A portable `.yidie` backup with integrity checks, staged restore, recovery behavior, and native validation tests.
- A single-owner SQLite connection and FIFO operation lane that serialize reads, writes, transactions, and close.
- A Simulator-only preview launcher that validates a Simulator UDID and fails closed if the Simulator service is unavailable.

## Verification

- `npm run check`: TypeScript, ESLint, Prettier, and 71 JavaScript tests in the current local worktree, including a file-backed SQLite WAL close/reopen case. The latest GitHub Actions run at PR head `1381fd7` ran 70 tests before this additional test was added; the current worktree has not yet been pushed or run in CI.
- `npm run export:ios`: production JavaScript bundle; preview fixtures are excluded from the release export.
- `sh scripts/check_native.sh`: Swift safety tests and iOS core typecheck.
- `python3 scripts/check_packet.py`: documentation links, publication hygiene, SQLite schema/migrations, and repository contracts.
- A dedicated iOS 27 Simulator preview used synthetic data to inspect the calendar, same-day stacks, outline preview/save, All Records, and import states. An iOS 26.1 Simulator completed an empty-backup save/restore through Files and reopened the calendar. An empty-month PNG was saved and opened in Preview.
- [GitHub Actions run 38725891588](https://github.com/tech-zjf/Yidie/actions/runs/38725891588) passed at PR head `1381fd7`, including JavaScript checks, tests, iOS export, native safety tests, Expo prebuild, CocoaPods, and an unsigned Simulator Release build on Xcode 26.6. See the [build log](09-build-log.md) for reproducible local commands and the newer local-only test evidence.

These checks did not use a physical iPhone, personal Photos library, Developer Mode, signing identity, certificate, or keychain. Synthetic previews do not prove Apple Vision cutout quality or real-photo import behavior.

## Remaining release gates

The release is not complete until the open P0/P1 items on the [delivery board](../TODO.md) have evidence. They include native SQLite close/WAL stress, touch-driven month/day paging and sheet dismissal, corrupt-backup UI and date-picker interaction, populated share/export rendering, accessibility and supported-size checks, and one physical-device photo test using only an image the user deliberately selects. Capture a public demo only from verified flows. Do not publish launch posts without an explicit request.

The repository snapshot removes the four retired HTML prototypes from its current tree and checks that they are not reintroduced. GitHub's language chart follows the default branch, so its HTML percentage changes only after the cleanup PR is merged; the existing public history is not rewritten.

## Known dependency advisories

The lockfile currently resolves `node-forge@1.4.0` through Expo's build tooling and `braces@3.0.3` through Metro. GitHub advisories [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) and [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) list these versions as affected; no patched upstream release was available at the last check. They are development/build dependencies and were not found in the exported application bundle. Recheck with registry access and update when compatible upstream fixes are available; do not force an unreviewed major-version override.

For local development and build reproduction, see the [mobile build guide](../apps/mobile/README.md) and [build log](09-build-log.md). Keep machine-specific signing, device, and keychain notes outside the public repository.
