import AppKit
import AVFoundation
import CoreGraphics
import CoreVideo
import Foundation

let outputDirectory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let width = 1280
let height = 720
let framesPerSecond: Int32 = 24
let background = NSColor(srgbRed: 0.965, green: 0.957, blue: 0.925, alpha: 1)
let ink = NSColor(srgbRed: 0.145, green: 0.16, blue: 0.145, alpha: 1)
let muted = NSColor(srgbRed: 0.43, green: 0.45, blue: 0.41, alpha: 1)
let rust = NSColor(srgbRed: 0.77, green: 0.31, blue: 0.20, alpha: 1)
let sage = NSColor(srgbRed: 0.42, green: 0.51, blue: 0.43, alpha: 1)
let line = NSColor(srgbRed: 0.84, green: 0.82, blue: 0.77, alpha: 1)
let white = NSColor(srgbRed: 0.995, green: 0.99, blue: 0.97, alpha: 1)
let lavender = NSColor(srgbRed: 0.45, green: 0.40, blue: 0.53, alpha: 1)

struct Scene {
    let eyebrow: String
    let title: String
    let subtitle: String
    let narration: String
    let kind: Int
}

let scenes = [
    Scene(
        eyebrow: "RELAY / CONTEXT THAT TRAVELS WELL",
        title: "Keep the context.",
        subtitle: "Leave the thread behind.",
        narration: "Relay starts with a familiar problem: a long conversation holds decisions and next steps, but forwarding the whole thread shares more than the next person needs. Relay turns the useful context into a small, reviewable handoff.",
        kind: 0
    ),
    Scene(
        eyebrow: "01 / SOURCE",
        title: "Start with the conversation.",
        subtitle: "A clear boundary keeps the original thread behind.",
        narration: "Start with the conversation. Relay's demo keeps the source in view and recognizes one explicit privacy marker. With the filter on, the marker and everything after it are excluded. This is a visible rule, not a general sensitive-data detector.",
        kind: 1
    ),
    Scene(
        eyebrow: "02 / HUMAN REVIEW",
        title: "Shape what travels.",
        subtitle: "Edit the capsule. Choose a recipient. Review before the preview.",
        narration: "Extraction organizes candidate details into decisions, constraints, open questions, and next actions. The sender can edit, remove, or add items, then choose the intended recipient. Nothing should move forward until a person reviews it.",
        kind: 2
    ),
    Scene(
        eyebrow: "03 / OPEN STANDARD",
        title: "A real MCP connection.",
        subtitle: "Streamable HTTP · tools discovered from the local server",
        narration: "Relay also runs as a Model Context Protocol server over Streamable HTTP. The browser connects to the local endpoint using the official MCP client, discovers the Relay tools, and calls the same server a separate compatible agent can use.",
        kind: 3
    ),
    Scene(
        eyebrow: "04 / TOOL CALLS",
        title: "Extract. Review. Preview.",
        subtitle: "A handoff preview is not a public link or a message to the recipient.",
        narration: "Here, the extraction tool returns a draft that appears in the editor. After reviewing the sections, the second tool creates a versioned recipient preview. This preview is not a public link, is not sent to anyone, and is not durable storage.",
        kind: 4
    ),
    Scene(
        eyebrow: "05 / AWS BUILDER",
        title: "Bedrock is optional.",
        subtitle: "Local by default · explicit consent before cloud inference",
        narration: "Local extraction works without cloud credentials. An optional Amazon Bedrock Converse integration is implemented for extraction. It requires explicit user consent before text is sent, but AWS credentials and model access are not configured in this demo, so Bedrock has not been tested.",
        kind: 5
    ),
    Scene(
        eyebrow: "ALEXA+ CONCEPT EXPERIENCE",
        title: "Context that travels well.",
        subtitle: "User-reviewed handoffs, powered by an open MCP workflow.",
        narration: "Relay demonstrates a practical MCP handoff flow with user review and explicit boundaries. It is an Alexa Plus concept simulation, not an Alexa integration. Relay: context that travels well.",
        kind: 6
    ),
]

