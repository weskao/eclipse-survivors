import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw
from pack_diagonal_candidate import clean_margin, pack_diagonal


class DiagonalCandidateTests(unittest.TestCase):
    def test_clears_only_margin_and_preserves_rgb(self):
        image = Image.new('RGBA', (627, 627), (21, 40, 60, 0))
        image.putpixel((0, 300), (30, 50, 70, 3))
        image.putpixel((9, 300), (40, 60, 80, 64))
        cleaned, count = clean_margin(image)
        self.assertEqual(count, 1)
        self.assertEqual(cleaned.getpixel((0, 300)), (30, 50, 70, 0))
        self.assertEqual(cleaned.getpixel((9, 300)), image.getpixel((9, 300)))
        self.assertEqual(cleaned.convert('RGB').tobytes(), image.convert('RGB').tobytes())
        self.assertEqual(image.getpixel((0, 300))[3], 3)

    def test_rejects_clipped_character_and_unreviewed_glow(self):
        image = Image.new('RGBA', (627, 627))
        image.putpixel((0, 10), (200, 100, 0, 23))
        with self.assertRaises(ValueError):
            clean_margin(image)
        self.assertEqual(clean_margin(image, 23)[0].getpixel((0, 10))[3], 0)
        image.putpixel((0, 10), (200, 100, 0, 64))
        with self.assertRaises(ValueError):
            clean_margin(image, 23)
        with self.assertRaises(ValueError):
            clean_margin(image, 64)

    def test_packs_four_unscaled_poses_and_preserves_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            image = Image.new('RGBA', (1254, 1254))
            draw = ImageDraw.Draw(image)
            for i in range(4):
                x, y = i % 2 * 627, i // 2 * 627
                draw.rectangle((x+100, y+60, x+450, y+550+i), fill=(40, 80, 120, 255))
                image.putpixel((x, y+5), (30, 50, 80, 2))
            original = root/'input.png'
            image.save(original)
            out = root/'out'
            manifest = pack_diagonal(original, out, 'shadowblade', 'SE')
            self.assertEqual((out/'original.png').read_bytes(), original.read_bytes())
            self.assertEqual(manifest['status'], 'QA_PENDING')
            self.assertFalse(manifest['runtimeApplied'])
            self.assertFalse(manifest['qaGameplayApplied'])
            self.assertFalse(manifest['resampled'])
            self.assertEqual(manifest['frameCount'], 4)
            self.assertEqual(manifest['sourceCellPixels'], [627, 627])
            self.assertEqual(manifest['footBottoms'], [621, 622, 623, 624])
            self.assertEqual(manifest['marginRepair']['perFrameChangedAlphaPixels'], [1]*4)
            with Image.open(out/manifest['atlasFile']) as atlas:
                self.assertEqual(atlas.size, (1536, 1536))


if __name__ == '__main__':
    unittest.main()
