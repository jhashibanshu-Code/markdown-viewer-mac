#!/usr/bin/env python3
from __future__ import annotations

import argparse
import math
import os
import random
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ADS_DIR = ROOT / "docs" / "marketing" / "ads"
OUTPUT_DIR = ADS_DIR / "output"
FRAMES_DIR = OUTPUT_DIR / "athena-premium-short-frames"
VIDEO_PATH = OUTPUT_DIR / "athena-premium-short.mp4"
POSTER_PATH = OUTPUT_DIR / "athena-premium-short-poster.png"
MUSIC_PATH = ADS_DIR / "music.mp3"

WIDTH = 1920
HEIGHT = 1080
FPS = 24
DURATION = 26.0
FRAME_COUNT = int(DURATION * FPS)
TAU = math.pi * 2

FONT_SANS = "/System/Library/Fonts/SFNS.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"
FFMPEG_CANDIDATES = [
    "/opt/homebrew/opt/ffmpeg@7/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
    "ffmpeg",
]


COLORS = {
    "white": (255, 255, 255),
    "pearl": (245, 247, 251),
    "zinc": (161, 161, 170),
    "dim": (82, 82, 91),
    "teal": (94, 234, 212),
    "red": (248, 113, 113),
    "gold": (251, 191, 36),
    "sky": (125, 211, 252),
    "violet": (196, 181, 253),
    "green": (134, 239, 172),
}


def resolve_ffmpeg() -> str:
    for candidate in FFMPEG_CANDIDATES:
        if "/" in candidate:
            if Path(candidate).exists():
                return candidate
        elif shutil.which(candidate):
            return candidate
    raise RuntimeError("ffmpeg was not found")


def clamp(v: float) -> float:
    return max(0.0, min(1.0, v))


def ease(v: float) -> float:
    v = clamp(v)
    if v < 0.5:
        return 4 * v * v * v
    return 1 - ((-2 * v + 2) ** 3) / 2


def ease_out(v: float) -> float:
    return 1 - (1 - clamp(v)) ** 3


def fi(t: float, start: float, duration: float) -> float:
    return ease((t - start) / duration)


def fo(t: float, start: float, duration: float) -> float:
    return 1 - ease((t - start) / duration)


def live(t: float, start: float, end: float, edge: float = 0.55) -> float:
    return min(fi(t, start, edge), fo(t, end - edge, edge))


font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def get_font(size: int, mono: bool = False) -> ImageFont.FreeTypeFont:
    key = ("mono" if mono else "sans", size)
    if key not in font_cache:
        font_cache[key] = ImageFont.truetype(FONT_MONO if mono else FONT_SANS, size)
    return font_cache[key]


def rgba(color: tuple[int, int, int], alpha: float) -> tuple[int, int, int, int]:
    return (color[0], color[1], color[2], int(255 * clamp(alpha)))


def text(
    layer: Image.Image,
    value: str,
    x: float,
    y: float,
    size: int,
    color: tuple[int, int, int],
    alpha: float = 1.0,
    align: str = "left",
    mono: bool = False,
    line_height: float = 1.16,
) -> None:
    if alpha <= 0.01:
        return
    draw = ImageDraw.Draw(layer)
    font = get_font(size, mono=mono)
    yy = y
    for line in str(value).split("\n"):
        bbox = draw.textbbox((0, 0), line, font=font)
        width = bbox[2] - bbox[0]
        xx = x
        if align == "center":
            xx -= width / 2
        elif align == "right":
            xx -= width
        draw.text((xx, yy), line, fill=rgba(color, alpha), font=font)
        yy += size * line_height


def rounded_panel(layer: Image.Image, x: float, y: float, w: float, h: float, alpha: float = 1.0) -> None:
    if alpha <= 0.01:
        return
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle(
        (x, y, x + w, y + h),
        radius=18,
        fill=(255, 255, 255, int(255 * 0.035 * alpha)),
        outline=(255, 255, 255, int(255 * 0.085 * alpha)),
        width=1,
    )


def chip(layer: Image.Image, label: str, x: float, y: float, color: tuple[int, int, int], alpha: float = 1.0) -> float:
    if alpha <= 0.01:
        return 0.0
    draw = ImageDraw.Draw(layer)
    f = get_font(18, mono=True)
    bbox = draw.textbbox((0, 0), label, font=f)
    w = bbox[2] - bbox[0] + 34
    draw.rounded_rectangle(
        (x, y, x + w, y + 42),
        radius=21,
        fill=(255, 255, 255, int(255 * 0.045 * alpha)),
        outline=(color[0], color[1], color[2], int(255 * 0.30 * alpha)),
        width=1,
    )
    draw.text((x + 17, y + 11), label, fill=rgba(color, alpha), font=f)
    return w


