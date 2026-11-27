"""Extract reference panels only; never use these as production sprites."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

POSES = ('idle', 'move', 'attack', 'recovery', 'hurt', 'transform', 'death')
COLS = ((283,454),(459,648),(653,832),(838,1005),(1010,1169),(1174,1363),(1368,1530))
ROWS = {
    'abyss-monarch': (45,106,173,251),
    'frost-sovereign': (297,363,431,501),
    'infernal-titan': (550,614,680,753),
    'eclipse-seraph': (804,867,934,1014),
}
STRIPS = {
    'abyss-monarch': (103, (0,145,290,434,575,715,860,1024), ('idle','move','attack-1-including-recovery','attack-2-including-recovery','hurt','transform','death')),
    'frost-sovereign': (231, (0,123,250,368,486,596,714,852,1024), ('idle','move','attack-a','attack-b','recovery','hurt','transform','death')),
    'infernal-titan': (114, (0,148,300,451,585,719,875,1024), POSES),
    'eclipse-seraph': (122, (0,147,294,441,581,720,875,1024), POSES),
}
HASHES = {
    'all-bosses-motion-study-02': 'cc6b57128f05c6886a89d589822c39a0fcf695cb67d3b81d800ed3330221a968',
    'abyss-monarch-animation-reference': '0bbaf3349be95402b52ae4a5f17be1c6a7606d88426e6819591eac6f0b309204',
    'frost-sovereign-animation-reference': 'c1639de3193a8374e320dc168aeafa1192a4421224db58759d46c03419534ea7',
    'infernal-titan-animation-reference': '5d6e3b53c7db65a095ac6470d36bacdc9478c022ba3cfadec1d2abbb7c8630ef',
    'eclipse-seraph-animation-reference': '1117b5968f905c5ccaa0c70bdfd384e0fe8d9759020711ec18e54d94440c48e9',
}
DEFAULT_SOURCE = Path('src/assets/es2/production/bosses/candidates/motion/reference-review')


def crop_specs():
    for boss, rows in ROWS.items():
        for pose, (x1, x2) in zip(POSES, COLS):
            for i, (y1, y2) in enumerate(zip(rows, rows[1:]), 1):
                yield 'all-bosses-motion-study-02', f'frames/{boss}/{pose}/{i:02}.png', (x1,y1,x2,y2)
    for boss, (x, rows, poses) in STRIPS.items():
        for pose, (y1,y2) in zip(poses, zip(rows, rows[1:])):
            yield boss+'-animation-reference', f'pose-strips/{boss}/{pose}.png', (x,y1,1536,y2)


def extract(source, output):
    images = {}
    for name, expected in HASHES.items():
        path = source / (name+'-QA-PENDING.png')
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise ValueError(f'Source hash mismatch: {path}')
        with Image.open(path) as im:
            if im.size != (1536,1024) or im.mode != 'RGBA':
                raise ValueError(f'Unexpected source geometry: {path}')
            images[name] = im.copy()
    output.mkdir(parents=True, exist_ok=False)
    files = []
    for name, path, rect in crop_specs():
        crop = images[name].crop(rect)
        dest = output / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        crop.save(dest)
        files.append({'path': path, 'source': name+'-QA-PENDING.png', 'sourceSha256': HASHES[name], 'rect': rect, 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest()})
    (output/'manifest.json').write_text(json.dumps({'status': 'QA_PENDING_REFERENCE_ONLY', 'native3x': False, 'runtimeReady': False, 'files': files}, indent=2)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--output', type=Path, required=True, help='New directory outside production assets')
    args = parser.parse_args()
    extract(args.source, args.output)
