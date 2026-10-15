import Foundation

/// Converts the editor's design-scale value into image pixels so an outline
/// remains visible after the cutout is displayed at calendar or sticker size.
enum StickerGeometry {
  static let referenceSubjectLength = 200.0

  static func outlineRadius(controlValue: Double, subjectLength: Double) -> Double {
    guard controlValue > 0, subjectLength > 0,
          controlValue.isFinite, subjectLength.isFinite else { return 0 }
    return controlValue * subjectLength / referenceSubjectLength
  }

  static func renderingPadding(outlineRadius: Double) -> Int {
    guard outlineRadius > 0, outlineRadius.isFinite else { return 12 }
    // Leave room for the outline, its soft shadow, and antialiasing.
    return max(12, Int(ceil(outlineRadius * 2.4)) + 8)
  }
}