def radial(layer: Image.Image, x: float, y: float, radius: float, color: tuple[int, int, int], alpha: float, steps: int = 18) -> None:
    if alpha <= 0.001:
        return
    draw = ImageDraw.Draw(layer)
    for i in range(steps, 0, -1):
        p = i / steps
        a = alpha * (1 - p) ** 1.7
        r = radius * p
        draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba(color, a))


@dataclass(frozen=True)
class Node:
    x: float
    y: float
    z: float
    radius: float
    cluster: int
    hub: bool


@dataclass(frozen=True)
class Edge:
    a: int
    b: int
    phase: float


random.seed(12591)
PALETTE = [
    COLORS["teal"],
    COLORS["sky"],
    COLORS["gold"],
    COLORS["green"],
    COLORS["violet"],
    COLORS["red"],
]

NODES: list[Node] = []
for i in range(170):
    cluster = i % len(PALETTE)
    angle = i * 2.399963229728653
    ring = 96 + (i // len(PALETTE)) * 8.5
    hub = i % 23 == 0 or i % 41 == 0
    NODES.append(
        Node(
            x=math.cos(angle) * ring + (cluster - 2.5) * 42,
            y=math.sin(angle) * ring * 0.56 + math.cos(cluster) * 28,
            z=math.sin(angle * 0.72) * 280 + (cluster - 2.5) * 34,
            radius=6.6 if hub else 2.2 + random.random() * 2.2,
            cluster=cluster,
            hub=hub,
        )
    )

EDGES: list[Edge] = []
for i in range(len(NODES)):
    for j in range(i + 1, len(NODES)):
        same = NODES[i].cluster == NODES[j].cluster
        if (same and random.random() < 0.032) or ((not same) and random.random() < 0.004):
            EDGES.append(Edge(i, j, random.random()))
for i in range(36):
    EDGES.append(Edge((i * 3) % len(NODES), (i * 17 + 29) % len(NODES), random.random()))

STARS = [
    (
        (random.random() - 0.5) * 3800,
        (random.random() - 0.5) * 2400,
        (random.random() - 0.5) * 3200,
        0.12 + random.random() * 0.6,
        0.25 + random.random() * 0.55,
        random.random() * TAU,
    )
    for _ in range(260)
]


def project_xyz(x: float, y: float, z: float, t: float, scale: float = 1.0, ox: float = 0, oy: float = 0) -> tuple[float, float, float, float]:
    rot = t * 0.1
    x1 = x * math.cos(rot) - z * math.sin(rot)
    z1 = x * math.sin(rot) + z * math.cos(rot)
    y1 = y * math.cos(rot * 0.32) - z1 * math.sin(rot * 0.32) * 0.1
    p = 820 / (900 + z1)
    return WIDTH * 0.54 + ox + x1 * p * scale, HEIGHT * 0.5 + oy + y1 * p * scale, p, z1


def background(t: float) -> Image.Image:
    img = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    radial(glow, WIDTH * 0.58, HEIGHT * 0.45, WIDTH * 0.62, COLORS["teal"], 0.06, 24)
    radial(glow, WIDTH * 0.2, HEIGHT * 0.78, WIDTH * 0.5, COLORS["gold"], 0.025, 18)
    img.alpha_composite(glow)

    stars = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(stars)
    for sx, sy, sz, sa, ss, sp in STARS:
        x, y, _, _ = project_xyz(sx, sy, sz, t * 0.28)
        if -10 < x < WIDTH + 10 and -10 < y < HEIGHT + 10:
            alpha = sa * (0.75 + math.sin(t * 1.2 + sp) * 0.25)
            r = ss
            draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba(COLORS["white"], alpha))
    img.alpha_composite(stars)
    return img


