# iOS app development

Yidie is an iOS-only Expo / React Native app with a local Swift module for PhotoKit, Vision, and Core Image. Expo Go does not contain this module.

## Requirements

- macOS and Xcode compatible with the Expo SDK pinned in `package-lock.json`
- Node.js 22 or newer
- CocoaPods for the generated iOS project

The last recorded local build used macOS 26.7.1, Xcode 27.0, Expo SDK 57, React Native 0.86, and iOS 27 Simulator. Check current Expo and Apple compatibility requirements before upgrading the toolchain.

## Install and check

```sh
npm ci
npm run check
npm run ios
```

`npm run ios:release` builds a local Release configuration with its embedded JavaScript bundle. Installing on a physical iPhone requires signing with your own Apple development identity and accepting the device-side development trust prompt. The project does not store or distribute signing credentials.

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
modules/yidie-native/  Swift PhotoKit, Vision, Core Image and owned-file boundary
```

Keep the dependency direction and failure-handling rules in [engineering conventions](../../docs/10-engineering.md). Generated `ios/` files are local build output; make native source changes in `modules/yidie-native` or app config plugins.

## Verification

```sh
npm run check
sh ../../scripts/check_native.sh
python3 ../../scripts/check_packet.py
```

The Swift file-catalog check and iOS core typecheck do not replace a full Xcode app build. Simulator Vision cannot provide valid cutout-quality evidence on the current local setup. See the live [delivery board](../../TODO.md) and [readiness review](../../docs/16-readiness-review.md) for remaining acceptance work.
