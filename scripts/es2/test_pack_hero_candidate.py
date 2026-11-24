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

    def test_refuses_overwrite(self):
        src = self.source()
        pack(src, self.root/'out')
        with self.assertRaises(FileExistsError):
            pack(src, self.root/'out')
