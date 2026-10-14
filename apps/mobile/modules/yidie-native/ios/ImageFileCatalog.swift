import Foundation

/// Only app-owned image directories and strict UUID-derived filenames participate in recovery.
struct ImageFileCatalog {
  let root: URL
  static let extensions = ["originals": "source", "stickers": "png", "previews": "png", "cutouts": "png", "photo-previews": "jpg"]

  private func entryID(_ file: URL, directory: String, ext: String) -> String? {
    guard file.pathExtension == ext else { return nil }
    let stem = file.deletingPathExtension().lastPathComponent
    if UUID(uuidString: stem)?.uuidString == stem { return stem }
    guard directory == "stickers" || directory == "previews",
          let range = stem.range(of: #"^([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})-v([0-9]+)$"#, options: .regularExpression) else { return nil }
    let versionStem = String(stem[range])
    guard let marker = versionStem.range(of: "-v", options: .backwards) else { return nil }
    let id = String(versionStem[..<marker.lowerBound])
    return UUID(uuidString: id)?.uuidString == id ? id : nil
  }

  private func folder(_ name: String) throws -> URL {
    let folder = root.appendingPathComponent(name, isDirectory: true)
    let values = try folder.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
    guard values.isDirectory == true, values.isSymbolicLink != true else { throw YidieError(code: "INVALID_RESOURCE") }
    return folder
  }

  func remove(_ id: String) throws {
    guard UUID(uuidString: id)?.uuidString == id else { throw YidieError(code: "INVALID_RESOURCE") }
    for (directory, ext) in Self.extensions {
      for file in try FileManager.default.contentsOfDirectory(at: folder(directory), includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey]) where entryID(file, directory: directory, ext: ext) == id {
        let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
        guard values.isRegularFile == true, values.isSymbolicLink != true else { throw YidieError(code: "INVALID_RESOURCE") }
        try FileManager.default.removeItem(at: file)
      }
    }
  }

  func pruneStickerStyles(_ id: String, keeping revision: Int) throws {
    guard UUID(uuidString: id)?.uuidString == id, revision >= 0 else {
      throw YidieError(code: "INVALID_RESOURCE")
    }
    let retained = "\(id)-v\(revision)"
    for (directory, ext) in [("stickers", "png"), ("previews", "png")] {
      for file in try FileManager.default.contentsOfDirectory(at: folder(directory), includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey]) where entryID(file, directory: directory, ext: ext) == id {
        if file.deletingPathExtension().lastPathComponent == retained { continue }
        let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
        guard values.isRegularFile == true, values.isSymbolicLink != true else { throw YidieError(code: "INVALID_RESOURCE") }
        try FileManager.default.removeItem(at: file)
      }
    }
  }

  func importIDs() throws -> [String] {
    var ids = Set<String>()
    for (directory, ext) in Self.extensions {
      let folder = try folder(directory)
      for file in try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey]) {
        let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
        let id = entryID(file, directory: directory, ext: ext)
        // Unknown names and file types are left alone.
        guard values.isRegularFile == true, values.isSymbolicLink != true,
              let id else { continue }
        ids.insert(id)
      }
    }
    return ids.sorted()
  }
}
