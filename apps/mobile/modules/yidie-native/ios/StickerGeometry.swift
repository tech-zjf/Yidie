import Foundation

/// Converts the editor's design-scale value into image pixels so an outline
/// remains visible after the cutout is displayed at calendar or sticker size.
enum StickerGeometry {
  static let referenceSubjectLength = 200.0
  static let maximumOutlineControlValue = 8.0

  static func outlineRadius(controlValue: Double, subjectLength: Double) -> Double {
    guard controlValue > 0, subjectLength > 0,
          controlValue.isFinite, subjectLength.isFinite else { return 0 }
    return controlValue * subjectLength / referenceSubjectLength
  }

  static func renderingPadding(subjectLength: Double) -> Int {
    guard subjectLength > 0, subjectLength.isFinite else { return 12 }
    let maximumRadius = outlineRadius(
      controlValue: maximumOutlineControlValue,
      subjectLength: subjectLength
    )
    // Keep the transparent canvas identical for every style and reserve room
    // for the widest outline, its shadow, and antialiasing.
    return max(12, Int(ceil(maximumRadius * 2.4)) + 8)
  }
}
