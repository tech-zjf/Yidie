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
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try root.setResourceValues(values)
    for name in ["originals", "stickers", "previews", "database"] {
      var child = root.appendingPathComponent(name, isDirectory: true)
      try FileManager.default.createDirectory(at: child, withIntermediateDirectories: true)
      try child.setResourceValues(values)
    }
    return root
  }

  static func validateID(_ id: String) throws {
    guard UUID(uuidString: id) != nil else { throw YidieError(code: "INVALID_RESOURCE") }
  }

  static func file(_ id: String, kind: String) throws -> URL {
    try validateID(id)
    let relative: String
    switch kind {
    case "original": relative = "originals/\(id).source"
    case "sticker": relative = "stickers/\(id).png"
    case "thumbnail": relative = "previews/\(id).png"
    default: throw YidieError(code: "INVALID_RESOURCE")
    }
    return try root().appendingPathComponent(relative)
  }

  static func discard(_ id: String) throws {
    try validateID(id)
    for kind in ["original", "sticker", "thumbnail"] {
      let url = try file(id, kind: kind)
      if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
  }
}
