import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw
from pack_hero_candidate import pack

class CandidateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def source(self, clipped=False, duplicate=False):
        im = Image.new('RGBA', (1254, 1254))
        draw = ImageDraw.Draw(im)
        for i in range(4):
            x, y = (i % 2)*627, (i // 2)*627
            draw.rectangle((x+(0 if clipped and i==0 else 40), y+40, x+540, y+570), fill=(50, 40, 80 if duplicate else 80+i, 255))
        p = self.root/'source.png'
        im.save(p)
        return p

    def test_preserves_original_pixels_and_pending_status(self):
        src = self.source()
        m = pack(src, self.root/'out')
        self.assertEqual(m['status'], 'QA_PENDING')
        self.assertFalse(m['runtimeApplied'])
        self.assertEqual(m['native3x'], 'unverified')
        with Image.open(self.root/'out'/'atlas.webp') as atlas, Image.open(src) as original:
            self.assertEqual(atlas.size, (1536,1536))
            self.assertEqual(atlas.crop((70,70,697,697)).tobytes(), original.crop((0,0,627,627)).tobytes())
        self.assertEqual((self.root/'out'/'source.png').read_bytes(), src.read_bytes())

    def test_rejects_clipped_source_before_writing(self):
        with self.assertRaisesRegex(ValueError, 'margin'):
            pack(self.source(clipped=True), self.root/'out')
        self.assertFalse((self.root/'out').exists())

    def test_rejects_duplicate_frames(self):
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            pack(self.source(duplicate=True), self.root/'out')

    def test_cleans_only_alpha_one_noise_in_source_margin(self):
        src = self.source()
        with Image.open(src) as original:
            im = original.copy()
        im.putpixel((0, 0), (255, 0, 255, 1))
        im.putpixel((100, 100), (255, 0, 255, 1))
        im.save(src)
        manifest = pack(src, self.root/'out')
        with Image.open(self.root/'out'/'atlas.webp') as atlas:
            self.assertEqual(atlas.getpixel((70,70)), (0,0,0,0))
            self.assertEqual(atlas.getpixel((170,170)), (255,0,255,1))
        self.assertEqual(manifest['frames'][0]['clearedMarginPixels'], 1)
        self.assertEqual((self.root/'out'/'source.png').read_bytes(), src.read_bytes())

    def test_rejects_margin_alpha_above_one(self):
        src = self.source()
        with Image.open(src) as original:
            im = original.copy()
        im.putpixel((0, 0), (255, 0, 255, 2))
        im.save(src)
        with self.assertRaisesRegex(ValueError, 'margin'):
            pack(src, self.root/'out')
        self.assertFalse((self.root/'out').exists())

    def test_rejects_undersized_solid_core_even_with_large_translucent_effect(self):
        for width, height in [(440, 441), (441, 440), (0, 0)]:
            with self.subTest(width=width, height=height):
                src = self.source()
                with Image.open(src) as original:
                    im = original.copy()
                draw = ImageDraw.Draw(im)
                draw.rectangle((0, 0, 626, 626), fill=(0, 0, 0, 0))
                draw.rectangle((40, 40, 580, 580), fill=(50, 40, 80, 127))
                if width and height:
                    draw.rectangle((80, 80, 79+width, 79+height), fill=(50, 40, 80, 128))
                im.save(src)
                out = self.root/f'out-{width}-{height}'
                with self.assertRaisesRegex(ValueError, 'solid-alpha core'):
                    pack(src, out)
                self.assertFalse(out.exists())

    def test_records_minimum_size_solid_core_from_original_pixels(self):
        src = self.source()
        with Image.open(src) as original:
            im = original.copy()
        draw = ImageDraw.Draw(im)
        draw.rectangle((0, 0, 626, 626), fill=(0, 0, 0, 0))
        draw.rectangle((40, 40, 580, 580), fill=(50, 40, 80, 127))
        draw.rectangle((80, 80, 520, 520), fill=(50, 40, 80, 128))
        im.save(src)
        m = pack(src, self.root/'out')
        self.assertIn('coreAlphaBounds', m['frames'][0])
        self.assertEqual(m['frames'][0]['coreAlphaBounds'], [80, 80, 521, 521])
        self.assertEqual(m['frames'][0]['coreExtent'], [441, 441])
        self.assertEqual(m['native3x'], 'unverified')

    def test_refuses_overwrite(self):
        src = self.source()
        pack(src, self.root/'out')
        with self.assertRaises(FileExistsError):
            pack(src, self.root/'out')
