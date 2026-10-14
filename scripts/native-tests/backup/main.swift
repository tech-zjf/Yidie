import Foundation
import CryptoKit
import SQLite3

enum BackupTestFailure: Error {
  case assertion(String)
}

func check(_ condition: @autoclosure () -> Bool, _ message: String) throws {
  guard condition() else { throw BackupTestFailure.assertion(message) }
}

func makeDirectory(_ url: URL) throws {
  try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
}

func makeFixtureLibrary(at support: URL) throws -> URL {
  let root = support.appendingPathComponent("Yidie", isDirectory: true)
  try makeDirectory(root.appendingPathComponent("database", isDirectory: true))
  for name in LocalBackup.assetDirectories {
    try makeDirectory(root.appendingPathComponent(name, isDirectory: true))
  }

  let database = root.appendingPathComponent("database/yidie.sqlite")
  var connection: OpaquePointer?
  guard sqlite3_open(database.path, &connection) == SQLITE_OK, let connection else {
    throw BackupTestFailure.assertion("Could not create SQLite fixture")
  }
  defer { sqlite3_close(connection) }
  let sql = """
  CREATE TABLE entries (
    original_path TEXT, sticker_path TEXT, thumbnail_path TEXT,
    cutout_path TEXT, photo_preview_path TEXT
  );
  PRAGMA user_version=\(LocalBackup.schemaVersion);
  """
  guard sqlite3_exec(connection, sql, nil, nil, nil) == SQLITE_OK else {
    throw BackupTestFailure.assertion("Could not initialize SQLite fixture")
  }
  return root
}

func rewriteManifest(_ package: URL, _ update: (inout [String: Any]) -> Void) throws {
  let url = package.appendingPathComponent("manifest.json")
  var manifest = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: Any]
  update(&manifest)
  let data = try JSONSerialization.data(withJSONObject: manifest, options: [.sortedKeys])
  try data.write(to: url, options: .atomic)
}

func sha256(_ url: URL) throws -> String {
  let digest = SHA256.hash(data: try Data(contentsOf: url))
  return digest.map { String(format: "%02x", $0) }.joined()
}

func expectBackupError(_ expected: String, operation: () throws -> Void) throws {
  do {
    try operation()
    throw BackupTestFailure.assertion("Expected backup error \(expected)")
  } catch let error as YidieError {
    try check(error.code == expected, "Expected \(expected), received \(error.code)")
  }
}

