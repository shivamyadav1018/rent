import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let base = root.appendingPathComponent("play-store-assets/multi-device")
let sourceDir = base.appendingPathComponent("source-screens")
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
          let data = bitmap.representation(using: .png, properties: [:]) else { return }
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

func sanitized(_ original: NSImage, index: Int) -> NSImage {
    let result = imageCanvas(width: Int(original.size.width), height: Int(original.size.height)) {
        original.draw(in: NSRect(origin: .zero, size: original.size), from: .zero,
                      operation: .sourceOver, fraction: 1, respectFlipped: true,
                      hints: [.interpolation: NSImageInterpolation.high])
        if index == 1 {
            rounded(NSRect(x: 80, y: 650, width: 520, height: 92), radius: 8, fill: color("233DB6"))
            text("Hello, Landlord 👋", rect: NSRect(x: 92, y: 659, width: 500, height: 70),
                 size: 46, weight: .bold, color: .white)
            rounded(NSRect(x: 820, y: 565, width: 190, height: 52), radius: 8, fill: color("1635B4"))
            text("Up to date", rect: NSRect(x: 830, y: 577, width: 170, height: 30),
                 size: 22, weight: .semibold, color: mint, alignment: .center)

            rounded(NSRect(x: 30, y: 1080, width: 1020, height: 590), radius: 28, fill: offWhite)
            let cards: [(NSRect, String, String, String, NSColor)] = [
                (NSRect(x: 40, y: 1095, width: 490, height: 265), "EXPECTED", "₹48,000", "4 units billed", ink),
                (NSRect(x: 550, y: 1095, width: 490, height: 265), "COLLECTED", "₹36,000", "3 units paid", color("006B52")),
                (NSRect(x: 40, y: 1380, width: 490, height: 265), "PENDING", "₹12,000", "1 unit remaining", ink),
                (NSRect(x: 550, y: 1380, width: 490, height: 265), "OVERDUE", "₹0", "All up to date", color("006B52"))
            ]
            for card in cards {
                rounded(card.0, radius: 28, fill: .white)
                text(card.1, rect: NSRect(x: card.0.minX + 34, y: card.0.minY + 32, width: card.0.width - 68, height: 35), size: 25, weight: .medium, color: muted)
                text(card.2, rect: NSRect(x: card.0.minX + 34, y: card.0.minY + 86, width: card.0.width - 68, height: 64), size: 47, weight: .heavy, color: card.4)
                text(card.3, rect: NSRect(x: card.0.minX + 34, y: card.0.minY + 180, width: card.0.width - 68, height: 36), size: 25, color: muted)
            }
        }
        if index == 2 {
            rounded(NSRect(x: 630, y: 1690, width: 390, height: 250), radius: 22, fill: color("F1F3FF"))
            text("Contact saved", rect: NSRect(x: 650, y: 1792, width: 350, height: 48),
                 size: 28, weight: .semibold, color: primary, alignment: .center)
            rounded(NSRect(x: 245, y: 1620, width: 430, height: 76), radius: 8, fill: .white)
            text("Green View PG · Room 2", rect: NSRect(x: 260, y: 1638, width: 400, height: 42),
                 size: 27, weight: .medium, color: muted)
        }
        if index == 3 {
            rounded(NSRect(x: 35, y: 815, width: 900, height: 365), radius: 12, fill: offWhite)
            text("Property", rect: NSRect(x: 55, y: 850, width: 300, height: 42),
                 size: 28, weight: .medium, color: ink)
            let filters: [(String, NSColor, NSColor, CGFloat)] = [("All", primary, NSColor.white, 150),
                           ("Green View", color("E9EDFF"), ink, 285.0),
                           ("Shanti PG", color("E9EDFF"), ink, 525.0)]
            for filter in filters {
                rounded(NSRect(x: filter.3, y: 930, width: filter.0 == "All" ? 110 : 210, height: 72), radius: 36, fill: filter.1)
                text(filter.0, rect: NSRect(x: filter.3, y: 949, width: filter.0 == "All" ? 110 : 210, height: 36),
                     size: 25, weight: .bold, color: filter.2, alignment: .center)
            }
            rounded(NSRect(x: 40, y: 1100, width: 590, height: 190), radius: 12, fill: .white)
            text("Tenant 1", rect: NSRect(x: 55, y: 1128, width: 540, height: 44),
                 size: 31, weight: .bold, color: ink)
            text("⌂  Green View PG · Room 1", rect: NSRect(x: 55, y: 1190, width: 540, height: 44),
                 size: 27, weight: .medium, color: muted)
        }
        if index == 4 {
            rounded(NSRect(x: 30, y: 445, width: 1020, height: 1000), radius: 20, fill: offWhite)
            text("Your properties", rect: NSRect(x: 42, y: 465, width: 500, height: 44),
                 size: 29, weight: .bold, color: ink)
            let properties = [("Green View Apartments", "Sector 21 · 4 occupied · 5 units"),
                              ("Shanti PG", "Central Road · 5 occupied · 6 units"),
                              ("Market Road Rooms", "Main Market · 3 occupied · 4 units")]
            for i in 0..<properties.count {
                let y = 530 + CGFloat(i) * 205
                rounded(NSRect(x: 42, y: y, width: 996, height: 175), radius: 22, fill: .white, stroke: border)
                rounded(NSRect(x: 65, y: y + 35, width: 78, height: 78), radius: 16, fill: color("F1F3FF"))
                text("⌂", rect: NSRect(x: 65, y: y + 48, width: 78, height: 48), size: 38, weight: .bold, color: primary, alignment: .center)
                text(properties[i].0, rect: NSRect(x: 170, y: y + 28, width: 800, height: 40), size: 29, weight: .bold)
                text(properties[i].1, rect: NSRect(x: 170, y: y + 82, width: 800, height: 38), size: 24, color: muted)
            }
        }
    }
    return result
}

