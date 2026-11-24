#!/usr/bin/env python3
"""Pack a native-size diagonal run candidate without approving or resampling it."""
import argparse
import hashlib
import json
import tempfile
from pathlib import Path
from PIL import Image, ImageChops
from pack_hero_candidate import pack


def clean_margin(tile, cap=3):
    if tile.mode != 'RGBA' or tile.size != (627, 627) or not 0 <= cap <= 23:
        raise ValueError('expected 627px RGBA tile and a reviewed alpha cap of 0–23')
    alpha = tile.getchannel('A')
    cleaned = alpha.copy()
    for box in [(0, 0, 627, 8), (0, 619, 627, 627), (0, 8, 8, 619), (619, 8, 627, 619)]:
        if alpha.crop(box).getextrema()[1] > cap:
            raise ValueError('source margin contains opacity above review cap')
        cleaned.paste(0, box)
    changed = sum(ImageChops.difference(alpha, cleaned).histogram()[1:])
    result = tile.copy()
    result.putalpha(cleaned)
    return result, changed


def pack_diagonal(source, output, hero, direction, cap=3):
    if direction not in ('SE', 'SW'):
        raise ValueError('expected SE or SW')
    if output.exists():
        raise FileExistsError(output)
    original_bytes = source.read_bytes()
    changed = []
    with Image.open(source) as original:
        if original.mode != 'RGBA' or original.size != (1254, 1254) or original.format != 'PNG':
            raise ValueError('expected original 1254x1254 RGBA PNG')
        cleaned = Image.new('RGBA', original.size)
        for i in range(4):
            x, y = i % 2 * 627, i // 2 * 627
            tile, count = clean_margin(original.crop((x, y, x+627, y+627)), cap)
            cleaned.paste(tile, (x, y))
            changed.append(count)
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp)/'cleaned.png'
        cleaned.save(path, 'PNG')
        manifest = pack(path, output, hero, 'run', direction)
    (output/'original.png').write_bytes(original_bytes)
    atlas = output/f'run-{direction.lower()}-4frames@3x.webp'
    (output/'atlas.webp').rename(atlas)
    feet = []
    with Image.open(atlas) as packed:
        for i in range(4):
            x, y = i % 2 * 768, i // 2 * 768
            tile = packed.crop((x, y, x+768, y+768))
            sx, sy = i % 2 * 627, i // 2 * 627
            if tile.crop((70, 70, 697, 697)).tobytes() != cleaned.crop((sx, sy, sx+627, sy+627)).tobytes():
                raise ValueError('WebP differs from repaired source pixels')
            bounds = tile.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox()
            if not bounds:
                raise ValueError('candidate has no opaque character anchor')
            feet.append(bounds[3])
    manifest.update(originalSourceFile='original.png', originalSourceSHA256=hashlib.sha256(original_bytes).hexdigest(),
                    sourceFile='source.png', atlasFile=atlas.name, bytes=atlas.stat().st_size,
                    footBottoms=feet, footAnchorMethod='alpha >=128 bottom exclusive per 768px cell',
                    maxDisplayCSSPixels=147, sourceResolutionRatio=627/147, grid=[2,2], qaGameplayApplied=False,
                    frameTiming='four independent candidate poses; incomplete 10-frame cycle',
                    marginRepair={'maxAlphaRemoved':cap, 'perFrameChangedAlphaPixels':changed,
                                  'method':'zero alpha only in 8px source border; preserve RGB and all alpha >=64 pixels; no resampling'})
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--hero', required=True, choices=['shadowblade','spirit-summoner','crimson-paladin'])
    parser.add_argument('--direction', required=True, choices=['SE','SW'])
    parser.add_argument('--reviewed-alpha-cap', type=int, default=3)
    args = parser.parse_args()
    print(json.dumps(pack_diagonal(args.source, args.output, args.hero, args.direction, args.reviewed_alpha_cap), indent=2))
