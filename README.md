<p align="center">
  <img src="assets/branding/yidie-app-icon.svg" width="132" alt="Yidie app icon" />
</p>

<h1 align="center">Yidie · 衣叠</h1>

<p align="center">An offline-first outfit diary that turns the days you wore them into a sticker calendar.</p>
<p align="center">把穿过的日子，一张张叠起来。</p>

> **Development build.** Current-source GitHub Actions [run 38825393330](https://github.com/tech-zjf/Yidie/actions/runs/38825393330) passed the unsigned iOS Simulator Release build, isolated sticker pixel checks, and 77 JavaScript tests. A separate earlier Simulator launch smoke check recognized the Yidie wordmark, but neither run accepts interactive flows or Vision quality from a real photo. This Mac currently has no working CoreSimulatorService or installed Simulator runtime. See the live [delivery board](TODO.md).

## What makes it different

- **Calendar first.** A worn outfit becomes a sticker on its day. Multiple looks stack, then open into a horizontal photo viewer.
- **Private by design.** Photo selection, date records, foreground cutouts, and sticker styles stay on the device. No account, backend, analytics, cloud inference, or photo upload.
- **A small tool, not a digital closet.** No garment catalog, social feed, recommendations, or shopping layer. Keep a visual record of what you actually wore.
- **Built with native iOS image processing.** Apple's VisionKit subject-lifting API creates a tightly cropped transparent cutout when available; Vision segmentation is the local fallback. Core Image renders editable sticker styles locally.

The editor prefers Apple's public VisionKit subject-lifting API, then falls back to Vision segmentation. VisionKit provides the same public subject-lifting capability Apple demonstrates for system-like interactions ([WWDC23](https://developer.apple.com/videos/play/wwdc2023/10176/)), but subject grouping may differ by image. Original, Outline, Comic, 3D, and Shimmer are local Core Image treatments with no paid service. Apple doesn't expose Photos' specific sticker-effect renderer to third-party apps, so Yidie's effects are independent implementations, not 1:1 copies. Subject selection, real-photo edge quality, rendering performance, and physical-device acceptance still need on-device acceptance.

## Product status

| Area                                                             | Status                                                                                                                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calendar, date browsing, same-day stacks and count badges        | Current app launch is verified in hosted Simulator CI; earlier populated/empty scenes and month arrows checked; touch swipes remain due                                    |
| Batch photo import, date confirmation and local processing queue | Implemented; physical-device edge cases are not fully accepted                                                                                                             |
| Sticker style preview and editing                                | Synthetic Core Image pixel checks pass on iOS Simulator in CI; Vision cutouts, real-photo edge quality, editor interaction, and physical-device behavior remain unaccepted |
| Backup/restore and native date picker                            | Empty backup save/restore passes in Simulator; invalid-package UI and date-picker acceptance due                                                                           |
| Transparent sticker and month image sharing                      | Implemented locally, with optional default-off Yidie signature; payload delivery acceptance due                                                                            |
| Physical-device Vision quality, accessibility and performance    | Not accepted yet                                                                                                                                                           |
| Public App Store or general device distribution                  | Not available                                                                                                                                                              |

## Run from source

Yidie uses Expo, React Native, TypeScript, SQLite, and a small Swift Expo module for PhotoKit and Vision. It targets iOS only.

Requirements: macOS, a compatible Xcode installation, and Node.js 22 or newer. Expo Go is not sufficient because the app includes a local native module.

```sh
cd apps/mobile
npm ci
npm run check
npm run ios:sim -- --list
npm run ios:sim -- <simulator-udid>
```

The `ios`, `ios:sim`, and `ios:release` launch scripts validate an exact available Simulator UDID before invoking Expo and fail closed when Simulator services are unavailable; they will not target a physical phone. To run the native UI preview with fixed sample data, use `npm run preview:ios`. The preview does not access Photos or the real database. Details are in the [mobile build guide](apps/mobile/README.md).

Installing on a personal iPhone requires building and signing with your own Apple development identity. This repository does not provide a signed public download. A free personal development profile is for testing on your own registered device and expires; broader iOS distribution has separate Apple requirements.

## Privacy and data safety

Yidie copies only photos the user selects. PhotoKit requests disable network access; the app does not fetch iCloud originals on its own. Deleting a Yidie record never deletes the source from Apple Photos. The app's own database and copies are local and excluded from system backup. A `.yidie` backup package contains unencrypted copies of those records and images; choose its destination yourself and keep it private. Until a backup has been created and verified, uninstalling Yidie can remove local records and imported copies. Do not use this development build as the only archive of important photos.

Photo browsing creates a capped, temporary thumbnail cache that can be rebuilt from the local library; it is not included in `.yidie` export packages.

Never attach personal outfit photos, databases, signing files, provisioning profiles, or device identifiers to issues. Use synthetic or explicitly consented material for private bug reproduction; public product screenshots must use an owner-approved real-photo capture.

## Project map

```text
apps/mobile/       Expo app, feature UI, local data layer, Swift native module
assets/branding/   App icon and brand mark source artwork
assets/fonts/      Licensed font sources and notices
docs/              Product decisions, architecture, verification and device-safety notes
specs/             Database and native contracts/migrations
scripts/           Reproducible checks and design asset builders
```

Start with [architecture](docs/03-architecture.md), [engineering conventions](docs/10-engineering.md), and the [delivery board](TODO.md). Product scope and the current release gate live in the [PRD](docs/02-prd.md) and [readiness review](docs/16-readiness-review.md).

## Contributing

Bug reports, design feedback, and focused code contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Keep date/layout rules in the domain layer, SQL in data repositories, UI in feature modules, and iOS APIs in `modules/yidie-native`. Changes that touch persistence or file ownership need failure-path tests.

The project is licensed under [MIT](LICENSE). Bundled fonts have their own notices; see [font provenance](assets/fonts/README.md).

## Project links

- [Live TODO and acceptance gates](TODO.md)
- [Market research and differentiation](docs/01-research.md)
- [Local device testing and safety guide](docs/15-device-test-safety-runbook.md)
- [Open-source launch notes](docs/17-open-source-launch.md)