def draw_graph(layer: Image.Image, t: float, alpha: float, scale: float = 1.0, ox: float = 0, oy: float = 0, selected: int = -1) -> None:
    if alpha <= 0.01:
        return
    draw = ImageDraw.Draw(layer)
    pts = [project_xyz(n.x, n.y, n.z, t, scale, ox, oy) for n in NODES]

    for e in EDGES:
        ax, ay, aps, _ = pts[e.a]
        bx, by, bps, _ = pts[e.b]
        n = NODES[e.a]
        active = selected < 0 or selected in (e.a, e.b) or (e.a % 23 == 0 and selected > -1)
        color = PALETTE[n.cluster]
        pulse = 0.08 + max(0, math.sin(t * 2.1 + e.phase * TAU)) * 0.12
        edge_alpha = pulse * alpha * (1 if active else 0.18)
        width = max(1, int((aps + bps) * 0.44 * scale))
        draw.line((ax, ay, bx, by), fill=rgba(color, edge_alpha), width=width)

    sorted_nodes = sorted(range(len(NODES)), key=lambda i: pts[i][3])
    for i in sorted_nodes:
        n = NODES[i]
        x, y, ps, _ = pts[i]
        if x < -40 or x > WIDTH + 40 or y < -40 or y > HEIGHT + 40:
            continue
        active = selected < 0 or selected == i or i % 23 == 0
        color = PALETTE[n.cluster]
        radius = max(1.2, n.radius * ps * scale * (1.08 if n.hub else 1))
        opacity = alpha * (0.9 if active else 0.15)

        if n.hub:
            for k in range(4, 0, -1):
                rr = radius * k * 1.9
                draw.ellipse((x - rr, y - rr, x + rr, y + rr), fill=rgba(color, opacity * 0.028 / k))
        r = radius
        draw.ellipse((x - r, y - r, x + r, y + r), fill=rgba(color, opacity))
        hi = max(1.0, r * 0.34)
        draw.ellipse((x - r * 0.42, y - r * 0.46, x - r * 0.42 + hi, y - r * 0.46 + hi), fill=rgba(COLORS["white"], opacity * 0.45))

    if selected >= 0:
        x, y, _, _ = pts[selected]
        pulse = 44 + math.sin(t * 3) * 3
        draw.ellipse((x - pulse, y - pulse, x + pulse, y + pulse), outline=rgba(COLORS["teal"], alpha * 0.52), width=2)
        callout(layer, "billing.ts", "hub: 14 dependents", "blast radius visible before edit", x + 58, y - 18, alpha)


def callout(layer: Image.Image, title: str, line1: str, line2: str, x: float, y: float, alpha: float) -> None:
    rounded_panel(layer, x, y, 290, 104, alpha)
    text(layer, title, x + 18, y + 20, 20, COLORS["teal"], alpha, mono=True)
    text(layer, line1, x + 18, y + 53, 17, COLORS["white"], alpha)
    text(layer, line2, x + 18, y + 78, 14, COLORS["zinc"], alpha)


def terminal_scene(layer: Image.Image, t: float, alpha: float) -> None:
    if alpha <= 0.01:
        return
    x = WIDTH * 0.075
    y = HEIGHT * 0.46 - 180
    w = 680
    h = 360
    rounded_panel(layer, x, y, w, h, alpha)
    draw = ImageDraw.Draw(layer)
    for i, c in enumerate([(255, 95, 87), (255, 189, 46), (40, 200, 64)]):
        draw.ellipse((x + 24 + i * 18 - 5, y + 24 - 5, x + 24 + i * 18 + 5, y + 24 + 5), fill=rgba(c, alpha))
    text(layer, '$ claude "refactor billing"', x + 24, y + 54, 20, COLORS["white"], alpha, mono=True)
    files = [
        "Reading src/payments/billing.ts",
        "Reading src/api/invoices.ts",
        "Reading src/auth/session.ts",
        "Reading src/utils/legacy-crypto.ts",
        "Reading src/workers/dispatch.ts",
        "Reading tests/payment-flow.spec.ts",
    ]
    shown = min(len(files), int(ease_out((t - 0.7) / 2.2) * len(files)))
    for i in range(shown):
        text(layer, files[i], x + 24, y + 100 + i * 32, 17, COLORS["red"] if i == shown - 1 else COLORS["dim"], alpha)

    progress = ease_out((t - 1.1) / 2.3)
    bx, by, bw, bh = x + 24, y + h - 54, w - 48, 20
    draw.rounded_rectangle((bx, by, bx + bw, by + bh), radius=6, fill=(255, 255, 255, int(255 * 0.05 * alpha)))
    draw.rounded_rectangle((bx, by, bx + bw * min(1, progress * 1.02), by + bh), radius=6, fill=rgba(COLORS["red"], alpha * 0.88))
    text(layer, f"context {round(progress * 91)}%", bx + bw / 2, by + 4, 12, COLORS["white"], alpha * 0.88, align="center", mono=True)


