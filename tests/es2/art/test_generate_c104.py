import tempfile
import unittest
from pathlib import Path
from PIL import Image

from scripts.es2.generate_c104_assets import generate_assets, ASSET_BOXES

ROOT = Path(__file__).resolve().parents[3]

class TestC104ProductionArt(unittest.TestCase):
    def test_explicit_boxes_are_nonoverlapping_and_in_source(self):
        for source, rects in ASSET_BOXES.items():
            with Image.open(ROOT / 'assets' / 'images' / f'imgs{source}.png') as image:
                frames = [(key, box) for key, box in rects.items() if key.startswith('frame:')]
                for key, (x0, y0, x1, y1) in rects.items():
                    with self.subTest(source=source, key=key):
                        self.assertTrue(0 <= x0 < x1 <= image.width)
                        self.assertTrue(0 <= y0 < y1 <= image.height)
                for index, (name, a) in enumerate(frames):
                    for other, b in frames[index+1:]:
                        overlaps = max(a[0], b[0]) < min(a[2], b[2]) and max(a[1], b[1]) < min(a[3], b[3])
                        self.assertFalse(overlaps, (source, name, other))

    def test_production_assets_preserve_independent_alpha_padded_cells(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            # 3 authored directional WebPs are already in the repo; the
            # generator must not synthesize missing directional frames.
            from shutil import copy2
            for id in ('shadowblade', 'spirit-summoner', 'crimson-paladin'):
                source = ROOT / 'src/assets/es2/production/heroes' / (id + '-8dir@3x.webp')
                dest = output / 'src/assets/es2/production/heroes' / source.name
                dest.parent.mkdir(parents=True, exist_ok=True)
                copy2(source, dest)
            items = generate_assets(ROOT / 'assets/images', output)
            expected = {'enemy-body': 10, 'enemy-telegraph': 10,
                        'boss-phases': 4, 'biome-decor': 4,
                        'biome-scene': 4, 'ui': 17, 'hero-special': 3}
            self.assertEqual(len(items), 52)
            for kind, count in expected.items():
                self.assertEqual(sum(item['kind'] == kind for item in items), count)
            self.assertEqual(len({item['path'] for item in items}), 52)
            for entry in items:
                with self.subTest(name=entry['path']):
                    file = output / entry['path']
                    with Image.open(file) as image:
                        self.assertEqual(image.size, tuple(entry['size']))
                        self.assertEqual(image.mode, 'RGBA')
                        self.assertEqual(image.format, 'WEBP')
                        width, height = entry['cell']
                        for index in range(entry['frames']):
                            cell = image.crop((index*width, 0, (index+1)*width, height))
                            alpha = cell.getchannel('A')
                            self.assertIsNotNone(alpha.getbbox())
                            edges = [alpha.crop((0, 0, width, 2)),
                                     alpha.crop((0, height-2, width, height)),
                                     alpha.crop((0, 0, 2, height)),
                                     alpha.crop((width-2, 0, width, height))]
                            for edge in edges:
                                self.assertLessEqual(edge.getextrema()[1], 16)
                    self.assertLess(file.stat().st_size, entry['max_bytes'])

if __name__ == '__main__':
    unittest.main()
