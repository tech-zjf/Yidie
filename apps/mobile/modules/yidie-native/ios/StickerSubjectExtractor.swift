import CoreGraphics
import Foundation
import UIKit
import VisionKit

/// Uses Apple's public subject-lifting API before falling back to Vision's mask request.
/// Photos' own effect renderer is private; this only shares the system subject extraction.
@MainActor
enum StickerSubjectExtractor {
  private static let analyzer = ImageAnalyzer()

  static func cutout(from image: CGImage) async throws -> (image: CGImage, instanceCount: Int) {
    guard ImageAnalyzer.isSupported else { throw YidieError(code: "NO_FOREGROUND") }
    // VisionKit exposes subject lifting through visualLookUp analysis; the interaction below
    // enables only imageSubject, so the app doesn't present Visual Look Up controls.
    let analysis = try await analyzer.analyze(
      image,
      orientation: .up,
      configuration: ImageAnalyzer.Configuration([.visualLookUp])
    )
    let interaction = ImageAnalysisInteraction()
    interaction.preferredInteractionTypes = [.imageSubject]
    interaction.analysis = analysis
    let subjects = await interaction.subjects
    guard !subjects.isEmpty else {
      throw YidieError(code: "NO_FOREGROUND")
    }
    let lifted = try await interaction.image(for: subjects)
    guard let cgImage = lifted.cgImage else { throw YidieError(code: "NO_FOREGROUND") }
    return (try StickerAlphaCropper.crop(cgImage), subjects.count)
  }

  static func individualCutouts(from image: CGImage) async throws -> [CGImage] {
    guard ImageAnalyzer.isSupported else { throw YidieError(code: "NO_FOREGROUND") }
    let analysis = try await analyzer.analyze(
      image,
      orientation: .up,
      configuration: ImageAnalyzer.Configuration([.visualLookUp])
    )
    let interaction = ImageAnalysisInteraction()
    interaction.preferredInteractionTypes = [.imageSubject]
    interaction.analysis = analysis
    let subjects = await interaction.subjects
    guard !subjects.isEmpty else { throw YidieError(code: "NO_FOREGROUND") }
    let ordered = subjects.sorted {
      if $0.bounds.minY != $1.bounds.minY { return $0.bounds.minY < $1.bounds.minY }
      return $0.bounds.minX < $1.bounds.minX
    }
    var cutouts: [CGImage] = []
    cutouts.reserveCapacity(ordered.count)
    for subject in ordered {
      let lifted = try await interaction.image(for: [subject])
      guard let image = lifted.cgImage else { throw YidieError(code: "NO_FOREGROUND") }
      cutouts.append(try StickerAlphaCropper.crop(image))
    }
    return cutouts
  }
}
