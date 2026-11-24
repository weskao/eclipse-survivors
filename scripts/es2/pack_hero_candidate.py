#!/usr/bin/env python3
"""Stage a transparent 2x2 hero candidate without resampling or release approval."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

CELL = 768
MARGIN = 8


def pack(source: Path, output: Path, hero='shadowblade', pose='run', direction='S') -> dict:
    source_bytes = source.read_bytes()
    with Image.open(source) as original:
        if original.mode != 'RGBA' or original.format != 'PNG':
            raise ValueError('expected original RGBA PNG')
        w, h = original.size
        if w % 2 or h % 2 or not (441 <= w//2 <= CELL-2*MARGIN and 441 <= h//2 <= CELL-2*MARGIN):
            raise ValueError('expected even source dimensions with 441–752px cells')
        cw, ch = w//2, h//2
        atlas = Image.new('RGBA', (CELL*2, CELL*2))
        frames = []
        seen = set()
        for i in range(4):
            x, y = i%2, i//2
            tile = original.crop((x*cw, y*ch, (x+1)*cw, (y+1)*ch))
            bounds = tile.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
            if not bounds or min(bounds[0], bounds[1], cw-bounds[2], ch-bounds[3]) < MARGIN:
                raise ValueError(f'frame {i}: insufficient original alpha margin')
            sha = hashlib.sha256(tile.tobytes()).hexdigest()
            if sha in seen:
                raise ValueError(f'frame {i}: duplicate source pixels')
            seen.add(sha)
            atlas.paste(tile, (x*CELL+(CELL-cw)//2, y*CELL+(CELL-ch)//2))
            frames.append({'index': i, 'originalAlphaBounds': list(bounds), 'rgbaSHA256': sha})
    output.mkdir(parents=True, exist_ok=False)
    (output/'source.png').write_bytes(source_bytes)
    target = output/'atlas.webp'
    atlas.save(target, 'WEBP', lossless=True, exact=True, method=6)
    manifest = {'status': 'QA_PENDING', 'hero': hero, 'pose': pose, 'direction': direction,
                'native3x': 'unverified', 'runtimeApplied': False, 'completeEightDirections': False,
                'sourcePixels': [w,h], 'sourceCellPixels': [cw,ch], 'outputCellPixels': [CELL,CELL],
                'atlasPixels': list(atlas.size), 'resampled': False, 'frameCount': 4,
                'sourceSHA256': hashlib.sha256(source_bytes).hexdigest(),
                'webpSHA256': hashlib.sha256(target.read_bytes()).hexdigest(), 'frames': frames}
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--hero', required=True, choices=['shadowblade','spirit-summoner','crimson-paladin'])
    parser.add_argument('--pose', required=True, choices=['run','attack','special'])
    parser.add_argument('--direction', required=True, choices=['E','SE','S','SW','W','NW','N','NE'])
    args = parser.parse_args()
    print(json.dumps(pack(args.source,args.output,args.hero,args.pose,args.direction), indent=2))
