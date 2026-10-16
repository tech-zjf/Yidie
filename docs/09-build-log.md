# Build and verification

This page records the latest bounded evidence. The [delivery board](../TODO.md) is the source of truth for open acceptance work; implementation rationale lives in the [architecture](03-architecture.md).

## Current source

GitHub Actions [run 38844579444](https://github.com/tech-zjf/Yidie/actions/runs/38844579444) passed on app source commit [`0399a98`](https://github.com/tech-zjf/Yidie/commit/0399a98):

- TypeScript, ESLint, Prettier, all 80 JavaScript tests, and iOS bundle export.
- Documentation, database, and native-module contracts; native file ownership and backup tests; iOS SDK typecheck.
- Expo prebuild, CocoaPods installation, and unsigned iOS Simulator Release build with Xcode 26.6.
- Sticker/Core Image pixel assertions. A separate earlier hosted smoke run verified current-app install and launch with first-screen OCR for the Yidie wordmark; run 38844579444 does not claim interactive UI acceptance.

The sticker fixture uses deterministic synthetic pixels. It verifies alpha cropping, stable canvas geometry, source color, white outline and shadow, zero-width identity, and distinct style output. It does not measure Vision segmentation quality or resemblance to Apple Photos. The app smoke check verifies launch and first render, not user flows.

## Local checks and limits

On 2026-10-16, `npm run check` passed strict TypeScript, ESLint, Prettier, and all 80 JavaScript tests. `npm run export:ios`, `sh scripts/check_native.sh`, and `python3 scripts/check_packet.py` also passed. The local native script skipped only Core Image pixel rendering because the host could not render a 1×1 `CIContext` probe; hosted CI treats this condition as a failure and ran the full pixel fixture.

The current Mac has Xcode 27.0 but no installed `Simulator.app` or iOS Simulator runtime, and CoreSimulatorService refuses connections. The local Xcode project build is therefore not accepted as a build or launch result. No physical iPhone, personal photo library, signing identity, keychain, or unrelated application was accessed for these checks.

Interactive calendar and sheet flows, native subject selection, real-photo appearance and performance, accessibility behavior, and physical-device acceptance remain open. See [TODO.md](../TODO.md) and the [device safety guide](15-device-test-safety-runbook.md).

## Reproduce

From `apps/mobile`:

```sh
npm ci
npm run check
npm run export:ios
npm run test:sticker:sim -- <booted-simulator-udid>
```

The sticker command requires an already booted Simulator UDID, refuses physical-device identifiers, and removes its temporary test app on exit. From the repository root:

```sh
sh scripts/check_native.sh
python3 scripts/check_packet.py
```

The native file and database checks do not replace a complete Xcode build or an interactive app walkthrough.
