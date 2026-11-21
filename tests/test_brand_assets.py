import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.request import urlopen
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("brand", ROOT / "scripts/export-brand-assets.py")
brand = importlib.util.module_from_spec(spec)
spec.loader.exec_module(brand)

class BrandAssetTests(unittest.TestCase):
    def test_loads_actual_game_art_from_src_assets(self):
        images = brand.get_game_images()
        expected = {"knight", "ranger", "wizard", "slime", "bat", "goblin",
                    "golem", "boss", "ground", "courtyard"}
        self.assertTrue(expected <= set(images))
        self.assertEqual(images["knight"].mode, "RGBA")
        self.assertGreater(images["knight"].size[0], 300)

    def test_missing_art_raises_clear_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, "Missing real in-game sprites"):
                brand.get_game_images(Path(tmp))

    def test_serve_dir_serves_files_over_http_then_shuts_down(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "index.html").write_text("<p>hi</p>")
            with brand.serve_dir(Path(tmp)) as base:
                self.assertTrue(base.startswith("http://127.0.0.1:"))
                with urlopen(base + "/index.html", timeout=5) as response:
                    self.assertEqual(response.read(), b"<p>hi</p>")
            with self.assertRaises(OSError):
                urlopen(base + "/index.html", timeout=2)

    def test_capture_requires_built_dist(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(brand, "DIST", Path(tmp) / "dist"):
                with self.assertRaisesRegex(FileNotFoundError, "pnpm build"):
                    brand.capture_game(None, Path(tmp) / "shot.png")

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
            brand.render_brand_images(root / "live.png", root)
            sizes = {"icon-192.png": (192, 192), "icon-512.png": (512, 512),
                     "apple-touch-icon.png": (180, 180), "og-cover.png": (1200, 630)}
            for name, size in sizes.items():
                with self.subTest(asset=name):
                    with Image.open(root / name) as picture:
                        self.assertEqual(picture.size, size)
                    self.assertGreater((root / name).stat().st_size, 5000)

if __name__ == "__main__":
    unittest.main()
