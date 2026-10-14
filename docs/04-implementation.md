# Implementation and release sequence

This is the ordered work plan, not a second feature inventory. The live checklist is [TODO.md](../TODO.md); verified implementation evidence is in the [build record](09-build-log.md) and the current release boundary is in the [readiness review](16-readiness-review.md).

## Shipped in the development build

1. **Foundation and local image flow:** Expo/React Native iOS app, Swift PhotoKit/Vision module, SQLite repositories, bounded local previews, durable processing queue, retry, and recovery of app-owned files.
2. **Date and record handling:** explicit date review, unknown-date inbox, batch import, duplicate confirmation, date editing, day cover, all-record pagination, deletion and retry.
3. **Calendar experience:** sticker-first month view, empty-day dates, same-day stacks and count badge, month/day swipes, animated bottom sheets, centered Add action, English UI, app identity, and reduced-motion support.
4. **Sticker editing:** save a transparent local cutout; preview and persist a color/width outline without rerunning Vision. SQLite schema migration v5 tracks the style and asset revision.
5. **Build and code quality:** strict TypeScript, ESLint, Prettier, domain/SQLite tests, Swift file safety checks, iOS core typecheck, packet contracts, and an iOS Simulator Release build.

This status means the source implementation exists. It does not imply every visual scenario or physical-device behavior has been accepted.

## Finish the product safely

1. **Accept backup and restore.** The local `.yidie` package, integrity checks, staged restore, rollback journal and Settings flow are implemented. Deterministic native tests cover corrupt/future packages, storage limits, cancellation and interrupted swaps. Verify the Files picker end-to-end in Simulator.
2. **Accept sharing and date editing.** Single transparent sticker and high-resolution month images share through the native sheet; month export uses the exact domain layout inputs used on screen. The native date picker is implemented. Accept both native interactions in Simulator; cancellation must leave records untouched.
3. **Accept the UI.** Walk every preview scenario in a supported simulator and inspect screenshots for a short phone, 4/5/6-week months, day stacks, badges, editor states, all-record layout, large text, VoiceOver and reduced motion. The Release empty-calendar launch is verified; populated interactions remain open.
4. **Accept native photos.** On a user-selected test photo only, verify local import, orientation, Vision cutout/fallback, outline, offline behavior, processing time and memory. Keep the source photo in Apple Photos and confirm failure leaves a recoverable Yidie record.
5. **Prove the public build.** Run CI, reproduce a Release build from the README, update support requirements and limitations, create an app-sourced demo, then invite a small group to test and report friction.

Each step has detailed acceptance checks in [TODO.md](../TODO.md) and the [verification matrix](07-verification.md). Do not call the app a complete v0.1 until every P0/P1 gate passes or the PRD is intentionally revised.

## Development commands

```sh
cd apps/mobile
npm ci
npm run check
npm run ios
```

The native source lives under `apps/mobile/modules/yidie-native`; generated Xcode projects and signing credentials stay local. See [mobile setup](../apps/mobile/README.md) and [engineering conventions](10-engineering.md).
