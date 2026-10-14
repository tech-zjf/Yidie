import Foundation
import ImageIO
import UIKit

private struct CalendarSticker: Decodable {
  let id: String
  let styleRevision: Int
  let kind: String
  let width: CGFloat
  let height: CGFloat
  let x: CGFloat
  let y: CGFloat
  let rotation: CGFloat
}

private struct CalendarBadge: Decodable {
  let top: CGFloat
  let right: CGFloat
}

private struct CalendarCell: Decodable {
  let date: String
  let day: Int
  let count: Int
  let badge: CalendarBadge?
  let stickers: [CalendarSticker]
}

private struct CalendarExportRequest: Decodable {
  let year: Int
  let month: Int
  let screenWidth: CGFloat
  let cellWidth: CGFloat
  let cellHeight: CGFloat
  let today: String
  let includeSignature: Bool?
  let monthTitle: String
  let weekdays: [String]
  let cells: [CalendarCell?]
}

/// Renders the same cell and sticker placements used by MonthGrid to a shareable PNG.
enum CalendarExporter {
  static func render(_ payload: [String: Any]) throws -> URL {
    let data = try JSONSerialization.data(withJSONObject: payload)
    let request = try JSONDecoder().decode(CalendarExportRequest.self, from: data)
    guard (1...12).contains(request.month), request.year > 0,
          request.screenWidth.isFinite, (280...1200).contains(request.screenWidth),
          request.cellWidth.isFinite, request.cellWidth > 0,
          request.cellHeight.isFinite, request.cellHeight >= 44,
          request.cells.count == 35 || request.cells.count == 42,
          request.weekdays.count == 7,
          request.cells.compactMap({ $0 }).allSatisfy({
            $0.count >= 0 && (1...31).contains($0.day) && $0.stickers.count <= 3
          }) else {
      throw YidieError(code: "INVALID_EXPORT")
    }

    let width = request.screenWidth
    let sideInset = max(0, (width - request.cellWidth * 7) / 2)
    let calendarTop: CGFloat = 142
    let calendarBottom = calendarTop + CGFloat(request.cells.count / 7) * request.cellHeight
    let size = CGSize(width: width, height: calendarBottom + 30)
    for (index, optionalCell) in request.cells.enumerated() {
      guard let cell = optionalCell else { continue }
      let row = index / 7
      let column = index % 7
      let origin = CGPoint(x: sideInset + CGFloat(column) * request.cellWidth,
                           y: calendarTop + CGFloat(row) * request.cellHeight)
      for sticker in cell.stickers {
        let file = try resourceURL(sticker, origin: origin,
                                   cellWidth: request.cellWidth,
                                   cellHeight: request.cellHeight)
        guard let source = CGImageSourceCreateWithURL(file as CFURL, nil),
              CGImageSourceGetCount(source) > 0 else {
          throw YidieError(code: "EXPORT_IMAGE_MISSING")
        }
      }
    }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 3
    format.opaque = true
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    var drawError: String?
    let image = renderer.image { context in
      UIColor.white.setFill()
      context.fill(CGRect(origin: .zero, size: size))
      draw(request.monthTitle, font: UIFont(name: "YidieDisplayItalic", size: 53) ?? .systemFont(ofSize: 53), color: UIColor(red: 18 / 255, green: 18 / 255, blue: 18 / 255, alpha: 1), centeredAt: CGPoint(x: width / 2, y: 22), width: width - 36)

      let weekdayFont = UIFont(name: "AvenirNext-Regular", size: 14) ?? .systemFont(ofSize: 14)
      for (column, day) in request.weekdays.enumerated() {
        draw(day, font: weekdayFont, color: .gray,
             centeredAt: CGPoint(x: sideInset + (CGFloat(column) + 0.5) * request.cellWidth, y: 105),
             width: request.cellWidth)
      }

      for (index, cell) in request.cells.enumerated() {
        guard let cell else { continue }
        let row = index / 7
        let column = index % 7
        let origin = CGPoint(x: sideInset + CGFloat(column) * request.cellWidth,
                             y: calendarTop + CGFloat(row) * request.cellHeight)
        if cell.stickers.isEmpty {
          let color: UIColor = cell.date == request.today
            ? UIColor(red: 8 / 255, green: 127 / 255, blue: 171 / 255, alpha: 1)
            : (cell.date > request.today ? UIColor(red: 167 / 255, green: 167 / 255, blue: 167 / 255, alpha: 1) : .black)
          let dateFont = UIFont(name: "YidieDisplay", size: 28) ?? .systemFont(ofSize: 28)
          draw(String(cell.day), font: dateFont, color: color,
               centeredAt: CGPoint(x: origin.x + request.cellWidth / 2, y: origin.y + (request.cellHeight - dateFont.lineHeight) / 2),
               width: request.cellWidth)
        } else {
          for sticker in cell.stickers.reversed() {
            guard drawError == nil,
                  let file = try? resourceURL(sticker, origin: origin,
                                              cellWidth: request.cellWidth,
                                              cellHeight: request.cellHeight) else { continue }
            let error = autoreleasepool { () -> String? in
              guard let image = Self.decode(file) else { return "EXPORT_IMAGE_MISSING" }
              Self.draw(sticker, image: image, in: origin)
              return nil
            }
            if let error { drawError = error }
          }
          if let badge = cell.badge, cell.count > 1 {
            let badgeRect = CGRect(x: origin.x + request.cellWidth - badge.right - 18,
                                   y: origin.y + badge.top, width: 18, height: 18)
            UIColor.white.setFill()
            context.cgContext.setStrokeColor(UIColor.lightGray.cgColor)
            context.cgContext.setLineWidth(0.75)
            context.cgContext.fillEllipse(in: badgeRect)
            context.cgContext.strokeEllipse(in: badgeRect)
            draw(cell.count > 99 ? "99+" : String(cell.count),
                 font: UIFont(name: "YidieDisplay", size: 10) ?? .systemFont(ofSize: 10),
                 color: .black, centeredAt: CGPoint(x: badgeRect.midX, y: badgeRect.minY + 2), width: badgeRect.width)
          }
        }
      }
      if request.includeSignature == true {
        let signatureFont = UIFont(name: "AvenirNext-Medium", size: 9) ?? .systemFont(ofSize: 9, weight: .medium)
        draw("Yidie", font: signatureFont,
             color: UIColor(red: 145 / 255, green: 145 / 255, blue: 145 / 255, alpha: 1),
             centeredAt: CGPoint(x: width - sideInset - 18, y: calendarBottom + 6),
             width: 64)
      }
    }
    if let drawError { throw YidieError(code: drawError) }
    guard let png = image.pngData() else { throw YidieError(code: "EXPORT_FAILED") }
    let target = FileManager.default.temporaryDirectory.appendingPathComponent("Yidie-\(UUID().uuidString).png")
    try png.write(to: target, options: .atomic)
    return target
  }