func font(_ size: CGFloat, _ weight: NSFont.Weight = .regular, mono: Bool = false, serif: Bool = false) -> NSFont {
    if mono { return NSFont(name: "Menlo", size: size) ?? NSFont.monospacedSystemFont(ofSize: size, weight: weight) }
    if serif { return NSFont(name: "Georgia", size: size) ?? NSFont.systemFont(ofSize: size, weight: weight) }
    return NSFont.systemFont(ofSize: size, weight: weight)
}

func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, size: CGFloat, color: NSColor = ink, weight: NSFont.Weight = .regular, mono: Bool = false, serif: Bool = false, alignment: NSTextAlignment = .left) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = alignment
    paragraph.lineBreakMode = .byWordWrapping
    let attributes: [NSAttributedString.Key: Any] = [
        .font: font(size, weight, mono: mono, serif: serif),
        .foregroundColor: color,
        .paragraphStyle: paragraph,
    ]
    (value as NSString).draw(
        in: CGRect(x: x, y: CGFloat(height) - y - h, width: w, height: h),
        withAttributes: attributes
    )
}

func box(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, fill: NSColor, stroke: NSColor? = nil, radius: CGFloat = 8) {
    let rect = CGRect(x: x, y: CGFloat(height) - y - h, width: w, height: h)
    let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
    fill.setFill()
    path.fill()
    if let stroke {
        stroke.setStroke()
        path.lineWidth = 1
        path.stroke()
    }
}

func rule(_ x1: CGFloat, _ y1: CGFloat, _ x2: CGFloat, _ y2: CGFloat, color: NSColor = line, width: CGFloat = 1) {
    let path = NSBezierPath()
    path.move(to: CGPoint(x: x1, y: CGFloat(height) - y1))
    path.line(to: CGPoint(x: x2, y: CGFloat(height) - y2))
    path.lineWidth = width
    color.setStroke()
    path.stroke()
}

func badge(_ label: String, _ x: CGFloat, _ y: CGFloat, color: NSColor = sage, fill: NSColor = NSColor(srgbRed: 0.90, green: 0.92, blue: 0.88, alpha: 1)) {
    let width = max(92, CGFloat(label.count) * 7.4 + 28)
    box(x, y, width, 27, fill: fill, radius: 13)
    text(label, x + 14, y + 6, width - 28, 15, size: 10, color: color, weight: .medium, mono: true)
}

func drawHeader(_ scene: Scene, index: Int) {
    background.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()

    for x in stride(from: 32, to: width, by: 32) {
        rule(CGFloat(x), 0, CGFloat(x), CGFloat(height), color: NSColor(srgbRed: 0.90, green: 0.885, blue: 0.85, alpha: 0.42), width: 0.45)
    }
    for y in stride(from: 32, to: height, by: 32) {
        rule(0, CGFloat(y), CGFloat(width), CGFloat(y), color: NSColor(srgbRed: 0.90, green: 0.885, blue: 0.85, alpha: 0.42), width: 0.45)
    }

    text(scene.eyebrow, 62, 35, 820, 20, size: 11, color: sage, weight: .medium, mono: true)
    text("PROTOTYPE / LOCAL DEMO", 900, 35, 316, 20, size: 10, color: muted, mono: true, alignment: .right)
    rule(62, 69, 1218, 69)
    text(scene.title, 64, 102, 1130, 72, size: 43, color: ink, weight: .medium, serif: true)
    text(scene.subtitle, 66, 177, 1100, 35, size: 16, color: muted)
    rule(62, 650, 1218, 650)
    text("RELAY  ·  HUMAN-REVIEWED CONTEXT", 62, 668, 650, 20, size: 10, color: muted, mono: true)
    let progressWidth = CGFloat(index + 1) / CGFloat(scenes.count) * 180
    box(986, 674, 180, 4, fill: line, radius: 2)
    box(986, 674, progressWidth, 4, fill: rust, radius: 2)
    text(String(format: "%02d / %02d", index + 1, scenes.count), 1168, 665, 50, 20, size: 9, color: muted, mono: true, alignment: .right)
}

