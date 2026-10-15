import Foundation

struct YidieError: LocalizedError {
  let code: String
  var errorDescription: String? { code }
}

enum NativeFileStore {
  static let queue = DispatchQueue(label: "app.yidie.images", qos: .userInitiated)

  static func root() throws -> URL {
    let support = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    var root = support.appendingPathComponent("Yidie", isDirectory: true)
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    try validateDirectory(root)
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try root.setResourceValues(values)
    for name in ["originals", "stickers", "previews", "cutouts", "photo-previews", "drafts", "database"] {
      var child = root.appendingPathComponent(name, isDirectory: true)
      try FileManager.default.createDirectory(at: child, withIntermediateDirectories: true)
      try validateDirectory(child)
      try child.setResourceValues(values)
    }
    return root
  }

  private static func validateDirectory(_ url: URL) throws {
    let values = try url.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
    guard values.isDirectory == true, values.isSymbolicLink != true else { throw YidieError(code: "INVALID_RESOURCE") }
  }

  static func validateID(_ id: String) throws {
    guard UUID(uuidString: id)?.uuidString == id else { throw YidieError(code: "INVALID_RESOURCE") }
  }

  static func file(
    _ id: String, kind: String, styleRevision: Int? = nil, cutoutRevision: Int? = nil
  ) throws -> URL {
    try validateID(id)
    if let styleRevision, styleRevision < 0 { throw YidieError(code: "INVALID_RESOURCE") }
    if let cutoutRevision, cutoutRevision <= 0 { throw YidieError(code: "INVALID_RESOURCE") }
    let relative: String
    switch kind {
    case "original": relative = "originals/\(id).source"
    case "sticker": relative = "stickers/\(id)\(styleRevision.map { "-v\($0)" } ?? "").png"
    case "thumbnail": relative = "previews/\(id)\(styleRevision.map { "-v\($0)" } ?? "").png"
    case "cutout": relative = "cutouts/\(id)\(cutoutRevision.map { "-v\($0)" } ?? "").png"
    case "photoPreview": relative = "photo-previews/\(id).jpg"
    default: throw YidieError(code: "INVALID_RESOURCE")
    }
    return try root().appendingPathComponent(relative)
  }

  static func cutoutFile(_ id: String, relativePath: String) throws -> URL {
    try StickerAssetStore(root: root()).cutoutFile(id: id, relativePath: relativePath)
  }

  static func subjectDraftFile(_ id: String, relativePath: String) throws -> URL {
    try StickerAssetStore(root: root()).subjectDraftFile(id: id, relativePath: relativePath)
  }

  static func discardSubjectDrafts(_ id: String) throws {
    try StickerAssetStore(root: root()).discardSubjectDrafts(id: id)
  }

  static func discardStaleSubjectDrafts() throws {
    try StickerAssetStore(root: root()).discardStaleSubjectDrafts()
  }

  static func stageSubjectCutout(_ id: String, draftPath: String, revision: Int) throws -> String {
    try StickerAssetStore(root: root()).stageSubjectCutout(
      id: id, draftPath: draftPath, revision: revision)
  }

  static func discard(_ id: String) throws {
    try validateID(id)
    try ImageFileCatalog(root: root()).remove(id)
  }

  static func discardStyleVersion(
    _ id: String, revision: Int, cutoutPath: String? = nil
  ) throws {
    try StickerAssetStore(root: root()).discardStyleVersion(
      id: id, revision: revision, cutoutPath: cutoutPath)
  }

  static func pruneStickerStyles(
    _ id: String, keeping revision: Int, cutoutPath: String
  ) throws {
    _ = try cutoutFile(id, relativePath: cutoutPath)
    try ImageFileCatalog(root: root()).pruneStickerStyles(
      id, keeping: revision, cutoutPath: cutoutPath)
  }
}
