import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count == 2 else {
  fputs("Usage: assert_simulator_launch.swift <simulator-screenshot.png>\n", stderr)
  exit(2)
}

let screenshotURL = URL(fileURLWithPath: CommandLine.arguments[1])
guard let image = NSImage(contentsOf: screenshotURL),
  let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
  fputs("Could not read the Simulator screenshot.\n", stderr)
  exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["en-US"]

do {
  try VNImageRequestHandler(cgImage: cgImage).perform([request])
} catch {
  fputs("Could not inspect the Simulator screenshot: \(error)\n", stderr)
  exit(1)
}

let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
guard lines.contains(where: { $0.localizedCaseInsensitiveContains("Yidie") }) else {
  let recognizedText = lines.joined(separator: " | ")
  fputs(
    "The launched app did not show its Yidie wordmark. OCR found: \(recognizedText)\n", stderr)
  exit(1)
}

print("PASS current Yidie app launched and rendered its wordmark in the iPhone Simulator.")
