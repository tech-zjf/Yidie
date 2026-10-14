#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
native_dir="$project_dir/apps/mobile/modules/yidie-native/ios"
work_dir=$(mktemp -d /tmp/yidie-native-check.XXXXXX)
trap 'rm -rf "$work_dir"' EXIT
xcrun swiftc -module-cache-path "$work_dir/cache" "$native_dir/NativeFileStore.swift" "$native_dir/ImageFileCatalog.swift" "$project_dir/scripts/native-tests/main.swift" -o "$work_dir/file-tests"
"$work_dir/file-tests"
xcrun swiftc -module-cache-path "$work_dir/cache-backup" "$native_dir/NativeFileStore.swift" "$native_dir/ImageFileCatalog.swift" "$native_dir/LocalBackup.swift" "$project_dir/scripts/native-tests/backup/main.swift" -framework ImageIO -framework UniformTypeIdentifiers -lsqlite3 -o "$work_dir/backup-tests"
"$work_dir/backup-tests"
sdk_path=$(xcrun --sdk iphonesimulator --show-sdk-path)
xcrun swiftc -typecheck -sdk "$sdk_path" -target arm64-apple-ios17.0-simulator -module-cache-path "$work_dir/cache-ios" "$native_dir/NativeFileStore.swift" "$native_dir/ImageFileCatalog.swift" "$native_dir/PhotoPreview.swift" "$native_dir/LocalPhotos.swift" "$native_dir/StickerProcessor.swift" "$native_dir/YidieDatePickerController.swift" "$native_dir/LocalBackup.swift" "$native_dir/BackupDocumentPickerDelegate.swift" "$native_dir/CalendarExporter.swift"
printf '%s\n' 'PASS Swift iOS core typecheck (does not compile/link the Expo bridge or run on a device)'
