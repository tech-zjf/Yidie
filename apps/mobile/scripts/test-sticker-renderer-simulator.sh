#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  printf '%s\n' 'Usage: npm run test:sticker:sim -- <booted-simulator-udid>' >&2
  exit 2
fi

simulator_udid=$1
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
repo_dir=$(CDPATH= cd -- "$project_dir/../.." && pwd)
native_dir="$project_dir/modules/yidie-native/ios"
temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/yidie-sticker-sim.XXXXXX")
app_dir="$temp_dir/StickerRendererTests.app"
bundle_id="org.yidie.StickerRendererTests.$$.simulator"
installed=0

cleanup() {
  if [ "$installed" -eq 1 ]; then
    xcrun simctl uninstall "$simulator_udid" "$bundle_id" >/dev/null 2>&1 || true
  fi
  rm -rf "$temp_dir"
}
trap cleanup EXIT HUP INT TERM

device_inventory=$(xcrun simctl list devices available --json)
SIMULATOR_INVENTORY="$device_inventory" node - "$simulator_udid" <<'NODE'
const inventory = JSON.parse(process.env.SIMULATOR_INVENTORY);
const udid = process.argv[2];
const devices = Object.values(inventory.devices ?? {}).flat();
const simulator = devices.find((device) => device.udid === udid);
if (!simulator || simulator.isAvailable === false || !simulator.deviceTypeIdentifier?.startsWith('com.apple.CoreSimulator.SimDeviceType.')) {
  console.error('Refusing to run: provide an exact, available Simulator UDID.');
  process.exit(1);
}
if (simulator.state !== 'Booted') {
  console.error('Refusing to boot or modify a device: the selected Simulator must already be booted.');
  process.exit(1);
}
NODE

mkdir -p "$app_dir"
cat > "$app_dir/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>StickerRendererTests</string>
  <key>CFBundleIdentifier</key><string>$bundle_id</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>StickerRendererTests</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleSupportedPlatforms</key><array><string>iPhoneSimulator</string></array>
  <key>LSRequiresIPhoneOS</key><true/>
  <key>MinimumOSVersion</key><string>17.0</string>
  <key>UIDeviceFamily</key><array><integer>1</integer><integer>2</integer></array>
</dict></plist>
PLIST

architecture=$(uname -m)
sdk_path=$(xcrun --sdk iphonesimulator --show-sdk-path)
xcrun swiftc \
  -sdk "$sdk_path" \
  -target "$architecture-apple-ios17.0-simulator" \
  -module-cache-path "$temp_dir/module-cache" \
  -framework CoreGraphics \
  -framework CoreImage \
  -framework ImageIO \
  "$native_dir/StickerAlphaCropper.swift" \
  "$native_dir/StickerGeometry.swift" \
  "$native_dir/StickerRenderer.swift" \
  "$repo_dir/scripts/native-tests/sticker-geometry/main.swift" \
  -o "$app_dir/StickerRendererTests"
codesign --force --sign - "$app_dir" >/dev/null
xcrun simctl install "$simulator_udid" "$app_dir"
installed=1
output=$(xcrun simctl launch --console --terminate-running-process "$simulator_udid" "$bundle_id" 2>&1) || {
  printf '%s\n' "$output" >&2
  exit 1
}
printf '%s\n' "$output"
printf '%s\n' "$output" | grep -Fq 'PASS sticker geometry and Core Image pixel checks' || {
  printf '%s\n' 'Simulator process exited without the expected renderer-test success marker.' >&2
  exit 1
}
