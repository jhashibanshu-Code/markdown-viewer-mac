import AppKit
import Foundation

let videoWidth = 1600
let videoHeight = 900
let fps: Int32 = 30
let duration = 23.0
let frameCount = Int(duration * Double(fps))
let root = FileManager.default.currentDirectoryPath
let outputDir = URL(fileURLWithPath: root).appendingPathComponent("docs/marketing/ads/output")
let videoURL = outputDir.appendingPathComponent("repo-brain-video.mp4")
let posterURL = outputDir.appendingPathComponent("repo-brain-video-poster.png")
let framesURL = outputDir.appendingPathComponent("repo-brain-frames")

try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: true)
try? FileManager.default.removeItem(at: videoURL)
try? FileManager.default.removeItem(at: posterURL)

struct RGB {
    let r: CGFloat
    let g: CGFloat
    let b: CGFloat

    var color: NSColor {
        NSColor(calibratedRed: r / 255, green: g / 255, blue: b / 255, alpha: 1)
    }
}

struct Node {
    let id: Int
    let cluster: Int
    let x: CGFloat
    let y: CGFloat
    let z: CGFloat
    let radius: CGFloat
    let color: RGB
    let hub: Bool
}

struct Projected {
    let x: CGFloat
    let y: CGFloat
    let s: CGFloat
    let z: CGFloat
}

struct Edge {
    let a: Int
    let b: Int
    let phase: CGFloat
}

struct RNG {
    var state: UInt64 = 0x1234ABCD

    mutating func next() -> CGFloat {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return CGFloat((state >> 33) & 0xFFFF) / CGFloat(0xFFFF)
    }
}

let palette = [
    RGB(r: 117, g: 231, b: 205),
    RGB(r: 148, g: 197, b: 255),
    RGB(r: 255, g: 199, b: 111),
    RGB(r: 255, g: 134, b: 151),
    RGB(r: 207, g: 186, b: 255),
    RGB(r: 190, g: 243, b: 128),
]

let files = [
    "CLAUDE.md", "AGENTS.md", "src/renderer.js", "mcp-server.mjs", "scripts/export-map.mjs",
    "docs/architecture.md", "src/graph/index.ts", "src/context/routes.ts", "README.md", "package.json",
    "src/search/vault.ts", "src/editor/tabs.ts", "src/preview/markdown.ts", "docs/release.md",
    "src/ai/context.ts", "src/map/hubs.ts", "src/map/bridges.ts", "src/map/orphans.ts",
]

var rng = RNG()
var nodes: [Node] = []
for i in 0..<120 {
    let cluster = i % 6
    let ring = CGFloat(90 + (i / 6) * 8)
    let angle = CGFloat(i) * 2.39996323
    let r = cluster == 0 || i % 17 == 0 ? CGFloat(5.6) : CGFloat(2.6) + rng.next() * 1.8
    nodes.append(Node(
        id: i,
        cluster: cluster,
        x: cos(angle) * ring + CGFloat(cluster - 2) * 42,
        y: sin(angle) * ring * 0.62 + sin(CGFloat(cluster)) * 35,
        z: sin(angle * 0.73) * 240 + CGFloat(cluster) * 22,
        radius: r,
        color: palette[cluster],
        hub: i % 23 == 0 || (cluster == 0 && i % 9 == 0)
    ))
}

var edges: [Edge] = []
for i in 0..<nodes.count {
    for j in (i + 1)..<nodes.count {
        let same = nodes[i].cluster == nodes[j].cluster
        let chance: CGFloat = same ? 0.045 : 0.006
        if rng.next() < chance {
            edges.append(Edge(a: i, b: j, phase: rng.next()))
        }
    }
}
for i in 0..<22 {
    edges.append(Edge(a: i, b: (i * 13 + 29) % nodes.count, phase: rng.next()))
}

func clamp(_ v: CGFloat) -> CGFloat {
    min(1, max(0, v))
}

func ease(_ value: CGFloat) -> CGFloat {
    let v = clamp(value)
    if v < 0.5 {
        return 4 * v * v * v
    }
    return 1 - pow(-2 * v + 2, 3) / 2
}

func sceneEase(_ t: CGFloat, _ s: CGFloat, _ d: CGFloat) -> CGFloat {
    ease((t - s) / d)
}

