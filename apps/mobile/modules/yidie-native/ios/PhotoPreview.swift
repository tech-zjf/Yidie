import Foundation
import ImageIO
import UIKit

/// A bounded, orientation-correct photo preview; never a base64 original on the JS bridge.
enum PhotoPreview {
  struct Result {
    let path: String
    let width: Int
    let height: Int
    var dictionary: [String: Any] { ["path": path, "width": width, "height": height] }
  }
  static func create(id: String) throws -> Result {
    let original = try NativeFileStore.file(id, kind: "original")
    guard let source = CGImageSourceCreateWithURL(original as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 512,
            kCGImageSourceShouldCacheImmediately: true
          ] as CFDictionary),
          let data = UIImage(cgImage: image).jpegData(compressionQuality: 0.8) else {
      throw YidieError(code: "INVALID_IMAGE")
    }
    let target = try NativeFileStore.file(id, kind: "photoPreview")
    try data.write(to: target, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    return Result(path: "photo-previews/\(id).jpg", width: image.width, height: image.height)
  }
}
