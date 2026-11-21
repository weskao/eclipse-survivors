import importlib.util
from pathlib import Path
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("brand", ROOT / "scripts/export-brand-assets.py")
brand = importlib.util.module_from_spec(spec)
spec.loader.exec_module(brand)

class BrandAssetTests(unittest.TestCase):
    def test_uses_actual_embedded_game_sprites(self):
        images = brand.get_game_images((ROOT / "index.html").read_text())
        self.assertTrue({"knight", "ranger", "wizard", "ground", "golem"} <= set(images))
        self.assertGreater(images["knight"].size[0], 300)

    def test_outputs_branded_icons_and_social_preview_from_game_art(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            Image.new("RGB", (1280, 800), "#64763e").save(root / "live.png")
            brand.render_brand_images((ROOT / "index.html").read_text(), root / "live.png", root)
            sizes = {"icon-192.png": (192, 192), "icon-512.png": (512, 512),
                     "apple-touch-icon.png": (180, 180), "og-cover.png": (1200, 630)}
            for name, size in sizes.items():
                with self.subTest(asset=name):
                    with Image.open(root / name) as picture:
                        self.assertEqual(picture.size, size)
                    self.assertGreater((root / name).stat().st_size, 5000)

if __name__ == "__main__":
    unittest.main()