func fade(_ t: CGFloat, _ s: CGFloat, _ d: CGFloat) -> CGFloat {
    1 - ease((t - s) / d)
}

func alphaInOut(_ t: CGFloat, _ s: CGFloat, _ life: CGFloat, _ edge: CGFloat = 0.8) -> CGFloat {
    min(sceneEase(t, s, edge), fade(t, s + life - edge, edge))
}

func setColor(_ color: NSColor, alpha: CGFloat = 1) {
    color.withAlphaComponent(alpha).set()
}

func fillRect(_ rect: CGRect, color: NSColor, alpha: CGFloat = 1) {
    setColor(color, alpha: alpha)
    NSBezierPath(rect: rect).fill()
}

func strokePath(_ path: NSBezierPath, color: NSColor, alpha: CGFloat = 1, width: CGFloat = 1) {
    setColor(color, alpha: alpha)
    path.lineWidth = width
    path.stroke()
}

func fillOval(x: CGFloat, y: CGFloat, radius: CGFloat, color: NSColor, alpha: CGFloat = 1) {
    setColor(color, alpha: alpha)
    NSBezierPath(ovalIn: CGRect(x: x - radius, y: y - radius, width: radius * 2, height: radius * 2)).fill()
}

func fillRoundRect(x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat, r: CGFloat, color: NSColor, alpha: CGFloat = 1) {
    setColor(color, alpha: alpha)
    NSBezierPath(roundedRect: CGRect(x: x, y: y, width: w, height: h), xRadius: r, yRadius: r).fill()
}

func strokeRoundRect(x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat, r: CGFloat, color: NSColor, alpha: CGFloat = 1, width: CGFloat = 1) {
    let path = NSBezierPath(roundedRect: CGRect(x: x, y: y, width: w, height: h), xRadius: r, yRadius: r)
    strokePath(path, color: color, alpha: alpha, width: width)
}

func drawText(_ value: String, x: CGFloat, y: CGFloat, size: CGFloat, weight: NSFont.Weight = .semibold, color: NSColor = .white, alpha: CGFloat = 1, align: NSTextAlignment = .left, lineHeight: CGFloat = 1.18) {
    guard alpha > 0.01 else { return }
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = align
    let font = NSFont.systemFont(ofSize: size, weight: weight)
    let attrs: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color.withAlphaComponent(alpha),
        .paragraphStyle: paragraph,
    ]

    var yy = y
    for line in value.components(separatedBy: "\n") {
        let ns = line as NSString
        let measured = ns.size(withAttributes: attrs)
        var xx = x
        if align == .center {
            xx -= measured.width / 2
        } else if align == .right {
            xx -= measured.width
        }
        ns.draw(at: CGPoint(x: xx, y: yy), withAttributes: attrs)
        yy += size * lineHeight
    }
}

func drawPill(_ label: String, x: CGFloat, y: CGFloat, w: CGFloat, alpha: CGFloat, color: NSColor) {
    guard alpha > 0.01 else { return }
    fillRoundRect(x: x, y: y, w: w, h: 38, r: 19, color: color, alpha: alpha * 0.16)
    strokeRoundRect(x: x, y: y, w: w, h: 38, r: 19, color: .white, alpha: alpha * 0.14, width: 1)
    drawText(label, x: x + w / 2, y: y + 10, size: 14, weight: .bold, color: NSColor(calibratedWhite: 0.96, alpha: 1), alpha: alpha, align: .center)
}

func project(_ n: Node, t: CGFloat, scale: CGFloat, w: CGFloat, h: CGFloat) -> Projected {
    let rot = t * 0.18
    let x = n.x * cos(rot) - n.z * sin(rot)
    let z = n.x * sin(rot) + n.z * cos(rot)
    let y = n.y * cos(rot * 0.42) - z * sin(rot * 0.42) * 0.14
    let perspective = CGFloat(700) / (760 + z)
    return Projected(
        x: w * 0.56 + x * perspective * scale,
        y: h * 0.51 + y * perspective * scale,
        s: perspective,
        z: z
    )
}

