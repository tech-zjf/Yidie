# Contributing

Thanks for helping make Yidie easier to use, understand, and run. The project is in early development; check [TODO.md](TODO.md) and an open issue before starting a large feature.

## Before opening a pull request

- Keep the app iOS-first, local-only, and free of accounts, telemetry, cloud inference, and a business backend.
- Put date and layout rules in `apps/mobile/src/domain`, SQLite and file ownership in `src/data`, screen behavior in feature modules, and PhotoKit/Vision/Core Image calls in `modules/yidie-native`.
- Prefer one clear model and typed contract over compatibility branches or generic frameworks. Add tests for meaningful date, migration, ownership, and failure boundaries.
- Use the existing shared text, copy, color, spacing, and font tokens. Verify narrow screens, long English strings, large text, and reduced motion when a UI change affects them.
- Update the current README, TODO, PRD, or verification document when user-visible behavior or a release boundary changes. Avoid adding another stage report when the live document can be updated.
- Do not add retired browser prototypes, temporary mockups, simulator captures, generated native projects, or other machine-local artifacts. Keep an active UI preview only when it has a documented test purpose and cannot access real app data.

Run from `apps/mobile`:

```sh
npm ci
npm run check
```

Run from the repository root:

```sh
sh scripts/check_native.sh
python3 scripts/check_packet.py
```

Native changes also need a complete iOS build on a compatible macOS/Xcode toolchain. A test substitute, browser prototype, or simulator run must not be described as physical-device evidence.

## Issues and privacy

Use the GitHub issue templates. Include the app version, iOS version, steps, expected result, and actual result. Do not attach personal outfit photos, device identifiers, databases, certificates, provisioning profiles, or secrets. Reproduce image problems with generated or explicitly consented samples. For a potential security vulnerability, follow [SECURITY.md](SECURITY.md) and do not publish exploit details in a public issue.

## Pull requests

Describe the user-visible change, the checks you ran, and any unverified device behavior. Keep unrelated changes separate. UI changes should include an app screenshot or screen recording from the tested build, with synthetic or consented content.
