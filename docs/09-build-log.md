# Build and verification

This page records current, bounded evidence. The active checklist is [TODO.md](../TODO.md); product-level risks and release gates are in the [readiness review](16-readiness-review.md). Older implementation chronology remains in Git history.

## Current checks

- `cd apps/mobile && npm run check` passes strict TypeScript, ESLint, Prettier, and all 76 JavaScript tests.
- `sh scripts/check_native.sh` passes native file-catalog, staged sticker-asset ownership, alpha-crop/geometry, thumbnail-cache, backup/restore tests, and the iOS SDK core typecheck. Its Core Image pixel stage reports `SKIP` because the current local environment cannot render a 1×1 `CIContext` probe; the alpha cropper's transparent-margin and visible-pixel assertions run before that skip.
- `python3 scripts/check_packet.py` passes documentation links, SQL contracts, native-module inventory, and public-packet checks. `git diff --check` passes.
- `npm run export:ios` bundles the iOS JavaScript entry and font assets.
- A clean Expo prebuild and CocoaPods dependency installation completed for the current source. The subsequent Xcode command stopped before compiling: this local Xcode reports the generated `Yidie.xcworkspace` is not a workspace and cannot connect to CoreSimulatorService. The install lacks `Simulator.app` and an iOS runtime, so this is not accepted as a successful current-tree build or launch. A separate project-only build is invalid because it omits the CocoaPods dependency graph.
- An earlier unsigned Release build produced a universal arm64/x86_64 Simulator app bundle but emitted `SwiftCompile ... failed with exit code 0 but produced no further output` diagnostics while compiling Expo modules. That artifact is not accepted as a clean build. Generated Pods and build products are ignored local outputs.
- An earlier complete unsigned build and launch succeeded on an isolated iOS Simulator. That historical runtime evidence does not accept the current tree.

## Hosted verification for the current source

- GitHub Actions [run 38804212797](https://github.com/tech-zjf/Yidie/actions/runs/38804212797) passed on commit `93b5d3a`: 76 JavaScript tests, type/lint/format checks, iOS bundle export, documentation/native contracts, Swift file and backup tests, Core Image pixel assertions, Expo prebuild, CocoaPods installation, and unsigned iOS Simulator Release compilation with Xcode 26.6.
- The hosted build compiled the app for Simulator but did not launch the product app. CI now includes a follow-up step that boots an isolated iPhone Simulator and launches the dedicated sticker pixel harness; that new step remains unverified until the next hosted run. It launches the temporary test fixture, not Yidie. The editor, gestures, date-picker, backup-error and real-photo Vision flows remain open for interactive acceptance.

## Sticker evidence and limits

- A deterministic synthetic RGBA harness passed on an isolated iOS Simulator for source color/alpha, visible white outline, translucent shadow, stable effect canvas, zero-width identity, and distinct Comic/3D/Shimmer pixels. It validates Core Image composition only; it does not validate Vision segmentation, realistic edges, or resemblance to Photos. The temporary harness used for that pass was removed.
- A reusable `npm run test:sticker:sim -- <booted-simulator-udid>` command compiles and links the same fixture for Simulator and refuses non-Simulator or unbooted IDs. Its end-to-end launch remains unverified because the current local toolchain lacks the Simulator app and CoreSimulatorService is unavailable. Restoring a complete Xcode installation remains a separate system change.
- A Simulator sample was imported under Limited Photos Access. Vision was unavailable in that Simulator; the original was preserved and the UI offered retry. No cutout was produced in that session.
- VisionKit's public subject-lifting API can return transparent foreground subjects. Apple's public API does not expose Photos' effect renderer; Yidie's styles are separate local approximations and cannot claim 1:1 parity. See the [PRD](02-prd.md) and [sticker acceptance gates](../TODO.md).

## SQLite crash-report follow-up

An observed crash report showed a SQLite statement reset overlapping database close and a WAL checkpoint. It did not identify the initiating app action or prove which source revision was installed. The repository now owns one connection for reads and writes, serializes work and shutdown on one FIFO lane, and drains/fences work before closing. Controlled JS regressions pass. A deliberate native Simulator stress run remains open; the earlier backup restore/relaunch is lifecycle smoke coverage, not a concurrency stress test.

## Reproduce

From `apps/mobile`:

```sh
npm ci
npm run check
npm run export:ios
npm run test:sticker:sim -- <booted-simulator-udid>
```

The last command runs only on an already booted Simulator, removes its own temporary test app, and never boots or resets a device. From the repository root:

```sh
sh scripts/check_native.sh
python3 scripts/check_packet.py
```

The full unsigned build procedure and signing boundaries are in the [mobile build guide](../apps/mobile/README.md). Device-test limits and the explicit real-photo consent boundary are in the [device safety guide](15-device-test-safety-runbook.md). Verification was limited to the project workspace and isolated Simulator test data; it did not access a physical iPhone, personal photo library, signing identity, keychain, or unrelated app.