func drawGraph(t: CGFloat, alpha: CGFloat, scale: CGFloat, pulse: CGFloat, w: CGFloat, h: CGFloat) {
    guard alpha > 0.01 else { return }
    let projected = nodes.map { project($0, t: t, scale: scale, w: w, h: h) }

    for e in edges {
        let a = projected[e.a]
        let b = projected[e.b]
        let n = nodes[e.a]
        let edgePulse = 0.18 + 0.22 * max(0, sin(t * 2.8 + e.phase * .pi * 2 + pulse * .pi * 2))
        let path = NSBezierPath()
        path.move(to: CGPoint(x: a.x, y: a.y))
        let cx = (a.x + b.x) / 2 + (b.y - a.y) * 0.035
        let cy = (a.y + b.y) / 2 - (b.x - a.x) * 0.035
        path.curve(to: CGPoint(x: b.x, y: b.y), controlPoint1: CGPoint(x: cx, y: cy), controlPoint2: CGPoint(x: cx, y: cy))
        strokePath(path, color: n.color.color, alpha: edgePulse * alpha, width: max(0.4, (a.s + b.s) * 0.55))
    }

    let sorted = nodes.indices.sorted { projected[$0].z < projected[$1].z }
    for i in sorted {
        let n = nodes[i]
        let p = projected[i]
        let active = n.hub || sin(t * 2 + CGFloat(i) * 0.37 + pulse * 6) > 0.72
        let radius = max(1.2, (n.radius + (active ? 2.4 : 0)) * p.s * scale)
        if n.hub {
            for k in stride(from: 4, through: 1, by: -1) {
                fillOval(x: p.x, y: p.y, radius: radius * CGFloat(k) * 1.8, color: n.color.color, alpha: alpha * 0.018 / CGFloat(k))
            }
        }
        fillOval(x: p.x, y: p.y, radius: radius, color: n.color.color, alpha: (active ? 0.96 : 0.62) * alpha)
        let outline = NSBezierPath(ovalIn: CGRect(x: p.x - radius, y: p.y - radius, width: radius * 2, height: radius * 2))
        strokePath(outline, color: .white, alpha: 0.34 * alpha, width: 0.8)
    }
}

func clearCanvas(w: CGFloat, h: CGFloat) {
    fillRect(CGRect(x: 0, y: 0, width: w, height: h), color: NSColor(calibratedRed: 0.018, green: 0.024, blue: 0.036, alpha: 1))
    for i in 0..<28 {
        let x = CGFloat(i * 173 % 1600)
        let y = CGFloat(i * 97 % 900)
        fillOval(x: x, y: y, radius: CGFloat(90 + (i % 5) * 36), color: NSColor(calibratedRed: 0.14, green: 0.22, blue: 0.34, alpha: 1), alpha: 0.012)
    }
    fillOval(x: w * 0.56, y: h * 0.46, radius: 360, color: palette[0].color, alpha: 0.028)
    fillOval(x: w * 0.72, y: h * 0.58, radius: 300, color: palette[4].color, alpha: 0.016)
}

func drawWrongReads(t: CGFloat, w: CGFloat, h: CGFloat) {
    let a = alphaInOut(t, 0.2, 6.4, 0.8)
    guard a > 0.01 else { return }
    let left = max(CGFloat(48), w * 0.075)
    let top = h * 0.19
    drawText("The model is smart.", x: left, y: top, size: 52, weight: .heavy, color: .white, alpha: a)
    drawText("The repo is bigger than its working memory.", x: left, y: top + 64, size: 30, weight: .medium, color: NSColor(calibratedRed: 0.66, green: 0.71, blue: 0.79, alpha: 1), alpha: a)
    drawText("Wrong output usually starts before the answer:\nit read the wrong files.", x: left, y: top + 142, size: 30, weight: .bold, color: NSColor(calibratedRed: 1, green: 0.70, blue: 0.75, alpha: 1), alpha: a)

    let boxX = left
    let boxY = top + 244
    fillRoundRect(x: boxX, y: boxY, w: 560, h: 250, r: 22, color: .white, alpha: 0.055 * a)
    strokeRoundRect(x: boxX, y: boxY, w: 560, h: 250, r: 22, color: .white, alpha: 0.12 * a)
    drawText("AI context run", x: boxX + 28, y: boxY + 25, size: 16, weight: .bold, color: NSColor(calibratedWhite: 0.86, alpha: 1), alpha: a)

    let progress = clamp((t - 1.3) / 4.8)
    for i in 0..<files.count {
        let row = boxY + 58 + CGFloat(i) * 22
        if row > boxY + 220 { break }
        let visible = progress * CGFloat(files.count) > CGFloat(i)
        let prefix = visible ? "Reading " : "Waiting  "
        drawText(prefix + files[i], x: boxX + 28, y: row, size: 14, weight: .medium, color: visible ? NSColor(calibratedWhite: 0.94, alpha: 1) : NSColor(calibratedRed: 0.35, green: 0.39, blue: 0.46, alpha: 1), alpha: a * (visible ? 0.9 : 0.45))
    }
    let cost = 2.4 + progress * 4.68
    drawText(String(format: "$%.2f", Double(cost)), x: boxX + 435, y: boxY + 35, size: 34, weight: .heavy, color: NSColor(calibratedRed: 1, green: 0.77, blue: 0.44, alpha: 1), alpha: a, align: .right)
    drawText("context tax", x: boxX + 450, y: boxY + 45, size: 14, weight: .semibold, color: NSColor(calibratedRed: 0.55, green: 0.60, blue: 0.67, alpha: 1), alpha: a)
}

