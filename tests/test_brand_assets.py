import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
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

    def test_social_cover_displays_all_three_playable_classes(self):
        """The OG cover must show every starting hero, not only the knight and mage."""
        heroes = {
            key: Image.new("RGBA", (240, 320), color)
            for key, color in (
                ("knight", "#3765a1"), ("ranger", "#357c62"), ("wizard", "#8165b1")
            )
        }
        with tempfile.TemporaryDirectory() as tmp:
            screenshot = Path(tmp) / "gameplay.png"
            Image.new("RGB", (1280, 800), "#273944").save(screenshot)
            with patch.object(brand, "add_sprite", wraps=brand.add_sprite) as drawn:
                cover = brand.social_cover(heroes, screenshot)
            self.assertEqual(cover.size, (1200, 630))
            self.assertEqual(
                {id(call.args[1]) for call in drawn.call_args_list},
                {id(heroes[key]) for key in ("knight", "ranger", "wizard")},
            )
            self.assertEqual(len(drawn.call_args_list), 3)
            for call in drawn.call_args_list:
                x, y, w, h = call.args[2]
                self.assertGreater(w, 150)
                self.assertGreater(h, 250)
                self.assertGreaterEqual(x, 0)
                self.assertGreaterEqual(y, 0)
                self.assertLessEqual(x + w, 1200)
                self.assertLessEqual(y + h, 630)

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
