"""Losslessly migrate only reviewed, unreferenced general-art PNGs."""
import json
import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile
from PIL import Image


def convert_png(source, *, preserve_source=False):
    target = source.with_suffix('.webp')
    result = {'source': str(source), 'target': str(target), 'status': 'kept'}
    if source.is_symlink() or target.is_symlink():
        return dict(result, reason='symlink')
    with Image.open(source) as image:
        if image.format != 'PNG' or image.n_frames != 1 or image.mode not in ('RGB', 'RGBA', 'P', 'L', 'LA'):
            return dict(result, reason='unsupported source format or animation')
        # Preserve color profile, EXIF, and decoded transparency; retain PNG
        # if any other metadata would be lost by conversion.
        if set(image.info) - {'icc_profile', 'exif', 'transparency'}:
            return dict(result, reason='source metadata requires review')
        metadata = {k: image.info[k] for k in ('icc_profile', 'exif') if image.info.get(k)}
        rgba = image.convert('RGBA')
    before = source.stat().st_size
    with NamedTemporaryFile(suffix='.webp', dir=source.parent) as temporary:
        candidate = target if target.exists() else Path(temporary.name)
        if not target.exists():
            rgba.save(candidate, 'WEBP', lossless=True, exact=True, method=6, **metadata)
        with Image.open(candidate) as decoded:
            if (decoded.format != 'WEBP' or decoded.n_frames != 1 or decoded.size != rgba.size
                    or decoded.convert('RGBA').tobytes() != rgba.tobytes()
                    or any(decoded.info.get(k) != metadata.get(k) for k in ('icc_profile', 'exif') if k in metadata or decoded.info.get(k))):
                return dict(result, reason='non-equivalent WebP or metadata')
        status = 'deduplicated' if target.exists() else 'converted'
        if not target.exists():
            candidate.replace(target)
        if preserve_source:
            return dict(result, status='display-copy' if status == 'converted' else 'display-reused',
                        originalBytes=before, webpBytes=target.stat().st_size,
                        sourcePreserved=True)
        source.unlink()
        return dict(result, status=status, originalBytes=before, webpBytes=target.stat().st_size,
                    savedBytes=before - target.stat().st_size if status == 'converted' else before)


def main():
    # Scope deliberately excludes platform icons, source masters and QA evidence.
    # Any possible literal or dynamic reference is a blocker, not a blind rename.
    refs = subprocess.run(['git', 'grep', '-I', '-l', '-F', '-e', 'assets/images', '-e', 'assets\\images', '-e', 'imgs', '--', '.',
                           ':(exclude)scripts/convert_unreferenced_pngs.py',
                           ':(exclude)scripts/test_convert_unreferenced_pngs.py',
                           ':(exclude).github/workflows/es2-safe-webp-migration.yml'], capture_output=True, text=True)
    if refs.returncode not in (0, 1):
        raise RuntimeError(refs.stderr)
    if refs.stdout.strip():
        print(json.dumps({'status': 'kept', 'reason': 'possible references require review', 'references': refs.stdout.splitlines()}, indent=2))
        return
    paths = [Path('assets/images') / f'imgs{i}.png' for i in range(1, 11)]
    print(json.dumps([convert_png(p) for p in paths if p.is_file()], indent=2))


if __name__ == '__main__':
    main()
