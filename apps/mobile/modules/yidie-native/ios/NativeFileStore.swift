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
    for name in ["originals", "stickers", "previews", "cutouts", "photo-previews", "database"] {
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

  static func file(_ id: String, kind: String, styleRevision: Int? = nil) throws -> URL {
    try validateID(id)
    if let styleRevision, styleRevision < 0 { throw YidieError(code: "INVALID_RESOURCE") }
    let relative: String
    switch kind {
    case "original": relative = "originals/\(id).source"
    case "sticker": relative = "stickers/\(id)\(styleRevision.map { "-v\($0)" } ?? "").png"
    case "thumbnail": relative = "previews/\(id)\(styleRevision.map { "-v\($0)" } ?? "").png"
    case "cutout": relative = "cutouts/\(id).png"
    case "photoPreview": relative = "photo-previews/\(id).jpg"
    default: throw YidieError(code: "INVALID_RESOURCE")
    }
    return try root().appendingPathComponent(relative)
  }

  static func discard(_ id: String) throws {
    try validateID(id)
    try ImageFileCatalog(root: root()).remove(id)
  }

  static func discardStyleVersion(_ id: String, revision: Int) throws {
    try validateID(id)
    guard revision >= 0 else { throw YidieError(code: "INVALID_RESOURCE") }
    for (kind, directory) in [("sticker", "stickers"), ("thumbnail", "previews")] {
      let file = try self.file(id, kind: kind, styleRevision: revision)
      var candidates = [file]
      if revision == 0 { candidates.append(try self.file(id, kind: kind)) }
      for candidate in candidates {
        if !FileManager.default.fileExists(atPath: candidate.path) { continue }
        let values = try candidate.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
        guard values.isRegularFile == true, values.isSymbolicLink != true,
              candidate.deletingLastPathComponent().lastPathComponent == directory else {
          throw YidieError(code: "INVALID_RESOURCE")
        }
        try FileManager.default.removeItem(at: candidate)
      }
    }
  }

  static func pruneStickerStyles(_ id: String, keeping revision: Int) throws {
    try ImageFileCatalog(root: root()).pruneStickerStyles(id, keeping: revision)
  }
}
