import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let source = root.appendingPathComponent("play-store-assets/source-art")
let output = root.appendingPathComponent("play-store-assets/upload-ready")
let screenshots = output.appendingPathComponent("phone-screenshots")

func color(_ hex: String, _ alpha: CGFloat = 1) -> NSColor {
    let clean = hex.replacingOccurrences(of: "#", with: "")
    let value = UInt64(clean, radix: 16) ?? 0
    return NSColor(
        red: CGFloat((value >> 16) & 255) / 255,
        green: CGFloat((value >> 8) & 255) / 255,
        blue: CGFloat(value & 255) / 255,
        alpha: alpha
    )
}

let ink = color("151B2A")
let muted = color("454653")
let primary = color("263BAA")
let primaryDark = color("001F94")
let accent = color("4B61D1")
let mint = color("93F5D4")
let lavender = color("DEE0FF")
let offWhite = color("FAF8FF")
let border = color("E9EDFF")
let success = color("007A5A")

func paragraph(_ alignment: NSTextAlignment = .left, lineSpacing: CGFloat = 0) -> NSMutableParagraphStyle {
    let style = NSMutableParagraphStyle()
    style.alignment = alignment
    style.lineSpacing = lineSpacing
    return style
}

func drawText(_ text: String, rect: NSRect, size: CGFloat, weight: NSFont.Weight = .regular,
              textColor: NSColor = ink, alignment: NSTextAlignment = .left, lineSpacing: CGFloat = 0) {
    let font = NSFont.systemFont(ofSize: size, weight: weight)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: textColor,
        .paragraphStyle: paragraph(alignment, lineSpacing: lineSpacing)
    ]
    NSString(string: text).draw(in: rect, withAttributes: attrs)
}

func roundRect(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, width: CGFloat = 1) {
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    fill.setFill(); path.fill()
    if let stroke { stroke.setStroke(); path.lineWidth = width; path.stroke() }
}

func circle(_ rect: NSRect, fill: NSColor) {
    let path = NSBezierPath(ovalIn: rect)
    fill.setFill(); path.fill()
}

func drawImageFill(_ image: NSImage, in rect: NSRect) {
    let scale = max(rect.width / image.size.width, rect.height / image.size.height)
    let scaled = NSSize(width: image.size.width * scale, height: image.size.height * scale)
    let target = NSRect(x: rect.midX - scaled.width / 2, y: rect.midY - scaled.height / 2,
                        width: scaled.width, height: scaled.height)
    image.draw(
        in: target,
        from: .zero,
        operation: .sourceOver,
        fraction: 1,
        respectFlipped: true,
        hints: [.interpolation: NSImageInterpolation.high]
    )
}

func savePNG(_ image: NSImage, to url: URL) throws {
    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let data = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "Render", code: 1)
    }
    try data.write(to: url)
}

func canvas(width: Int, height: Int, draw: () -> Void) -> NSImage {
    let image = NSImage(size: NSSize(width: width, height: height))
    image.lockFocusFlipped(true)
    NSGraphicsContext.current?.imageInterpolation = .high
    draw()
    image.unlockFocus()
    return image
}

func uiLabel(_ text: String, x: CGFloat, y: CGFloat, width: CGFloat, color: NSColor = muted) {
    drawText(text, rect: NSRect(x: x, y: y, width: width, height: 38), size: 22, weight: .medium, textColor: color)
}

func statusChip(_ text: String, x: CGFloat, y: CGFloat, color chipColor: NSColor) {
    roundRect(NSRect(x: x, y: y, width: 120, height: 42), radius: 21, fill: chipColor.withAlphaComponent(0.14))
    drawText(text, rect: NSRect(x: x, y: y + 8, width: 120, height: 28), size: 18, weight: .bold,
             textColor: chipColor, alignment: .center)
}

