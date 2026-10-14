import Foundation
import Vision
import CoreImage
import UIKit
import ImageIO

enum StickerProcessor {
  static func create(id: String) throws -> [String: Any] {
    let sourceURL = try NativeFileStore.file(id, kind: "original")
    guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 2048,
            kCGImageSourceShouldCacheImmediately: true
          ] as CFDictionary) else { throw YidieError(code: "INVALID_IMAGE") }
    let handler = VNImageRequestHandler(cgImage: image, orientation: .up)
    let request = VNGenerateForegroundInstanceMaskRequest()
    do { try handler.perform([request]) }
    catch {
      #if targetEnvironment(simulator)
      let failure = error as NSError
      if failure.domain == VNErrorDomain && failure.code == VNErrorCode.internalError.rawValue {
        throw YidieError(code: "SIMULATOR_VISION_UNAVAILABLE")
      }
      #endif
      throw error
    }
    guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
      throw YidieError(code: "NO_FOREGROUND")
    }
    // Phase 2 keeps all detected foreground subjects. Subject picking is a later feature.
    let buffer = try observation.generateMaskedImage(ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: true)
    let cutout = CIImage(cvPixelBuffer: buffer)
    let canvas = cutout.extent.insetBy(dx: -8, dy: -8).integral
    let alpha = CIVector(x: 0, y: 0, z: 0, w: 1)
    let whiteBorder = cutout.applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: 4])
      .applyingFilter("CIColorMatrix", parameters: ["inputRVector": alpha, "inputGVector": alpha, "inputBVector": alpha, "inputAVector": alpha])
    let composed = cutout.composited(over: whiteBorder).cropped(to: canvas)
    let context = CIContext(options: [.cacheIntermediates: false])
    guard let result = context.createCGImage(composed, from: canvas), let png = UIImage(cgImage: result).pngData() else {
      throw YidieError(code: "PROCESSING_FAILED")
    }
    let sticker = try NativeFileStore.file(id, kind: "sticker")
    let thumbnail = try NativeFileStore.file(id, kind: "thumbnail")
    try png.write(to: sticker, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    let ratio = min(1, 256 / CGFloat(max(result.width, result.height)))
    let size = CGSize(width: CGFloat(result.width) * ratio, height: CGFloat(result.height) * ratio)
    let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = false
    let small = UIGraphicsImageRenderer(size: size, format: format).pngData { _ in
      UIImage(cgImage: result).draw(in: CGRect(origin: .zero, size: size))
    }
    try small.write(to: thumbnail, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    return ["stickerPath": "stickers/\(id).png", "thumbnailPath": "previews/\(id).png", "width": result.width, "height": result.height, "instanceCount": observation.allInstances.count]
  }
}
