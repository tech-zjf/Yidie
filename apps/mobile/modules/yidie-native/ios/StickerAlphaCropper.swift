import CoreGraphics
import Foundation

enum StickerAlphaCropError: Error {
  case unableToRasterize
  case noVisiblePixels
}

/// Removes transparent photo margins before sizing a cutout as a calendar sticker.
enum StickerAlphaCropper {
  static func crop(_ image: CGImage, alphaThreshold: UInt8 = 8) throws -> CGImage {
    let width = image.width
    let height = image.height
    let bytesPerRow = width * 4
    var pixels = [UInt8](repeating: 0, count: bytesPerRow * height)
    let rendered = pixels.withUnsafeMutableBytes { storage -> Bool in
      guard
        let context = CGContext(
          data: storage.baseAddress,
          width: width,
          height: height,
          bitsPerComponent: 8,
          bytesPerRow: bytesPerRow,
          space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
            | CGBitmapInfo.byteOrder32Big.rawValue
        )
      else { return false }
      context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    guard rendered else { throw StickerAlphaCropError.unableToRasterize }

    var minX = width
    var minY = height
    var maxX = -1
    var maxY = -1
    for y in 0..<height {
      for x in 0..<width where pixels[y * bytesPerRow + x * 4 + 3] > alphaThreshold {
        minX = min(minX, x)
        minY = min(minY, y)
        maxX = max(maxX, x)
        maxY = max(maxY, y)
      }
    }
    guard maxX >= minX, maxY >= minY,
      let cropped = image.cropping(
        to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1))
    else { throw StickerAlphaCropError.noVisiblePixels }
    return cropped
  }
}
