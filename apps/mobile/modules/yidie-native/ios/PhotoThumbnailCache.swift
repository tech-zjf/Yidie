import Foundation

/// A bounded cache of PhotoKit thumbnails. All calls must use NativeFileStore.queue.
enum PhotoThumbnailCache {
  static let maximumFiles = 240
  static let maximumBytes = 24 * 1024 * 1024

  @discardableResult
  static func store(
    _ data: Data,
    key: String,
    in directory: URL,
    maximumFiles: Int = maximumFiles,
    maximumBytes: Int = maximumBytes,
    fileManager: FileManager = .default
  ) throws -> URL {
    guard maximumFiles > 0, maximumBytes > 0, data.count <= maximumBytes, isCacheKey(key) else {
      throw YidieError(code: "INVALID_RESOURCE")
    }
    try prepareDirectory(directory, fileManager: fileManager)

    let file = directory.appendingPathComponent("\(key).jpg", isDirectory: false)
    if fileManager.fileExists(atPath: file.path) {
      let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
      guard values.isSymbolicLink != true, values.isRegularFile == true else {
        throw YidieError(code: "INVALID_RESOURCE")
      }
    }
    try data.write(
      to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    try prune(
      directory,
      keeping: file,
      keepingAtMost: maximumFiles,
      bytes: maximumBytes,
      fileManager: fileManager
    )
    return file
  }

  private static func prepareDirectory(_ directory: URL, fileManager: FileManager) throws {
    if fileManager.fileExists(atPath: directory.path) {
      let values = try directory.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
      guard values.isDirectory == true, values.isSymbolicLink != true else {
        throw YidieError(code: "INVALID_RESOURCE")
      }
    } else {
      try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
      let values = try directory.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
      guard values.isDirectory == true, values.isSymbolicLink != true else {
        throw YidieError(code: "INVALID_RESOURCE")
      }
    }

    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    var mutableDirectory = directory
    try mutableDirectory.setResourceValues(values)
  }

  private static func prune(
    _ directory: URL,
    keeping currentFile: URL,
    keepingAtMost maximumFiles: Int,
    bytes maximumBytes: Int,
    fileManager: FileManager
  ) throws {
    let files = try fileManager.contentsOfDirectory(
      at: directory,
      includingPropertiesForKeys: [
        .isRegularFileKey, .isSymbolicLinkKey, .contentModificationDateKey, .fileSizeKey,
      ],
      options: [.skipsHiddenFiles]
    )
    var entries: [(url: URL, date: Date, size: Int)] = []
    for file in files where isCacheFile(file.lastPathComponent) {
      let values = try file.resourceValues(forKeys: [
        .isRegularFileKey, .isSymbolicLinkKey, .contentModificationDateKey, .fileSizeKey,
      ])
      guard values.isRegularFile == true, values.isSymbolicLink != true else { continue }
      entries.append((file, values.contentModificationDate ?? .distantPast, values.fileSize ?? 0))
    }

    entries.sort {
      if $0.date != $1.date { return $0.date < $1.date }
      return $0.url.lastPathComponent < $1.url.lastPathComponent
    }
    var totalBytes = entries.reduce(0) { $0 + $1.size }
    var remaining = entries.count
    let currentPath = currentFile.standardizedFileURL.path
    for entry in entries
    where
      (remaining > maximumFiles || totalBytes > maximumBytes)
      && entry.url.standardizedFileURL.path != currentPath
    {
      try fileManager.removeItem(at: entry.url)
      remaining -= 1
      totalBytes -= entry.size
    }
    guard remaining <= maximumFiles, totalBytes <= maximumBytes else {
      throw YidieError(code: "THUMBNAIL_CACHE_LIMIT")
    }
  }

  private static func isCacheKey(_ value: String) -> Bool {
    value.count == 64 && value.utf8.allSatisfy { (48...57).contains($0) || (97...102).contains($0) }
  }

  private static func isCacheFile(_ name: String) -> Bool {
    name.hasSuffix(".jpg") && isCacheKey(String(name.dropLast(4)))
  }
}
