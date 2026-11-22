import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from scripts.es2.build_c104_hero_atlases import DIRECTIONS, HEROES, MANIFEST_NAME, OUT_DIR, build


class TestC104HeroAtlases(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name)
        cls.manifest = build(out_dir=cls.out)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_committed_atlases_match_a_fresh_deterministic_build(self):
        committed = json.loads((OUT_DIR / MANIFEST_NAME).read_text(encoding="utf-8"))
        # Encoded bytes depend on the libwebp build (CI pins an older Pillow); geometry must not.
        strip = lambda m: {**m, "heroes": {h: {k: v for k, v in x.items() if k not in ("bytes", "sha256")}
                                         for h, x in m["heroes"].items()}}
        self.assertEqual(strip(committed), strip(self.manifest))
        for meta in committed["heroes"].values():
            raw = (OUT_DIR / meta["file"]).read_bytes()
            self.assertEqual(hashlib.sha256(raw).hexdigest(), meta["sha256"])
            self.assertLessEqual(len(raw), meta["maxBytes"])

    def test_layout_and_every_authored_frame_is_present(self):
        for hero, spec in HEROES.items():
            meta = self.manifest["heroes"][hero]
            cw, ch = meta["cell"]["width"], meta["cell"]["height"]
            with Image.open(self.out / meta["file"]) as image:
                self.assertEqual(image.size, (cw * meta["columns"], ch * meta["rows"]))
                alpha = image.convert("RGBA").getchannel("A")
            for si, (_, frames) in enumerate(spec["sections"]):
                for d in range(len(DIRECTIONS)):
                    row = si * 8 + d
                    for f in range(meta["columns"]):
                        box = alpha.crop((f * cw, row * ch, (f + 1) * cw, (row + 1) * ch)).getbbox()
                        if f < frames:
                            # Content exists and never touches the cell edge (no clipped or bleeding frame).
                            self.assertIsNotNone(box, (hero, row, f))
                            self.assertTrue(box[0] > 0 and box[1] > 0 and box[2] < cw and box[3] < ch, (hero, row, f, box))
                        else:
                            self.assertIsNone(box, (hero, row, f))

    def test_source_rects_stay_inside_the_sheet_and_never_overlap(self):
        for hero, cells in self.manifest["cells"].items():
            if hero == "columns":
                continue
            w, h = self.manifest["heroes"][hero]["sourceSize"]
            rects = {tuple(c[3:7]) for c in cells}  # NW/N/NE fallbacks may share a rect
            for x, y, rw, rh in rects:
                self.assertTrue(0 <= x and 0 <= y and x + rw <= w and y + rh <= h, (hero, x, y))
            ordered = sorted(rects)
            for i, a in enumerate(ordered):
                for b in ordered[i + 1:]:
                    overlap = min(a[0] + a[2], b[0] + b[2]) > max(a[0], b[0]) and min(a[1] + a[3], b[1] + b[3]) > max(a[1], b[1])
                    self.assertFalse(overlap, (hero, a, b))


if __name__ == "__main__":
    unittest.main()