func drawThread(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) {
    box(x, y, w, h, fill: white, stroke: line, radius: 10)
    text("REPAIR CAFÉ / PLANNING", x + 23, y + 20, w - 46, 22, size: 10, color: muted, weight: .medium, mono: true)
    rule(x + 20, y + 54, x + w - 20, y + 54)
    let allItems: [(String, String, NSColor)] = [
        ("Maya", "Let's plan the repair café for Saturday.", sage),
        ("Leo", "Keep it free and welcoming for beginners.", lavender),
        ("Maya", "I'll ask the library about a courtyard.", sage),
        ("Leo", "I can bring sewing kits and the bike stand.", lavender),
    ]
    let items = h >= 360 ? allItems : Array(allItems.prefix(3))
    let rowStart: CGFloat = h >= 360 ? 72 : 66
    let rowGap: CGFloat = h >= 360 ? 49 : 54
    for (index, item) in items.enumerated() {
        let rowY = y + rowStart + CGFloat(index) * rowGap
        box(x + 22, rowY, 5, 37, fill: item.2, radius: 2)
        text(item.0.uppercased(), x + 38, rowY, w - 58, 13, size: 9, color: muted, weight: .medium, mono: true)
        text(item.1, x + 38, rowY + 16, w - 58, 35, size: 12, color: ink)
    }
    box(x + 20, y + h - 97, w - 40, 70, fill: NSColor(srgbRed: 0.95, green: 0.93, blue: 0.89, alpha: 1), stroke: line, radius: 6)
    box(x + 31, y + h - 85, 4, 45, fill: rust, radius: 2)
    text("[PRIVATE ...]", x + 47, y + h - 83, w - 80, 17, size: 10, color: rust, weight: .medium, mono: true)
    text("Marker and following text excluded", x + 47, y + h - 61, w - 80, 18, size: 11, color: muted)
}

func drawCapsule(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, compact: Bool = false) {
    box(x, y, w, h, fill: white, stroke: line, radius: 10)
    text("YOUR HANDOFF CAPSULE", x + 22, y + 19, w - 44, 20, size: 10, color: muted, weight: .medium, mono: true)
    badge("LEO · PLANNING TEAM", x + 22, y + 48)
    let groups: [(String, String, NSColor)] = [
        ("DECISIONS", "Free, beginner-friendly repair café", rust),
        ("CONSTRAINTS", "No power tools; small repairs only", sage),
        ("OPEN QUESTIONS", "Confirm venue and rain plan", lavender),
        ("NEXT ACTIONS", "Maya asks library by Wednesday", rust),
    ]
    let startY = y + 94
    let gap: CGFloat = compact ? 53 : 58
    for (index, group) in groups.enumerated() {
        let rowY = startY + CGFloat(index) * gap
        text(group.0, x + 23, rowY, w - 46, 15, size: 9, color: group.2, weight: .medium, mono: true)
        text(group.1, x + 23, rowY + 19, w - 46, 31, size: compact ? 11 : 13, color: ink)
        if index < groups.count - 1 { rule(x + 22, rowY + gap - 6, x + w - 22, rowY + gap - 6) }
    }
    if !compact {
        box(x + 22, y + h - 58, w - 44, 36, fill: ink, radius: 5)
        text("CREATE HANDOFF PREVIEW   →", x + 32, y + h - 48, w - 64, 17, size: 9, color: white, weight: .medium, mono: true, alignment: .center)
    }
}

func drawMcpPanel(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat) {
    box(x, y, w, 372, fill: white, stroke: line, radius: 10)
    text("TRY THE RELAY MCP SERVER", x + 24, y + 20, w - 48, 18, size: 10, color: muted, weight: .medium, mono: true)
    text("MCP endpoint", x + 24, y + 56, w - 48, 16, size: 9, color: muted, weight: .medium, mono: true)
    box(x + 22, y + 79, w - 44, 42, fill: background, stroke: line, radius: 5)
    text("http://127.0.0.1:8787/mcp", x + 36, y + 92, w - 72, 17, size: 12, color: ink, mono: true)
    badge("LOCAL · CONNECTED", x + 24, y + 137, color: sage)
    text("TOOLS DISCOVERED", x + 24, y + 185, w - 48, 16, size: 9, color: muted, weight: .medium, mono: true)
    let tools: [(String, String)] = [
        ("relay_extract_context", "Extract reviewed context"),
        ("relay_create_handoff", "Return a preview-only snapshot"),
    ]
    for (index, tool) in tools.enumerated() {
        let rowY = y + 211 + CGFloat(index) * 53
        box(x + 22, rowY, w - 44, 43, fill: background, stroke: line, radius: 5)
        text(tool.0, x + 34, rowY + 5, w - 68, 15, size: 9, color: lavender, weight: .medium, mono: true)
        text(tool.1, x + 34, rowY + 22, w - 68, 15, size: 10, color: muted)
    }
    text("Streamable HTTP · protocol 2025-11-25", x + 24, y + 330, w - 48, 18, size: 10, color: muted, mono: true)
}

