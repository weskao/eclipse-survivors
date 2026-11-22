import tempfile
import unittest
from pathlib import Path
from PIL import Image

from scripts.es2.generate_c104_assets import generate_assets, ASSET_BOXES, UI_BOXES

ROOT = Path(__file__).resolve().parents[3]


def alpha_component_sizes(alpha):
    """8-connected opaque regions: detect accidentally imported adjacent sprites."""
    width, height = alpha.size
    pixels = alpha.tobytes()
    seen = bytearray(width * height)
    areas = []
    for start, value in enumerate(pixels):
        if value <= 32 or seen[start]:
            continue
        seen[start] = 1
        pending = [start]
        count = 0
        while pending:
            pos = pending.pop()
            count += 1
            x, y = pos % width, pos // width
            for yy in range(max(0, y - 1), min(height, y + 2)):
                for xx in range(max(0, x - 1), min(width, x + 2)):
                    q = yy * width + xx
                    if pixels[q] > 32 and not seen[q]:
                        seen[q] = 1
                        pending.append(q)
        areas.append(count)
    return sorted(areas, reverse=True)

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

    def test_ui_source_cells_never_overlap_other_icons(self):
        # c104's health halo protrudes into the old XP crop by four pixels.
        # Enforce exclusive source-rect ownership for every future UI asset.
        for index, (name, a) in enumerate(UI_BOXES.items()):
            for other, b in list(UI_BOXES.items())[index + 1:]:
                dx = min(a[2], b[2]) - max(a[0], b[0])
                dy = min(a[3], b[3]) - max(a[1], b[1])
                self.assertFalse(dx > 0 and dy > 0,
                                 f'c104 source crops overlap: {name} and {other} ({dx}x{dy})')

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
                        self.assertEqual(image.mode, 'RGB' if entry['kind'] == 'biome-scene' else 'RGBA')
                        self.assertEqual(image.format, 'WEBP')
                        width, height = entry['cell']
                        for index in range(entry['frames']):
                            cell = image.crop((index*width, 0, (index+1)*width, height))
                            alpha = cell.convert('RGBA').getchannel('A')
                            if entry['kind'] == 'biome-scene':
                                self.assertEqual(alpha.getextrema(), (255, 255),
                                                 'Full-scene art must preserve dark pixels without transparent holes')
                            if entry['kind'] == 'enemy-body':
                                self.assertEqual(len({tuple(bounds) for bounds in entry['sourceBoxes']}), 4,
                                                 'Six playback slots must reuse four distinct authored poses')
                                areas = alpha_component_sizes(alpha)
                                self.assertTrue(areas)
                                self.assertLessEqual(areas[1] if len(areas) > 1 else 0,
                                                     max(45, areas[0] * 0.035),
                                                     f'Neighboring pose contamination: {entry["path"]} cell {index}')
                            self.assertIsNotNone(alpha.getbbox())
                            if entry['kind'] != 'biome-scene':
                                edges = [alpha.crop((0, 0, width, 2)),
                                         alpha.crop((0, height-2, width, height)),
                                         alpha.crop((0, 0, 2, height)),
                                         alpha.crop((width-2, 0, width, height))]
                                for edge in edges:
                                    self.assertLessEqual(edge.getextrema()[1], 16)
                    self.assertLess(file.stat().st_size, entry['max_bytes'])

if __name__ == '__main__':
    unittest.main()