func drawPhoneUI(kind: Int, in frame: NSRect) {
    NSGraphicsContext.saveGraphicsState()
    let shadow = NSShadow(); shadow.shadowColor = color("001F94", 0.22); shadow.shadowBlurRadius = 34; shadow.shadowOffset = NSSize(width: 0, height: 14)
    shadow.set()
    roundRect(frame, radius: 56, fill: primaryDark)
    NSGraphicsContext.restoreGraphicsState()

    let screen = frame.insetBy(dx: 16, dy: 16)
    roundRect(screen, radius: 43, fill: offWhite)
    roundRect(NSRect(x: screen.midX - 72, y: screen.minY + 12, width: 144, height: 24), radius: 12, fill: ink)

    let x = screen.minX + 34
    let w = screen.width - 68
    drawText("KirayaBahi", rect: NSRect(x: x, y: screen.minY + 58, width: w, height: 40), size: 27, weight: .heavy, textColor: primaryDark)
    circle(NSRect(x: screen.maxX - 70, y: screen.minY + 55, width: 36, height: 36), fill: mint)

    switch kind {
    case 1:
        drawText("Rent dashboard", rect: NSRect(x: x, y: screen.minY + 112, width: w, height: 48), size: 33, weight: .bold)
        uiLabel("September overview", x: x, y: screen.minY + 158, width: w)
        roundRect(NSRect(x: x, y: screen.minY + 214, width: w, height: 176), radius: 24, fill: primary)
        drawText("COLLECTED", rect: NSRect(x: x + 25, y: screen.minY + 244, width: w - 50, height: 30), size: 18, weight: .bold, textColor: lavender)
        drawText("₹36,000", rect: NSRect(x: x + 25, y: screen.minY + 280, width: w - 50, height: 60), size: 46, weight: .heavy, textColor: .white)
        drawText("of ₹48,000 due", rect: NSRect(x: x + 25, y: screen.minY + 340, width: w - 50, height: 32), size: 20, weight: .medium, textColor: mint)
        for i in 0..<3 {
            let yy = screen.minY + 420 + CGFloat(i) * 118
            roundRect(NSRect(x: x, y: yy, width: w, height: 94), radius: 18, fill: .white, stroke: border)
            circle(NSRect(x: x + 18, y: yy + 20, width: 52, height: 52), fill: i == 2 ? lavender : mint)
            drawText(["A-101 · Raj Kumar", "B-204 · Neha Singh", "C-102 · Amit Shah"][i], rect: NSRect(x: x + 84, y: yy + 16, width: w - 205, height: 30), size: 21, weight: .semibold)
            drawText(["₹12,000", "₹14,000", "₹10,000"][i], rect: NSRect(x: x + 84, y: yy + 50, width: 150, height: 28), size: 19, textColor: muted)
            statusChip(i == 2 ? "DUE" : "PAID", x: x + w - 138, y: yy + 26, color: i == 2 ? color("A15C00") : success)
        }
    case 2:
        drawText("Properties", rect: NSRect(x: x, y: screen.minY + 112, width: w, height: 48), size: 33, weight: .bold)
        uiLabel("Units and tenants in one place", x: x, y: screen.minY + 158, width: w)
        for i in 0..<3 {
            let yy = screen.minY + 220 + CGFloat(i) * 188
            roundRect(NSRect(x: x, y: yy, width: w, height: 160), radius: 22, fill: .white, stroke: border)
            roundRect(NSRect(x: x + 18, y: yy + 22, width: 92, height: 92), radius: 18, fill: [lavender, mint, color("FFF0D6")][i])
            drawText("⌂", rect: NSRect(x: x + 18, y: yy + 37, width: 92, height: 60), size: 44, weight: .bold, textColor: primary, alignment: .center)
            drawText(["Shanti Apartments", "Green View House", "Market Road Rooms"][i], rect: NSRect(x: x + 132, y: yy + 24, width: w - 150, height: 34), size: 22, weight: .bold)
            drawText(["8 units · 7 occupied", "4 units · 4 occupied", "6 units · 5 occupied"][i], rect: NSRect(x: x + 132, y: yy + 66, width: w - 150, height: 30), size: 19, textColor: muted)
            drawText(["₹68,000/month", "₹42,000/month", "₹51,000/month"][i], rect: NSRect(x: x + 132, y: yy + 108, width: w - 150, height: 30), size: 20, weight: .semibold, textColor: primary)
        }
    case 3:
        drawText("Monthly ledger", rect: NSRect(x: x, y: screen.minY + 112, width: w, height: 48), size: 33, weight: .bold)
        roundRect(NSRect(x: x, y: screen.minY + 176, width: w, height: 60), radius: 30, fill: lavender)
        drawText("‹    September 2026    ›", rect: NSRect(x: x, y: screen.minY + 190, width: w, height: 34), size: 22, weight: .bold, textColor: primaryDark, alignment: .center)
        let rows = [("Raj Kumar", "₹12,000", "PAID"), ("Neha Singh", "₹8,000 / ₹14,000", "PARTIAL"), ("Amit Shah", "₹10,000", "DUE"), ("Priya Verma", "₹11,500", "PAID")]
        for i in 0..<rows.count {
            let yy = screen.minY + 270 + CGFloat(i) * 132
            roundRect(NSRect(x: x, y: yy, width: w, height: 108), radius: 18, fill: .white, stroke: border)
            circle(NSRect(x: x + 18, y: yy + 26, width: 54, height: 54), fill: i % 2 == 0 ? lavender : mint)
            drawText(rows[i].0, rect: NSRect(x: x + 88, y: yy + 18, width: 230, height: 30), size: 21, weight: .semibold)
            drawText(rows[i].1, rect: NSRect(x: x + 88, y: yy + 57, width: 250, height: 28), size: 19, textColor: muted)
            let chip = rows[i].2
            statusChip(chip, x: x + w - 138, y: yy + 34, color: chip == "PAID" ? success : (chip == "DUE" ? color("A15C00") : accent))
        }
    case 4:
        drawText("Rent receipt", rect: NSRect(x: x, y: screen.minY + 112, width: w, height: 48), size: 33, weight: .bold)
        uiLabel("Professional proof of payment", x: x, y: screen.minY + 158, width: w)
        roundRect(NSRect(x: x, y: screen.minY + 220, width: w, height: 590), radius: 22, fill: .white, stroke: border)
        circle(NSRect(x: screen.midX - 42, y: screen.minY + 252, width: 84, height: 84), fill: mint)
        drawText("✓", rect: NSRect(x: screen.midX - 42, y: screen.minY + 264, width: 84, height: 60), size: 44, weight: .heavy, textColor: success, alignment: .center)
        drawText("Payment received", rect: NSRect(x: x, y: screen.minY + 354, width: w, height: 38), size: 25, weight: .bold, alignment: .center)
        drawText("₹12,000", rect: NSRect(x: x, y: screen.minY + 404, width: w, height: 62), size: 48, weight: .heavy, textColor: primary, alignment: .center)
        let details = [("Tenant", "Raj Kumar"), ("Property", "Shanti Apartments · A-101"), ("For month", "September 2026"), ("Payment mode", "UPI")]
        for i in 0..<details.count {
            let yy = screen.minY + 500 + CGFloat(i) * 68
            drawText(details[i].0, rect: NSRect(x: x + 28, y: yy, width: 180, height: 30), size: 19, textColor: muted)
            drawText(details[i].1, rect: NSRect(x: x + 205, y: yy, width: w - 235, height: 34), size: 19, weight: .semibold, alignment: .right)
        }
        roundRect(NSRect(x: x + 28, y: screen.minY + 770, width: w - 56, height: 58), radius: 16, fill: primary)
        drawText("Share receipt", rect: NSRect(x: x + 28, y: screen.minY + 784, width: w - 56, height: 32), size: 22, weight: .bold, textColor: .white, alignment: .center)
    default:
        drawText("Rent reminders", rect: NSRect(x: x, y: screen.minY + 112, width: w, height: 48), size: 33, weight: .bold)
        uiLabel("Follow up without the stress", x: x, y: screen.minY + 158, width: w)
        for i in 0..<3 {
            let yy = screen.minY + 222 + CGFloat(i) * 164
            roundRect(NSRect(x: x, y: yy, width: w, height: 138), radius: 20, fill: .white, stroke: border)
            circle(NSRect(x: x + 20, y: yy + 30, width: 58, height: 58), fill: i == 0 ? color("FFF0D6") : lavender)
            drawText("●", rect: NSRect(x: x + 20, y: yy + 38, width: 58, height: 42), size: 24, textColor: i == 0 ? color("A15C00") : accent, alignment: .center)
            drawText(["Rent due today", "Payment follow-up", "Receipt delivered"][i], rect: NSRect(x: x + 98, y: yy + 23, width: w - 118, height: 32), size: 22, weight: .bold)
            drawText(["Amit Shah · C-102", "Neha Singh · B-204", "Raj Kumar · A-101"][i], rect: NSRect(x: x + 98, y: yy + 65, width: w - 118, height: 28), size: 19, textColor: muted)
            drawText(["₹10,000 due", "₹6,000 balance", "Paid in full"][i], rect: NSRect(x: x + 98, y: yy + 99, width: w - 118, height: 25), size: 18, weight: .semibold, textColor: i == 2 ? success : primary)
        }
        roundRect(NSRect(x: x, y: screen.minY + 748, width: w, height: 76), radius: 20, fill: mint.withAlphaComponent(0.45))
        drawText("Works offline · Sync when connected", rect: NSRect(x: x + 18, y: screen.minY + 771, width: w - 36, height: 34), size: 20, weight: .bold, textColor: success, alignment: .center)
    }
}