func drawPreview(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat) {
    box(x, y, w, 292, fill: white, stroke: line, radius: 10)
    text("MCP HANDOFF PREVIEW · V1", x + 22, y + 19, w - 44, 18, size: 10, color: muted, weight: .medium, mono: true)
    text("For Leo · planning team", x + 22, y + 48, w - 44, 28, size: 20, color: ink, serif: true)
    let rows: [(String, String, NSColor)] = [
        ("DECISION", "Keep the repair café free", rust),
        ("CONSTRAINT", "No power tools", sage),
        ("NEXT ACTION", "Maya confirms library by Wednesday", lavender),
    ]
    for (index, row) in rows.enumerated() {
        let rowY = y + 91 + CGFloat(index) * 48
        text(row.0, x + 22, rowY, w - 44, 13, size: 9, color: row.2, weight: .medium, mono: true)
        text(row.1, x + 22, rowY + 15, w - 44, 22, size: 12, color: ink)
    }
    box(x + 20, y + 244, w - 40, 31, fill: NSColor(srgbRed: 0.96, green: 0.93, blue: 0.88, alpha: 1), radius: 4)
    text("PREVIEW ONLY · NOT SENT OR SAVED", x + 24, y + 252, w - 48, 16, size: 9, color: rust, weight: .medium, mono: true, alignment: .center)
}

