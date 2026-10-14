import Foundation
import Photos
import UIKit
import ImageIO
import CryptoKit

enum LocalPhotos {
  static func permitted() -> Bool {
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    return status == .authorized || status == .limited
  }

  static func asset(_ id: String) throws -> PHAsset {
    guard permitted() else { throw YidieError(code: "PHOTO_PERMISSION_DENIED") }
    guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else {
      throw YidieError(code: "SOURCE_UNAVAILABLE")
    }
    return asset
  }

  static func list(offset: Int, limit: Int) throws -> [[String: Any]] {
    guard permitted() else { throw YidieError(code: "PHOTO_PERMISSION_DENIED") }
    let options = PHFetchOptions()
    options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    let assets = PHAsset.fetchAssets(with: .image, options: options)
    let start = max(0, offset), end = min(assets.count, start + min(60, max(1, limit)))
    guard start < end else { return [] }
    return (start..<end).map { index in
      let asset = assets.object(at: index)
      return ["id": asset.localIdentifier, "createdAt": asset.creationDate.map { ISO8601DateFormatter().string(from: $0) } as Any? ?? NSNull(), "width": asset.pixelWidth, "height": asset.pixelHeight]
    }
  }

  static func thumbnail(_ id: String, completion: @escaping (Result<String?, Error>) -> Void) {
    do {
      let asset = try asset(id)
      let options = PHImageRequestOptions()
      options.isNetworkAccessAllowed = false
      options.deliveryMode = .highQualityFormat
      options.resizeMode = .fast
      PHImageManager.default().requestImage(for: asset, targetSize: CGSize(width: 180, height: 240), contentMode: .aspectFill, options: options) { image, _ in
        guard let image, let data = image.jpegData(compressionQuality: 0.75) else { completion(.success(nil)); return }
        NativeFileStore.queue.async {
          do {
            // Transient cache, never a large base64 image on the JS bridge.
            var cache = FileManager.default.temporaryDirectory.appendingPathComponent("YidieThumbnails", isDirectory: true)
            try FileManager.default.createDirectory(at: cache, withIntermediateDirectories: true)
            var values = URLResourceValues(); values.isExcludedFromBackup = true
            try cache.setResourceValues(values)
            let hash = SHA256.hash(data: Data(id.utf8)).map { String(format: "%02x", $0) }.joined()
            let file = cache.appendingPathComponent(hash + ".jpg")
            try data.write(to: file, options: .atomic)
            completion(.success(file.absoluteString))
          } catch { completion(.failure(error)) }
        }
      }
    } catch { completion(.failure(error)) }
  }

  static func read(_ assetID: String, completion: @escaping (Result<[String: Any], Error>) -> Void) {
    do {
      let asset = try asset(assetID)
      let options = PHImageRequestOptions()
      options.isNetworkAccessAllowed = false
      options.deliveryMode = .highQualityFormat
      options.version = .current
      PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) { data, _, _, info in
        guard let data else {
          let cloud = info?[PHImageResultIsInCloudKey] as? Bool ?? false
          completion(.failure(YidieError(code: cloud ? "SOURCE_NOT_LOCAL" : "SOURCE_UNAVAILABLE"))); return
        }
        NativeFileStore.queue.async {
          autoreleasepool {
            do {
              guard data.count <= 80 * 1024 * 1024, let source = CGImageSourceCreateWithData(data as CFData, nil) else {
                throw YidieError(code: "INVALID_IMAGE")
              }
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
              let exif = properties?[kCGImagePropertyExifDictionary] as? [CFString: Any]
              let id = UUID().uuidString
              let url = try NativeFileStore.file(id, kind: "original")
              let preview: PhotoPreview.Result
              do {
                try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
                preview = try PhotoPreview.create(id: id)
              } catch {
                // Import has not crossed the bridge; no database record can own this UUID yet.
                try? NativeFileStore.discard(id)
                throw error
              }
              completion(.success([
                "id": id, "originalPath": "originals/\(id).source",
                "photoPreviewPath": preview.path, "photoWidth": preview.width, "photoHeight": preview.height,
                "contentHash": SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined(),
                "exifDateTime": exif?[kCGImagePropertyExifDateTimeOriginal] as? String as Any? ?? NSNull(),
                "createdAt": asset.creationDate.map { ISO8601DateFormatter().string(from: $0) } as Any? ?? NSNull()
              ]))
            } catch { completion(.failure(error)) }
          }
        }
      }
    } catch { completion(.failure(error)) }
  }
}