func drawTransformation(t: CGFloat, w: CGFloat, h: CGFloat) {
    let a = alphaInOut(t, 5.4, 9.4, 1.2)
    let p = sceneEase(t, 5.5, 4.2)
    drawGraph(t: t, alpha: a, scale: 0.82 + 0.22 * p, pulse: p, w: w, h: h)
    guard a > 0.01 else { return }
    let x = max(CGFloat(52), w * 0.07)
    drawText("Build the map once.", x: x, y: h * 0.19, size: 50, weight: .heavy, color: .white, alpha: a)
    drawText("Every AI run starts with the route.", x: x, y: h * 0.255, size: 30, weight: .medium, color: NSColor(calibratedRed: 0.67, green: 0.72, blue: 0.80, alpha: 1), alpha: a)
    drawPill("hubs", x: x, y: h * 0.34, w: 86, alpha: a, color: palette[0].color)
    drawPill("bridges", x: x + 102, y: h * 0.34, w: 112, alpha: a, color: palette[2].color)
    drawPill("orphans", x: x + 230, y: h * 0.34, w: 112, alpha: a, color: palette[3].color)
    drawPill("reading order", x: x + 358, y: h * 0.34, w: 154, alpha: a, color: palette[1].color)

    let pulseA = alphaInOut(t, 8.2, 4.4, 0.7)
    drawText("Open your repo's brain.", x: w * 0.5, y: h * 0.84, size: 42, weight: .heavy, color: .white, alpha: pulseA, align: .center)
}

func drawProof(t: CGFloat, w: CGFloat, h: CGFloat) {
    let a = alphaInOut(t, 12.0, 6.1, 0.75)
    guard a > 0.01 else { return }
    drawGraph(t: t, alpha: a * 0.62, scale: 0.72, pulse: 0.8, w: w, h: h)
    let x = w * 0.1
    let y = h * 0.2
    drawText("Reason to believe", x: x, y: y, size: 23, weight: .bold, color: palette[0].color, alpha: a)
    drawText("924 files", x: x, y: y + 72, size: 66, weight: .heavy, color: .white, alpha: a)
    drawText("2,359,465 raw tokens", x: x, y: y + 120, size: 26, weight: .semibold, color: NSColor(calibratedRed: 0.67, green: 0.72, blue: 0.80, alpha: 1), alpha: a)
    drawText("10,812 map tokens", x: x, y: y + 160, size: 32, weight: .heavy, color: palette[0].color, alpha: a)
    drawText("218:1 compression", x: x, y: y + 224, size: 54, weight: .heavy, color: palette[2].color, alpha: a)
    drawText("Less rereading. Fewer wrong turns. Lower cost per run.", x: x, y: y + 282, size: 25, weight: .medium, color: NSColor(calibratedRed: 0.79, green: 0.82, blue: 0.87, alpha: 1), alpha: a)

    let right = w * 0.76
    drawText("From", x: right, y: h * 0.31, size: 18, weight: .bold, color: NSColor(calibratedRed: 0.56, green: 0.61, blue: 0.68, alpha: 1), alpha: a, align: .center)
    drawText("300 files", x: right, y: h * 0.37, size: 40, weight: .heavy, color: NSColor(calibratedRed: 1, green: 0.70, blue: 0.75, alpha: 1), alpha: a, align: .center)
    drawText("to", x: right, y: h * 0.48, size: 18, weight: .bold, color: NSColor(calibratedRed: 0.56, green: 0.61, blue: 0.68, alpha: 1), alpha: a, align: .center)
    drawText("the 3-10 files\nthat matter", x: right, y: h * 0.56, size: 42, weight: .heavy, color: .white, alpha: a, align: .center)
}