func drawScene(_ scene: Scene, index: Int) -> CGImage {
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    )!
    NSGraphicsContext.saveGraphicsState()
    let graphics = NSGraphicsContext(bitmapImageRep: bitmap)!
    NSGraphicsContext.current = graphics
    drawHeader(scene, index: index)

    switch scene.kind {
    case 0:
        drawThread(64, 255, 480, 334)
        rule(576, 425, 651, 425, color: rust, width: 2)
        text("SELECT", 576, 395, 75, 20, size: 9, color: rust, weight: .medium, mono: true, alignment: .center)
        drawCapsule(674, 233, 540, 390)
        text("A smaller handoff. A clearer next step.", 66, 595, 1050, 26, size: 13, color: muted)
    case 1:
        drawThread(64, 245, 690, 375)
        box(797, 271, 420, 270, fill: NSColor(srgbRed: 0.93, green: 0.92, blue: 0.88, alpha: 1), radius: 10)
        badge("EXPLICIT MARKER FILTER", 827, 302, color: rust, fill: NSColor(srgbRed: 0.98, green: 0.92, blue: 0.88, alpha: 1))
        text("A visible boundary.", 829, 353, 355, 40, size: 25, color: ink, serif: true)
        text("When enabled, [PRIVATE ...] and every line after it stay out of extraction.", 830, 407, 340, 79, size: 16, color: muted)
        text("Not a general sensitive-data detector.", 830, 505, 348, 23, size: 11, color: rust, weight: .medium, mono: true)
        text("Review the original and the capsule before sharing.", 66, 622, 900, 18, size: 11, color: muted)
    case 2:
        drawCapsule(64, 243, 660, 385)
        box(764, 264, 452, 322, fill: NSColor(srgbRed: 0.93, green: 0.92, blue: 0.88, alpha: 1), radius: 10)
        text("THE SENDER STAYS IN CONTROL", 791, 292, 405, 20, size: 10, color: sage, weight: .medium, mono: true)
        text("Keep only what helps the next person.", 791, 336, 360, 75, size: 26, color: ink, serif: true)
        let points = ["Edit or remove extracted details", "Add missing actions or questions", "Pick the intended recipient", "Publish a preview only after review"]
        for (index, point) in points.enumerated() {
            let rowY = 441 + CGFloat(index) * 35
            box(793, rowY + 3, 16, 16, fill: sage, radius: 8)
            text("✓", 796, rowY + 4, 12, 13, size: 9, color: white, weight: .bold)
            text(point, 822, rowY, 363, 23, size: 13, color: ink)
        }
    case 3:
        box(64, 250, 552, 372, fill: NSColor(srgbRed: 0.93, green: 0.92, blue: 0.88, alpha: 1), radius: 10)
        text("OPEN STANDARD", 94, 281, 450, 18, size: 10, color: sage, weight: .medium, mono: true)
        text("One MCP server.", 92, 324, 430, 38, size: 26, color: ink, serif: true)
        text("A browser client for judges. The same tools can be discovered by a compatible agent.", 94, 377, 422, 66, size: 15, color: muted)
        badge("STATELESS STREAMABLE HTTP", 94, 476, color: lavender, fill: NSColor(srgbRed: 0.92, green: 0.90, blue: 0.95, alpha: 1))
        text("Local endpoint · localhost only", 95, 527, 430, 21, size: 11, color: muted, mono: true)
        drawMcpPanel(648, 245, 568)
    case 4:
        box(64, 246, 548, 372, fill: NSColor(srgbRed: 0.93, green: 0.92, blue: 0.88, alpha: 1), radius: 10)
        text("TOOL 01 · EXTRACT", 92, 276, 465, 18, size: 10, color: lavender, weight: .medium, mono: true)
        text("A structured draft.", 91, 314, 445, 37, size: 25, color: ink, serif: true)
        let labels = ["Decisions", "Constraints", "Open questions", "Next actions"]
        for (index, label) in labels.enumerated() {
            let rowY = 374 + CGFloat(index) * 39
            rule(94, rowY + 26, 575, rowY + 26)
            text(label, 97, rowY, 235, 21, size: 13, color: ink)
            text(index == 0 ? "1" : index == 1 ? "1" : index == 2 ? "1" : "2", 530, rowY, 35, 20, size: 12, color: muted, mono: true, alignment: .right)
        }
        text("Human review happens in the capsule.", 95, 554, 470, 22, size: 11, color: muted)
        drawPreview(650, 284, 566)
    case 5:
        box(64, 248, 526, 368, fill: white, stroke: line, radius: 10)
        text("DEFAULT", 92, 279, 460, 18, size: 10, color: sage, weight: .medium, mono: true)
        text("Local heuristic", 91, 318, 430, 34, size: 25, color: ink, serif: true)
        text("Works with no AWS account, key, or network model call.", 92, 367, 438, 55, size: 14, color: muted)
        badge("NO CLOUD TRANSFER", 92, 445)
        rule(92, 493, 555, 493)
        text("OPTIONAL · AMAZON BEDROCK CONVERSE", 92, 515, 454, 17, size: 9, color: rust, weight: .medium, mono: true)
        text("Explicit consent is required before sending non-excluded text.", 92, 545, 440, 45, size: 12, color: ink)

        box(626, 248, 590, 368, fill: NSColor(srgbRed: 0.93, green: 0.92, blue: 0.88, alpha: 1), radius: 10)
        text("HONEST STATUS", 654, 280, 515, 18, size: 10, color: rust, weight: .medium, mono: true)
        text("Implemented. Not yet verified.", 652, 319, 512, 38, size: 24, color: ink, serif: true)
        text("AWS credentials and enabled model access are not configured in this demo.", 654, 371, 493, 54, size: 14, color: muted)
        badge("BEDROCK INFERENCE UNTESTED", 654, 457, color: rust, fill: NSColor(srgbRed: 0.98, green: 0.92, blue: 0.88, alpha: 1))
        text("The MCP consent gate is covered by integration tests.", 655, 513, 510, 21, size: 11, color: muted)
    default:
        box(64, 260, 1152, 350, fill: ink, radius: 14)
        text("RELAY", 99, 294, 1060, 23, size: 12, color: NSColor(srgbRed: 0.74, green: 0.80, blue: 0.71, alpha: 1), weight: .medium, mono: true)
        text("Context that travels well.", 99, 350, 1060, 63, size: 44, color: white, weight: .medium, serif: true)
        text("User-reviewed handoffs · MCP Streamable HTTP · privacy boundaries", 102, 439, 1045, 27, size: 15, color: NSColor(srgbRed: 0.81, green: 0.82, blue: 0.76, alpha: 1))
        rule(101, 502, 1179, 502, color: NSColor(srgbRed: 0.39, green: 0.42, blue: 0.37, alpha: 1))
        text("ALEXA+ CONCEPT SIMULATION · NOT AN ALEXA INTEGRATION", 102, 532, 1040, 20, size: 10, color: NSColor(srgbRed: 0.86, green: 0.69, blue: 0.56, alpha: 1), weight: .medium, mono: true)
    }

    graphics.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()
    return bitmap.cgImage!
}