func renderFeature() throws {
    guard let art = NSImage(contentsOf: source.appendingPathComponent("feature-art.png")) else { return }
    let image = canvas(width: 1024, height: 500) {
        drawImageFill(art, in: NSRect(x: 0, y: 0, width: 1024, height: 500))
        let gradient = NSGradient(colors: [color("001F94", 0.92), color("001F94", 0.60), color("001F94", 0.0)])!
        gradient.draw(in: NSRect(x: 0, y: 0, width: 610, height: 500), angle: 0)
        roundRect(NSRect(x: 62, y: 72, width: 190, height: 42), radius: 21, fill: mint)
        drawText("KIRAYABAHI", rect: NSRect(x: 62, y: 82, width: 190, height: 25), size: 18, weight: .heavy, textColor: primaryDark, alignment: .center)
        drawText("Rent management,\nmade simple", rect: NSRect(x: 62, y: 132, width: 500, height: 150), size: 54, weight: .heavy, textColor: .white, lineSpacing: -4)
        drawText("Tenants  •  Payments  •  Receipts", rect: NSRect(x: 64, y: 305, width: 480, height: 38), size: 24, weight: .semibold, textColor: mint)
        drawText("Your smart offline rent ledger", rect: NSRect(x: 64, y: 357, width: 470, height: 34), size: 22, weight: .medium, textColor: lavender)
    }
    try savePNG(image, to: output.appendingPathComponent("feature-graphic-1024x500.png"))
}

