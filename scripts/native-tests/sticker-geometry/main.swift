import Foundation
import CoreImage
import CoreGraphics

func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
  guard condition() else {
    fputs("FAIL: \(message)\n", stderr)
    exit(1)
  }
}

expect(StickerGeometry.outlineRadius(controlValue: 0, subjectLength: 200) == 0,
       "zero outline control must stay disabled")
expect(StickerGeometry.outlineRadius(controlValue: 4, subjectLength: 200) == 4,
       "reference-size outline must preserve the selected design scale")
expect(StickerGeometry.outlineRadius(controlValue: 4, subjectLength: 2_000) == 40,
       "large cutouts must scale the radius with the subject")
expect(StickerGeometry.outlineRadius(controlValue: .infinity, subjectLength: 200) == 0,
       "non-finite style values must not enter image rendering")
expect(StickerGeometry.renderingPadding(outlineRadius: 40) >= 104,
       "large outlines need enough transparent room for the soft shadow")
expect(StickerGeometry.renderingPadding(outlineRadius: 0) == 12,
       "unstyled cutouts keep a small antialiasing margin")

let sourceExtent = CGRect(x: 30, y: 20, width: 80, height: 160)
let subject = CIImage(color: CIColor(red: 0.8, green: 0.2, blue: 0.1, alpha: 1)).cropped(to: sourceExtent)
let rendered = try StickerRenderer.render(cutout: subject, outlineRadius: 6, colorHex: "#FFFFFF", effect: .outline)
expect(rendered.extent.width > sourceExtent.width && rendered.extent.height > sourceExtent.height,
       "styled output must reserve room around the subject")
let context = CIContext(options: [.cacheIntermediates: false])
guard let image = context.createCGImage(rendered.image, from: rendered.extent,
                                        format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB()) else {
  fatalError("FAIL: rendered image must produce a CGImage")
}
guard let pixels = image.dataProvider?.data as Data? else {
  fatalError("FAIL: rendered CGImage has no data provider")
}
func pixel(x: Int, y: Int) -> (red: UInt8, green: UInt8, blue: UInt8, alpha: UInt8) {
  let offset = y * image.bytesPerRow + x * 4
  return (pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3])
}
let padding = StickerGeometry.renderingPadding(outlineRadius: 6)
let subjectPixel = pixel(x: padding + 40, y: padding + 80)
let outlinePixel = pixel(x: padding - 1, y: padding + 80)
let shadowPixel = pixel(x: padding - 10, y: padding + 80)
expect(subjectPixel.red > subjectPixel.green && subjectPixel.alpha > 240,
       "rendering must retain the source subject color")
expect(outlinePixel.red > 230 && outlinePixel.green > 230 && outlinePixel.blue > 230,
       "white outline must be clearly composited outside the subject")
expect(shadowPixel.alpha > 0 && shadowPixel.alpha < 255,
       "outline style must include a soft translucent shadow")
let unstyled = try StickerRenderer.render(cutout: subject, outlineRadius: 0, colorHex: "#FFFFFF", effect: .original)
expect(unstyled.extent.width < rendered.extent.width,
       "original style must not expand to the outlined bounds")
let noOutline = try StickerRenderer.render(cutout: subject, outlineRadius: 0, colorHex: "#FFFFFF", effect: .outline)
expect(noOutline.extent == unstyled.extent,
       "a zero-width outline must keep the unstyled canvas")
guard let unstyledImage = context.createCGImage(unstyled.image, from: unstyled.extent,
                                                format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB()),
      let noOutlineImage = context.createCGImage(noOutline.image, from: noOutline.extent,
                                                  format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB()),
      let unstyledPixels = unstyledImage.dataProvider?.data as Data?,
      let noOutlinePixels = noOutlineImage.dataProvider?.data as Data? else {
  fatalError("FAIL: zero-width outline comparison must render to pixels")
}
expect(noOutlinePixels == unstyledPixels,
       "a zero-width outline must not leave a one-pixel border or shadow")
do {
  _ = try StickerRenderer.render(cutout: subject, outlineRadius: 6, colorHex: "#FF0000", effect: .outline)
  fatalError("FAIL: unknown outline colors must be rejected")
} catch StickerRendererError.invalidColor {
  // Expected: the renderer only accepts the documented palette.
}

for effect in [StickerEffect.comic, .dimensional, .shimmer] {
  let variant = try StickerRenderer.render(cutout: subject, outlineRadius: 6, colorHex: "#FFFFFF", effect: effect)
  expect(variant.extent.width == rendered.extent.width && variant.extent.height == rendered.extent.height,
         "\(effect.rawValue) effect must preserve a stable sticker canvas")
  guard let image = context.createCGImage(variant.image, from: variant.extent,
                                          format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB()),
        let variantPixels = image.dataProvider?.data as Data? else {
    fatalError("FAIL: \(effect.rawValue) output must render to pixels")
  }
  expect(variantPixels.contains(where: { $0 > 0 }), "\(effect.rawValue) effect must produce visible output")
  expect(variantPixels != pixels, "\(effect.rawValue) must change rendered pixels")
}

print("PASS sticker geometry and local outline rendering")
