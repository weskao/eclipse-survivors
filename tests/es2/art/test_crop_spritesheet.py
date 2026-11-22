import unittest
from PIL import Image, ImageDraw
from scripts.es2.crop_spritesheet import SpriteLayout, extract_atlas, UnsafeSpriteCrop

class TestSafeCrop(unittest.TestCase):
    def make_grid(self, boundary=False):
        im = Image.new("RGBA", (23, 23), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        colors = [(255, 0, 0, 255), (0, 255, 0, 255),
                  (0, 0, 255, 255), (255, 255, 0, 255)]
        for row in range(2):
            for col in range(2):
                x, y = 1 + col * 12, 1 + row * 12
                d.rectangle((x + 2, y + 2, x + 5, y + 5),
                            fill=colors[row*2+col])
        if boundary:
            d.point((1, 4), fill=(255, 0, 0, 255))
        return im

    def test_exact_isolated_cells_no_adjacent_frame_bleed(self):
        layout = SpriteLayout(columns=2, rows=2, frame_width=8,
                              frame_height=8, origin_x=1, origin_y=1,
                              column_gap=4, row_gap=4)
        atlas, rects = extract_atlas(self.make_grid(), layout)
        self.assertEqual(atlas.size, (16, 16))
        self.assertEqual(rects, [(1,1,9,9),(13,1,21,9),
                                 (1,13,9,21),(13,13,21,21)])
        colors = [(255,0,0),(0,255,0),(0,0,255),(255,255,0)]
        for i, (x,y) in enumerate([(4,4),(12,4),(4,12),(12,12)]):
            self.assertEqual(atlas.getpixel((x,y))[:3],colors[i])
        self.assertEqual(atlas.getpixel((0,4))[3],0)

    def test_rejects_alpha_touching_frame_boundary(self):
        layout=SpriteLayout(columns=2,rows=2,frame_width=8,
                             frame_height=8,origin_x=1,origin_y=1,
                             column_gap=4,row_gap=4)
        with self.assertRaises(UnsafeSpriteCrop):
            extract_atlas(self.make_grid(boundary=True), layout)

    def test_rejects_opaque_composite_with_cross_cell_content(self):
        im=Image.new("RGBA",(16,16),(40,40,40,255))
        layout=SpriteLayout(columns=2,rows=2,frame_width=8,frame_height=8)
        with self.assertRaises(UnsafeSpriteCrop):
            extract_atlas(im,layout)

    def test_rejects_invalid_or_outside_grid(self):
        im=self.make_grid()
        for layout in [
            SpriteLayout(columns=2,rows=2,frame_width=12,frame_height=8,
                         origin_x=1,origin_y=1,column_gap=-4,row_gap=4),
            SpriteLayout(columns=3,rows=2,frame_width=8,frame_height=8,
                         origin_x=1,origin_y=1,column_gap=4,row_gap=4),
            SpriteLayout(columns=0,rows=2,frame_width=8,frame_height=8),
        ]:
            with self.subTest(layout=layout),self.assertRaises(UnsafeSpriteCrop):
                extract_atlas(im,layout)

if __name__ == "__main__":
    unittest.main()
