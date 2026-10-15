import CoreImage
import Foundation

enum StickerEffect: String {
  case original
  case outline
  case comic
  case dimensional
  case shimmer
}

enum StickerRendererError: Error {
  case invalidColor
  case unavailableEffect
}

/// Composes offline sticker looks from a saved transparent cutout.
/// These effects intentionally use public Core Image filters; they are visual
/// interpretations and do not reproduce Photos' private rendering pipeline.
enum StickerRenderer {
  private static let colors: [String: CIColor] = [
    "#FFFFFF": CIColor(red: 1, green: 1, blue: 1, alpha: 1),
    "#242424": CIColor(red: 36.0 / 255.0, green: 36.0 / 255.0, blue: 36.0 / 255.0, alpha: 1),
    "#0786A8": CIColor(red: 7.0 / 255.0, green: 134.0 / 255.0, blue: 168.0 / 255.0, alpha: 1),
  ]

  static func render(
    cutout: CIImage,
    outlineRadius: Double,
    colorHex: String,
    effect: StickerEffect
  ) throws -> (image: CIImage, extent: CGRect) {
    let source = cutout.extent.integral
    let padding = CGFloat(StickerGeometry.renderingPadding(outlineRadius: outlineRadius))
    let canvas = CGRect(x: 0, y: 0, width: source.width + padding * 2, height: source.height + padding * 2).integral
    let subject = cutout
      .transformed(by: CGAffineTransform(translationX: padding - source.minX, y: padding - source.minY))
      .cropped(to: canvas)
    guard effect != .outline || outlineRadius == 0 || colors[colorHex] != nil else {
      throw StickerRendererError.invalidColor
    }

    let alphaMask = subject.applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
      "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
      "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
      "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
    ]).cropped(to: canvas)
    let clear = CIImage(color: .clear).cropped(to: canvas)
    let visibleSubject: CIImage

    switch effect {
    case .original, .outline:
      visibleSubject = subject
    case .comic:
      guard let comic = CIFilter(name: "CIComicEffect") else { throw StickerRendererError.unavailableEffect }
      comic.setValue(subject, forKey: kCIInputImageKey)
      guard let output = comic.outputImage else { throw StickerRendererError.unavailableEffect }
      visibleSubject = output.cropped(to: canvas).applyingFilter("CIBlendWithAlphaMask", parameters: [
        kCIInputBackgroundImageKey: clear,
        kCIInputMaskImageKey: alphaMask,
      ]).cropped(to: canvas)
    case .dimensional:
      visibleSubject = subject
    case .shimmer:
      guard let bloom = CIFilter(name: "CIBloom") else { throw StickerRendererError.unavailableEffect }
      bloom.setValue(subject, forKey: kCIInputImageKey)
      bloom.setValue(max(2, outlineRadius * 0.9), forKey: kCIInputRadiusKey)
      bloom.setValue(0.7, forKey: kCIInputIntensityKey)
      guard let output = bloom.outputImage else { throw StickerRendererError.unavailableEffect }
      visibleSubject = output.cropped(to: canvas).applyingFilter("CIBlendWithAlphaMask", parameters: [
        kCIInputBackgroundImageKey: clear,
        kCIInputMaskImageKey: alphaMask,
      ]).cropped(to: canvas)
    }

    if effect == .original { return (subject, canvas) }
    if effect == .outline && outlineRadius <= 0 { return (subject, canvas) }

    let radius = CGFloat(outlineRadius)
    let expandedAlpha = alphaMask
      .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: max(1, radius)])
      .cropped(to: canvas)
    let outlineColor = effect == .outline ? colors[colorHex] : CIColor.white
    guard let outlineColor else { throw StickerRendererError.invalidColor }
    let outline = tint(expandedAlpha, color: outlineColor, canvas: canvas)

    var backdrop = shadow(for: expandedAlpha, radius: radius, canvas: canvas)
    if effect == .dimensional {
      // Layer several offset silhouettes to create a subtle extruded edge.
      let depthColor = CIColor(red: 0.17, green: 0.2, blue: 0.23, alpha: 0.72)
      for step in stride(from: 5, through: 1, by: -1) {
        let offset = CGFloat(step) * max(1, radius * 0.22)
        let depth = tint(alphaMask.transformed(by: CGAffineTransform(translationX: offset * 0.55, y: -offset)), color: depthColor, canvas: canvas)
        backdrop = depth.composited(over: backdrop)
      }
    }
    if effect == .shimmer {
      let halo = expandedAlpha
        .applyingFilter("CIGaussianBlur", parameters: ["inputRadius": max(2, radius * 0.8)])
        .cropped(to: canvas)
      let glow = tint(halo, color: CIColor(red: 0.63, green: 0.9, blue: 1, alpha: 0.44), canvas: canvas)
      backdrop = glow.composited(over: backdrop)
    }
    return (visibleSubject.composited(over: outline.composited(over: backdrop)), canvas)
  }

  private static func tint(_ mask: CIImage, color: CIColor, canvas: CGRect) -> CIImage {
    CIImage(color: color).cropped(to: canvas).applyingFilter("CIBlendWithAlphaMask", parameters: [
      kCIInputBackgroundImageKey: CIImage(color: .clear).cropped(to: canvas),
      kCIInputMaskImageKey: mask.cropped(to: canvas),
    ]).cropped(to: canvas)
  }

  private static func shadow(for mask: CIImage, radius: CGFloat, canvas: CGRect) -> CIImage {
    let clear = CIImage(color: .clear).cropped(to: canvas)
    let shadowMask = mask
      .applyingFilter("CIGaussianBlur", parameters: ["inputRadius": max(1, radius * 0.35)])
      .transformed(by: CGAffineTransform(translationX: 0, y: -radius * 0.3))
      .cropped(to: canvas)
    return tint(shadowMask, color: CIColor(red: 0, green: 0, blue: 0, alpha: 0.28), canvas: canvas)
      .composited(over: clear)
  }
}
