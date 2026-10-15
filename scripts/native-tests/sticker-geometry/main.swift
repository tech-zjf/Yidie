import CoreGraphics
import CoreImage
import Foundation

func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
  guard condition() else {
    fputs("FAIL: \(message)\n", stderr)
    exit(1)
  }
}

expect(
  StickerGeometry.outlineRadius(controlValue: 0, subjectLength: 200) == 0,
  "zero outline control must stay disabled")
expect(
  StickerGeometry.outlineRadius(controlValue: 4, subjectLength: 200) == 4,
  "reference-size outline must preserve the selected design scale")
expect(
  StickerGeometry.outlineRadius(controlValue: 4, subjectLength: 2_000) == 40,
  "large cutouts must scale the radius with the subject")
expect(
  StickerGeometry.outlineRadius(controlValue: .infinity, subjectLength: 200) == 0,
  "non-finite style values must not enter image rendering")
expect(
  StickerGeometry.renderingPadding(subjectLength: 2_000) == 200,
  "large outlines need enough transparent room for the soft shadow")
expect(
  StickerGeometry.renderingPadding(subjectLength: 200) == 20,
  "all styles reserve the same maximum-effect canvas")
let lowResolutionVisibleFraction = 200.0 / Double(
  200 + StickerGeometry.renderingPadding(subjectLength: 200) * 2)
let highResolutionVisibleFraction = 2_000.0 / Double(
  2_000 + StickerGeometry.renderingPadding(subjectLength: 2_000) * 2)
expect(
  abs(lowResolutionVisibleFraction - highResolutionVisibleFraction) < 0.01,
  "the same cropped subject must occupy nearly the same canvas fraction at different resolutions")

let alphaWidth = 9
let alphaHeight = 11
var alphaPixels = [UInt8](repeating: 0, count: alphaWidth * alphaHeight * 4)
let alphaContext = alphaPixels.withUnsafeMutableBytes { storage in
  CGContext(
    data: storage.baseAddress,
    width: alphaWidth,
    height: alphaHeight,
    bitsPerComponent: 8,
    bytesPerRow: alphaWidth * 4,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      | CGBitmapInfo.byteOrder32Big.rawValue
  )
}
guard let alphaContext else { fatalError("FAIL: alpha crop fixture must create a bitmap") }
alphaContext.clear(CGRect(x: 0, y: 0, width: alphaWidth, height: alphaHeight))
alphaContext.setFillColor(CGColor(red: 0.8, green: 0.2, blue: 0.1, alpha: 1))
alphaContext.fill(CGRect(x: 1, y: 2, width: 3, height: 5))
guard let paddedCutout = alphaContext.makeImage() else {
  fatalError("FAIL: alpha crop fixture must create an image")
}
let tightCutout = try StickerAlphaCropper.crop(paddedCutout)
expect(
  tightCutout.width == 3 && tightCutout.height == 5,
  "transparent source margins must not shrink a lifted subject")
var tightPixels = [UInt8](repeating: 0, count: tightCutout.width * tightCutout.height * 4)
let tightContext = tightPixels.withUnsafeMutableBytes { storage in
  CGContext(
    data: storage.baseAddress,
    width: tightCutout.width,
    height: tightCutout.height,
    bitsPerComponent: 8,
    bytesPerRow: tightCutout.width * 4,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      | CGBitmapInfo.byteOrder32Big.rawValue
  )
}
guard let tightContext else { fatalError("FAIL: cropped cutout must create a bitmap") }
tightContext.draw(tightCutout, in: CGRect(x: 0, y: 0, width: tightCutout.width, height: tightCutout.height))
expect(
  stride(from: 3, to: tightPixels.count, by: 4).allSatisfy { tightPixels[$0] > 240 },
  "alpha cropping must return the visible subject pixels, not a same-sized transparent region")
alphaContext.clear(CGRect(x: 0, y: 0, width: alphaWidth, height: alphaHeight))
guard let emptyCutout = alphaContext.makeImage() else {
  fatalError("FAIL: empty alpha fixture must create an image")
}
do {
  _ = try StickerAlphaCropper.crop(emptyCutout)
  fatalError("FAIL: a fully transparent cutout must not be accepted")
} catch StickerAlphaCropError.noVisiblePixels {
  // Empty segmentation is treated as a failed extraction, never as a tiny sticker.
}

let sourceExtent = CGRect(x: 30, y: 20, width: 80, height: 160)
let subject = CIImage(color: CIColor(red: 0.8, green: 0.2, blue: 0.1, alpha: 1))
  .cropped(to: sourceExtent)
