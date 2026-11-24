#!/usr/bin/env python3
"""Repair diffuse cross-cell mist on a native-size Summoner QA candidate, never approve it."""
import argparse
import hashlib
import json
import tempfile
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter
from pack_hero_candidate import pack


def clean_tile(tile):
    alpha = tile.getchannel('A')
    core = alpha.point(lambda a: 255 if a >= 64 else 0)
    bounds = core.getbbox()
    w, h = tile.size
    if not bounds or min(bounds[0], bounds[1], w-bounds[2], h-bounds[3]) < 28:
        raise ValueError('visible silhouette lacks the required source margin')
    near = core.filter(ImageFilter.MaxFilter(17))
    outer = near.filter(ImageFilter.MaxFilter(17)).filter(ImageFilter.GaussianBlur(4))
    mask = ImageChops.lighter(near, outer)
    mask.paste(0, (0, 0, w, 8))
    mask.paste(0, (0, h-8, w, h))
    mask.paste(0, (0, 0, 8, h))
    mask.paste(0, (w-8, 0, w, h))
    out = tile.copy()
    out.putalpha(ImageChops.multiply(alpha, mask))
    if ImageChops.multiply(ImageChops.difference(alpha, out.getchannel('A')), core).getbbox():
        raise ValueError('repair would modify the visible character')
    return out


def repair(source, output, expected_sha):
    original_sha = hashlib.sha256(source.read_bytes()).hexdigest()
    if original_sha != expected_sha:
        raise ValueError('original source SHA-256 mismatch')
    if output.exists():
        raise FileExistsError(output)
    with Image.open(source) as original:
        if original.mode != 'RGBA' or original.size != (1254, 1254):
            raise ValueError('expected original 1254x1254 RGBA candidate')
        cleaned = Image.new('RGBA', original.size)
        for i in range(4):
            x, y = i % 2 * 627, i // 2 * 627
            cleaned.paste(clean_tile(original.crop((x, y, x+627, y+627))), (x, y))
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / 'cleaned.png'
        cleaned.save(path, 'PNG')
        m = pack(path, output, 'spirit-summoner', 'run', 'S')
    atlas = output / 'run-south-4frames@3x.webp'
    (output / 'atlas.webp').rename(atlas)
    foot_bottoms = []
    with Image.open(atlas) as packed:
        for i in range(4):
            x, y = i % 2 * 768, i // 2 * 768
            alpha = packed.crop((x, y, x+768, y+768)).getchannel('A')
            foot_bottoms.append(alpha.point(lambda a: 255 if a >= 128 else 0).getbbox()[3])
    m.update(originalSourceSHA256=original_sha, originalSourceFile='../south-2026-11-24-batch-2/source.png',
             sourceFile='source.png', atlasFile=atlas.name, bytes=atlas.stat().st_size,
             footBottoms=foot_bottoms, footAnchorMethod='opaque alpha >=128 bottom exclusive per 768px cell',
             maxDisplayCSSPixels=147, sourceResolutionRatio=627/147, grid=[2,2], qaGameplayApplied=False,
             frameTiming='four distinct poses; not a complete 10-frame run cycle',
             repair='attenuate outer mist only; preserve RGB and all alpha >=64 pixels; no resampling')
    (output / 'manifest.json').write_text(json.dumps(m, indent=2)+'\n')
    return m


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--expected-sha', required=True)
    args = parser.parse_args()
    print(json.dumps(repair(args.source, args.output, args.expected_sha), indent=2))
