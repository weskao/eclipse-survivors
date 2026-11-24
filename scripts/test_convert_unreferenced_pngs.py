import tempfile
import unittest
from pathlib import Path
from PIL import Image
from convert_unreferenced_pngs import convert_png


class ConvertPngTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.png = Path(self.tmp.name) / 'sample.png'
        self.image = Image.new('RGBA', (24, 20), (7, 31, 69, 0))
        self.image.putpixel((4, 4), (211, 72, 39, 127))
        self.image.putpixel((5, 5), (234, 67, 81, 255))
        self.image.save(self.png)

    def test_lossless_rgba_including_hidden_rgb(self):
        result = convert_png(self.png)
        self.assertEqual(result['status'], 'converted')
        self.assertFalse(self.png.exists())
        with Image.open(self.png.with_suffix('.webp')) as im:
            self.assertEqual(im.size, self.image.size)
            self.assertEqual(im.convert('RGBA').tobytes(), self.image.tobytes())

    def test_existing_different_webp_is_not_overwritten(self):
        target = self.png.with_suffix('.webp')
        Image.new('RGB', self.image.size, 'red').save(target, lossless=True)
        original = self.png.read_bytes(), target.read_bytes()
        self.assertEqual(convert_png(self.png)['status'], 'kept')
        self.assertEqual((self.png.read_bytes(), target.read_bytes()), original)

    def test_metadata_is_not_silently_removed(self):
        from PIL.PngImagePlugin import PngInfo
        metadata = PngInfo()
        metadata.add_text('original-source', 'important provenance')
        self.image.save(self.png, pnginfo=metadata)
        self.assertEqual(convert_png(self.png)['status'], 'kept')
        self.assertTrue(self.png.exists())
        self.assertFalse(self.png.with_suffix('.webp').exists())

    def test_existing_equivalent_webp_is_reused(self):
        target = self.png.with_suffix('.webp')
        self.image.save(target, lossless=True, exact=True)
        before = target.read_bytes()
        self.assertEqual(convert_png(self.png)['status'], 'deduplicated')
        self.assertFalse(self.png.exists())
        self.assertEqual(target.read_bytes(), before)

    def test_animated_png_is_not_replaced(self):
        self.image.save(self.png, save_all=True, append_images=[Image.new('RGBA', self.image.size, 'blue')], duration=100)
        self.assertEqual(convert_png(self.png)['status'], 'kept')
        self.assertTrue(self.png.exists())


if __name__ == '__main__':
    unittest.main()
