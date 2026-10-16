# Build and verification

This page records the latest bounded evidence. The [delivery board](../TODO.md) is the source of truth for open acceptance work; implementation rationale lives in the [architecture](03-architecture.md).

## Current source

GitHub Actions [run 38860023978](https://github.com/tech-zjf/Yidie/actions/runs/38860023978) passed for the current PR tree at [`90217bb`](https://github.com/tech-zjf/Yidie/commit/90217bbb7f72b2e7137049edd950b456dc672b61):

- TypeScript, ESLint, Prettier, all 81 JavaScript tests, and iOS bundle export.
- Documentation, database, and native-module contracts; native file ownership and backup tests; iOS SDK typecheck.
- Expo prebuild, CocoaPods installation, and unsigned iOS Simulator Release build with Xcode 26.6.
- Sticker/Core Image pixel assertions and current-app install/launch with first-screen OCR for the Yidie wordmark. The run does not claim interactive UI acceptance.
- A regression test confirms same-day mixed-aspect sticker-stack geometry is unchanged when every cutout's pixel resolution scales by 8×.

The sticker fixture uses deterministic synthetic pixels. It verifies alpha cropping, stable canvas geometry, source color, visible white outline and shadow, zero-width identity, and distinct style output. It does not measure Vision segmentation quality or resemblance to Apple Photos. The app smoke check verifies launch and first render, not user flows.

## Local checks and limits

On 2026-10-16, the current local tree passed `npm run check` with strict TypeScript, ESLint, Prettier, and all 81 JavaScript tests. `npm run export:ios`, `sh scripts/check_native.sh`, and `python3 scripts/check_packet.py` also passed. The local native script skipped only Core Image pixel rendering because the host could not render a 1×1 `CIContext` probe; hosted CI treated this condition as a failure and ran the full pixel fixture on the current source above.

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
