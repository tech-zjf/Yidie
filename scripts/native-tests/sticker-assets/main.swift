import Foundation

func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
  guard condition() else { fatalError("FAIL: \(message)") }
}

func expectRejected(_ operation: () throws -> Void, _ message: String) {
  do {
    try operation()
    fatalError("FAIL: \(message)")
  } catch let error as YidieError {
    expect(error.code == "INVALID_RESOURCE", "\(message) must report INVALID_RESOURCE")
  } catch {
    fatalError("FAIL: \(message) returned an unexpected error: \(error)")
  }
}

let fileManager = FileManager.default
let temporary = fileManager.temporaryDirectory
  .appendingPathComponent("YidieStickerAssets-\(UUID().uuidString)", isDirectory: true)
defer { try? fileManager.removeItem(at: temporary) }

let root = temporary.appendingPathComponent("Yidie", isDirectory: true)
for name in ["drafts", "cutouts", "stickers", "previews"] {
  try fileManager.createDirectory(
    at: root.appendingPathComponent(name, isDirectory: true), withIntermediateDirectories: true)
}

let id = "AAAAAAAA-0000-4000-8000-000000000001"
let otherID = "BBBBBBBB-0000-4000-8000-000000000002"
let session = "DDDDDDDD-0000-4000-8000-000000000004"
let bytes = Data("transparent-cutout-fixture".utf8)
let ownedDraftPath = "drafts/\(id)-\(session)-subject-1.png"
let otherDraftPath = "drafts/\(otherID)-\(session)-subject-1.png"
let ownedDraft = root.appendingPathComponent(ownedDraftPath)
let otherDraft = root.appendingPathComponent(otherDraftPath)
try bytes.write(to: ownedDraft)
try bytes.write(to: otherDraft)
try bytes.write(to: root.appendingPathComponent("drafts/notes.png"))

let store = StickerAssetStore(root: root)
let stagedPath = try store.stageSubjectCutout(id: id, draftPath: ownedDraftPath, revision: 2)
expect(stagedPath == "cutouts/\(id)-v2.png", "staging returns the revisioned owned path")
let stagedCutout = root.appendingPathComponent("cutouts/\(id)-v2.png")
let stagedBytes = try Data(contentsOf: stagedCutout)
expect(stagedBytes == bytes, "staging copies the selected transparent cutout")

expectRejected(
  { _ = try store.subjectDraftFile(id: id, relativePath: otherDraftPath) },
  "a draft belonging to another entry must not be readable")
expectRejected(
  { _ = try store.cutoutFile(id: id, relativePath: "cutouts/../outside.png") },
  "cutout path traversal must be rejected")
expectRejected(
  { _ = try store.stageSubjectCutout(id: id, draftPath: ownedDraftPath, revision: 0) },
  "a non-positive cutout revision must be rejected")

try store.discardSubjectDrafts(id: id)
expect(!fileManager.fileExists(atPath: ownedDraft.path), "discard removes the selected entry's draft")
expect(fileManager.fileExists(atPath: otherDraft.path), "discard preserves another entry's draft")
expect(
  fileManager.fileExists(atPath: root.appendingPathComponent("drafts/notes.png").path),
  "discard preserves unknown files")

let staleDraftPath = "drafts/\(id)-\(session)-subject-2.png"
let staleDraft = root.appendingPathComponent(staleDraftPath)
let unknownTarget = temporary.appendingPathComponent("unknown-target.png")
try bytes.write(to: unknownTarget)
let unknownLink = root.appendingPathComponent("drafts/notes-link.png")
try fileManager.createSymbolicLink(at: unknownLink, withDestinationURL: unknownTarget)
try bytes.write(to: staleDraft)
try store.discardStaleSubjectDrafts()
expect(!fileManager.fileExists(atPath: staleDraft.path), "startup cleanup removes stale owned drafts")
expect(!fileManager.fileExists(atPath: otherDraft.path), "startup cleanup removes drafts from abandoned editors")
expect(
  fileManager.fileExists(atPath: root.appendingPathComponent("drafts/notes.png").path),
  "startup cleanup preserves unknown files")
expect(fileManager.fileExists(atPath: unknownLink.path), "startup cleanup preserves unknown symbolic links")
let unknownTargetBytes = try Data(contentsOf: unknownTarget)
expect(unknownTargetBytes == bytes, "startup cleanup never touches link targets")

for path in ["stickers/\(id).png", "previews/\(id).png", "stickers/\(id)-v2.png",
             "previews/\(id)-v2.png"] {
  try bytes.write(to: root.appendingPathComponent(path))
}
try store.discardStyleVersion(id: id, revision: 2, cutoutPath: "cutouts/\(id)-v2.png")
expect(!fileManager.fileExists(atPath: stagedCutout.path), "discard removes only the staged versioned cutout")
expect(
  fileManager.fileExists(atPath: root.appendingPathComponent("stickers/\(id).png").path),
  "discard preserves the previously committed sticker")
expect(
  fileManager.fileExists(atPath: root.appendingPathComponent("previews/\(id).png").path),
  "discard preserves the previously committed thumbnail")

let outside = temporary.appendingPathComponent("outside.png")
try bytes.write(to: outside)
let linkedDraftPath = "drafts/\(id)-\(session)-subject-3.png"
try fileManager.createSymbolicLink(
  at: root.appendingPathComponent(linkedDraftPath), withDestinationURL: outside)
expectRejected(
  { _ = try store.stageSubjectCutout(id: id, draftPath: linkedDraftPath, revision: 3) },
  "a symbolic-link draft must not be staged")
let outsideBytes = try Data(contentsOf: outside)
expect(outsideBytes == bytes, "rejecting a symbolic link preserves the external target")

print("PASS sticker asset store: staging, revision cleanup, stale drafts, ownership, traversal and symlinks")
