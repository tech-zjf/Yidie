# Mobile engineering rules

These project-specific decisions replace the generic Expo template guidance. Follow the root AGENTS.md and docs/10-engineering.md.

- iOS only. Local Xcode builds, local PhotoKit/Vision processing, no EAS dependency, no OTA, no backend or telemetry. These are explicit product requirements.
- Check the installed Expo major version and matching docs or package source before using APIs. Use `npx expo install` for SDK-managed packages and commit the npm lockfile.
- Current navigation is one calendar screen and native Modal sheets. Add Expo Router when there are independently addressable full screens; keep routing free of business logic.
- Never edit generated ios files as the source of a feature. Use app.json, config plugins and modules/yidie-native.
- UI and hooks access injected services; SQL lives in data, pure business rules and ports in domain. Native entry points delegate to focused Swift files.
- Follow local Text/Button, copy and font/color tokens. Do not add remote fonts or runtime CDN dependencies.
- Run npm run check before committing. For native changes verify type checking, autolinking and a complete iOS build with a compatible toolchain. Do not describe JS export as a native build.
