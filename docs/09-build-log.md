# Build and verification

Updated 2026-10-15. This page records the latest reproducible checks. Feature acceptance and remaining release gates live in [TODO.md](../TODO.md).

## Automated checks

- `npm run check` passes TypeScript, ESLint, Prettier, and all 71 JavaScript tests in the current local worktree.
- `npm run export:ios` produces the production iOS JavaScript bundle.
- `sh scripts/check_native.sh` passes the Swift safety suites and iOS core typecheck.
- `python3 scripts/check_packet.py` validates local document links, absence of retired HTML prototypes, test-to-CI inventory, SQLite schema and migrations, transaction behavior, and generated schema consistency.
- GitHub Actions builds the unsigned Simulator Release app with the pinned Xcode 26.6 toolchain. This build does not sign or install an app on a physical iPhone.

The latest complete workflow passed for PR head [`60e54cb`](https://github.com/tech-zjf/Yidie/commit/60e54cbe9044f5c66b0e1558aa5390551adef4ae) in [run 38728466183](https://github.com/tech-zjf/Yidie/actions/runs/38728466183). It includes the 71-test suite, iOS export, documentation and native safety checks, Expo prebuild, CocoaPods, and the unsigned Simulator Release build.

The latest app-source commit is [`6ced968`](https://github.com/tech-zjf/Yidie/commit/6ced96866015580cd3e2c3f1f37cad56c729f234). Its JavaScript checks, 71 tests, iOS export, documentation checks, native safety tests, Expo prebuild, and CocoaPods installation passed. The unsigned Simulator Release build was still running in [run 38729213583](https://github.com/tech-zjf/Yidie/actions/runs/38729213583) when this evidence was recorded. Subsequent commits only corrected documentation. Check the live [PR checks](https://github.com/tech-zjf/Yidie/pull/1) before describing its latest revision as fully green.

## Runtime evidence

- A dedicated iOS 26.1 Simulator completed an empty `.yidie` save/restore flow through Files and relaunched to the calendar.
- A dedicated iOS 27 Simulator preview inspected populated and empty calendars, same-day stacks, outline preview/save, import review, and record states with synthetic in-memory data. It does not exercise PhotoKit or Apple Vision.
- Day sheets, All Records, Settings, and the add-photo explanation were inspected in Simulator. The Photos picker was not opened.

## Acceptance still required

Month and day touch paging, sheet dismissal timing, date-picker interaction, populated export/share delivery, corrupt-package UI, accessibility, small-screen and large-text layout, and performance are not yet accepted. A physical-device Vision test must use a photo selected by the user for this purpose. See the [delivery board](../TODO.md) for the current checklist.

## Reproduce checks

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

For an unsigned Simulator build, Expo prebuild and CocoaPods setup, or personal-device signing, see the [mobile build guide](../apps/mobile/README.md). Keep device-specific safety notes outside this public repository.
