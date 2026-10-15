import CoreImage
import Foundation

enum StickerRendererError: Error {
  case invalidColor
}

/// Draws a scalable sticker outline and a restrained shadow around a saved alpha cutout.
/// Kept independent of Vision/UIKit so the image composition can be tested on the host Mac.
enum StickerRenderer {
  private static let colors: [String: CIColor] = [
    "#FFFFFF": CIColor(red: 1, green: 1, blue: 1, alpha: 1),
    "#242424": CIColor(red: 36.0 / 255.0, green: 36.0 / 255.0, blue: 36.0 / 255.0, alpha: 1),
    "#0786A8": CIColor(red: 7.0 / 255.0, green: 134.0 / 255.0, blue: 168.0 / 255.0, alpha: 1),
  ]

  static func render(cutout: CIImage, outlineRadius: Double, colorHex: String) throws -> (image: CIImage, extent: CGRect) {
    let source = cutout.extent.integral
    let padding = CGFloat(StickerGeometry.renderingPadding(outlineRadius: outlineRadius))
    let canvas = CGRect(x: 0, y: 0, width: source.width + padding * 2, height: source.height + padding * 2).integral
    let subject = cutout
      .transformed(by: CGAffineTransform(translationX: padding - source.minX, y: padding - source.minY))
      .cropped(to: canvas)
    guard outlineRadius > 0 else { return (subject, canvas) }
    guard let color = colors[colorHex] else { throw StickerRendererError.invalidColor }

    let alphaMask = subject.applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
      "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
      "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
      "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
    ]).cropped(to: canvas)
    let expandedAlpha = alphaMask
      .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: outlineRadius])
      .cropped(to: canvas)
    let clear = CIImage(color: .clear).cropped(to: canvas)
    let outline = CIImage(color: color).cropped(to: canvas).applyingFilter("CIBlendWithAlphaMask", parameters: [
      kCIInputBackgroundImageKey: clear,
      kCIInputMaskImageKey: expandedAlpha,
    ]).cropped(to: canvas)
    let shadowMask = expandedAlpha
      .applyingFilter("CIGaussianBlur", parameters: ["inputRadius": max(1, outlineRadius * 0.35)])
      .transformed(by: CGAffineTransform(translationX: 0, y: -outlineRadius * 0.3))
      .cropped(to: canvas)
    let shadow = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0.28))
      .cropped(to: canvas)
      .applyingFilter("CIBlendWithAlphaMask", parameters: [
        kCIInputBackgroundImageKey: clear,
        kCIInputMaskImageKey: shadowMask,
      ]).cropped(to: canvas)
    return (subject.composited(over: outline.composited(over: shadow)), canvas)
  }
}