let context = CIContext(options: [.cacheIntermediates: false])
let renderProbe = CIImage(color: .red).cropped(to: CGRect(x: 0, y: 0, width: 1, height: 1))
guard context.createCGImage(renderProbe, from: renderProbe.extent) != nil else {
  if ProcessInfo.processInfo.environment["CI"] == "true" {
    fatalError("FAIL: CI must render Core Image pixels; this is a required sticker acceptance check")
  }
  print("SKIP Core Image pixel assertions: this host cannot render even a 1×1 CIImage")
  exit(0)
}
let outlined = try StickerRenderer.render(
  cutout: subject, outlineRadius: 6, colorHex: "#FFFFFF", effect: .outline)
guard
  let image = context.createCGImage(
    outlined.image, from: outlined.extent, format: .RGBA8,
    colorSpace: CGColorSpaceCreateDeviceRGB()),
  let pixels = image.dataProvider?.data as Data?
else {
  fatalError("FAIL: rendered sticker must produce a pixel buffer")
}

func pixel(x: Int, y: Int) -> (red: UInt8, green: UInt8, blue: UInt8, alpha: UInt8) {
  let offset = y * image.bytesPerRow + x * 4
  return (pixels[offset], pixels[offset + 1], pixels[offset + 2], pixels[offset + 3])
}

let padding = StickerGeometry.renderingPadding(subjectLength: 160)
let subjectPixel = pixel(x: padding + 40, y: padding + 80)
let outlinePixel = pixel(x: padding - 1, y: padding + 80)
let shadowPixel = pixel(x: padding - 10, y: padding + 80)
expect(
  subjectPixel.red > subjectPixel.green && subjectPixel.alpha > 240,
  "rendering must retain the source subject color")
expect(
  outlinePixel.red > 230 && outlinePixel.green > 230 && outlinePixel.blue > 230,
  "white outline must be clearly composited outside the subject")
expect(
  shadowPixel.alpha > 0 && shadowPixel.alpha < 255,
  "outline style must include a soft translucent shadow")

let original = try StickerRenderer.render(
  cutout: subject, outlineRadius: 0, colorHex: "#FFFFFF", effect: .original)
let noOutline = try StickerRenderer.render(
  cutout: subject, outlineRadius: 0, colorHex: "#FFFFFF", effect: .outline)
expect(
  original.extent == outlined.extent,
  "original and outlined styles must preserve the same canvas")
expect(
  noOutline.extent == original.extent,
  "a zero-width outline must keep the unstyled canvas")
guard
  let originalImage = context.createCGImage(
    original.image, from: original.extent, format: .RGBA8,
    colorSpace: CGColorSpaceCreateDeviceRGB()),
  let noOutlineImage = context.createCGImage(
    noOutline.image, from: noOutline.extent, format: .RGBA8,
    colorSpace: CGColorSpaceCreateDeviceRGB()),
  let originalPixels = originalImage.dataProvider?.data as Data?,
  let noOutlinePixels = noOutlineImage.dataProvider?.data as Data?
else {
  fatalError("FAIL: zero-width outline comparison must render to pixels")
}
expect(
  noOutlinePixels == originalPixels,
  "a zero-width outline must not leave a border or shadow")

for width in [2.0, 4.0, 6.0, 8.0] {
  let radius = StickerGeometry.outlineRadius(controlValue: width, subjectLength: 160)
  let variant = try StickerRenderer.render(
    cutout: subject, outlineRadius: radius, colorHex: "#FFFFFF", effect: .outline)
  expect(
    variant.extent == original.extent,
    "outline width \(width) must not change the visible subject scale")
}

do {
  _ = try StickerRenderer.render(
    cutout: subject, outlineRadius: 6, colorHex: "#FF0000", effect: .outline)
  fatalError("FAIL: unknown outline colors must be rejected")
} catch StickerRendererError.invalidColor {
  // The renderer only accepts the documented palette.
}

for effect in [StickerEffect.comic, .dimensional, .shimmer] {
  let variant = try StickerRenderer.render(
    cutout: subject, outlineRadius: 6, colorHex: "#FFFFFF", effect: effect)
  expect(
    variant.extent == original.extent,
    "\(effect.rawValue) must preserve a stable sticker canvas")
  guard
    let image = context.createCGImage(
      variant.image, from: variant.extent, format: .RGBA8,
      colorSpace: CGColorSpaceCreateDeviceRGB()),
    let variantPixels = image.dataProvider?.data as Data?
  else {
    fatalError("FAIL: \(effect.rawValue) output must render to pixels")
  }
  expect(
    variantPixels.contains(where: { $0 > 0 }),
    "\(effect.rawValue) effect must produce visible output")
  expect(
    variantPixels != pixels,
    "\(effect.rawValue) effect must change rendered pixels")
}

print("PASS sticker geometry and Core Image pixel checks")