func runProcess(_ executable: String, _ arguments: [String]) throws {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: executable)
    process.arguments = arguments
    try process.run()
    process.waitUntilExit()
    guard process.terminationStatus == 0 else {
        throw NSError(domain: "RelayVideo", code: Int(process.terminationStatus), userInfo: [
            NSLocalizedDescriptionKey: "\(URL(fileURLWithPath: executable).lastPathComponent) failed with exit code \(process.terminationStatus).",
        ])
    }
}

func makePixelBuffer(_ pool: CVPixelBufferPool) throws -> CVPixelBuffer {
    var optionalBuffer: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, pool, &optionalBuffer)
    guard status == kCVReturnSuccess, let buffer = optionalBuffer else {
        throw NSError(domain: "RelayVideo", code: Int(status), userInfo: [
            NSLocalizedDescriptionKey: "Could not allocate a video frame.",
        ])
    }
    return buffer
}

func drawFrame(_ image: CGImage, into buffer: CVPixelBuffer) throws {
    CVPixelBufferLockBaseAddress(buffer, [])
    defer { CVPixelBufferUnlockBaseAddress(buffer, []) }
    guard let baseAddress = CVPixelBufferGetBaseAddress(buffer),
          let context = CGContext(
            data: baseAddress,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
          ) else {
        throw NSError(domain: "RelayVideo", code: 1, userInfo: [
            NSLocalizedDescriptionKey: "Could not render a video frame.",
        ])
    }
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
}

func renderSilentVideo(images: [CGImage], durations: [Double], url: URL) throws {
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 3_200_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        ],
    ]
    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false
    let attributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
        kCVPixelBufferCGImageCompatibilityKey as String: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
    ]
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: attributes
    )
    writer.add(input)
    guard writer.startWriting() else {
        throw writer.error ?? NSError(domain: "RelayVideo", code: 2, userInfo: [
            NSLocalizedDescriptionKey: "Could not start writing the MP4.",
        ])
    }
    writer.startSession(atSourceTime: .zero)
    guard let pool = adaptor.pixelBufferPool else {
        throw NSError(domain: "RelayVideo", code: 3, userInfo: [
            NSLocalizedDescriptionKey: "Could not create the video frame pool.",
        ])
    }

    var frameNumber: Int64 = 0
    for (index, image) in images.enumerated() {
        let frameCount = Int((durations[index] * Double(framesPerSecond)).rounded())
        for _ in 0..<frameCount {
            while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.003) }
            let buffer = try makePixelBuffer(pool)
            try drawFrame(image, into: buffer)
            let timestamp = CMTime(value: frameNumber, timescale: framesPerSecond)
            guard adaptor.append(buffer, withPresentationTime: timestamp) else {
                throw writer.error ?? NSError(domain: "RelayVideo", code: 4, userInfo: [
                    NSLocalizedDescriptionKey: "Could not append a video frame.",
                ])
            }
            frameNumber += 1
        }
    }
    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    guard writer.status == .completed else {
        throw writer.error ?? NSError(domain: "RelayVideo", code: 5, userInfo: [
            NSLocalizedDescriptionKey: "The silent video export did not complete.",
        ])
    }
}