func drawFinal(t: CGFloat, w: CGFloat, h: CGFloat) {
    let a = sceneEase(t, 17.3, 1.2)
    drawGraph(t: t, alpha: a * 0.48, scale: 0.54, pulse: 1, w: w, h: h)
    drawText("Shibanshu Markdown Viewer", x: w / 2, y: h * 0.28, size: 42, weight: .heavy, color: .white, alpha: a, align: .center)
    drawText("Stop paying AI to get lost.", x: w / 2, y: h * 0.43, size: 74, weight: .heavy, color: .white, alpha: a, align: .center)
    drawText("Open folder  ->  Map the repo  ->  Copy AI context", x: w / 2, y: h * 0.56, size: 28, weight: .bold, color: palette[0].color, alpha: a, align: .center)
    drawText("Markdown viewer · 3D repo graph · Claude.md maps · offline context export", x: w / 2, y: h * 0.66, size: 21, weight: .medium, color: NSColor(calibratedRed: 0.68, green: 0.72, blue: 0.78, alpha: 1), alpha: a, align: .center)
    drawText("Better answers. Lower context cost. Faster understanding.", x: w / 2, y: h * 0.76, size: 28, weight: .bold, color: palette[2].color, alpha: a, align: .center)
}

func renderFrame(context: CGContext, t: CGFloat) {
    let previous = NSGraphicsContext.current
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    defer { NSGraphicsContext.current = previous }

    let w = CGFloat(videoWidth)
    let h = CGFloat(videoHeight)
    clearCanvas(w: w, h: h)
    drawWrongReads(t: t, w: w, h: h)
    drawTransformation(t: t, w: w, h: h)
    drawProof(t: t, w: w, h: h)
    drawFinal(t: t, w: w, h: h)
}

func writePoster() throws {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: videoWidth,
        pixelsHigh: videoHeight,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bitmapFormat: [.alphaFirst],
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        throw NSError(domain: "render", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not create poster bitmap"])
    }
    guard let cg = NSGraphicsContext(bitmapImageRep: rep)?.cgContext else {
        throw NSError(domain: "render", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not create poster context"])
    }
    renderFrame(context: cg, t: 10.2)
    guard let png = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "render", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not encode poster PNG"])
    }
    try png.write(to: posterURL)
}

func writePNGFrame(index: Int, t: CGFloat) throws {
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: videoWidth,
        pixelsHigh: videoHeight,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bitmapFormat: [.alphaFirst],
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        throw NSError(domain: "render", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not create frame bitmap"])
    }
    guard let cg = NSGraphicsContext(bitmapImageRep: rep)?.cgContext else {
        throw NSError(domain: "render", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not create frame context"])
    }
    renderFrame(context: cg, t: t)
    guard let png = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "render", code: 6, userInfo: [NSLocalizedDescriptionKey: "Could not encode frame PNG"])
    }
    let file = framesURL.appendingPathComponent(String(format: "frame-%04d.png", index))
    try png.write(to: file)
}

if CommandLine.arguments.contains("--frames") {
    try? FileManager.default.removeItem(at: framesURL)
    try FileManager.default.createDirectory(at: framesURL, withIntermediateDirectories: true)
    for frame in 0..<frameCount {
        try autoreleasepool {
            try writePNGFrame(index: frame, t: CGFloat(Double(frame) / Double(fps)))
        }
        if frame % Int(fps * 5) == 0 {
            print("Rendered frame \(frame)/\(frameCount)")
        }
    }
    try writePoster()
    print("Frames written: \(framesURL.path)")
    print("Poster written: \(posterURL.path)")
    exit(0)
}

if CommandLine.arguments.contains("--poster-only") {
    try writePoster()
    print("Poster written: \(posterURL.path)")
    exit(0)
}

print("Use --frames to render PNG frames, --poster-only to render the poster, or run node scripts/render-repo-brain-video.mjs to build the MP4.")
