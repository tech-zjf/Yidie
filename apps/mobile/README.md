# iOS app development

Yidie is an iOS-only Expo / React Native app with a local Swift module for PhotoKit, VisionKit, Vision, and Core Image. Expo Go does not contain this module.

## Requirements

- macOS and Xcode compatible with the Expo SDK pinned in `package-lock.json`
- Node.js 22.13.0 or newer (`.nvmrc` pins 22.21.0)
- CocoaPods for the generated iOS project

The last recorded local build used macOS 26.7.1, Xcode 27.0, Expo SDK 57, React Native 0.86, and iOS 27 Simulator. Check current Expo and Apple compatibility requirements before upgrading the toolchain.

## Install and check

```sh
npm ci
npm run check
npm run ios:sim -- --list
npm run ios -- <simulator-udid>
npm run ios:sim -- <simulator-udid>
npm run ios:release -- <simulator-udid>
npm run test:sticker:sim -- <booted-simulator-udid>
```

All app launch scripts (`ios`, `ios:sim`, and `ios:release`) accept only an exact UDID from `simctl`'s available iOS Simulator inventory and stop before invoking Expo if the inventory is unavailable or the UDID is not a Simulator. This keeps the default workflows from selecting a connected physical iPhone. Use `npm run ios:release -- <simulator-udid>` for a Release build on that Simulator. Installing on a physical iPhone is a separate workflow and is not exposed by these scripts; it requires signing with your own Apple development identity and accepting the device-side development trust prompt. The project does not store or distribute signing credentials.

`test:sticker:sim` compiles deterministic synthetic-pixel assertions against the production sticker renderer and runs a temporary test app on the specified, already-booted Simulator. It refuses physical-device identifiers and does not boot, erase, or reset a simulator. The test app is uninstalled and its temporary files are removed on exit. These assertions cover compositing only; they do not test Vision cutout quality or Photos-app parity.

## UI preview

```sh
npm run preview:ios
```

The preview uses deterministic sample data and read-only service substitutes. It does not read Photos, access the app database, or run Vision. It is useful for repeatable layout checks but is not evidence of native image-processing behavior. See [preview boundaries](../../docs/14-ui-preview.md).

## Code map

```text
src/domain/       Date, import, queue and sticker-layout rules
src/data/         SQLite repositories, migrations and durable image ownership
src/features/     Calendar, import, processing and record screens
src/ui/           Shared type, button, sheet, copy and design tokens
modules/yidie-native/  Swift PhotoKit, VisionKit/Vision, Core Image and owned-file boundary
```

Keep the dependency direction and failure-handling rules in [engineering conventions](../../docs/10-engineering.md). Generated `ios/` files are local build output; make native source changes in `modules/yidie-native` or app config plugins.

## Verification

```sh
npm run check
sh ../../scripts/check_native.sh
python3 ../../scripts/check_packet.py
```

The Swift file-catalog check and iOS core typecheck do not replace a full Xcode app build. Simulator Vision cannot provide valid cutout-quality evidence on the current local setup. See the live [delivery board](../../TODO.md) and [readiness review](../../docs/16-readiness-review.md) for remaining acceptance work.

The local native check may skip Core Image pixel assertions when the host cannot render a 1×1 image; CI treats that condition as a failure so a green workflow always includes actual renderer pixels.
