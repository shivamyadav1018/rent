import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let base = root.appendingPathComponent("play-store-assets/blue-showcase")
let output = base.appendingPathComponent("upload-ready")

func color(_ hex: String, _ alpha: CGFloat = 1) -> NSColor {
    let value = UInt64(hex.replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0
    return NSColor(red: CGFloat((value >> 16) & 255) / 255,
                   green: CGFloat((value >> 8) & 255) / 255,
                   blue: CGFloat(value & 255) / 255,
                   alpha: alpha)
}

let ink = color("151B2A")
let muted = color("454653")
let primary = color("263BAA")
let primaryDark = color("001F94")
let mint = color("93F5D4")
let offWhite = color("FAF8FF")
let border = color("E9EDFF")

func rounded(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, width: CGFloat = 1) {
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    fill.setFill(); path.fill()
    if let stroke { stroke.setStroke(); path.lineWidth = width; path.stroke() }
}

func text(_ value: String, rect: NSRect, size: CGFloat, weight: NSFont.Weight = .regular,
          color: NSColor = ink, alignment: NSTextAlignment = .left) {
    let style = NSMutableParagraphStyle(); style.alignment = alignment; style.lineSpacing = -3
    NSString(string: value).draw(in: rect, withAttributes: [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: color,
        .paragraphStyle: style
    ])
}

func imageCanvas(width: Int, height: Int, draw: () -> Void) -> NSImage {
    let image = NSImage(size: NSSize(width: width, height: height))
    image.lockFocusFlipped(true)
    NSGraphicsContext.current?.imageInterpolation = .high
    draw()
    image.unlockFocus()
    return image
}

func save(_ image: NSImage, to url: URL) throws {
    guard let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff),
          let rgb = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: bitmap.pixelsWide, pixelsHigh: bitmap.pixelsHigh, bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: bitmap.pixelsWide * 3, bitsPerPixel: 24),
          let src = bitmap.bitmapData, let dst = rgb.bitmapData else { fatalError("Cannot export PNG") }
    precondition(bitmap.bitsPerSample == 8 && bitmap.samplesPerPixel >= 3)
    for y in 0..<bitmap.pixelsHigh {
        for x in 0..<bitmap.pixelsWide {
            let s = y * bitmap.bytesPerRow + x * bitmap.samplesPerPixel
            let d = y * rgb.bytesPerRow + x * 3
            dst[d] = src[s]; dst[d+1] = src[s+1]; dst[d+2] = src[s+2]
        }
    }
    guard let data = rgb.representation(using: .png, properties: [:]) else { fatalError("Cannot encode PNG") }
    try data.write(to: url)
}

