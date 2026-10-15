import CoreImage
import Foundation
import ImageIO
import UIKit
import Vision

enum StickerProcessor {
  private static let context = CIContext(options: [.cacheIntermediates: false])

  static func create(
    id: String, completion: @escaping (Result<[String: Any], Error>) -> Void
  ) {
    NativeFileStore.queue.async {
      autoreleasepool {
        do {
          let source = try loadSourceImage(id: id)
          Task { @MainActor in
            let lifted = try? await StickerSubjectExtractor.cutout(from: source)
            NativeFileStore.queue.async {
              autoreleasepool {
                do {
                  let result =
                    try lifted.map {
                      (image: CIImage(cgImage: $0.image), instanceCount: $0.instanceCount)
                    } ?? makeCutout(id: id)
                  let cutoutURL = try NativeFileStore.file(id, kind: "cutout")
                  do {
                    try writePNG(result.image, to: cutoutURL)
                    let sticker = try render(
                      id: id, cutout: result.image, cutoutPath: "cutouts/\(id).png",
                      revision: 0, effect: .outline,
                      borderWidth: 4, borderColor: "#FFFFFF", instanceCount: result.instanceCount)
                    completion(.success(sticker))
                  } catch {
                    try? FileManager.default.removeItem(at: cutoutURL)
                    throw error
                  }
                } catch {
                  completion(.failure(error))
                }
              }
            }
          }
        } catch {
          completion(.failure(error))
        }
      }
    }
  }

  static func subjectCandidates(
    id: String, completion: @escaping (Result<[[String: Any]], Error>) -> Void
  ) {
    NativeFileStore.queue.async {
      autoreleasepool {
        do {
          let source = try loadSourceImage(id: id)
          Task { @MainActor in
            do {
              let images = try await StickerSubjectExtractor.individualCutouts(from: source)
              NativeFileStore.queue.async {
                autoreleasepool {
                  do {
                    let session = UUID().uuidString
                    var candidates: [[String: Any]] = []
                    var createdFiles: [URL] = []
                    do {
                      for (offset, image) in images.enumerated() {
                        let path = "drafts/\(id)-\(session)-subject-\(offset + 1).png"
                        let url = try NativeFileStore.subjectDraftFile(id, relativePath: path)
                        try writePNG(CIImage(cgImage: image), to: url)
                        createdFiles.append(url)
                        candidates.append([
                          "path": path,
                          "width": image.width,
                          "height": image.height,
                        ])
                      }
                    } catch {
                      for file in createdFiles { try? FileManager.default.removeItem(at: file) }
                      throw error
                    }
                    completion(.success(candidates))
                  } catch {
                    completion(.failure(error))
                  }
                }
              }
            } catch {
              completion(.failure(error))
            }
          }
        } catch {
          completion(.failure(error))
        }
      }
    }
  }

  static func renderStyle(
    id: String, revision: Int, cutoutPath: String?, effect: String, borderWidth: Double,
    borderColor: String
  ) throws -> [String: Any] {
    try NativeFileStore.validateID(id)
    guard revision > 0,
      let style = StickerEffect(rawValue: effect),
      borderWidth.isFinite, (0...8).contains(borderWidth),
      StickerRenderer.supportsColor(borderColor),
      effect != "original" || borderWidth == 0
    else {
      throw YidieError(code: "INVALID_STICKER_STYLE")
    }
    let selectedPath = cutoutPath ?? "cutouts/\(id).png"
    let cutoutURL = try NativeFileStore.cutoutFile(id, relativePath: selectedPath)
    let cutout: CIImage
    if FileManager.default.fileExists(atPath: cutoutURL.path),
      let image = CIImage(contentsOf: cutoutURL, options: [.applyOrientationProperty: true])
    {
      cutout = image
    } else {
      guard selectedPath == "cutouts/\(id).png" else {
        throw YidieError(code: "INVALID_RESOURCE")
      }
      // Older records have no saved cutout. Create it only after the user asks to edit.
      cutout = try makeCutout(id: id).image
      try writePNG(cutout, to: cutoutURL)
    }
    return try render(
      id: id, cutout: cutout, cutoutPath: selectedPath, revision: revision, effect: style,
      borderWidth: borderWidth, borderColor: borderColor, instanceCount: 1)
  }

  private static func makeCutout(id: String) throws -> (image: CIImage, instanceCount: Int) {
    let image = try loadSourceImage(id: id)
    let handler = VNImageRequestHandler(cgImage: image, orientation: .up)
    let personRequest = VNGeneratePersonInstanceMaskRequest()
    var personObservation: VNInstanceMaskObservation?
    do {
      try handler.perform([personRequest])
      personObservation = personRequest.results?.first
    } catch {
      try throwIfVisionUnavailableInSimulator(error)
      // Person segmentation can be unavailable for some inputs; try the generic
      // foreground request before treating an otherwise valid photo as a failure.
    }
    if let personObservation, !personObservation.allInstances.isEmpty {
      return try makeCutout(observation: personObservation, handler: handler)
    }

    let foregroundRequest = VNGenerateForegroundInstanceMaskRequest()
    do {
      try handler.perform([foregroundRequest])
    } catch {
      try throwIfVisionUnavailableInSimulator(error)
      throw error
    }
    guard let observation = foregroundRequest.results?.first, !observation.allInstances.isEmpty
    else {
      throw YidieError(code: "NO_FOREGROUND")
    }
    return try makeCutout(observation: observation, handler: handler)
  }

