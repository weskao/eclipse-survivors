#!/usr/bin/env python3
"""Generate 12-frame transparent WebP skill animations from committed 3x art.

Move interior energy highlights and orbiting motes, not the whole sprite.
No runtime SVG/canvas renderer and no extra production dependencies.
Run: python scripts/generate-animated-skill-art.py
"""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "assets" / "skill-icons"
ATLAS = ROOT / "src" / "assets" / "ui" / "skill-art-atlas@3x-animated.webp"
NAMES = ("damage", "multi", "blaze", "frost", "chain",
         "vortex", "meteor", "orb", "shield", "heal")
FRAMES = 12
DURATION_MS = 100
SIZE = 288
ATLAS_TILE = 144
FIRE = {"damage", "blaze", "meteor"}
ICE = {"multi", "frost", "vortex"}
ARC = {"chain", "orb"}
Y, X = np.mgrid[:SIZE, :SIZE].astype(np.float32)
R = np.hypot(X - SIZE / 2, Y - SIZE / 2)


def motes(name: str, frame: int) -> Image.Image:
    layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pen = ImageDraw.Draw(layer, "RGBA")
    tint = ((255, 222, 127) if name in FIRE or name == "shield" else
            (150, 226, 255) if name in ICE else
            (215, 155, 255) if name in ARC else (170, 255, 145))
    for j in range(6):
        direction = 2 * math.pi * (j / 6 + frame / FRAMES *
                                  (0.85 if name in ("orb", "vortex") else 0.35))
        radius = 70 + 8 * math.sin(2 * math.pi * frame / FRAMES + j * 1.7)
        px, py = 144 + radius * math.cos(direction), 144 + 0.87 * radius * math.sin(direction)
        size = 2 + (j % 3)
        pen.ellipse((px - size, py - size, px + size, py + size),
                    fill=(*tint, 130 + 36 * (j % 2)))
    return layer


def generate(name: str) -> list[Image.Image]:
    path = ICONS / f"{name}@3x.webp"
    base = np.asarray(Image.open(path).convert("RGBA"), dtype=np.float32)
    if base.shape != (SIZE, SIZE, 4):
        raise ValueError(f"{path}: expected 288x288 RGBA")
    alpha = base[:, :, 3]
    color = base[:, :, :3]
    frames = []
    for frame in range(FRAMES):
        phase = math.tau * frame / FRAMES
        # Texture flows along each scanline, while the alpha silhouette remains stable.
        shift = (2.9 if name in FIRE else 1.8) * np.sin(Y[:, 0] / 29 + phase)
        if name in ("orb", "vortex"):
            shift = 4.0 * np.sin(Y[:, 0] / 27 + phase)
        moved = np.empty_like(color)
        for row, pixels in enumerate(color):
            moved[row] = np.roll(pixels, int(round(float(shift[row]))), axis=0)
        rgb = .52 * color + .48 * moved
        # Sweep a specular highlight through visible art pixels, not the entire tile.
        band = X * .72 + Y * .66 - (142 + 83 * math.sin(phase))
        shine = np.exp(-np.square(band / 20)) * (alpha / 255) ** 1.3
        glow = np.array([255, 210, 122] if name in FIRE or name == "shield" else
                        [156, 225, 255] if name in ICE else
                        [209, 164, 255] if name in ARC else [166, 255, 147],
                        dtype=np.float32)
        rgb = rgb * (1 - .24 * shine[:, :, None]) + glow * (.24 * shine[:, :, None])
        rgb *= (1 + .035 * np.sin(phase + R / 26))[:, :, None]
        result = np.empty_like(base, dtype=np.uint8)
        result[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
        result[:, :, 3] = alpha.astype(np.uint8)
        frames.append(Image.alpha_composite(Image.fromarray(result, "RGBA"), motes(name, frame)))
    animated = ICONS / f"{name}@3x-animated.webp"
    frames[0].save(animated, format="WEBP", save_all=True, append_images=frames[1:],
                   duration=DURATION_MS, loop=0, quality=65, method=4)
    with Image.open(animated) as verified:
        assert verified.n_frames == FRAMES, animated
        assert verified.convert("RGBA").getchannel("A").getextrema()[0] == 0, animated
    print(f"{animated.relative_to(ROOT)}: {animated.stat().st_size:,} bytes, {FRAMES} frames")
    return frames


def main() -> None:
    all_frames = [generate(name) for name in NAMES]
    atlas_frames = []
    for frame in range(FRAMES):
        atlas = Image.new("RGBA", (ATLAS_TILE * 5, ATLAS_TILE * 2), (0, 0, 0, 0))
        for slot, frames in enumerate(all_frames):
            tile = frames[frame].resize((ATLAS_TILE, ATLAS_TILE), Image.Resampling.LANCZOS)
            atlas.alpha_composite(tile, ((slot % 5) * ATLAS_TILE, (slot // 5) * ATLAS_TILE))
        atlas_frames.append(atlas)
    ATLAS.parent.mkdir(parents=True, exist_ok=True)
    atlas_frames[0].save(ATLAS, format="WEBP", save_all=True,
                         append_images=atlas_frames[1:],
                         duration=DURATION_MS, loop=0, quality=65, method=4)
    with Image.open(ATLAS) as checked:
        assert checked.n_frames == FRAMES
        assert checked.size == (720, 288)
    print(f"{ATLAS.relative_to(ROOT)}: {ATLAS.stat().st_size:,} bytes, {FRAMES} frames")


if __name__ == "__main__":
    main()
