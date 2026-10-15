# Open-source launch and presentation plan

Research checked on 2026-10-15 against the public repository pages. GitHub star counts change continuously; the figures below are a point-in-time signal, not a quality ranking or an estimate of Yidie's future reach.

## What comparable projects show

| Project                                                                                 | Public positioning                                                                                                                         | Useful lesson for Yidie                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Libre Closet](https://github.com/lazztech/Libre-Closet) — 360 stars when checked       | Self-hosted wardrobe catalog, outfit builder and scheduling in a mobile-friendly PWA                                                      | Nearby product validates interest in wardrobe tooling, but its account/server and catalog model differs from Yidie. Show real screens, release notes, a concise setup path, and clear ownership of local data.                   |
| [Ignite](https://github.com/infinitered/ignite) — 19.9k stars when checked              | Long-running React Native / Expo starter with docs, intro videos, troubleshooting, tests and contributor paths                             | High-star technical repositories make the entry path visible and support contributors with tested examples. Borrow documentation shape and module boundaries, not its extra starter abstractions.                              |
| [Expo](https://github.com/expo/expo) — 52.7k stars when checked                         | React Native platform with documentation, project layout, contribution guidance and a large tested codebase                               | Keep local build instructions exact, run repeatable CI, explain native assumptions, and show a truthful app demo. Expo Go is not a runnable path for Yidie because the app ships a custom Swift module.                         |
| [wardrobe](https://github.com/wardrobe-hq/wardrobe) — 26 stars when checked             | Self-hosted clothing-management web app with labels and outfit suggestions                                                                 | Adjacent open-source projects vary widely in traction. Avoid treating an open-source wardrobe catalog as direct competition; make Yidie's smaller daily-photo memory job obvious.                                             |

These projects solve adjacent jobs. Public descriptions do not prove their exact behavior on every device. Yidie's defensible direction is narrower: an iPhone-first, no-account outfit diary with a calendar made from the photos themselves, local image processing, and source code people can run and inspect. This is a product thesis to test, not a claim that no one else does it. The GitHub pages currently show 19.9k stars for Ignite, 52.7k for Expo, 360 for Libre Closet, and 26 for wardrobe; those numbers describe repository reach, not product quality or likely traction for Yidie. [Ignite](https://github.com/infinitered/ignite), [Expo](https://github.com/expo/expo), [Libre Closet](https://github.com/lazztech/Libre-Closet), [wardrobe](https://github.com/wardrobe-hq/wardrobe).

## Open-source presentation checklist

1. The first screen of the repository should explain the app in one sentence, show a verified demo, state the project stage, and offer a working local setup path.
2. Keep only current decision documents linked from the README. Preserve meaningful evidence in git history; do not leave superseded stage reviews looking like active specifications.
3. CI should run the lockfile-based JavaScript, SQLite and documentation checks on every pull request. Native build checks belong on a supported macOS/Xcode runner and must identify their exact toolchain.
4. A contributor should be able to build without credentials, private photos, cloud services or undocumented manual state. Clearly call out Xcode signing if installing on a personal iPhone.
5. Screenshots and video must come from the app build being described. Label browser prototypes as prototypes. Use synthetic sample outfits for public media.

## Demo recording

Create two artifacts after the simulator acceptance pass:

- A short, looping README GIF (roughly 15–25 seconds) showing the calendar stack, opening a day, swiping same-day photos, and previewing/saving an outline. Keep it small and readable at repository width; provide a reduced-motion still screenshot as a fallback.
- A captioned 30–45 second portrait screen recording for X. Show one complete user job rather than a tour of menus. Use generated or explicitly consented sample imagery, hide simulator controls and status clutter where possible, and do not include personal data.

Before recording, verify that every shown interaction works in the current simulator build. Do not depict backup, export, or device Vision success until those flows pass. Add the capture date and build identifier to the release notes, not to the visible UI.

## X outreach sequence

Do not publish a generic “I built an app” announcement before there is a verified demo. A small sequence can invite useful feedback without promising reach:

1. **Problem + demo (draft; publish only after the shown interactions pass):** “I wanted to remember what I wore without building a digital closet. Yidie turns outfit photos into a calendar of outfit stickers. It is an iPhone app, keeps its library on-device, and has no account or backend. Here is a short iPhone Simulator demo using synthetic sample images.” Link the repository and ask one specific question about whether the same-day stack is easy to understand.
2. **Engineering note:** Show one concrete decision, such as retaining the transparent cutout so users can change an outline without rerunning segmentation. Explain the trade-off and link the source/tests.
3. **Open test request:** State the exact tested iOS/build requirements, what has and has not been verified, and invite a few testers to try a chosen-photo workflow. Ask them not to send private photos; accept written feedback or synthetic reproductions. Do not describe a Simulator build as a signed public download or claim real-device Vision quality before it has been tested.

## Ready-to-edit X copy

Keep the first post short and demonstrate one complete action. Do not publish until the recording is captured from the current build and its UI interactions have passed the Simulator walkthrough. The sample below is a draft, not a promise that the remaining release gates have passed.

> I wanted to remember what I wore without building another digital closet. Yidie turns outfit photos into a calendar of little cutout stickers. It is iPhone-first, works locally, and has no account or backend.
>
> This clip uses synthetic sample images in the iOS Simulator. I’m opening the source for feedback: [GitHub repository]
>
> Does the stack of multiple outfits on one day make sense at a glance?

Follow up only when each claim is verified: a short engineering post about re-rendering an outline from the saved transparent cutout, then a small tester invitation that names the tested iOS version and clearly says physical-device photo quality is still being evaluated. Avoid asking people to upload personal wardrobe photos.

For the README, prefer a silent 15–20 second loop under roughly 8 MB, with a still screenshot and reduced-motion fallback. Record the calendar, open a multi-outfit date, page through the day's images only after swipe acceptance, and preview/save an outline. For X, use a captioned 30–45 second vertical cut with the same verified path; show “Simulator · synthetic images” in a small caption, not a fake product UI. Avoid a broad feature tour, simulated Vision success, system panels that are not yet accepted, and claims about reach. After posting, track profile/repository visits, README-to-build completions, useful issues, and tester follow-through for a few weeks; treat stars as one weak signal.

A third-party analysis of 293 X launch videos found that the high-view subset often used a working demo and voiceover, while video format and timing were descriptive patterns rather than proven causes of reach. Treat it as a production reference, not an algorithm recipe. For this project, measure repository visits, README-to-build completion, useful issues, repeat use, and stars over 2–4 weeks. Star count alone does not establish product use.

## Sources

- [wardrowbe repository and README](https://github.com/Anyesh/wardrowbe)
- [Libre Closet repository and README](https://github.com/lazztech/Libre-Closet)
- [Ignite React Native / Expo README](https://github.com/infinitered/ignite/blob/master/README.md)
- [Expo repository and contributor guidance](https://github.com/expo/expo)
- [Wardrobe repository and README](https://github.com/wardrobe-hq/wardrobe)
- [Product launch video analysis of 293 X launches](https://www.indiehackers.com/post/product-launch-video-7-steps-from-293-x-launches-8ad570fb47)
- [Build in public on X: specific updates and examples](https://usepostship.app/blog/how-to-build-in-public-on-x)
