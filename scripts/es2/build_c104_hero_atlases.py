"""Build eight-direction runtime atlases for the three c104 heroes.

Every cut below was measured on the full-resolution 1448x1086 source sheets
(alpha-band projection + visual review); nothing is inferred at build time
except a +/-14px search for the cleanest row line inside an already measured
direction column. Frames are copied 1:1 (no scaling, no invented frames).

Atlas layout: row = sectionIndex * 8 + runtimeDirection (E,SE,S,SW,W,NW,N,NE),
column = frame. Section 0 is the run cycle, section 1 the attack/cast cycle.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import statistics
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "src/assets/es2/source/c104"
OUT_DIR = ROOT / "src/assets/es2/production/heroes"
MANIFEST_NAME = "c104-atlas-manifest.json"
DIRECTIONS = ("E", "SE", "S", "SW", "W", "NW", "N", "NE")
ALPHA_FLOOR = 24      # source sheets carry a faint grey haze (alpha 1..31) everywhere
STRONG = 200          # "solid" pixel for cut-line and feet measurement
REFINE = 14           # search window around a measured row cut
PAD = 4
MAX_BYTES = 900_000
GRID = [k * 181 for k in range(9)]

HEROES: dict[str, dict] = {
    "crimson-paladin": {
        "source": "hero-crimson-paladin-run-attack-sheet.png",
        "layout": "columns-are-directions",
        "columnCuts": GRID,
        "rowCuts": [0, 82, 159, 238, 315, 393, 470, 543, 614, 678, 744, 816, 888, 959, 1022, 1086],
        "sourceColumns": ["SW", "W", "NW", "N", "NE", "E", "SE", "S"],
        "sections": [("run", 7), ("attack", 8)],
    },
    "spirit-summoner": {
        "source": "hero-spirit-summoner-run-cast-sheet.png",
        "layout": "columns-are-directions",
        "columnCuts": GRID,
        "rowCuts": [0, 94, 181, 272, 361, 450, 542, 616, 688, 759, 832, 904, 988, 1086],
        "sourceColumns": ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
        "sections": [("run", 6), ("cast", 7)],
    },
    "shadowblade": {
        "source": "hero-shadowblade-run-attack-sheet.png",
        "layout": "rows-are-facings",
        "columnCuts": [0, 216, 398, 576, 763, 951, 1126, 1300, 1448],
        "rowCuts": [0, 82, 154, 228, 303, 374, 457, 540, 616, 690, 768, 838, 909, 994, 1086],
        "rowsPerSection": 7,
        # The sheet has no back-facing art: NW reuses W, N/NE reuse the second
        # right-facing row. Documented fallback, never a fabricated frame.
        "facingRows": {"E": 0, "SE": 1, "S": 2, "SW": 3, "W": 4, "NW": 4, "N": 6, "NE": 6},
        "sections": [("run", 8), ("attack", 8)],
    },
}


def strong_count(alpha: Image.Image, x0: int, x1: int, y: int) -> int:
    return sum(alpha.crop((x0, y, x1, y + 1)).histogram()[STRONG + 1:])


def refine_cuts(alpha: Image.Image, cuts: list[int], x0: int, x1: int) -> tuple[list[int], int]:
    """Move each interior cut to the cleanest row within +/-REFINE in this column."""
    out, worst = [cuts[0]], 0
    for c in cuts[1:-1]:
        best = min(range(c - REFINE, c + REFINE + 1),
                   key=lambda y: (strong_count(alpha, x0, x1, y), abs(y - c)))
        out.append(best)
        worst = max(worst, strong_count(alpha, x0, x1, best))
    out.append(cuts[-1])
    return out, worst


def body_mask(image: Image.Image) -> Image.Image:
    """Solid pixels minus bright saturated spell/slash light (not the hero's body)."""
    _, s, v = image.convert("RGB").convert("HSV").split()
    effect = ImageChops.multiply(s.point(lambda x: 255 if x > 150 else 0),
                                 v.point(lambda x: 255 if x > 200 else 0))
    solid = image.getchannel("A").point(lambda x: 255 if x > STRONG else 0)
    return ImageChops.subtract(solid, effect)


def row_counts(mask: Image.Image) -> list[int]:
    w, h = mask.size
    data = mask.tobytes()
    return [data[y * w:(y + 1) * w].count(255) for y in range(h)]


def measure(mask: Image.Image, rect: tuple[int, int, int, int]) -> tuple[int, int, float] | None:
    """(feet y, top y, lower-body centroid x) in sheet coordinates."""
    crop = mask.crop(rect)
    rows = [y for y, n in enumerate(row_counts(crop)) if n >= 3]
    if not rows:
        return None
    top, feet = rows[0], rows[-1]
    w = crop.size[0]
    data = crop.tobytes()
    lo = feet - max(4, int((feet - top) * 0.4))
    xs = [i % w for y in range(lo, feet + 1) for i in range(y * w, (y + 1) * w) if data[i] == 255]
    return rect[1] + feet, rect[1] + top, rect[0] + sum(xs) / len(xs)


def source_rects(spec: dict, alpha: Image.Image) -> tuple[dict, int]:
    """{(section, direction, frame): rect} plus worst strong-pixel count on a cut line."""
    rects, worst = {}, 0
    cols, rows = spec["columnCuts"], spec["rowCuts"]
    if spec["layout"] == "columns-are-directions":
        for ci, direction in enumerate(spec["sourceColumns"]):
            x0, x1 = cols[ci], cols[ci + 1]
            ycuts, w = refine_cuts(alpha, rows, x0, x1)
            worst = max(worst, w)
            offset = 0
            for si, (_, frames) in enumerate(spec["sections"]):
                for f in range(frames):
                    r = offset + f
                    rects[(si, direction, f)] = (x0, ycuts[r], x1, ycuts[r + 1])
                offset += frames
    else:
        for si, (_, frames) in enumerate(spec["sections"]):
            for direction in DIRECTIONS:
                r = si * spec["rowsPerSection"] + spec["facingRows"][direction]
                for f in range(frames):
                    rects[(si, direction, f)] = (cols[f], rows[r], cols[f + 1], rows[r + 1])
    return rects, worst


def build_hero(hero: str, spec: dict, source_dir: Path) -> tuple[Image.Image, dict, list]:
    path = source_dir / spec["source"]
    sheet = Image.open(path).convert("RGBA")
    alpha = sheet.getchannel("A").point(lambda x: 0 if x < ALPHA_FLOOR else x)
    sheet.putalpha(alpha)
    mask = body_mask(sheet)
    rects, worst_cut = source_rects(spec, alpha)

    keys = sorted(rects)
    metrics = {k: measure(mask, rects[k]) for k in keys}
    missing = [k for k, m in metrics.items() if m is None]
    if missing:
        raise SystemExit(f"{hero}: empty source cells {missing}")
    centered = spec["layout"] == "columns-are-directions"
    # Lowest solid body row is the ground contact; grid sheets are centred per direction column.
    feet = {k: metrics[k][0] for k in keys}
    anchor = {k: round((rects[k][0] + rects[k][2]) / 2 if centered else metrics[k][2]) for k in keys}
    body_height = round(statistics.median(feet[k] - metrics[k][1] for k in keys if k[0] == 0))

    boxes = {k: alpha.crop(rects[k]).getbbox() for k in keys}
    left = max(anchor[k] - (rects[k][0] + boxes[k][0]) for k in keys)
    right = max(rects[k][0] + boxes[k][2] - anchor[k] for k in keys)
    up = max(feet[k] - (rects[k][1] + boxes[k][1]) for k in keys)
    down = max(rects[k][1] + boxes[k][3] - feet[k] for k in keys)
    half = max(left, right) + PAD
    cell_w, cell_h = 2 * half, up + down + 2 * PAD
    baseline = PAD + up
    frames_max = max(n for _, n in spec["sections"])
    atlas = Image.new("RGBA", (cell_w * frames_max, cell_h * 8 * len(spec["sections"])), (0, 0, 0, 0))
    cells = []
    for k in keys:
        si, d, f = k
        x0, y0 = rects[k][0] + boxes[k][0], rects[k][1] + boxes[k][1]
        piece = sheet.crop((x0, y0, rects[k][0] + boxes[k][2], rects[k][1] + boxes[k][3]))
        row = si * 8 + DIRECTIONS.index(d)
        atlas.alpha_composite(piece, (f * cell_w + half - (anchor[k] - x0), row * cell_h + baseline - (feet[k] - y0)))
        r = rects[k]
        cells.append([si, DIRECTIONS.index(d), f, r[0], r[1], r[2] - r[0], r[3] - r[1], feet[k], anchor[k]])

    meta = {
        "file": f"{hero}-c104-atlas@3x.webp",
        "source": f"src/assets/es2/source/c104/{spec['source']}",
        "sourceSha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "sourceSize": list(sheet.size),
        "cell": {"width": cell_w, "height": cell_h, "anchorX": half, "baseline": baseline},
        "bodyHeight": body_height,
        "columns": frames_max,
        "rows": 8 * len(spec["sections"]),
        "sections": [{"name": n, "frames": c, "rowOffset": i * 8} for i, (n, c) in enumerate(spec["sections"])],
        "maxCutLineStrongPixels": worst_cut,
    }
    if spec["layout"] == "rows-are-facings":
        meta["directionFallback"] = {"NW": "W", "N": "right-facing row 6", "NE": "right-facing row 6"}
    return atlas, meta, cells


def contact_sheet(atlas: Image.Image, meta: dict, out: Path) -> None:
    w, h = meta["cell"]["width"], meta["cell"]["height"]
    bg = Image.new("RGBA", atlas.size, (24, 20, 30, 255))
    bg.alpha_composite(atlas)
    draw = ImageDraw.Draw(bg)
    for r in range(meta["rows"]):
        draw.text((2, r * h + 2), f"{meta['sections'][r // 8]['name']}:{DIRECTIONS[r % 8]}", fill=(255, 220, 120, 255))
        y = r * h + meta["cell"]["baseline"]
        draw.line((0, y, atlas.size[0], y), fill=(80, 200, 255, 90))
        for c in range(meta["columns"]):
            draw.rectangle((c * w, r * h, (c + 1) * w - 1, (r + 1) * h - 1), outline=(120, 110, 140, 255))
    bg.convert("RGB").save(out)


def build(source_dir: Path = SOURCE_DIR, out_dir: Path = OUT_DIR, contact_dir: Path | None = None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema": 1,
        "generator": "scripts/es2/build_c104_hero_atlases.py",
        "artDirection": "Realistic Dark Fantasy + Gothic Magic + Celestial Eclipse",
        "directionOrder": list(DIRECTIONS),
        "layout": "row = sectionIndex * 8 + directionIndex; column = frame; feet at (anchorX, baseline)",
        "heroes": {},
        "cells": {"columns": ["section", "direction", "frame", "x", "y", "width", "height", "feetY", "anchorX"]},
    }
    for hero, spec in HEROES.items():
        atlas, meta, cells = build_hero(hero, spec, source_dir)
        target = out_dir / meta["file"]
        atlas.save(target, "WEBP", quality=90, alpha_quality=95, method=6)
        raw = target.read_bytes()
        if len(raw) > MAX_BYTES:
            raise SystemExit(f"{target} is {len(raw)} bytes > budget {MAX_BYTES}")
        meta.update(width=atlas.size[0], height=atlas.size[1], bytes=len(raw),
                    maxBytes=MAX_BYTES, sha256=hashlib.sha256(raw).hexdigest())
        manifest["heroes"][hero] = meta
        manifest["cells"][hero] = cells
        if contact_dir:
            contact_sheet(atlas, meta, contact_dir / f"{hero}-c104-contact.png")
    (out_dir / MANIFEST_NAME).write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE_DIR)
    parser.add_argument("--output", type=Path, default=OUT_DIR)
    parser.add_argument("--contact", type=Path, help="write labelled review contact sheets here")
    args = parser.parse_args()
    result = build(args.source, args.output, args.contact)
    for hero, meta in result["heroes"].items():
        print(hero, meta["width"], "x", meta["height"], meta["cell"], "body", meta["bodyHeight"],
              meta["bytes"], "bytes", "cut-line strong px", meta["maxCutLineStrongPixels"])
