import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw
from repair_summoner_candidate import clean_tile, repair


class MistRepairTests(unittest.TestCase):
    def test_removes_distant_mist_preserves_character_and_near_glow(self):
        im = Image.new('RGBA', (627, 627), (180, 190, 230, 32))
        ImageDraw.Draw(im).rectangle((220, 160, 405, 490), fill=(210, 211, 215, 230))
        out = clean_tile(im)
        self.assertEqual(out.getpixel((0, 0))[3], 0)
        self.assertEqual(out.getpixel((100, 100))[3], 0)
        self.assertEqual(out.getpixel((230, 200)), im.getpixel((230, 200)))
        self.assertEqual(out.getpixel((218, 200)), im.getpixel((218, 200)))
        self.assertEqual(im.getpixel((0, 0))[3], 32)
        self.assertEqual(out.convert('RGB').tobytes(), im.convert('RGB').tobytes())

    def test_refuses_visible_character_near_edge(self):
        im = Image.new('RGBA', (627, 627))
        ImageDraw.Draw(im).rectangle((10, 160, 405, 490), fill=(210, 211, 215, 230))
        with self.assertRaisesRegex(ValueError, 'margin'):
            clean_tile(im)

    def test_refuses_empty_frame(self):
        with self.assertRaisesRegex(ValueError, 'margin'):
            clean_tile(Image.new('RGBA', (627, 627)))

    def test_packs_four_distinct_frames_with_preserved_provenance(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'source.png'
            im = Image.new('RGBA', (1254, 1254), (180, 190, 230, 32))
            draw = ImageDraw.Draw(im)
            for i in range(4):
                x, y = i % 2 * 627, i // 2 * 627
                draw.rectangle((x+220, y+100, x+405, y+550+i), fill=(210, 211, 215, 230))
            im.save(source)
            original = source.read_bytes()
            sha = hashlib.sha256(original).hexdigest()
            output = root / 'repaired'
            m = repair(source, output, sha)
            self.assertEqual(source.read_bytes(), original)
            self.assertEqual(m['originalSourceSHA256'], sha)
            self.assertEqual(m['sourceCellPixels'], [627, 627])
            self.assertFalse(m['resampled'])
            self.assertEqual(m['status'], 'QA_PENDING')
            self.assertFalse(m['runtimeApplied'])
            self.assertEqual(m['footBottoms'], [621, 622, 623, 624])
            self.assertEqual(m['webpSHA256'], hashlib.sha256((output / m['atlasFile']).read_bytes()).hexdigest())
            self.assertEqual(m, json.loads((output / 'manifest.json').read_text()))
            self.assertFalse((output / 'atlas.webp').exists())

    def test_refuses_wrong_source_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / 'source.png'
            source.write_bytes(b'wrong source')
            with self.assertRaisesRegex(ValueError, 'SHA-256'):
                repair(source, root / 'output', '0' * 64)
            self.assertFalse((root / 'output').exists())


if __name__ == '__main__':
    unittest.main()