func runBackupTests() throws {
  let temporary = FileManager.default.temporaryDirectory
    .appendingPathComponent("YidieBackupTests-\(UUID().uuidString)", isDirectory: true)
  try makeDirectory(temporary)
  defer { try? FileManager.default.removeItem(at: temporary) }

  let support = temporary.appendingPathComponent("Application Support", isDirectory: true)
  try makeDirectory(support)
  let root = try makeFixtureLibrary(at: support)
  let package = try LocalBackup.createPackage(root: root, support: support)
  let summary = try LocalBackup.stageRestore(from: package, support: support)
  try check(summary.entryCount == 0 && summary.assetCount == 0, "Empty library summary is incorrect")
  try LocalBackup.requireAvailableStorage(required: 100, available: 100)
  try expectBackupError("INSUFFICIENT_STORAGE") {
    try LocalBackup.requireAvailableStorage(required: 101, available: 100)
  }

  let currentMarker = root.appendingPathComponent("keep-current-until-commit")
  try Data("current".utf8).write(to: currentMarker)

  let corrupt = temporary.appendingPathComponent("Corrupt.yidie", isDirectory: true)
  try FileManager.default.copyItem(at: package, to: corrupt)
  try rewriteManifest(corrupt) { manifest in manifest["totalBytes"] = -1 }
  try expectBackupError("BACKUP_VERSION_UNSUPPORTED") {
    _ = try LocalBackup.stageRestore(from: corrupt, support: support)
  }
  try check(FileManager.default.fileExists(atPath: currentMarker.path), "Rejected backup changed current library")

  let future = temporary.appendingPathComponent("Future.yidie", isDirectory: true)
  try FileManager.default.copyItem(at: package, to: future)
  try rewriteManifest(future) { manifest in manifest["formatVersion"] = 99 }
  try expectBackupError("BACKUP_VERSION_UNSUPPORTED") {
    _ = try LocalBackup.stageRestore(from: future, support: support)
  }
  try check(FileManager.default.fileExists(atPath: currentMarker.path), "Future backup changed current library")

  let futureSchema = temporary.appendingPathComponent("FutureSchema.yidie", isDirectory: true)
  try FileManager.default.copyItem(at: package, to: futureSchema)
  try rewriteManifest(futureSchema) { manifest in manifest["schemaVersion"] = 99 }
  try expectBackupError("BACKUP_VERSION_UNSUPPORTED") {
    _ = try LocalBackup.stageRestore(from: futureSchema, support: support)
  }
  try check(FileManager.default.fileExists(atPath: currentMarker.path), "Future schema changed current library")

  let badChecksum = temporary.appendingPathComponent("Checksum.yidie", isDirectory: true)
  try FileManager.default.copyItem(at: package, to: badChecksum)
  try rewriteManifest(badChecksum) { manifest in
    var files = manifest["files"] as! [[String: Any]]
    files[0]["sha256"] = String(repeating: "0", count: 64)
    manifest["files"] = files
  }
  try expectBackupError("BACKUP_CHECKSUM_FAILED") {
    _ = try LocalBackup.stageRestore(from: badChecksum, support: support)
  }
  try check(FileManager.default.fileExists(atPath: currentMarker.path), "Checksum failure changed current library")

  let pathTraversal = temporary.appendingPathComponent("PathTraversal.yidie", isDirectory: true)
  try FileManager.default.copyItem(at: package, to: pathTraversal)
  let pathTraversalDatabase = pathTraversal.appendingPathComponent("database/yidie.sqlite")
  var pathTraversalConnection: OpaquePointer?
  guard sqlite3_open(pathTraversalDatabase.path, &pathTraversalConnection) == SQLITE_OK,
        let pathTraversalConnection else {
    throw BackupTestFailure.assertion("Could not open path traversal fixture")
  }
  let inserted = sqlite3_exec(
    pathTraversalConnection,
    "INSERT INTO entries (original_path) VALUES ('../outside.source')",
    nil,
    nil,
    nil
  )
  sqlite3_close(pathTraversalConnection)
  try check(inserted == SQLITE_OK, "Could not add path traversal record")
  let pathTraversalSize = try FileManager.default.attributesOfItem(atPath: pathTraversalDatabase.path)[.size] as? NSNumber
  guard let pathTraversalSize else { throw BackupTestFailure.assertion("Could not read traversal database size") }
  let pathTraversalHash = try sha256(pathTraversalDatabase)
  try rewriteManifest(pathTraversal) { manifest in
    manifest["entryCount"] = 1
    manifest["totalBytes"] = pathTraversalSize.int64Value
    var files = manifest["files"] as! [[String: Any]]
    files[0]["byteCount"] = pathTraversalSize.int64Value
    files[0]["sha256"] = pathTraversalHash
    manifest["files"] = files
  }
  try expectBackupError("INVALID_BACKUP") {
    _ = try LocalBackup.stageRestore(from: pathTraversal, support: support)
  }
  try check(FileManager.default.fileExists(atPath: currentMarker.path), "Path traversal backup changed current library")

  let oversized = temporary.appendingPathComponent("Oversized.yidie", isDirectory: true)
  try FileManager.default.copyItem(at: package, to: oversized)
  let oversizedImage = oversized.appendingPathComponent("stickers/AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA-v0.png")
  try makeDirectory(oversizedImage.deletingLastPathComponent())
  guard FileManager.default.createFile(atPath: oversizedImage.path, contents: Data([0])) else {
    throw BackupTestFailure.assertion("Could not create oversized-file fixture")
  }
  let oversizedHandle = try FileHandle(forWritingTo: oversizedImage)
  try oversizedHandle.truncate(atOffset: UInt64(LocalBackup.maxFileBytes + 1))
  try oversizedHandle.close()
  try expectBackupError("BACKUP_TOO_LARGE") {
    _ = try LocalBackup.stageRestore(from: oversized, support: support)
  }
  try check(FileManager.default.fileExists(atPath: currentMarker.path), "Oversized backup changed current library")

  try LocalBackup.discardRestore(support: support)
  try check(!FileManager.default.fileExists(atPath: support.appendingPathComponent("Yidie.restore-staging").path), "Cancellation kept the staged backup")
  try check(FileManager.default.fileExists(atPath: currentMarker.path), "Cancelled restore changed current library")
  _ = try LocalBackup.stageRestore(from: package, support: support)
  try LocalBackup.activateRestore(support: support)
  try check(!FileManager.default.fileExists(atPath: currentMarker.path), "Successful restore did not replace old library")

  let previous = support.appendingPathComponent("Yidie.restore-previous", isDirectory: true)
  let marker = support.appendingPathComponent("Yidie.restore-committed")
  let live = support.appendingPathComponent("Yidie", isDirectory: true)
  let oldData = live.appendingPathComponent("old-library-marker")
  try Data("old".utf8).write(to: oldData)
  try FileManager.default.moveItem(at: live, to: previous)
  try makeDirectory(live)
  try Data("new".utf8).write(to: live.appendingPathComponent("new-library-marker"))
  try Data("pending".utf8).write(to: marker)
  try LocalBackup.recoverIfNeeded(support: support)
  try check(FileManager.default.fileExists(atPath: live.appendingPathComponent("old-library-marker").path), "Pending restore did not roll back")
  try check(!FileManager.default.fileExists(atPath: marker.path), "Rollback left its marker behind")

  let committedPrevious = support.appendingPathComponent("Yidie.restore-previous", isDirectory: true)
  try makeDirectory(committedPrevious)
  try Data("obsolete".utf8).write(to: committedPrevious.appendingPathComponent("old"))
  try Data("committed".utf8).write(to: marker)
  try LocalBackup.recoverIfNeeded(support: support)
  try check(!FileManager.default.fileExists(atPath: committedPrevious.path), "Committed restore kept the old library")
  try check(FileManager.default.fileExists(atPath: live.appendingPathComponent("old-library-marker").path), "Committed recovery changed the live library")

  print("PASS local backup: snapshot, staging/cancellation, checksum and path rejection, size/storage/future-version rejection, current-library preservation, activation, and pending/committed crash recovery")
}

do {
  try runBackupTests()
} catch {
  fputs("FAIL local backup: \(error)\n", stderr)
  exit(1)
}
