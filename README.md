<p align="center">
  <img src="apps/mobile/assets/icon.png" width="132" alt="Yidie app icon" />
</p>

<h1 align="center">Yidie · 衣叠</h1>

<p align="center">An offline-first outfit diary that turns the days you wore them into a sticker calendar.</p>
<p align="center">把穿过的日子，一张张叠起来。</p>

> **Development build.** The populated calendar and local sticker-outline preview/save have been exercised in an isolated Simulator with synthetic data. Empty-library backup save/restore now also passes through the iOS Files UI. Touch gestures, share delivery, corrupt-package UI handling, date-picker interaction, physical-device Vision quality, accessibility and performance acceptance remain open; this is not a finished or generally installable release. See the live [delivery board](TODO.md).

## What makes it different

- **Calendar first.** A worn outfit becomes a sticker on its day. Multiple looks stack, then open into a horizontal photo viewer.
- **Private by design.** Photo selection, date records, foreground cutouts, and sticker styles stay on the device. No account, backend, analytics, cloud inference, or photo upload.
- **A small tool, not a digital closet.** No garment catalog, social feed, recommendations, or shopping layer. Keep a visual record of what you actually wore.
- **Built with native iOS image processing.** Apple Vision creates the transparent cutout; Core Image redraws editable outlines locally.

## Product status

| Area                                                             | Status                                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| Calendar, date browsing, same-day stacks and count badges        | Populated/empty simulator scenes and month arrows checked; touch swipes remain due |
| Batch photo import, date confirmation and local processing queue | Implemented; physical-device edge cases are not fully accepted   |
| Sticker outline preview and editing                              | Preview/save checked with synthetic simulator data; verify quality with an opt-in test photo |
| Backup/restore and native date picker                            | Empty backup save/restore passes in Simulator; invalid-package UI and date-picker acceptance due |
| Transparent sticker and month image sharing                      | Implemented locally, with optional default-off Yidie signature; payload delivery acceptance due |
| Physical-device Vision quality, accessibility and performance    | Not accepted yet                                                 |
| Public App Store or general device distribution                  | Not available                                                    |

## Run from source

Yidie uses Expo, React Native, TypeScript, SQLite, and a small Swift Expo module for PhotoKit and Vision. It targets iOS only.

Requirements: macOS, a compatible Xcode installation, and Node.js 22.13.0 or newer (`apps/mobile/.nvmrc` pins 22.21.0). Expo Go is not sufficient because the app includes a local native module.

```sh
cd apps/mobile
npm ci
npm run check
npm run ios:sim -- --list
npm run ios:sim -- <simulator-udid>
```

The Simulator helper validates the UDID against `simctl` before invoking Expo and fails closed when the Simulator service is unavailable; it will not target a physical phone. To run the native UI preview with fixed sample data, use `npm run preview:ios`. The preview does not access Photos or the real database. Details are in the [mobile build guide](apps/mobile/README.md).

Installing on a personal iPhone requires building and signing with your own Apple development identity. This repository does not provide a signed public download. A free personal development profile is for testing on your own registered device and expires; broader iOS distribution has separate Apple requirements.

## Privacy and data safety

Yidie copies only photos the user selects. PhotoKit requests disable network access; the app does not fetch iCloud originals on its own. Deleting a Yidie record never deletes the source from Apple Photos. The app's own database and copies are local and excluded from system backup. A `.yidie` backup package contains unencrypted copies of those records and images; choose its destination yourself and keep it private. Until a backup has been created and verified, uninstalling Yidie can remove local records and imported copies. Do not use this development build as the only archive of important photos.

Photo browsing creates a capped, temporary thumbnail cache that can be rebuilt from the local library; it is not included in `.yidie` export packages.

Never attach personal outfit photos, databases, signing files, provisioning profiles, or device identifiers to issues. Use synthetic or explicitly consented test material.

## Project map

```text
apps/mobile/       Expo app, feature UI, local data layer, Swift native module
assets/            Brand source artwork and font source files with licenses
docs/              Product decisions, architecture, verification and device-safety notes
specs/             Database and native contracts/migrations
scripts/           Reproducible checks and source generators
```

Start with [architecture](docs/03-architecture.md), [engineering conventions](docs/10-engineering.md), and the [delivery board](TODO.md). Product scope and the current release gate live in the [PRD](docs/02-prd.md) and [readiness review](docs/16-readiness-review.md).

## Contributing

Bug reports, design feedback, and focused code contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Keep date/layout rules in the domain layer, SQL in data repositories, UI in feature modules, and iOS APIs in `modules/yidie-native`. Changes that touch persistence or file ownership need failure-path tests.

The project is licensed under [MIT](LICENSE). Bundled fonts have their own SIL Open Font License notices; see [font provenance](assets/fonts/README.md).

## Project links

- [Live TODO and acceptance gates](TODO.md)
- [Market research and differentiation](docs/01-research.md)
- [Local device testing and safety guide](docs/15-device-test-safety-runbook.md)
- [Open-source launch notes](docs/17-open-source-launch.md)