  private static func loadSourceImage(id: String) throws -> CGImage {
    let sourceURL = try NativeFileStore.file(id, kind: "original")
    guard let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
      let image = CGImageSourceCreateThumbnailAtIndex(
        source, 0,
        [
          kCGImageSourceCreateThumbnailFromImageAlways: true,
          kCGImageSourceCreateThumbnailWithTransform: true,
          kCGImageSourceThumbnailMaxPixelSize: 2048,
          kCGImageSourceShouldCacheImmediately: true,
        ] as CFDictionary)
    else { throw YidieError(code: "INVALID_IMAGE") }
    return image
  }

  private static func throwIfVisionUnavailableInSimulator(_ error: Error) throws {
    #if targetEnvironment(simulator)
      let failure = error as NSError
      if failure.domain == VNErrorDomain && failure.code == VNErrorCode.internalError.rawValue {
        throw YidieError(code: "SIMULATOR_VISION_UNAVAILABLE")
      }
    #endif
  }

  private static func makeCutout(
    observation: VNInstanceMaskObservation, handler: VNImageRequestHandler
  ) throws -> (image: CIImage, instanceCount: Int) {
    let buffer = try observation.generateMaskedImage(
      ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: true)
    // Vision's extent is rectangular; trim any transparent margin before sizing the sticker.
    let foreground = CIImage(cvPixelBuffer: buffer)
    let bounds = foreground.extent.integral
    guard let raster = context.createCGImage(foreground, from: bounds) else {
      throw YidieError(code: "PROCESSING_FAILED")
    }
    let cropped = try StickerAlphaCropper.crop(raster)
    return (CIImage(cgImage: cropped), observation.allInstances.count)
  }

  private static func render(
    id: String, cutout: CIImage, cutoutPath: String, revision: Int, effect: StickerEffect,
    borderWidth: Double, borderColor: String, instanceCount: Int
  ) throws -> [String: Any] {
    let subjectLength = Double(max(cutout.extent.width, cutout.extent.height))
    let outlineControl = effect == .outline ? borderWidth : max(borderWidth, 4)
    let radius = StickerGeometry.outlineRadius(
      controlValue: outlineControl, subjectLength: subjectLength)
    let rendered: (image: CIImage, extent: CGRect)
    do {
      rendered = try StickerRenderer.render(
        cutout: cutout,
        outlineRadius: radius,
        colorHex: borderColor,
        effect: effect
      )
    } catch StickerRendererError.invalidColor {
      throw YidieError(code: "INVALID_STICKER_STYLE")
    } catch {
      throw YidieError(code: "PROCESSING_FAILED")
    }
    guard let result = context.createCGImage(rendered.image, from: rendered.extent),
      let png = UIImage(cgImage: result).pngData()
    else {
      throw YidieError(code: "PROCESSING_FAILED")
    }
    let sticker = try NativeFileStore.file(id, kind: "sticker", styleRevision: revision)
    let thumbnail = try NativeFileStore.file(id, kind: "thumbnail", styleRevision: revision)
    let ratio = min(1, 256 / CGFloat(max(result.width, result.height)))
    let size = CGSize(width: CGFloat(result.width) * ratio, height: CGFloat(result.height) * ratio)
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = false
    let small = UIGraphicsImageRenderer(size: size, format: format).pngData { _ in
      UIImage(cgImage: result).draw(in: CGRect(origin: .zero, size: size))
    }
    do {
      try png.write(
        to: sticker, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
      try small.write(
        to: thumbnail, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    } catch {
      try? FileManager.default.removeItem(at: sticker)
      try? FileManager.default.removeItem(at: thumbnail)
      throw error
    }
    return [
      "stickerPath": "stickers/\(id)-v\(revision).png",
      "cutoutPath": cutoutPath,
      "thumbnailPath": "previews/\(id)-v\(revision).png",
      "width": result.width,
      "height": result.height,
      "instanceCount": instanceCount,
      "effect": effect.rawValue,
      "borderWidth": borderWidth,
      "borderColor": borderColor,
      "styleRevision": revision,
    ]
  }

  private static func writePNG(_ image: CIImage, to url: URL) throws {
    let bounds = image.extent.integral
    guard let cgImage = context.createCGImage(image, from: bounds),
      let png = UIImage(cgImage: cgImage).pngData()
    else {
      throw YidieError(code: "PROCESSING_FAILED")
    }
    try png.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
}