let screenSpecs = [
    ("screen-01-art.png", "01-rent-manager-1080x1920.png", "All your rent,\none clear view", "Track rent collection across every property", 1),
    ("screen-02-art.png", "02-tenant-property-records-1080x1920.png", "Tenants & properties,\nperfectly organized", "Keep unit and tenant records together", 2),
    ("screen-03-art.png", "03-payment-ledger-1080x1920.png", "Track every payment\nand partial payment", "Know what’s paid, pending, or overdue", 3),
    ("screen-04-art.png", "04-rent-receipts-1080x1920.png", "Create professional\nrent receipts", "Generate and share clear payment proof", 4),
    ("screen-05-art.png", "05-offline-reminders-1080x1920.png", "Reminders that keep\nrent on track", "Work offline and follow up on time", 5)
]

func renderScreen(_ spec: (String, String, String, String, Int)) throws {
    guard let art = NSImage(contentsOf: source.appendingPathComponent(spec.0)) else { return }
    let image = canvas(width: 1080, height: 1920) {
        drawImageFill(art, in: NSRect(x: 0, y: 0, width: 1080, height: 1920))
        roundRect(NSRect(x: 72, y: 68, width: 216, height: 46), radius: 23, fill: primary)
        drawText("KIRAYABAHI", rect: NSRect(x: 72, y: 79, width: 216, height: 28), size: 19, weight: .heavy, textColor: .white, alignment: .center)
        drawText(spec.2, rect: NSRect(x: 72, y: 148, width: 936, height: 190), size: 70, weight: .heavy, textColor: ink, lineSpacing: -7)
        drawText(spec.3, rect: NSRect(x: 76, y: 356, width: 920, height: 55), size: 28, weight: .medium, textColor: muted)
        drawPhoneUI(kind: spec.4, in: NSRect(x: 210, y: 500, width: 660, height: 1340))
    }
    try savePNG(image, to: screenshots.appendingPathComponent(spec.1))
}

try FileManager.default.createDirectory(at: screenshots, withIntermediateDirectories: true)
try renderFeature()
for spec in screenSpecs { try renderScreen(spec) }

let iconSource = source.appendingPathComponent("app-icon-512.png")
let iconTarget = output.appendingPathComponent("app-icon-512x512.png")
if FileManager.default.fileExists(atPath: iconTarget.path) { try FileManager.default.removeItem(at: iconTarget) }
try FileManager.default.copyItem(at: iconSource, to: iconTarget)
print("Rendered Google Play assets to \(output.path)")
