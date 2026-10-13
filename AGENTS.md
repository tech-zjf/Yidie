# Yidie project rules

- iOS first, Expo + React Native, Apple Vision via a local Expo module. No backend, accounts, paid inference APIs, telemetry or cloud synchronization.
- Follow the current PRD and UI spec. Occupied dates show stickers without date numerals or count badges; empty dates retain numerals. Date and count are available in the day sheet and accessibility labels.
- Keep date/geometry rules in pure domain modules and test meaningful boundaries. Do not let view components execute SQL or guess dates from file modification time.
- PhotoKit reads must disallow network access. Keep imported originals, generated assets and the database in an app-owned root excluded from backup. Never delete source Photo Library assets.
- Generated `ios/`, dependencies, credentials, real user photos and local databases must not be committed. Native source belongs in `modules/yidie-native`.
- Distinguish implementation, simulator verification and physical-device verification in status updates. Never label an unverified release production ready.
- Use the checked-in lockfile. Review Expo/Xcode compatibility before upgrades. Keep Chinese copy in a shared catalog and use deterministic layout across screens and exports.
- Follow `docs/10-engineering.md`: feature-local UI/controllers, pure domain rules and use cases, injected storage/native ports, one composition root. Do not add global state or generic base classes without a concrete requirement.
- Run `npm run check` in `apps/mobile` and `python3 scripts/check_packet.py` from the root before committing. Native changes additionally require Swift typecheck and, once the toolchain is upgraded, a full iOS build. List unverified device behavior explicitly.
