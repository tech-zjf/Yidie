#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
native_dir="$project_dir/apps/mobile/modules/yidie-native/ios"
work_dir=$(mktemp -d /tmp/yidie-native-check.XXXXXX)
trap 'rm -rf "$work_dir"' EXIT
xcrun swiftc -module-cache-path "$work_dir/cache" "$native_dir/NativeFileStore.swift" "$native_dir/ImageFileCatalog.swift" "$project_dir/scripts/native-tests/main.swift" -o "$work_dir/file-tests"
"$work_dir/file-tests"
sdk_path=$(xcrun --sdk iphonesimulator --show-sdk-path)
xcrun swiftc -typecheck -sdk "$sdk_path" -target arm64-apple-ios17.0-simulator -module-cache-path "$work_dir/cache-ios" "$native_dir/NativeFileStore.swift" "$native_dir/ImageFileCatalog.swift" "$native_dir/PhotoPreview.swift" "$native_dir/LocalPhotos.swift" "$native_dir/StickerProcessor.swift"
printf '%s\n' 'PASS Swift iOS core typecheck (does not compile/link the Expo bridge or run on a device)'