func drawCroppedScreen(_ screenshot: NSImage, in rect: NSRect, cropTop: CGFloat = 90, cropBottom: CGFloat = 280) {
    NSGraphicsContext.saveGraphicsState()
    NSBezierPath(roundedRect: rect, xRadius: 28, yRadius: 28).addClip()
    // NSImage source coordinates are bottom-origin even when the destination
    // context is flipped, so the lower crop becomes the source Y offset.
    let source = NSRect(x: 0, y: cropBottom, width: screenshot.size.width,
                        height: screenshot.size.height - cropTop - cropBottom)
    screenshot.draw(in: rect, from: source, operation: .sourceOver, fraction: 1,
                    respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    NSGraphicsContext.restoreGraphicsState()
}

func shadowedDevice(_ rect: NSRect, radius: CGFloat, drawContent: () -> Void) {
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow(); shadow.shadowColor = color("001F94", 0.26); shadow.shadowBlurRadius = 44; shadow.shadowOffset = NSSize(width: 0, height: 18)
    shadow.set(); rounded(rect, radius: radius, fill: primaryDark)
    NSGraphicsContext.restoreGraphicsState()
    drawContent()
}

let files = ["01-dashboard.png", "02-tenants.png", "03-ledger.png", "04-properties.png"]
let slugs = ["dashboard", "tenants", "ledger", "properties"]
let headings = ["Smart rent dashboard", "Tenant records at a glance", "Monthly ledger made clear", "Properties in one place"]
let subheads = ["Track collections, pending rent and occupancy", "Find tenants, rent status and lease details", "Review paid, partial and overdue rent", "Manage every property and unit together"]

guard let portraitBackground = NSImage(contentsOf: base.appendingPathComponent("portrait-background.png")),
      let landscapeBackground = NSImage(contentsOf: base.appendingPathComponent("landscape-background.png")),
      let phoneV2Background = NSImage(contentsOf: base.appendingPathComponent("phone-v2-background.png")) else {
    fatalError("Missing generated backgrounds")
}

let sourceScreens: [NSImage] = files.enumerated().map { index, name in
    guard let image = NSImage(contentsOf: sourceDir.appendingPathComponent(name)) else { fatalError("Missing \(name)") }
    return sanitized(image, index: index + 1)
}

for folder in ["phone", "phone-v2", "7-inch-tablet", "10-inch-tablet", "chromebook"] {
    try FileManager.default.createDirectory(at: output.appendingPathComponent(folder), withIntermediateDirectories: true)
}

for index in 0..<sourceScreens.count {
    let screen = sourceScreens[index]
    let order = String(format: "%02d", index + 1)

    let phone = imageCanvas(width: 1080, height: 1920) {
        drawFill(portraitBackground, rect: NSRect(x: 0, y: 0, width: 1080, height: 1920))
        rounded(NSRect(x: 64, y: 58, width: 220, height: 46), radius: 23, fill: primary)
        text("KIRAYABAHI", rect: NSRect(x: 64, y: 70, width: 220, height: 26), size: 19, weight: .heavy, color: .white, alignment: .center)
        text(headings[index], rect: NSRect(x: 64, y: 132, width: 952, height: 96), size: 57, weight: .heavy)
        text(subheads[index], rect: NSRect(x: 68, y: 240, width: 940, height: 48), size: 25, weight: .medium, color: muted)
        let device = NSRect(x: 225, y: 330, width: 630, height: 1500)
        shadowedDevice(device, radius: 60) {
            drawCroppedScreen(screen, in: device.insetBy(dx: 16, dy: 16), cropTop: 80, cropBottom: 520)
        }
    }
    try save(phone, to: output.appendingPathComponent("phone/\(order)-\(slugs[index])-1080x1920.png"))

    let v2Headings = ["See rent clearly", "Manage every tenant", "Your monthly ledger", "All properties together"]
    let v2Subheads = ["Collections, pending rent and occupancy at a glance", "Rent status and tenant records in one place", "Paid, partial and overdue rent—month by month", "Organize every property, unit and room"]
    let phoneV2 = imageCanvas(width: 1080, height: 1920) {
        drawFill(phoneV2Background, rect: NSRect(x: 0, y: 0, width: 1080, height: 1920))
        rounded(NSRect(x: 64, y: 44, width: 210, height: 40), radius: 20, fill: primary)
        text("KIRAYABAHI", rect: NSRect(x: 64, y: 54, width: 210, height: 24), size: 17, weight: .heavy, color: .white, alignment: .center)
        text(v2Headings[index], rect: NSRect(x: 64, y: 105, width: 952, height: 78), size: 59, weight: .heavy)
        text(v2Subheads[index], rect: NSRect(x: 68, y: 194, width: 940, height: 40), size: 24, weight: .medium, color: muted)
        let device = NSRect(x: 68, y: 270, width: 944, height: 1580)
        shadowedDevice(device, radius: 48) {
            drawCroppedScreen(screen, in: device.insetBy(dx: 12, dy: 12), cropTop: 75, cropBottom: 520)
        }
    }
    try save(phoneV2, to: output.appendingPathComponent("phone-v2/\(order)-\(slugs[index])-1080x1920.png"))

    let seven = imageCanvas(width: 1440, height: 2560) {
        drawFill(portraitBackground, rect: NSRect(x: 0, y: 0, width: 1440, height: 2560))
        rounded(NSRect(x: 220, y: 60, width: 1000, height: 64), radius: 32, fill: primary)
        text("KIRAYABAHI · \(headings[index].uppercased())", rect: NSRect(x: 220, y: 77, width: 1000, height: 35), size: 23, weight: .heavy, color: .white, alignment: .center)
        let device = NSRect(x: 245, y: 165, width: 950, height: 2310)
        shadowedDevice(device, radius: 54) {
            drawCroppedScreen(screen, in: device.insetBy(dx: 18, dy: 18), cropTop: 65, cropBottom: 520)
        }
    }
    try save(seven, to: output.appendingPathComponent("7-inch-tablet/\(order)-\(slugs[index])-1440x2560.png"))

    let ten = imageCanvas(width: 2560, height: 1440) {
        drawFill(landscapeBackground, rect: NSRect(x: 0, y: 0, width: 2560, height: 1440))
        text(headings[index], rect: NSRect(x: 110, y: 110, width: 760, height: 150), size: 72, weight: .heavy, color: primaryDark)
        text(subheads[index], rect: NSRect(x: 114, y: 280, width: 690, height: 110), size: 31, weight: .medium, color: muted)
        rounded(NSRect(x: 110, y: 430, width: 520, height: 58), radius: 29, fill: mint)
        text("REAL IN-APP EXPERIENCE", rect: NSRect(x: 110, y: 446, width: 520, height: 30), size: 21, weight: .heavy, color: primaryDark, alignment: .center)
        let tablet = NSRect(x: 1010, y: 70, width: 720, height: 1300)
        shadowedDevice(tablet, radius: 52) {
            drawCroppedScreen(screen, in: tablet.insetBy(dx: 18, dy: 18), cropTop: 80, cropBottom: 520)
        }
    }
    try save(ten, to: output.appendingPathComponent("10-inch-tablet/\(order)-\(slugs[index])-2560x1440.png"))

    let chromebook = imageCanvas(width: 2560, height: 1440) {
        drawFill(landscapeBackground, rect: NSRect(x: 0, y: 0, width: 2560, height: 1440))
        text(headings[index], rect: NSRect(x: 130, y: 105, width: 920, height: 120), size: 66, weight: .heavy, color: primaryDark)
        text(subheads[index], rect: NSRect(x: 134, y: 230, width: 820, height: 92), size: 29, weight: .medium, color: muted)
        let laptop = NSRect(x: 1020, y: 120, width: 920, height: 1120)
        NSGraphicsContext.saveGraphicsState()
        let shadow = NSShadow(); shadow.shadowColor = color("001F94", 0.27); shadow.shadowBlurRadius = 52; shadow.shadowOffset = NSSize(width: 0, height: 22); shadow.set()
        rounded(laptop, radius: 30, fill: color("20273A"))
        NSGraphicsContext.restoreGraphicsState()
        let browser = laptop.insetBy(dx: 18, dy: 18)
        rounded(browser, radius: 18, fill: .white)
        rounded(NSRect(x: browser.minX, y: browser.minY, width: browser.width, height: 56), radius: 18, fill: color("F1F3FF"))
        for dot in 0..<3 { rounded(NSRect(x: browser.minX + 22 + CGFloat(dot) * 30, y: browser.minY + 19, width: 16, height: 16), radius: 8, fill: [color("FF8A80"), color("FFD180"), mint][dot]) }
        rounded(NSRect(x: browser.minX + 135, y: browser.minY + 12, width: browser.width - 165, height: 32), radius: 16, fill: .white, stroke: border)
        drawCroppedScreen(screen, in: NSRect(x: browser.minX + 125, y: browser.minY + 80, width: browser.width - 250, height: browser.height - 110), cropTop: 60, cropBottom: 520)
        let baseRect = NSRect(x: laptop.minX - 90, y: laptop.maxY, width: laptop.width + 180, height: 62)
        rounded(baseRect, radius: 24, fill: color("3B435A"))
    }
    try save(chromebook, to: output.appendingPathComponent("chromebook/\(order)-\(slugs[index])-2560x1440.png"))
}

print("Rendered 16 multi-device Google Play screenshots")
