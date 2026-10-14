import Foundation
import CryptoKit
import ImageIO
import SQLite3
import UniformTypeIdentifiers

struct LocalBackupSummary {
  let entryCount: Int
  let assetCount: Int
  let totalBytes: Int64

  var dictionary: [String: Any] {
    ["entryCount": entryCount, "assetCount": assetCount, "totalBytes": totalBytes]
  }
}

/// Owns the portable `.yidie` document package and crash-safe replacement of app data.
enum LocalBackup {
  static let formatVersion = 1
  static let schemaVersion = 5
  static let assetDirectories = ["originals", "stickers", "previews", "cutouts", "photo-previews"]
  static let maxFiles = 25_000
  static let maxFileBytes: Int64 = 512 * 1024 * 1024
  static let maxManifestBytes: Int64 = 2 * 1024 * 1024
  static let maxTotalBytes: Int64 = 4 * 1024 * 1024 * 1024

  private struct Manifest: Codable {
    let formatVersion: Int
    let schemaVersion: Int
    let appVersion: String
    let exportedAt: String
    let entryCount: Int
    let assetCount: Int
    let totalBytes: Int64
    let files: [FileRecord]
  }

  private struct FileRecord: Codable {
    let path: String
    let byteCount: Int64
    let sha256: String
  }

  static func backupType() -> UTType {
    UTType("com.techzjf.yidie-backup") ?? .package
  }

  static func createPackage() throws -> URL {
    try createPackage(root: NativeFileStore.root(), support: applicationSupport())
  }

