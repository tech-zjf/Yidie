import Foundation

func check(_ value: Bool) { if !value { fatalError("Assertion failed") } }
let fm = FileManager.default
let sandbox = fm.temporaryDirectory.appendingPathComponent("YidieFileTests-" + UUID().uuidString, isDirectory: true)
try fm.createDirectory(at: sandbox, withIntermediateDirectories: true)
defer { try? fm.removeItem(at: sandbox) }
let root = sandbox.appendingPathComponent("owned", isDirectory: true)
for folder in ImageFileCatalog.extensions.keys { try fm.createDirectory(at: root.appendingPathComponent(folder), withIntermediateDirectories: true) }
try fm.createDirectory(at: root.appendingPathComponent("database"), withIntermediateDirectories: true)
let id = "AAAAAAAA-0000-4000-8000-000000000001"
let second = "BBBBBBBB-0000-4000-8000-000000000002"
let linked = "CCCCCCCC-0000-4000-8000-000000000003"
let content = Data("fixture".utf8)
for (folder, ext) in ImageFileCatalog.extensions { try content.write(to: root.appendingPathComponent("\(folder)/\(id).\(ext)")) }
try content.write(to: root.appendingPathComponent("previews/\(second).png"))
let unknown = root.appendingPathComponent("originals/notes.txt")
let database = root.appendingPathComponent("database/yidie.sqlite")
let outside = sandbox.appendingPathComponent("outside.jpg")
for file in [unknown, database, outside] { try content.write(to: file) }
try fm.createSymbolicLink(at: root.appendingPathComponent("photo-previews/\(linked).jpg"), withDestinationURL: outside)
let catalog = ImageFileCatalog(root: root)
check(try catalog.importIDs() == [id, second])
try catalog.remove(id)
try catalog.remove(id) // Repeated deletion is safe after an interruption.
check(try catalog.importIDs() == [second])
for file in [unknown, database, outside] { check(try Data(contentsOf: file) == content) }
func mustReject(_ action: () throws -> Void) {
  do { try action(); fatalError("Expected rejection") } catch { }
}
mustReject { try catalog.remove("../outside") }
mustReject { try catalog.remove(linked) }
let previews = root.appendingPathComponent("previews")
try fm.removeItem(at: previews)
try fm.createSymbolicLink(at: previews, withDestinationURL: sandbox)
mustReject { _ = try catalog.importIDs() }
mustReject { try catalog.remove(second) }
check(try Data(contentsOf: outside) == content)
print("PASS Swift file inventory: exact names, deduplication, idempotent removal, unknown/database preservation, path and symlink rejection")
