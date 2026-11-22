"""Fail-closed byte and alpha-boundary verification for ES2 directional WebPs."""
from pathlib import Path
from PIL import Image
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
ATLAS_DIR = ROOT / "src/assets/es2/production/heroes"
MANIFEST = ATLAS_DIR / "8dir-manifest.json"
EXPECTED_IDS = {"shadowblade", "spirit-summoner", "crimson-paladin"}


def main() -> None:
    contract = json.loads(MANIFEST.read_text(encoding="utf-8"))
    shape = contract["contract"]
    assert (shape["columns"], shape["rows"], shape["frameWidth"], shape["frameHeight"]) == (8, 4, 128, 128)
    assert len(shape["directionOrder"]) == 8 and len(shape["poseRows"]) == 4
    entries = contract["assets"]
    assert {x["id"] for x in entries} == EXPECTED_IDS
    hashes = set()
    verified = 0
    for item in entries:
        expected = item["id"] + "-8dir@3x.webp"
        assert item["file"] == expected
        path = ATLAS_DIR / expected
        raw = path.read_bytes()
        assert raw[:4] == b"RIFF" and raw[8:12] == b"WEBP", path
        assert len(raw) == item["bytes"] and len(raw) < 250_000, path
        digest = hashlib.sha256(raw).hexdigest()
        assert digest == item["sha256"] and digest not in hashes, path
        hashes.add(digest)
        with Image.open(path) as image:
            assert image.size == (1024, 512) and item["width"] == 1024 and item["height"] == 512
            a = image.convert("RGBA").getchannel("A")
            for row in range(4):
                for col in range(8):
                    cell = a.crop((col * 128, row * 128, (col + 1) * 128, (row + 1) * 128))
                    assert cell.getbbox(), (path, row, col, "empty frame")
                    edges = (cell.crop((0, 0, 128, 1)),
                             cell.crop((0, 127, 128, 128)),
                             cell.crop((0, 0, 1, 128)),
                             cell.crop((127, 0, 128, 128)))
                    assert all(edge.getextrema()[1] <= 16 for edge in edges), (path, row, col, "frame bleeding")
                    verified += 1
    assert verified == 96
    print(f"Verified 3 authored 8-direction WebPs and {verified} populated, isolated sprite cells.")


if __name__ == "__main__":
    main()