  static func createPackage(root: URL, support: URL) throws -> URL {
    let sourceBytes = try directoryByteCount(root)
    guard sourceBytes <= maxTotalBytes else { throw YidieError(code: "BACKUP_TOO_LARGE") }
    let freeBytes = try FileManager.default.attributesOfFileSystem(forPath: support.path)[.systemFreeSize] as? NSNumber
    guard let freeBytes else { throw YidieError(code: "INSUFFICIENT_STORAGE") }
    try requireAvailableStorage(required: sourceBytes, available: freeBytes.int64Value)
    let package = support.appendingPathComponent("Yidie-" + UUID().uuidString + ".yidie", isDirectory: true)
    try FileManager.default.createDirectory(at: package, withIntermediateDirectories: false)
    try markExcludedFromBackup(package)
    do {
      let dbDirectory = package.appendingPathComponent("database", isDirectory: true)
      try FileManager.default.createDirectory(at: dbDirectory, withIntermediateDirectories: true)
      let sourceDB = root.appendingPathComponent("database/yidie.sqlite")
      let snapshotDB = dbDirectory.appendingPathComponent("yidie.sqlite")
      try copySQLiteSnapshot(from: sourceDB, to: snapshotDB)

      for name in assetDirectories {
        let source = root.appendingPathComponent(name, isDirectory: true)
        let destination = package.appendingPathComponent(name, isDirectory: true)
        try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)
        for file in try recognizedFiles(in: source, directory: name) {
          try FileManager.default.copyItem(at: file, to: destination.appendingPathComponent(file.lastPathComponent))
        }
      }

      let records = try fileRecords(in: package)
      let allowedPaths = Set(records.map(\.path))
      let db = try openSQLite(snapshotDB, flags: SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX)
      defer { sqlite3_close(db) }
      try validateDatabase(db, allowedPaths: allowedPaths)
      let entryCount = try scalarInt(db, "SELECT COUNT(*) FROM entries")
      guard records.count <= maxFiles else { throw YidieError(code: "BACKUP_TOO_LARGE") }
      let total = records.reduce(Int64(0)) { $0 + $1.byteCount }
      guard total <= maxTotalBytes else { throw YidieError(code: "BACKUP_TOO_LARGE") }
      let manifest = Manifest(
        formatVersion: formatVersion,
        schemaVersion: schemaVersion,
        appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0",
        exportedAt: ISO8601DateFormatter().string(from: Date()),
        entryCount: entryCount,
        assetCount: records.count - 1,
        totalBytes: total,
        files: records
      )
      let manifestData = try JSONEncoder().encode(manifest)
      try manifestData.write(to: package.appendingPathComponent("manifest.json"), options: .atomic)
      return package
    } catch {
      try? FileManager.default.removeItem(at: package)
      throw error
    }
  }

  static func stageRestore(from selected: URL) throws -> LocalBackupSummary {
    try stageRestore(from: selected, support: applicationSupport())
  }

  static func stageRestore(from selected: URL, support: URL) throws -> LocalBackupSummary {
    let stage = support.appendingPathComponent("Yidie.restore-staging", isDirectory: true)
    try removeOwnedDirectory(stage)
    guard selected.hasDirectoryPath else { throw YidieError(code: "INVALID_BACKUP") }
    let summary = try validatePackage(selected)
    let freeBytes = try FileManager.default.attributesOfFileSystem(forPath: support.path)[.systemFreeSize] as? NSNumber
    guard let freeBytes else { throw YidieError(code: "INSUFFICIENT_STORAGE") }
    try requireAvailableStorage(required: summary.totalBytes, available: freeBytes.int64Value)
    try FileManager.default.createDirectory(at: stage, withIntermediateDirectories: false)
    try markExcludedFromBackup(stage)
    do {
      for item in try FileManager.default.contentsOfDirectory(at: selected, includingPropertiesForKeys: nil) {
        try FileManager.default.copyItem(at: item, to: stage.appendingPathComponent(item.lastPathComponent))
      }
      let stagedSummary = try validatePackage(stage)
      return stagedSummary
    } catch {
      try? removeOwnedDirectory(stage)
      throw error
    }
  }

  static func discardRestore() throws {
    try discardRestore(support: applicationSupport())
  }

  static func discardRestore(support: URL) throws {
    let stage = support.appendingPathComponent("Yidie.restore-staging", isDirectory: true)
    try removeOwnedDirectory(stage)
  }

  static func activateRestore() throws {
    try activateRestore(support: applicationSupport())
  }

  static func activateRestore(support: URL) throws {
    let current = support.appendingPathComponent("Yidie", isDirectory: true)
    let stage = support.appendingPathComponent("Yidie.restore-staging", isDirectory: true)
    let previous = support.appendingPathComponent("Yidie.restore-previous", isDirectory: true)
    let marker = support.appendingPathComponent("Yidie.restore-committed")
    guard FileManager.default.fileExists(atPath: stage.path),
          !FileManager.default.fileExists(atPath: previous.path) else {
      throw YidieError(code: "RESTORE_UNAVAILABLE")
    }
    _ = try validatePackage(stage)
    try markExcludedFromBackup(stage)
    try Data("pending".utf8).write(to: marker, options: .atomic)
    do {
      try FileManager.default.moveItem(at: current, to: previous)
      try FileManager.default.moveItem(at: stage, to: current)
      try markExcludedFromBackup(current)
      _ = try validatePackage(current)
      try Data("committed".utf8).write(to: marker, options: .atomic)
      try removeOwnedDirectory(previous)
      try FileManager.default.removeItem(at: marker)
    } catch {
      try? recoverIfNeeded()
      throw error
    }
  }

  static func requireAvailableStorage(required: Int64, available: Int64) throws {
    guard required >= 0, available >= required else {
      throw YidieError(code: "INSUFFICIENT_STORAGE")
    }
  }

  /// Called before SQLite opens. Any uncommitted swap restores the old directory.
  static func recoverIfNeeded() throws {
    try recoverIfNeeded(support: applicationSupport())
  }

  static func recoverIfNeeded(support: URL) throws {
    let current = support.appendingPathComponent("Yidie", isDirectory: true)
    let stage = support.appendingPathComponent("Yidie.restore-staging", isDirectory: true)
    let previous = support.appendingPathComponent("Yidie.restore-previous", isDirectory: true)
    let marker = support.appendingPathComponent("Yidie.restore-committed")
    let markerExists = FileManager.default.fileExists(atPath: marker.path)
    let committed = markerExists && (try? String(contentsOf: marker, encoding: .utf8)) == "committed"

    if markerExists && !committed {
      if FileManager.default.fileExists(atPath: previous.path) {
        if FileManager.default.fileExists(atPath: current.path) { try removeOwnedDirectory(current) }
        try FileManager.default.moveItem(at: previous, to: current)
      }
      if FileManager.default.fileExists(atPath: marker.path) { try FileManager.default.removeItem(at: marker) }
    } else if committed {
      if FileManager.default.fileExists(atPath: previous.path) { try removeOwnedDirectory(previous) }
      if FileManager.default.fileExists(atPath: marker.path) { try FileManager.default.removeItem(at: marker) }
    }
    if FileManager.default.fileExists(atPath: stage.path) { try removeOwnedDirectory(stage) }
  }

  private static func validatePackage(_ package: URL) throws -> LocalBackupSummary {
    let values = try package.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
    guard values.isDirectory == true, values.isSymbolicLink != true else { throw YidieError(code: "INVALID_BACKUP") }
    let allowedItems = Set(assetDirectories + ["database", "manifest.json"])
    let items = try FileManager.default.contentsOfDirectory(at: package, includingPropertiesForKeys: [.isDirectoryKey, .isRegularFileKey, .isSymbolicLinkKey])
    guard Set(items.map(\.lastPathComponent)) == allowedItems else { throw YidieError(code: "INVALID_BACKUP") }
    for item in items {
      let itemValues = try item.resourceValues(forKeys: [.isDirectoryKey, .isRegularFileKey, .isSymbolicLinkKey])
      guard itemValues.isSymbolicLink != true,
            (item.lastPathComponent == "manifest.json" ? itemValues.isRegularFile == true : itemValues.isDirectory == true) else {
        throw YidieError(code: "INVALID_BACKUP")
      }
    }
    let databaseDirectory = package.appendingPathComponent("database", isDirectory: true)
    guard try FileManager.default.contentsOfDirectory(atPath: databaseDirectory.path) == ["yidie.sqlite"] else {
      throw YidieError(code: "INVALID_BACKUP")
    }
    let manifestURL = package.appendingPathComponent("manifest.json")
    let manifestValues = try manifestURL.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
    guard manifestValues.isRegularFile == true, manifestValues.isSymbolicLink != true else { throw YidieError(code: "INVALID_BACKUP") }
    let manifestSize = try manifestURL.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
    guard Int64(manifestSize) <= maxManifestBytes else { throw YidieError(code: "INVALID_BACKUP") }
    let manifest = try JSONDecoder().decode(Manifest.self, from: Data(contentsOf: manifestURL))
    guard manifest.formatVersion == formatVersion, manifest.schemaVersion == schemaVersion,
          manifest.entryCount >= 0, manifest.assetCount >= 0,
          manifest.files.count <= maxFiles, manifest.totalBytes >= 0,
          manifest.totalBytes <= maxTotalBytes else { throw YidieError(code: "BACKUP_VERSION_UNSUPPORTED") }
    let actual = try fileRecords(in: package)
    guard actual.count == manifest.files.count,
          actual.sorted(by: { $0.path < $1.path }).elementsEqual(manifest.files.sorted(by: { $0.path < $1.path }), by: {
            $0.path == $1.path && $0.byteCount == $1.byteCount && $0.sha256 == $1.sha256
          }),
          actual.reduce(Int64(0), { $0 + $1.byteCount }) == manifest.totalBytes,
          manifest.assetCount == actual.count - 1 else { throw YidieError(code: "BACKUP_CHECKSUM_FAILED") }

    let databaseURL = package.appendingPathComponent("database/yidie.sqlite")
    let db = try openSQLite(databaseURL, flags: SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX)
    defer { sqlite3_close(db) }
    try validateDatabase(db, allowedPaths: Set(actual.map(\.path)))
    guard try scalarInt(db, "SELECT COUNT(*) FROM entries") == manifest.entryCount else {
      throw YidieError(code: "BACKUP_CHECKSUM_FAILED")
    }
    return LocalBackupSummary(entryCount: manifest.entryCount, assetCount: manifest.assetCount, totalBytes: manifest.totalBytes)
  }

  private static func validateDatabase(_ db: OpaquePointer, allowedPaths: Set<String>) throws {
    guard try scalarText(db, "PRAGMA integrity_check") == "ok",
          try scalarInt(db, "PRAGMA user_version") == schemaVersion,
          try rowCount(db, "PRAGMA foreign_key_check") == 0 else { throw YidieError(code: "INVALID_BACKUP") }
    let statement = try prepare(db, "SELECT original_path,sticker_path,thumbnail_path,cutout_path,photo_preview_path FROM entries")
    defer { sqlite3_finalize(statement) }
    while sqlite3_step(statement) == SQLITE_ROW {
      for index in 0..<5 {
        guard let raw = sqlite3_column_text(statement, Int32(index)) else { continue }
        let path = String(cString: raw)
        guard isAllowedResourcePath(path), allowedPaths.contains(path) else { throw YidieError(code: "INVALID_BACKUP") }
      }
    }
  }

  private static func fileRecords(in package: URL) throws -> [FileRecord] {
    var records: [FileRecord] = []
    let db = package.appendingPathComponent("database/yidie.sqlite")
    records.append(try fileRecord(db, relative: "database/yidie.sqlite"))
    for directory in assetDirectories {
      let folder = package.appendingPathComponent(directory, isDirectory: true)
      let values = try folder.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
      guard values.isDirectory == true, values.isSymbolicLink != true else { throw YidieError(code: "INVALID_BACKUP") }
      for file in try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey]) {
        let relative = "\(directory)/\(file.lastPathComponent)"
        let fileValues = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey])
        guard fileValues.isRegularFile == true, fileValues.isSymbolicLink != true,
              isAllowedResourcePath(relative),
              let size = fileValues.fileSize, size > 0, Int64(size) <= maxFileBytes else {
          throw YidieError(code: "BACKUP_TOO_LARGE")
        }
        guard let source = CGImageSourceCreateWithURL(file as CFURL, nil), CGImageSourceGetCount(source) > 0 else {
          throw YidieError(code: "INVALID_BACKUP")
        }
        records.append(try fileRecord(file, relative: relative))
        guard records.count <= maxFiles else { throw YidieError(code: "BACKUP_TOO_LARGE") }
      }
    }
    return records
  }

  private static func recognizedFiles(in folder: URL, directory: String) throws -> [URL] {
    let values = try folder.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
    guard values.isDirectory == true, values.isSymbolicLink != true else { throw YidieError(code: "INVALID_RESOURCE") }
    return try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey])
      .filter { file in
        let attrs = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
        return attrs.isRegularFile == true && attrs.isSymbolicLink != true && isAllowedResourcePath("\(directory)/\(file.lastPathComponent)")
      }
  }

  private static func isAllowedResourcePath(_ path: String) -> Bool {
    let uuid = #"[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}"#
    let patterns = [
      "^originals/\(uuid)\\.source$",
      "^stickers/\(uuid)(-v[0-9]+)?\\.png$",
      "^previews/\(uuid)(-v[0-9]+)?\\.png$",
      "^cutouts/\(uuid)\\.png$",
      "^photo-previews/\(uuid)\\.jpg$",
    ]
    return patterns.contains { path.range(of: $0, options: .regularExpression) != nil }
      || path == "database/yidie.sqlite"
  }

  private static func fileRecord(_ url: URL, relative: String) throws -> FileRecord {
    let values = try url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey])
    guard values.isRegularFile == true, values.isSymbolicLink != true,
          let size = values.fileSize, size > 0, Int64(size) <= maxFileBytes else {
      throw YidieError(code: "BACKUP_TOO_LARGE")
    }
    return FileRecord(path: relative, byteCount: Int64(size), sha256: try sha256(url))
  }

  private static func directoryByteCount(_ directory: URL) throws -> Int64 {
    guard let enumerator = FileManager.default.enumerator(
      at: directory,
      includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey]
    ) else { throw YidieError(code: "BACKUP_READ_FAILED") }
    var total: Int64 = 0
    for case let url as URL in enumerator {
      let values = try url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey])
      if values.isSymbolicLink == true {
        enumerator.skipDescendants()
      } else if values.isRegularFile == true, let size = values.fileSize {
        total += Int64(size)
        if total > maxTotalBytes { return total }
      }
    }
    return total
  }

  private static func sha256(_ url: URL) throws -> String {
    guard let stream = InputStream(url: url) else { throw YidieError(code: "BACKUP_READ_FAILED") }
    stream.open()
    defer { stream.close() }
    var digest = SHA256()
    var buffer = [UInt8](repeating: 0, count: 1024 * 1024)
    while true {
      let read = stream.read(&buffer, maxLength: buffer.count)
      if read < 0 { throw stream.streamError ?? YidieError(code: "BACKUP_READ_FAILED") }
      if read == 0 { break }
      digest.update(data: Data(buffer[0..<read]))
    }
    return digest.finalize().map { String(format: "%02x", $0) }.joined()
  }

  private static func copySQLiteSnapshot(from sourceURL: URL, to destinationURL: URL) throws {
    var source: OpaquePointer?
    var destination: OpaquePointer?
    guard sqlite3_open_v2(sourceURL.path, &source, SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK,
          sqlite3_open_v2(destinationURL.path, &destination, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK,
          let source, let destination else {
      if let source { sqlite3_close(source) }
      if let destination { sqlite3_close(destination) }
      throw YidieError(code: "BACKUP_READ_FAILED")
    }
    defer { sqlite3_close(source); sqlite3_close(destination) }
    guard let backup = sqlite3_backup_init(destination, "main", source, "main") else {
      throw YidieError(code: "BACKUP_READ_FAILED")
    }
    let result = sqlite3_backup_step(backup, -1)
    let finished = sqlite3_backup_finish(backup)
    guard result == SQLITE_DONE, finished == SQLITE_OK else { throw YidieError(code: "BACKUP_READ_FAILED") }
  }

  private static func openSQLite(_ url: URL, flags: Int32) throws -> OpaquePointer {
    var db: OpaquePointer?
    guard sqlite3_open_v2(url.path, &db, flags, nil) == SQLITE_OK, let db else {
      if let db { sqlite3_close(db) }
      throw YidieError(code: "INVALID_BACKUP")
    }
    return db
  }

  private static func prepare(_ db: OpaquePointer, _ sql: String) throws -> OpaquePointer {
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
      throw YidieError(code: "INVALID_BACKUP")
    }
    return statement
  }

  private static func scalarInt(_ db: OpaquePointer, _ sql: String) throws -> Int {
    let statement = try prepare(db, sql)
    defer { sqlite3_finalize(statement) }
    guard sqlite3_step(statement) == SQLITE_ROW else { throw YidieError(code: "INVALID_BACKUP") }
    return Int(sqlite3_column_int64(statement, 0))
  }

  private static func scalarText(_ db: OpaquePointer, _ sql: String) throws -> String {
    let statement = try prepare(db, sql)
    defer { sqlite3_finalize(statement) }
    guard sqlite3_step(statement) == SQLITE_ROW, let value = sqlite3_column_text(statement, 0) else {
      throw YidieError(code: "INVALID_BACKUP")
    }
    return String(cString: value)
  }

  private static func rowCount(_ db: OpaquePointer, _ sql: String) throws -> Int {
    let statement = try prepare(db, sql)
    defer { sqlite3_finalize(statement) }
    var count = 0
    while sqlite3_step(statement) == SQLITE_ROW { count += 1 }
    return count
  }

  private static func applicationSupport() throws -> URL {
    try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
  }

  private static func markExcludedFromBackup(_ url: URL) throws {
    var root = url
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try root.setResourceValues(values)
    for name in assetDirectories + ["database"] {
      var folder = root.appendingPathComponent(name, isDirectory: true)
      if FileManager.default.fileExists(atPath: folder.path) { try folder.setResourceValues(values) }
    }
  }

  private static func removeOwnedDirectory(_ url: URL) throws {
    guard FileManager.default.fileExists(atPath: url.path) else { return }
    let values = try url.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
    guard values.isDirectory == true, values.isSymbolicLink != true else { throw YidieError(code: "INVALID_RESOURCE") }
    try FileManager.default.removeItem(at: url)
  }
}
