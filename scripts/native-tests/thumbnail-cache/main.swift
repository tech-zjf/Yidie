import Foundation

func check(_ value: Bool, _ message: String) {
  if !value { fatalError(message) }
}

func mustReject(_ action: () throws -> Void) {
  do {
    try action()
    fatalError("Expected thumbnail cache operation to reject")
  } catch {}
}

let fileManager = FileManager.default
let sandbox = fileManager.temporaryDirectory.appendingPathComponent(
  "YidieThumbnailTests-" + UUID().uuidString, isDirectory: true)
try fileManager.createDirectory(at: sandbox, withIntermediateDirectories: true)
defer { try? fileManager.removeItem(at: sandbox) }

let cache = sandbox.appendingPathComponent("cache", isDirectory: true)
let firstKey = String(repeating: "a", count: 64)
let secondKey = String(repeating: "b", count: 64)
let thirdKey = String(repeating: "c", count: 64)
let first = try PhotoThumbnailCache.store(
  Data("1111".utf8), key: firstKey, in: cache, maximumFiles: 2, maximumBytes: 8)
try fileManager.setAttributes(
  [.modificationDate: Date(timeIntervalSince1970: 100)], ofItemAtPath: first.path)
let second = try PhotoThumbnailCache.store(
  Data("2222".utf8), key: secondKey, in: cache, maximumFiles: 2, maximumBytes: 8)
try fileManager.setAttributes(
  [.modificationDate: Date(timeIntervalSince1970: 200)], ofItemAtPath: second.path)
let third = try PhotoThumbnailCache.store(
  Data("3333".utf8), key: thirdKey, in: cache, maximumFiles: 2, maximumBytes: 8)
check(
  !fileManager.fileExists(atPath: first.path), "least-recently-used thumbnail should be evicted")
check(fileManager.fileExists(atPath: second.path), "recent thumbnail should be retained")
check(fileManager.fileExists(atPath: third.path), "new thumbnail should be retained")

let countCache = sandbox.appendingPathComponent("count-cache", isDirectory: true)
let countKeys = ["1", "2", "3"].map { String(repeating: $0, count: 64) }
var countFiles: [URL] = []
for (index, key) in countKeys.enumerated() {
  let file = try PhotoThumbnailCache.store(
    Data("item".utf8), key: key, in: countCache, maximumFiles: 2, maximumBytes: 32)
  try fileManager.setAttributes(
    [.modificationDate: Date(timeIntervalSince1970: TimeInterval(index + 1))],
    ofItemAtPath: file.path
  )
  countFiles.append(file)
}
check(
  !fileManager.fileExists(atPath: countFiles[0].path),
  "file-count cap should evict the oldest thumbnail")
check(
  fileManager.fileExists(atPath: countFiles[1].path),
  "file-count cap should keep the newer thumbnail")
check(
  fileManager.fileExists(atPath: countFiles[2].path),
  "file-count cap should keep the newly stored thumbnail")

let unknown = cache.appendingPathComponent("keep-me.txt")
try Data("unknown".utf8).write(to: unknown)
let fourthKey = String(repeating: "d", count: 64)
let fourth = try PhotoThumbnailCache.store(
  Data("4444".utf8), key: fourthKey, in: cache, maximumFiles: 2, maximumBytes: 8)
check(fileManager.fileExists(atPath: unknown.path), "cache pruning must preserve unknown files")
check(!fileManager.fileExists(atPath: second.path), "byte cap should evict the older retained file")
check(fileManager.fileExists(atPath: fourth.path), "byte cap should retain the newest thumbnail")
mustReject {
  try PhotoThumbnailCache.store(
    Data(repeating: 0, count: 9),
    key: String(repeating: "9", count: 64),
    in: cache,
    maximumFiles: 2,
    maximumBytes: 8
  )
}

let outside = sandbox.appendingPathComponent("outside", isDirectory: true)
try fileManager.createDirectory(at: outside, withIntermediateDirectories: true)
let outsideFile = outside.appendingPathComponent("preserve.txt")
try Data("private".utf8).write(to: outsideFile)
let linkedCache = sandbox.appendingPathComponent("linked-cache", isDirectory: true)
try fileManager.createSymbolicLink(at: linkedCache, withDestinationURL: outside)
mustReject {
  try PhotoThumbnailCache.store(
    Data("x".utf8), key: String(repeating: "e", count: 64), in: linkedCache)
}
check(
  try String(contentsOf: outsideFile, encoding: .utf8) == "private",
  "rejecting a linked cache must preserve its target")

let linkedFile = cache.appendingPathComponent("\(String(repeating: "f", count: 64)).jpg")
try fileManager.createSymbolicLink(at: linkedFile, withDestinationURL: outsideFile)
mustReject {
  try PhotoThumbnailCache.store(
    Data("replace".utf8), key: String(repeating: "f", count: 64), in: cache)
}
check(
  try String(contentsOf: outsideFile, encoding: .utf8) == "private",
  "a cache filename symlink must not write outside the cache")
print(
  "PASS thumbnail cache: LRU file/byte bounds, unknown-file preservation, and symlink rejection")
