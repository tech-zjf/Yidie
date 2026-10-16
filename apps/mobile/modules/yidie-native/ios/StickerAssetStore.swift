import Foundation

/// Owns temporary subject cutouts and versioned sticker assets under the app's image root.
struct StickerAssetStore {
  let root: URL

  func cutoutFile(id: String, relativePath: String) throws -> URL {
    try validateID(id)
    let base = "cutouts/\(id).png"
    guard relativePath == base ||
      relativePath.range(
        of: "^cutouts/\(NSRegularExpression.escapedPattern(for: id))-v[1-9][0-9]*\\.png$",
        options: .regularExpression
      ) != nil
    else { throw YidieError(code: "INVALID_RESOURCE") }
    return root.appendingPathComponent(relativePath)
  }

  func subjectDraftFile(id: String, relativePath: String) throws -> URL {
    try validateID(id)
    guard relativePath.range(
      of: subjectDraftPattern(for: id), options: .regularExpression
    ) != nil else { throw YidieError(code: "INVALID_RESOURCE") }
    return try directory("drafts").appendingPathComponent(
      String(relativePath.dropFirst("drafts/".count)))
  }

  func stageSubjectCutout(id: String, draftPath: String, revision: Int) throws -> String {
    guard revision > 0 else { throw YidieError(code: "INVALID_RESOURCE") }
    let source = try subjectDraftFile(id: id, relativePath: draftPath)
    try requireOwnedRegularFile(source)
    let relativePath = "cutouts/\(id)-v\(revision).png"
    let destination = try cutoutFile(id: id, relativePath: relativePath)
    let data = try Data(contentsOf: source, options: .mappedIfSafe)
    try data.write(
      to: destination,
      options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    return relativePath
  }

  func discardSubjectDrafts(id: String) throws {
    try validateID(id)
    let drafts = try directory("drafts")
    for file in try FileManager.default.contentsOfDirectory(
      at: drafts, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey]
    ) where file.lastPathComponent.range(
      of: subjectDraftPattern(for: id, includesDirectory: false), options: .regularExpression
    ) != nil {
      try requireOwnedRegularFile(file)
      try FileManager.default.removeItem(at: file)
    }
  }

  func discardStaleSubjectDrafts() throws {
    let drafts = try directory("drafts")
    for file in try FileManager.default.contentsOfDirectory(
      at: drafts, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey]
    ) {
      guard file.lastPathComponent.range(
        of: Self.staleSubjectDraftPattern, options: .regularExpression
      ) != nil else { continue }
      let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
      guard values.isRegularFile == true, values.isSymbolicLink != true else { continue }
      try FileManager.default.removeItem(at: file)
    }
  }

  func discardStyleVersion(id: String, revision: Int, cutoutPath: String?) throws {
    try validateID(id)
    guard revision >= 0 else { throw YidieError(code: "INVALID_RESOURCE") }
    for (directory, stem) in [("stickers", "stickers"), ("previews", "previews")] {
      let file = root.appendingPathComponent("\(directory)/\(id)-v\(revision).png")
      var candidates = [file]
      if revision == 0 {
        candidates.append(root.appendingPathComponent("\(directory)/\(id).png"))
      }
      for candidate in candidates where FileManager.default.fileExists(atPath: candidate.path) {
        guard candidate.deletingLastPathComponent().lastPathComponent == stem else {
          throw YidieError(code: "INVALID_RESOURCE")
        }
        try requireOwnedRegularFile(candidate)
        try FileManager.default.removeItem(at: candidate)
      }
    }
    if let cutoutPath, cutoutPath != "cutouts/\(id).png" {
      let cutout = try cutoutFile(id: id, relativePath: cutoutPath)
      if FileManager.default.fileExists(atPath: cutout.path) {
        try requireOwnedRegularFile(cutout)
        try FileManager.default.removeItem(at: cutout)
      }
    }
  }

  private func directory(_ name: String) throws -> URL {
    let url = root.appendingPathComponent(name, isDirectory: true)
    let values = try url.resourceValues(forKeys: [.isDirectoryKey, .isSymbolicLinkKey])
    guard values.isDirectory == true, values.isSymbolicLink != true else {
      throw YidieError(code: "INVALID_RESOURCE")
    }
    return url
  }

  private func requireOwnedRegularFile(_ url: URL) throws {
    let values = try url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
    guard values.isRegularFile == true, values.isSymbolicLink != true else {
      throw YidieError(code: "INVALID_RESOURCE")
    }
  }

  private func validateID(_ id: String) throws {
    guard UUID(uuidString: id)?.uuidString == id else {
      throw YidieError(code: "INVALID_RESOURCE")
    }
  }

  private func subjectDraftPattern(for id: String, includesDirectory: Bool = true) -> String {
    let prefix = includesDirectory ? "^drafts/" : "^"
    return "\(prefix)\(NSRegularExpression.escapedPattern(for: id))-" +
      #"[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}-subject-[1-9][0-9]*\.png$"#
  }

  private static let staleSubjectDraftPattern =
    #"^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}-subject-[1-9][0-9]*\.png$"#
}