  private static func resourceURL(_ sticker: CalendarSticker, origin: CGPoint, cellWidth: CGFloat, cellHeight: CGFloat) throws -> URL {
    guard UUID(uuidString: sticker.id) != nil,
          sticker.styleRevision >= 0,
          sticker.width.isFinite, sticker.height.isFinite,
          sticker.width > 0, sticker.height > 0,
          sticker.x.isFinite, sticker.y.isFinite,
          sticker.rotation.isFinite, abs(sticker.rotation) <= 20 else {
      throw YidieError(code: "INVALID_EXPORT")
    }
    let kind = sticker.kind == "sticker" ? "sticker" : (sticker.kind == "photoPreview" ? "photoPreview" : "")
    guard !kind.isEmpty else { throw YidieError(code: "INVALID_EXPORT") }
    let file = try NativeFileStore.file(sticker.id, kind: kind, styleRevision: kind == "sticker" ? sticker.styleRevision : nil)
    let values = try file.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey])
    guard values.isRegularFile == true, values.isSymbolicLink != true,
          let size = values.fileSize, size > 0, size <= 100 * 1024 * 1024 else {
      throw YidieError(code: "EXPORT_IMAGE_MISSING")
    }
    let frame = CGRect(x: origin.x + sticker.x, y: origin.y + sticker.y, width: sticker.width, height: sticker.height)
    guard frame.minX >= origin.x - 2, frame.minY >= origin.y - 4,
          frame.maxX <= origin.x + cellWidth + 4, frame.maxY <= origin.y + cellHeight + 4 else {
      throw YidieError(code: "INVALID_EXPORT")
    }
    return file
  }

  private static func decode(_ file: URL) -> UIImage? {
    guard let source = CGImageSourceCreateWithURL(file as CFURL, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 768,
            kCGImageSourceShouldCacheImmediately: true,
          ] as CFDictionary) else { return nil }
    return UIImage(cgImage: image)
  }

  private static func draw(_ sticker: CalendarSticker, image: UIImage, in origin: CGPoint) {
    let frame = CGRect(x: origin.x + sticker.x, y: origin.y + sticker.y, width: sticker.width, height: sticker.height)
    let kind = sticker.kind
    guard let context = UIGraphicsGetCurrentContext() else { return }
    context.saveGState()
    context.translateBy(x: frame.midX, y: frame.midY)
    context.rotate(by: sticker.rotation * .pi / 180)
    let localFrame = CGRect(x: -frame.width / 2, y: -frame.height / 2, width: frame.width, height: frame.height)
    if kind == "photoPreview" {
      context.addPath(UIBezierPath(roundedRect: localFrame, cornerRadius: 8).cgPath)
      context.clip()
      UIColor(red: 245 / 255, green: 245 / 255, blue: 243 / 255, alpha: 1).setFill()
      context.fill(localFrame)
      image.draw(in: aspectFit(image.size, into: localFrame))
    } else {
      image.draw(in: localFrame)
    }
    context.restoreGState()
  }

  private static func aspectFit(_ source: CGSize, into rect: CGRect) -> CGRect {
    guard source.width > 0, source.height > 0 else { return rect }
    let scale = min(rect.width / source.width, rect.height / source.height)
    let size = CGSize(width: source.width * scale, height: source.height * scale)
    return CGRect(x: rect.midX - size.width / 2, y: rect.midY - size.height / 2, width: size.width, height: size.height)
  }

  private static func draw(_ text: String, font: UIFont, color: UIColor, centeredAt point: CGPoint, width: CGFloat) {
    let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color]
    let size = (text as NSString).size(withAttributes: attributes)
    (text as NSString).draw(at: CGPoint(x: point.x - min(width, size.width) / 2, y: point.y), withAttributes: attributes)
  }
}