func drawFill(_ image: NSImage, rect: NSRect) {
    let scale = max(rect.width / image.size.width, rect.height / image.size.height)
    let target = NSRect(x: rect.midX - image.size.width * scale / 2,
                        y: rect.midY - image.size.height * scale / 2,
                        width: image.size.width * scale,
                        height: image.size.height * scale)
    image.draw(in: target, from: .zero, operation: .sourceOver, fraction: 1,
               respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
}

// Reuse only the app panels from the existing publishable artwork.
// No source captures or private contact information are introduced.
let slugs = ["dashboard", "tenants", "ledger", "properties"]
let headings = ["Stay on top\nof your rent", "Keep tenant\nrecords together", "Track every\nrent payment", "Manage properties\nin one place"]
let subtitles = ["Collections, dues and more at a glance", "Find tenants and check their rent status", "Your monthly ledger, clearly organized", "Keep your units and occupancy organized"]
let tags = ["RENT OVERVIEW", "TENANT RECORDS", "MONTHLY LEDGER", "PROPERTY MANAGEMENT"]
let benefits = ["Collected • Pending • Overdue", "Search • Rent status • Lease details", "Paid • Partial • Overdue", "Properties • Units • Occupancy"]
let sources = slugs.enumerated().map { index, slug -> NSImage in
    let name = String(format: "%02d", index + 1) + "-" + slug + "-1080x1920.png"
    return NSImage(contentsOf: root.appendingPathComponent("play-store-assets/multi-device/upload-ready/phone-v3/" + name))!
}
let backdrop = NSImage(contentsOf: base.appendingPathComponent("source-art/blue-background.png"))!

func panel(_ index: Int, rect: NSRect) {
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow()
    shadow.shadowColor = color("002F6B", 0.4)
    shadow.shadowBlurRadius = 30
    shadow.shadowOffset = NSSize(width: 0, height: 12)
    shadow.set()
    rounded(rect.insetBy(dx: -5, dy: -5), radius: 34, fill: .white)
    NSGraphicsContext.restoreGraphicsState()
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(roundedRect: rect, xRadius: 30, yRadius: 30).addClip()
    // 992 × 1610 app panel, preserving its existing aspect ratio.
    let sourceRect = NSRect(x: 44, y: 44, width: 992, height: 1610)
    sources[index].draw(in: rect, from: sourceRect, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
}

let formats: [(String, Int, Int)] = [("phone", 1080, 1920), ("7-inch-tablet", 1440, 2560), ("10-inch-tablet", 2560, 1440), ("chromebook", 2560, 1440)]
for (folder, width, height) in formats {
    try FileManager.default.createDirectory(at: output.appendingPathComponent(folder), withIntermediateDirectories: true)
    for i in 0..<4 {
        let result = imageCanvas(width: width, height: height) {
            color("0873C8").setFill()
            NSRect(x: 0, y: 0, width: width, height: height).fill()
            drawFill(backdrop, rect: NSRect(x: 0, y: 0, width: width, height: height))
            NSGraphicsContext.saveGraphicsState()
            if height > width {
                let scale = CGFloat(width) / 1080
                let transform = NSAffineTransform(); transform.scale(by: scale); transform.concat()
                text("KIRAYABAHI", rect: NSRect(x: 100, y: 58, width: 880, height: 45), size: 28, weight: .bold, color: .white, alignment: .center)
                text(headings[i], rect: NSRect(x: 60, y: 163, width: 960, height: 228), size: 83, weight: .bold, color: .white, alignment: .center)
                text(subtitles[i], rect: NSRect(x: 65, y: 416, width: 950, height: 60), size: 30, color: .white, alignment: .center)
                text(benefits[i], rect: NSRect(x: 60, y: 505, width: 960, height: 42), size: 25, weight: .medium, color: color("D9EEFF"), alignment: .center)
                panel(i, rect: NSRect(x: 143, y: 613, width: 794, height: 1288.65))
            } else {
                text("KIRAYABAHI", rect: NSRect(x: 145, y: 135, width: 1000, height: 58), size: 36, weight: .bold, color: .white)
                text(tags[i], rect: NSRect(x: 145, y: 306, width: 1100, height: 52), size: 28, weight: .semibold, color: color("C8E8FF"))
                text(headings[i], rect: NSRect(x: 138, y: 400, width: 1240, height: 306), size: 106, weight: .bold, color: .white)
                text(subtitles[i], rect: NSRect(x: 145, y: 750, width: 1140, height: 132), size: 40, color: .white)
                rounded(NSRect(x: 145, y: 975, width: 1025, height: 96), radius: 24, fill: color("00569F", 0.7))
                text(benefits[i], rect: NSRect(x: 170, y: 1004, width: 975, height: 55), size: 32, weight: .medium, color: .white, alignment: .center)
                panel(i, rect: NSRect(x: 1500, y: 100, width: 764, height: 1240))
                text(String(format: "%02d / 04", i+1), rect: NSRect(x: 145, y: 1270, width: 500, height: 50), size: 26, weight: .medium, color: color("C8E8FF"))
            }
            NSGraphicsContext.restoreGraphicsState()
        }
        let filename = String(format: "%02d", i+1) + "-" + slugs[i] + "-\(width)x\(height).png"
        try save(result, to: output.appendingPathComponent(folder + "/" + filename))
    }
}

let previewDir = base.appendingPathComponent("previews")
try FileManager.default.createDirectory(at: previewDir, withIntermediateDirectories: true)
for (folder, width, height) in formats {
    let thumbW: CGFloat = height > width ? 270 : 480
    let thumbH = thumbW * CGFloat(height) / CGFloat(width)
    let preview = imageCanvas(width: Int(thumbW * 4 + 100), height: Int(thumbH + 40)) {
        NSColor.white.setFill(); NSRect(x: 0, y: 0, width: thumbW * 4 + 100, height: thumbH + 40).fill()
        for i in 0..<4 {
            let name = String(format: "%02d", i+1) + "-" + slugs[i] + "-\(width)x\(height).png"
            let img = NSImage(contentsOf: output.appendingPathComponent(folder + "/" + name))!
            img.draw(in: NSRect(x: 20 + CGFloat(i) * (thumbW + 20), y: 20, width: thumbW, height: thumbH), from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
        }
    }
    try save(preview, to: previewDir.appendingPathComponent(folder + "-overview.png"))
}
print("Created 16 screenshots and 4 preview strips in \(base.path)")
