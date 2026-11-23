import tempfile
import unittest
from pathlib import Path
from PIL import Image
from sys import path
path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from pack_es2_character_art import pack_sheet

class PackHeroFramesTests(unittest.TestCase):
    def test_fractional_cell_sizes_have_exact_integer_bounds_and_no_bleed(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / 'input.png'
            result = Path(tmp) / 'out.webp'
            im = Image.new('RGBA', (1254,1254), (0,0,0,0))
            for row in range(4):
                for col in range(4):
                    x0 = round(col*1254/4)
                    y0 = round(row*1254/4)
                    for x in range(x0+5,round((col+1)*1254/4)-5):
                        for y in range(y0+5,round((row+1)*1254/4)-5):
                            im.putpixel((x,y),(row*40,col*50,180,255))
            im.save(source)
            info = pack_sheet(source,result,4,4,448,kind='test')
            self.assertFalse(info['native3x'])
            self.assertEqual(info['frameCount'],16)
            with Image.open(result) as out:
                self.assertEqual(out.size,(1792,1792))
                for r in range(4):
                    for c in range(4):
                        pix = out.convert('RGBA').getpixel((c*448+224,r*448+224))
                        self.assertGreater(pix[3],250)
                        self.assertLess(abs(pix[0]-r*40),10)
                        self.assertLess(abs(pix[1]-c*50),10)
                        self.assertEqual(out.convert('RGBA').getpixel((c*448,r*448))[3],0)

    def test_4x2_special_sequence_remains_eight_distinct_crops(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp)/'input.png'
            output = Path(tmp)/'out.webp'
            im = Image.new('RGBA',(1774,887),(0,0,0,0))
            for row in range(2):
                for col in range(4):
                    x0=round(col*1774/4); y0=round(row*887/2)
                    im.paste((col*60, row*110, 120,255),(x0+12,y0+12,x0+110,y0+110))
            im.save(source)
            info=pack_sheet(source,output,4,2,448,kind='test')
            self.assertEqual(info['outputPixels'],[1792,896])
            self.assertEqual(info['frameCount'],8)
            with Image.open(output) as out:
                self.assertEqual(out.size,(1792,896))

if __name__ == '__main__': unittest.main()