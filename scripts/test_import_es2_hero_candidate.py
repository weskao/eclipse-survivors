import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).with_name('import-es2-hero-candidate.py')
FILES = [
    'shadowblade-run-east-4frame-QA-PENDING.webp',
    *(f'shadowblade-run-east-frame-{i:02}-QA-PENDING.png' for i in range(1, 5)),
    'asset-QA.json', 'repair_draft.py', 'test_asset_quality.py',
    'shadowblade-crop-safe-preview.png',
]


def fake_webp():
    # 1920x480 VP8X fixture verifies archive handling, not visual quality.
    vp8x = bytes([0x10, 0, 0, 0]) + (1919).to_bytes(3, 'little') + (479).to_bytes(3, 'little')
    chunk = b'VP8X' + (10).to_bytes(4, 'little') + vp8x
    return b'RIFF' + (len(chunk) + 4).to_bytes(4, 'little') + b'WEBP' + chunk


def fake_png():
    return (b'\x89PNG\r\n\x1a\n' + (13).to_bytes(4, 'big') + b'IHDR'
            + (480).to_bytes(4, 'big') * 2 + bytes((8, 6, 0, 0, 0)) + b'\0\0\0\0')


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.zip = self.root / 'candidate.zip'

    def make_zip(self, *, bad_sha=False, unsafe=False, approved=False):
        webp = fake_webp()
        qa = {
            'atlas': FILES[0],
            'atlasSHA256': '0' * 64 if bad_sha else hashlib.sha256(webp).hexdigest(),
            'atlasPixels': [1920, 480], 'frameSize': [480, 480],
            'frames': [{'index': i, 'native3x': False, 'status': 'QA_PENDING'} for i in range(4)],
            'native3x': approved, 'completeEightDirections': False,
            'runtimeApplied': False, 'transparent': True,
        }
        with zipfile.ZipFile(self.zip, 'w', zipfile.ZIP_DEFLATED) as archive:
            for name in FILES:
                data = (webp if name == FILES[0] else
                        json.dumps(qa).encode() if name == 'asset-QA.json' else
                        fake_png() if name.endswith('.png') else b'# historical source only\n')
                archive.writestr(name, data)
            if unsafe:
                archive.writestr('../escape.txt', 'unsafe')

    def invoke(self):
        return subprocess.run([sys.executable, str(SCRIPT), str(self.zip),
                               '--repo-root', str(self.root)],
                              capture_output=True, text=True)

    def test_imports_exact_original_files_with_hashes_and_is_idempotent(self):
        self.make_zip()
        result = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        root = self.root / 'src/assets/es2/production/heroes/shadowblade/candidates/east-run'
        self.assertEqual({p.name for p in root.iterdir()}, set(FILES) | {'manifest.json'})
        manifest = json.loads((root / 'manifest.json').read_text())
        self.assertEqual(manifest['qa'], 'QA_PENDING')
        self.assertFalse(manifest['native3x'])
        self.assertFalse(manifest['runtimeApplied'])
        for name, sha in manifest['sha256'].items():
            self.assertEqual(sha, hashlib.sha256((root / name).read_bytes()).hexdigest())
        self.assertEqual(self.invoke().returncode, 0)

    def test_rejects_tampered_sha(self):
        self.make_zip(bad_sha=True)
        result = self.invoke()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('SHA-256', result.stderr)
        self.assertFalse((self.root / 'src').exists())

    def test_rejects_unsafe_zip_entries(self):
        self.make_zip(unsafe=True)
        result = self.invoke()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('unexpected ZIP entry', result.stderr)

    def test_rejects_false_native_3x(self):
        self.make_zip(approved=True)
        result = self.invoke()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('native3x', result.stderr)


if __name__ == '__main__':
    unittest.main()
