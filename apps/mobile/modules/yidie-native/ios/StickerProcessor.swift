import Foundation
import Vision
import CoreImage
import UIKit
import ImageIO

enum StickerProcessor {
  private static let context = CIContext(options: [.cacheIntermediates: false])
  private static let allowedColors: [String: UIColor] = [
    "#FFFFFF": .white,
    "#242424": UIColor(red: 36.0 / 255.0, green: 36.0 / 255.0, blue: 36.0 / 255.0, alpha: 1),
    "#0786A8": UIColor(red: 7.0 / 255.0, green: 134.0 / 255.0, blue: 168.0 / 255.0, alpha: 1)
  ]

  static func create(id: String) throws -> [String: Any] {
    let result = try makeCutout(id: id)
    try writePNG(result.image, to: NativeFileStore.file(id, kind: "cutout"))
    return try render(id: id, cutout: result.image, revision: 0, borderWidth: 4, borderColor: "#FFFFFF", instanceCount: result.instanceCount)
  }

  static func renderStyle(id: String, revision: Int, borderWidth: Double, borderColor: String) throws -> [String: Any] {
    try NativeFileStore.validateID(id)
    guard revision > 0, borderWidth.isFinite, (0...8).contains(borderWidth), allowedColors[borderColor] != nil else {
      throw YidieError(code: "INVALID_STICKER_STYLE")
    }
    let cutoutURL = try NativeFileStore.file(id, kind: "cutout")
    let cutout: CIImage
    if FileManager.default.fileExists(atPath: cutoutURL.path),
       let image = CIImage(contentsOf: cutoutURL, options: [.applyOrientationProperty: true]) {
      cutout = image
    } else {
      // Older records have no saved cutout. Create it only after the user asks to edit.
      cutout = try makeCutout(id: id).image
      try writePNG(cutout, to: cutoutURL)
    }
    return try render(id: id, cutout: cutout, revision: revision, borderWidth: borderWidth, borderColor: borderColor, instanceCount: 1)
  }

  private static func makeCutout(id: String) throws -> (image: CIImage, instanceCount: Int) {
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
    let buffer = try observation.generateMaskedImage(ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: true)
    // Save transparent padding with the alpha cutout so every style redraw uses identical bounds.
    let foreground = CIImage(cvPixelBuffer: buffer)
    let canvas = foreground.extent.insetBy(dx: -12, dy: -12).integral
    return (foreground.cropped(to: canvas), observation.allInstances.count)
  }

  private static func render(id: String, cutout: CIImage, revision: Int, borderWidth: Double, borderColor: String, instanceCount: Int) throws -> [String: Any] {
    let canvas = cutout.extent.integral
    let styled: CIImage
    if borderWidth == 0 {
      styled = cutout
    } else {
      guard let color = allowedColors[borderColor] else { throw YidieError(code: "INVALID_STICKER_STYLE") }
      let rgba = color.cgColor.components ?? [1, 1, 1, 1]
      let alpha = CIVector(x: 0, y: 0, z: 0, w: 1)
      let bias = CIVector(x: rgba[0], y: rgba[1], z: rgba[2], w: 0)
      let outline = cutout.applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: borderWidth])
        .applyingFilter("CIColorMatrix", parameters: [
          "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputAVector": alpha,
          "inputBiasVector": bias
        ])
      styled = cutout.composited(over: outline)
    }
    guard let result = context.createCGImage(styled, from: canvas), let png = UIImage(cgImage: result).pngData() else {
      throw YidieError(code: "PROCESSING_FAILED")
    }
    let sticker = try NativeFileStore.file(id, kind: "sticker", styleRevision: revision)
    let thumbnail = try NativeFileStore.file(id, kind: "thumbnail", styleRevision: revision)
    try png.write(to: sticker, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    let ratio = min(1, 256 / CGFloat(max(result.width, result.height)))
    let size = CGSize(width: CGFloat(result.width) * ratio, height: CGFloat(result.height) * ratio)
    let format = UIGraphicsImageRendererFormat(); format.scale = 1; format.opaque = false
    let small = UIGraphicsImageRenderer(size: size, format: format).pngData { _ in
      UIImage(cgImage: result).draw(in: CGRect(origin: .zero, size: size))
    }
    try small.write(to: thumbnail, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    return [
      "stickerPath": "stickers/\(id)-v\(revision).png",
      "cutoutPath": "cutouts/\(id).png",
      "thumbnailPath": "previews/\(id)-v\(revision).png",
      "width": result.width,
      "height": result.height,
      "instanceCount": instanceCount,
      "borderWidth": borderWidth,
      "borderColor": borderColor,
      "styleRevision": revision
    ]
  }

  private static func writePNG(_ image: CIImage, to url: URL) throws {
    let bounds = image.extent.integral
    guard let cgImage = context.createCGImage(image, from: bounds), let png = UIImage(cgImage: cgImage).pngData() else {
      throw YidieError(code: "PROCESSING_FAILED")
    }
    try png.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
}