func muxNarration(videoURL: URL, audioURLs: [URL], durations: [Double], outputURL: URL) async throws {
    let composition = AVMutableComposition()
    let sourceVideo = AVURLAsset(url: videoURL)
    guard let sourceVideoTrack = try await sourceVideo.loadTracks(withMediaType: .video).first,
          let compositionVideo = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw NSError(domain: "RelayVideo", code: 6, userInfo: [
            NSLocalizedDescriptionKey: "Could not prepare the video track.",
        ])
    }
    let videoDuration = try await sourceVideo.load(.duration)
    try compositionVideo.insertTimeRange(CMTimeRange(start: .zero, duration: videoDuration), of: sourceVideoTrack, at: .zero)

    guard let compositionAudio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
        throw NSError(domain: "RelayVideo", code: 7, userInfo: [
            NSLocalizedDescriptionKey: "Could not prepare the narration track.",
        ])
    }
    var cursor = CMTime.zero
    for (index, audioURL) in audioURLs.enumerated() {
        let audioAsset = AVURLAsset(url: audioURL)
        guard let audioTrack = try await audioAsset.loadTracks(withMediaType: .audio).first else {
            throw NSError(domain: "RelayVideo", code: 8, userInfo: [
                NSLocalizedDescriptionKey: "Narration clip \(index + 1) has no audio track.",
            ])
        }
        let audioDuration = try await audioAsset.load(.duration)
        try compositionAudio.insertTimeRange(
            CMTimeRange(start: .zero, duration: audioDuration),
            of: audioTrack,
            at: cursor
        )
        cursor = CMTimeAdd(cursor, CMTime(seconds: durations[index], preferredTimescale: 600))
    }

    guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
        throw NSError(domain: "RelayVideo", code: 9, userInfo: [
            NSLocalizedDescriptionKey: "Could not create the final MP4 exporter.",
        ])
    }
    exporter.outputURL = outputURL
    exporter.outputFileType = .mp4
    exporter.shouldOptimizeForNetworkUse = true
    await exporter.export()
    guard exporter.status == .completed else {
        throw exporter.error ?? NSError(domain: "RelayVideo", code: 10, userInfo: [
            NSLocalizedDescriptionKey: "The final MP4 export did not complete.",
        ])
    }
}

func audioDuration(_ url: URL) throws -> Double {
    let audio = try AVAudioFile(forReading: url)
    return Double(audio.length) / audio.processingFormat.sampleRate
}

func createDemoVideo() async throws {
    try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
    let audioURLs = scenes.indices.map { outputDirectory.appendingPathComponent("relay-narration-\($0).aiff") }
    for (index, scene) in scenes.enumerated() {
        try runProcess("/usr/bin/say", [
            "-v", "Samantha",
            "-r", "178",
            "-o", audioURLs[index].path,
            scene.narration,
        ])
    }
    let speechDurations = try audioURLs.map(audioDuration)
    let sceneDurations = speechDurations.map { $0 + 0.65 }
    let images = scenes.enumerated().map { index, scene in drawScene(scene, index: index) }
    let silentURL = outputDirectory.appendingPathComponent("relay-demo-silent.mp4")
    let finalURL = outputDirectory.appendingPathComponent("relay-demo.mp4")
    try? FileManager.default.removeItem(at: silentURL)
    try? FileManager.default.removeItem(at: finalURL)
    try renderSilentVideo(images: images, durations: sceneDurations, url: silentURL)
    try await muxNarration(videoURL: silentURL, audioURLs: audioURLs, durations: sceneDurations, outputURL: finalURL)
    try? FileManager.default.removeItem(at: silentURL)
    for audioURL in audioURLs { try? FileManager.default.removeItem(at: audioURL) }
    let attributes = try FileManager.default.attributesOfItem(atPath: finalURL.path)
    let bytes = attributes[.size] as? NSNumber ?? 0
    let length = sceneDurations.reduce(0, +)
    print(String(format: "Created %@ · %.1f sec · 1280x720 · %.1f MB", finalURL.path, length, bytes.doubleValue / 1_000_000))
}

do {
    try await createDemoVideo()
} catch {
    fputs("Could not create Relay demo video: \(error.localizedDescription)\n", stderr)
    exit(1)
}
