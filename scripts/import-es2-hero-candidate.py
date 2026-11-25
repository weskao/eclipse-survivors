#!/usr/bin/env python3
"""Stage supplied Shadowblade East-run art without replacing production assets.

Usage: python3 scripts/import-es2-hero-candidate.py <source.zip> [--repo-root .]
This only stages art candidates. Native 3x / visual approval remains separate.
"""

import argparse
import hashlib
import json
import os
import struct
import sys
import tempfile
import zipfile
from pathlib import Path

HERO = 'shadowblade'
FRAME_PREFIX = 'shadowblade-run-east-frame-'
ATLAS_NAME = 'shadowblade-run-east-4frame-QA-PENDING.webp'
FILES = frozenset({
    ATLAS_NAME, 'asset-QA.json', 'repair_draft.py', 'test_asset_quality.py',
    'shadowblade-crop-safe-preview.png',
    *(f'{FRAME_PREFIX}{n:02}-QA-PENDING.png' for n in range(1, 5)),
})
DEST_REL = Path('src/assets/es2/production/heroes/shadowblade/candidates/east-run')
MAX_ENTRY_BYTES = 10 * 1024 * 1024


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def webp_geometry(data: bytes) -> tuple[int, int]:
    if len(data) < 30 or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        raise ValueError('candidate atlas is not a WebP RIFF file')
    if int.from_bytes(data[4:8], 'little') + 8 != len(data):
        raise ValueError('candidate atlas has an invalid WebP RIFF length')
    codec = data[12:16]
    if codec == b'VP8X':
        return (1 + int.from_bytes(data[24:27], 'little'),
                1 + int.from_bytes(data[27:30], 'little'))
    if codec == b'VP8L':
        if data[20] != 0x2F:
            raise ValueError('invalid WebP lossless header')
        return (1 + data[21] + ((data[22] & 0x3F) << 8),
                1 + (data[22] >> 6) + (data[23] << 2)
                + ((data[24] & 0x0F) << 10))
    if codec == b'VP8 ':
        if data[23:26] != b'\x9d\x01\x2a':
            raise ValueError('invalid WebP lossy header')
        return (int.from_bytes(data[26:28], 'little') & 0x3FFF,
                int.from_bytes(data[28:30], 'little') & 0x3FFF)
    raise ValueError('unsupported WebP encoding')


def validate_png(data: bytes) -> None:
    if len(data) < 33 or data[:8] != b'\x89PNG\r\n\x1a\n' or data[12:16] != b'IHDR':
        raise ValueError('candidate frame is not PNG')
    if struct.unpack('>II', data[16:24]) != (480, 480):
        raise ValueError('candidate frame must be 480x480')
    if data[24:26] != b'\x08\x06':
        raise ValueError('candidate frame must be 8-bit RGBA PNG')


def inspect(archive_path: Path) -> tuple[dict[str, bytes], dict]:
    with zipfile.ZipFile(archive_path) as archive:
        entries = archive.infolist()
        names = [i.filename for i in entries]
        if len(names) != len(FILES) or set(names) != FILES:
            raise ValueError('unexpected ZIP entry, missing source file or duplicate file')
        if any(i.is_dir() or i.file_size > MAX_ENTRY_BYTES or i.flag_bits & 1
               or i.external_attr >> 16 & 0o170000 == 0o120000 for i in entries):
            raise ValueError('unsafe ZIP file entry')
        files = {name: archive.read(name) for name in sorted(FILES)}

    qa = json.loads(files['asset-QA.json'])
    if (qa.get('native3x') is not False or qa.get('completeEightDirections') is not False
            or qa.get('runtimeApplied') is not False):
        raise ValueError('cannot import false native3x / eight-direction / runtime claims')
    if qa.get('atlas') != ATLAS_NAME or qa.get('atlasPixels') != [1920, 480]:
        raise ValueError('incorrect candidate atlas reference or declared geometry')
    if qa.get('frameSize') != [480, 480] or len(qa.get('frames', [])) != 4:
        raise ValueError('candidate must contain four 480px frames')
    if any(f.get('index') != i or f.get('native3x') is not False
           or f.get('status') != 'QA_PENDING' for i, f in enumerate(qa['frames'])):
        raise ValueError('unreviewed animation metadata is inaccurate')
    if digest(files[ATLAS_NAME]) != qa.get('atlasSHA256'):
        raise ValueError('atlas SHA-256 does not match the original source archive')
    if webp_geometry(files[ATLAS_NAME]) != (1920, 480):
        raise ValueError('invalid original four-frame WebP dimensions')
    for i in range(1, 5):
        validate_png(files[f'{FRAME_PREFIX}{i:02}-QA-PENDING.png'])
    return files, qa


def stage(zip_file: Path, repo_root: Path) -> Path:
    files, _qa = inspect(zip_file)
    dst = repo_root / DEST_REL
    expected_hashes = {name: digest(data) for name, data in files.items()}
    manifest = {
        'schemaVersion': 1,
        'heroId': HERO, 'pose': 'run', 'direction': 'E', 'frameCount': 4,
        'atlasPixels': [1920, 480], 'framePixels': [480, 480],
        'qa': 'QA_PENDING', 'native3x': False, 'runtimeApplied': False,
        'completeEightDirections': False,
        'sourceArchiveSHA256': digest(zip_file.read_bytes()),
        'sha256': expected_hashes,
        'sourceStatus': 'candidate-only; preserve original bytes; never import as live pose atlas',
        'note': 'Actual alpha/gutter continuity still requires visual QA; no production runtime substitution.',
    }
    manifest_bytes = (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode()

    if dst.exists():
        actual = {x.name: digest(x.read_bytes()) for x in dst.iterdir() if x.is_file()}
        wanted = expected_hashes | {'manifest.json': digest(manifest_bytes)}
        if actual == wanted:
            return dst
        raise ValueError(f'candidate directory has changed; refuse overwrite: {dst}')

    dst.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.es2-hero-candidate-', dir=dst.parent) as temp:
        temp_path = Path(temp)
        for name, data in files.items():
            (temp_path / name).write_bytes(data)
        (temp_path / 'manifest.json').write_bytes(manifest_bytes)
        os.rename(temp_path, dst)
    return dst


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_zip', type=Path)
    parser.add_argument('--repo-root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        dest = stage(args.source_zip, args.repo_root.resolve())
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as exc:
        print(f'ES2 candidate import rejected: {exc}', file=sys.stderr)
        return 1
    print(f'Staged unapproved art candidate at: {dest}\nStatus: QA_PENDING; no runtime imports changed')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
