# Open-source launch and presentation plan

Research checked on 2026-10-15 against the public repository pages. Star counts below are snapshots from that date; they change continuously and do not establish product use or code quality.

## What comparable projects show

| Project | GitHub stars on 2026-10-15 | Public positioning | Useful lesson for Yidie |
| --- | ---: | --- | --- |
| [Expo](https://github.com/expo/expo) | 52.7k | React Native platform with extensive docs, a modular package tree, and a large tested codebase | State native assumptions and CI toolchain precisely. Expo's contributor guide separates unit, E2E, and manual smoke testing; the last is useful for physical interactions that are hard to automate. Yidie cannot use Expo Go because it ships a custom Swift module. |
| [Ignite](https://github.com/infinitered/ignite) | 19.9k | Long-running React Native / Expo starter with setup guides, troubleshooting, tests, and contributor paths | Keep setup reproducible, centralize typography/theme tokens, and put tests beside the behavior they protect. Borrow its documentation depth, not its broader starter-kit abstractions. |
| [Bluesky Social App](https://github.com/bluesky-social/social-app) | 18.3k | Open React Native app organized into feature areas and native modules | Feature-local UI and native boundaries are useful references. Its server-backed social state, caches, and multi-platform surface are outside Yidie's single-device scope. |
| [Libre Closet](https://github.com/lazztech/Libre-Closet) | — | Self-hosted wardrobe catalog, outfit builder, and scheduling in a mobile-friendly PWA | The server/account and catalog model differs from Yidie. Make the single-device install path, local data ownership, and no-service requirement obvious. |
| [wardrobe](https://github.com/wardrobe-hq/wardrobe) | — | Self-hosted clothing-management web app with labels and outfit suggestions | Do not treat an open-source wardrobe catalog as direct competition; make Yidie's smaller daily-photo memory job obvious. |
| [Wardrowbe](https://github.com/Anyesh/wardrowbe) | — | Self-hosted AI wardrobe-management app | “AI wardrobe” is not Yidie's pitch. Keep the difference concrete: no account/server, use already-taken outfit photos, and organize by the day worn. |

These projects solve adjacent jobs. Public descriptions do not prove their exact behavior on every device. Yidie's defensible direction is narrower: an iPhone-first, no-account outfit diary with a calendar made from the photos themselves, local image processing, and source code people can run and inspect. This is a product thesis to test, not a claim that no one else does it.

The engineering patterns that fit this repository are feature-local code, a narrow native boundary, typed domain/storage contracts, repeatable setup, and layered verification. In Yidie those map to feature modules, pure date/layout rules, injected storage/native ports, and one service composition root. Do not copy the larger projects' server caches, global stores, navigation abstractions, or platform matrix without a concrete need. Ignite's test guide distinguishes unit tests from device E2E; Expo explicitly includes manual smoke tests for interactions that are difficult to automate. [Ignite testing guide](https://github.com/infinitered/ignite/blob/master/docs/concept/Testing.md), [Expo contribution guide](https://github.com/expo/expo/blob/main/CONTRIBUTING.md).

## Open-source presentation checklist

1. The first screen of the repository should explain the app in one sentence, show a verified demo, state the project stage, and offer a working local setup path.
2. Keep only current decision documents linked from the README. Preserve useful product and engineering evidence, but keep personal device-state records, credentials, and machine-specific paths out of the repository and its public history. Do not leave superseded stage reviews looking like active specifications.
3. CI should run the lockfile-based JavaScript, SQLite and documentation checks on every pull request. Native build checks belong on a supported macOS/Xcode runner and must identify their exact toolchain.
4. A contributor should be able to build without credentials, private photos, cloud services or undocumented manual state. Clearly call out Xcode signing if installing on a personal iPhone.
5. Screenshots and video must come from the app build being described. Public product media uses real app captures made by the user with a user-selected test photo. Do not publish generated people, geometric preview fixtures, or private Photos content. Keep screenshots out of the repository until the user supplies and approves the captures.

GitHub's language chart reflects the repository's default branch. The current publication branch removes four historical HTML-only design prototypes; the chart will change only after that cleanup reaches the default branch. Do not use Linguist overrides to hide source files or commit those prototypes again.

## Demo recording

Create two artifacts after the simulator acceptance pass:

- A short, silent README loop (roughly 15–20 seconds) showing the calendar stack, opening a day, paging through same-day photos, and previewing/saving a sticker effect. Capture it on the user's iPhone with a real test photo the user selected. Keep it small and readable at repository width; provide a reduced-motion still screenshot as a fallback.
- A 12–15 second, captioned portrait cut for X. Show one complete user job rather than a tour of menus: a quick calendar view, open a day, swipe once, save an outline. Capture on the user's iPhone with a user-selected test photo, hide system controls where possible, and exclude personal data.

Before recording, verify that every shown interaction works in the current simulator build. Do not depict backup, export, or device Vision success until those flows pass. Add the capture date and build identifier to the release notes, not to the visible UI.

## X outreach sequence

Do not publish a generic “I built an app” announcement before there is a verified demo. A small sequence can invite useful feedback without promising reach:

1. **Problem + demo (draft; publish only after the shown interactions pass and the user provides an approved capture):** “I wanted to remember what I wore without building a digital closet. Yidie turns outfit photos into a calendar of outfit stickers. It is an iPhone app, keeps its library on-device, and has no account or backend.” Pair it with the user's approved real-photo capture, link the repository, and ask one specific question about whether the same-day stack is easy to understand.
2. **Engineering note:** Show one concrete decision, such as retaining the transparent cutout so users can change an outline without rerunning segmentation. Explain the trade-off and link the source/tests.
3. **Open test request:** State the exact tested iOS/build requirements, what has and has not been verified, and invite a few testers to try a chosen-photo workflow. Ask them not to send private photos; accept written feedback or synthetic reproductions. Do not describe a Simulator build as a signed public download or claim real-device Vision quality before it has been tested.

## Ready-to-edit X copy

Keep the first post short and demonstrate one complete action. Do not publish until the recording is captured from the current build and its UI interactions have passed the Simulator walkthrough. The sample below is a draft, not a promise that the remaining release gates have passed.

> I wanted to remember what I wore without building another digital closet. Yidie turns outfit photos into a calendar of little cutout stickers. It is iPhone-first, works locally, and has no account or backend.
>
> This clip was captured from Yidie on iPhone using a test photo selected by me. The photo stays on-device. I’m opening the source for feedback: [GitHub repository]
>
> Does the stack of multiple outfits on one day make sense at a glance?

Follow up only when each claim is verified: a short engineering post about re-rendering an outline from the saved transparent cutout, then a small tester invitation that names the tested iOS version and clearly says physical-device photo quality is still being evaluated. Avoid asking people to upload personal wardrobe photos.

For the README, prefer a silent 15–20 second loop under roughly 8 MB, with a still screenshot and reduced-motion fallback. For X, the short cut is an editorial choice, not a reach guarantee: X's official creative guidance is written for ads and recommends mobile-first framing, movement early, captions for sound-off viewing, and a concise video. Apply those as production heuristics only; do not imply that ad guidance predicts organic distribution. Use only the user's approved real-photo capture and label the tested iOS/build conditions. Avoid a broad feature tour, simulated Vision success, system panels that are not yet accepted, and claims about reach. After an explicitly requested post, track profile/repository visits, README-to-build completions, useful issues, and tester follow-through for a few weeks; treat stars as one weak signal.

## Sources

- [Libre Closet repository and README](https://github.com/lazztech/Libre-Closet)
- [wardrowbe repository and README](https://github.com/Anyesh/wardrowbe)
- [X Business creative best practices](https://business.x.com/en/advertising/creative-best-practices) (advertising guidance; adapted cautiously for organic demos)
- [X Help: video posting and download controls](https://help.x.com/en/using-x/x-videos)
- [Ignite React Native / Expo README](https://github.com/infinitered/ignite/blob/master/README.md)
- [Ignite testing guide](https://github.com/infinitered/ignite/blob/master/docs/concept/Testing.md)
- [Expo repository and contributor guidance](https://github.com/expo/expo)
- [Expo contribution guide and manual smoke-test guidance](https://github.com/expo/expo/blob/main/CONTRIBUTING.md)
- [Wardrobe repository and README](https://github.com/wardrobe-hq/wardrobe)
