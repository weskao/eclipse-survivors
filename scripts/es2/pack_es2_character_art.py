#!/usr/bin/env python3
"""Stage transparent hero contact sheets as 448px/cell WebPs (QA candidates).

Usage: python scripts/es2/pack_es2_character_art.py --source-dir SOURCE --out-dir OUTPUT
Artistic acceptance is separate: a 313px original cell enlarged to 448px is
NOT native 3x detail, even if the WebP frame fits 147 CSS px at <=1x scaling.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

CELL = 448
GUTTER = 8
DISPLAY_MAX = 147
SOURCES = {
    'shadowblade': [
        ('idle-ready-8dir', '影刃行者_紫焰十六式_sprite_圖_sheet.png', 4, 4, False),
        ('run-attack-east', '影刃行者_奔跑與雙刃連擊精靈圖譜.png', 4, 4, False),
        ('special-east', '影刃行者_紫霧突襲連擊.png', 4, 2, False),
    ],
    'spirit-summoner': [
        ('idle-ready-8dir', '靈契召喚師_幽狐法術姿態圖譜.png', 4, 4, False),
        ('run-attack-east', '靈契召喚師_幻狐奔行與施法_sprites.png', 4, 4, False),
        ('special-east', '靈契召喚師_幻狐秘術八連式.png', 4, 2, False),
    ],
    'crimson-paladin': [
        ('idle-ready-8dir', '緋紅聖騎四向戰鬥精靈圖譜.png', 4, 4, True),
        ('run-attack-east', '緋紅聖騎_奔跑與聖光連擊_sprite_表.png', 4, 4, True),
        ('special-east', '緋紅聖騎_聖盾終結技序列.png', 4, 2, False),
    ],
}


def remove_pale_background(frame: Image.Image) -> Image.Image:
    """Candidate-only extraction; requires manual alpha QA for bright armor/glow."""
    import cv2  # art-preparation tool, NOT a game/runtime dependency
    import numpy as np
    rgb = np.array(frame.convert('RGB'))
    h, w = rgb.shape[:2]
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    mask = np.full((h, w), cv2.GC_PR_FGD, np.uint8)
    edge = max(6, min(h, w) // 25)
    mask[:edge, :] = mask[-edge:, :] = cv2.GC_BGD
    mask[:, :edge] = mask[:, -edge:] = cv2.GC_BGD
    pale = (rgb.min(axis=2) >= 225) & (rgb.max(axis=2) - rgb.min(axis=2) <= 24)
    mask[pale] = cv2.GC_PR_BGD
    saturation = rgb.max(axis=2).astype('int16') - rgb.min(axis=2).astype('int16')
    strong = (saturation > 48) & (rgb.min(axis=2) < 205)
    mask[strong] = cv2.GC_FGD
    # Restore the guaranteed image-edge background after classifying foreground.
    mask[:edge, :] = mask[-edge:, :] = cv2.GC_BGD
    mask[:, :edge] = mask[:, -edge:] = cv2.GC_BGD
    cv2.grabCut(bgr, mask, None, np.zeros((1, 65), np.float64),
                np.zeros((1, 65), np.float64), 4, cv2.GC_INIT_WITH_MASK)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype('uint8')
    fg = cv2.GaussianBlur(fg, (3, 3), 0.6)
    # The generated paladin sheets use a pale source-page matte. GrabCut
    # recovers the silhouette, but its antialiasing may retain near-white
    # source pixels; remove neutral highlights from the *edge matte* only.
    # This is a candidate-only cleanup and must still pass visual QA.
    channel_min = rgb.min(axis=2).astype('float32')
    channel_delta = saturation.astype('float32')
    neutral_fade = np.clip((225 - channel_min) / 40, 0, 1)
    matte_factor = np.where(channel_delta < 28, neutral_fade, 1.0)
    fg = (fg.astype('float32') * matte_factor).astype('uint8')
    out = frame.copy()
    out.putalpha(Image.fromarray(fg, 'L'))
    return out


def pack_sheet(source: Path, output: Path, cols: int, rows: int,
               cell: int = CELL, *, kind: str, remove_matte: bool = False) -> dict:
    original = Image.open(source).convert('RGBA')
    width, height = original.size
    if width < cols or height < rows:
        raise ValueError(f'{source.name}: grid exceeds source dimensions')
    # Explicit integer cuts. Input 1254/4 and 1774/4 are NOT integers.
    xcuts = [round(i * width / cols) for i in range(cols + 1)]
    ycuts = [round(i * height / rows) for i in range(rows + 1)]
    atlas = Image.new('RGBA', (cols * cell, rows * cell), (0, 0, 0, 0))
    for row in range(rows):
        for col in range(cols):
            tile = original.crop((xcuts[col], ycuts[row], xcuts[col + 1], ycuts[row + 1]))
            if remove_matte:
                tile = remove_pale_background(tile)
            else:
                alpha = tile.getchannel('A')
                # Important: do not stamp an opaque source-page rectangle into gameplay.
                if min(alpha.getextrema()) > 32:
                    raise ValueError(f'{source.name}: non-transparent background in {row},{col}')
            inner = cell - GUTTER * 2
            tile = tile.resize((inner, inner), Image.Resampling.LANCZOS)
            atlas.alpha_composite(tile, (col * cell + GUTTER, row * cell + GUTTER))
    output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(output, 'WEBP', quality=86, method=5)
    data = output.read_bytes()
    source_frame = [min(b - a for a, b in zip(xcuts, xcuts[1:])),
                    min(b - a for a, b in zip(ycuts, ycuts[1:]))]
    return {
        'kind': kind, 'path': output.as_posix(), 'source': source.name,
        'sourcePixels': [width, height], 'nativeSourceFramePixels': source_frame,
        'outputPixels': list(atlas.size), 'framePixels': [cell, cell],
        'grid': [cols, rows], 'frameCount': cols * rows,
        'native3x': min(source_frame) >= 3 * DISPLAY_MAX,
        'interpolated': source_frame[0] < cell or source_frame[1] < cell,
        'qa': 'QA_PENDING', 'matteCleanup': remove_matte,
        'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--out-dir', type=Path, required=True)
    args = parser.parse_args()
    assets = {}
    for hero, items in SOURCES.items():
        assets[hero] = []
        for pose, filename, columns, rows, matte in items:
            dest = args.out_dir / hero / f'{pose}@3x.webp'
            result = pack_sheet(args.source_dir / filename, dest, columns, rows,
                                kind=pose, remove_matte=matte)
            result['path'] = dest.relative_to(args.out_dir).as_posix()
            assets[hero].append(result)
    manifest = {
        'schemaVersion': 1, 'status': 'QA_PENDING',
        'note': '448px candidates are NOT proof of native 3x detail; see nativeSourceFramePixels.',
        'displayCSSMaxHeight': DISPLAY_MAX, 'assets': assets,
    }
    (args.out_dir / 'candidate-3x-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Packed', sum(len(v) for v in assets.values()), 'candidate atlases')


if __name__ == '__main__': main()