def cost_card(layer: Image.Image, alpha: float) -> None:
    if alpha <= 0.01:
        return
    x, y = WIDTH * 0.61, HEIGHT * 0.27
    text(layer, "Cost is the first hook.", x, y - 56, 34, COLORS["white"], alpha)
    text(layer, "Spend tokens on work, not repo rereads.", x, y - 18, 21, COLORS["zinc"], alpha)
    rounded_panel(layer, x, y + 18, 430, 218, alpha)
    text(layer, "$136/mo", x + 28, y + 72, 56, COLORS["red"], alpha, mono=True)
    text(layer, "raw exploration", x + 278, y + 77, 19, COLORS["zinc"], alpha)
    text(layer, "$9/mo", x + 28, y + 138, 56, COLORS["teal"], alpha, mono=True)
    text(layer, "with Athena maps", x + 244, y + 143, 19, COLORS["zinc"], alpha)
    text(layer, "Up to $1,521/year saved on a 994-file repo.", x + 28, y + 190, 18, COLORS["gold"], alpha)


def accuracy_scene(layer: Image.Image, t: float, alpha: float) -> None:
    if alpha <= 0.01:
        return
    x, y = WIDTH * 0.075, HEIGHT * 0.2
    text(layer, "Then sell accuracy.", x, y, 70, COLORS["white"], alpha)
    text(layer, "Athena gives the agent the files that matter before it edits.", x, y + 66, 27, COLORS["zinc"], alpha)
    items = [
        ("hubs", "what everything depends on", COLORS["teal"]),
        ("bridges", "where systems connect", COLORS["gold"]),
        ("blast radius", "what can break next", COLORS["red"]),
        ("reading order", "where to start first", COLORS["sky"]),
    ]
    for i, (title, sub, color) in enumerate(items):
        ix = x + (i % 2) * 365
        iy = y + 140 + (i // 2) * 106
        ia = alpha * fi(t, 5.2 + i * 0.28, 0.5)
        rounded_panel(layer, ix, iy, 326, 80, ia)
        text(layer, title, ix + 20, iy + 18, 23, color, ia, mono=True)
        text(layer, sub, ix + 20, iy + 52, 16, COLORS["zinc"], ia)


def tools_scene(layer: Image.Image, t: float, alpha: float) -> None:
    if alpha <= 0.01:
        return
    x, top = WIDTH * 0.065, HEIGHT * 0.18
    text(layer, "22 tools. Sold as outcomes.", x, top, 52, COLORS["white"], alpha)
    text(layer, "The names are technical. The value is simple.", x, top + 50, 25, COLORS["zinc"], alpha)
    rows = [
        ("query_context", "Find exact cited context", COLORS["teal"]),
        ("repo_health", "Detect dead code and risk", COLORS["green"]),
        ("blast_radius", "Know what breaks before commit", COLORS["gold"]),
        ("check_map_freshness", "Never use a stale map", COLORS["sky"]),
        ("enable_auto_mapping", "Auto-update on every commit", COLORS["violet"]),
    ]
    for i, (name, benefit, color) in enumerate(rows):
        yy = top + 112 + i * 68
        ia = alpha * fi(t, 11.0 + i * 0.22, 0.45)
        chip(layer, name, x, yy, color, ia)
        text(layer, benefit, x + 326, yy + 8, 24, COLORS["white"], ia)

    bx, by = WIDTH - 470, HEIGHT - 292
    rounded_panel(layer, bx, by, 370, 190, alpha)
    text(layer, "Best users", bx + 26, by + 30, 25, COLORS["white"], alpha)
    text(layer, "Claude Code power users\nlarge repos and monorepos\nteams paying API bills", bx + 26, by + 74, 22, COLORS["zinc"], alpha, line_height=1.45)


def proof_scene(layer: Image.Image, t: float, alpha: float) -> None:
    if alpha <= 0.01:
        return
    x, y = WIDTH * 0.08, HEIGHT * 0.18
    text(layer, "Proof beats feature lists.", x, y, 60, COLORS["white"], alpha)
    text(layer, "994 real source files. Benchmarked locally.", x, y + 58, 26, COLORS["zinc"], alpha)
    stats = [
        ("453,522", "raw tokens", COLORS["red"]),
        ("15,541", "with map", COLORS["teal"]),
        ("29:1", "compression", COLORS["gold"]),
        ("0.5s", "map generation", COLORS["white"]),
    ]
    for i, (value, label, color) in enumerate(stats):
        ix = x + i * 300
        ia = alpha * fi(t, 17.3 + i * 0.18, 0.45)
        text(layer, value, ix, y + 126, 48, color, ia, mono=True)
        text(layer, label, ix, y + 176, 18, COLORS["zinc"], ia)


def cta_scene(layer: Image.Image, t: float, alpha: float) -> None:
    if alpha <= 0.01:
        return
    radial(layer, WIDTH / 2, HEIGHT / 2, WIDTH * 0.38, COLORS["teal"], 0.055 * alpha, 18)
    text(layer, "Athena Code MCP", WIDTH / 2, HEIGHT / 2 - 105, 82, COLORS["white"], alpha, align="center")
    text(layer, "Lower cost. Better first tries. Fresh repo intelligence.", WIDTH / 2, HEIGHT / 2 - 38, 29, COLORS["zinc"], alpha, align="center")
    text(layer, "npx athena-code-mcp", WIDTH / 2, HEIGHT / 2 + 44, 38, COLORS["teal"], alpha, align="center", mono=True)
    text(layer, "22 tools. Zero config. Open source.", WIDTH / 2, HEIGHT / 2 + 104, 22, COLORS["dim"], alpha, align="center")


def render_frame(t: float) -> Image.Image:
    img = background(t)
    graph_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    graph_alpha = live(t, 7.4, 22.2, 1.0)
    draw_graph(graph_layer, t, graph_alpha, 1.25, 80 if t < 15 else 0, 0, 46 if 8.7 < t < 13.2 else -1)
    img.alpha_composite(graph_layer)

    layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    s1 = live(t, 0, 4.9, 0.65)
    terminal_scene(layer, t, s1)
    cost_card(layer, s1 * fi(t, 1.1, 0.8))
    accuracy_scene(layer, t, live(t, 4.7, 10.0, 0.7))
    tools_scene(layer, t, live(t, 10.0, 16.8, 0.7))
    proof_scene(layer, t, live(t, 16.5, 21.6, 0.7))
    cta_scene(layer, t, fi(t, 21.2, 1.0))
    img.alpha_composite(layer)
    return img.convert("RGB")


def render_frames(keep_frames: bool) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if FRAMES_DIR.exists():
        shutil.rmtree(FRAMES_DIR)
    FRAMES_DIR.mkdir(parents=True)
    if VIDEO_PATH.exists():
        VIDEO_PATH.unlink()
    if POSTER_PATH.exists():
        POSTER_PATH.unlink()

    poster_frame = int(22.2 * FPS)
    for frame in range(FRAME_COUNT):
        t = frame / FPS
        image = render_frame(t)
        if frame == poster_frame:
            image.save(POSTER_PATH)
        image.save(FRAMES_DIR / f"frame-{frame:04d}.png", optimize=False)
        if frame % (FPS * 5) == 0:
            print(f"Rendered frame {frame}/{FRAME_COUNT}")

    ffmpeg = resolve_ffmpeg()
    args = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "warning",
        "-y",
        "-framerate",
        str(FPS),
        "-i",
        str(FRAMES_DIR / "frame-%04d.png"),
    ]
    if MUSIC_PATH.exists():
        args += [
            "-i",
            str(MUSIC_PATH),
            "-t",
            str(DURATION),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-af",
            f"atrim=0:{DURATION},asetpts=N/SR/TB,afade=t=in:st=0:d=0.35,afade=t=out:st={DURATION - 2}:d=2,volume=0.82",
        ]
    args += [
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
    ]
    if MUSIC_PATH.exists():
        args += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
    args += ["-movflags", "+faststart", str(VIDEO_PATH)]
    subprocess.run(args, cwd=ROOT, check=True)

    if not keep_frames:
        shutil.rmtree(FRAMES_DIR)

    print(f"Video written: {VIDEO_PATH}")
    print(f"Poster written: {POSTER_PATH}")
    print(f"Video size: {VIDEO_PATH.stat().st_size / 1024 / 1024:.2f} MB")
    print(f"Poster size: {POSTER_PATH.stat().st_size / 1024:.0f} KB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-frames", action="store_true")
    args = parser.parse_args()
    render_frames(args.keep_frames)


if __name__ == "__main__":
    main()
