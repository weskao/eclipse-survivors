#!/usr/bin/env python3
"""Safely stage actual ES2 candidate ZIP bytes; never replace live art."""
import argparse
import hashlib
import json
import os
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = "src/assets/es2/production/heroes/"
HEROES = ("shadowblade", "spirit-summoner")

def sha(data):
    return hashlib.sha256(data).hexdigest()

def pixel_dimensions(data, fmt):
    if fmt == "png":
        if len(data) < 33 or not data.startswith(b"\x89PNG\r\n\x1a\n") or data[12:16] != b"IHDR" or data[24:26] != b"\x08\x06":
            raise ValueError("expected RGBA PNG image")
        return [int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")]
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP" or int.from_bytes(data[4:8], "little")+8 != len(data):
        raise ValueError("invalid WebP RIFF header")
    codec = data[12:16]
    if codec == b"VP8X":
        return [1+int.from_bytes(data[24:27], "little"), 1+int.from_bytes(data[27:30], "little")]
    if codec == b"VP8L":
        return [1+data[21]+((data[22]&63)<<8), 1+(data[22]>>6)+(data[23]<<2)+((data[24]&15)<<10)]
    if codec == b"VP8 ":
        return [int.from_bytes(data[26:28],"little")&16383,int.from_bytes(data[28:30],"little")&16383]
    raise ValueError("unsupported WebP codec")

def validate(archive):
    with zipfile.ZipFile(archive) as z:
        entries = z.infolist()
        if len(entries) != len(set(i.filename for i in entries)):
            raise ValueError("duplicate archive entry")
        data = {}
        for entry in entries:
            name = entry.filename
            parts = Path(name).parts
            if (entry.is_dir() or entry.file_size > 12_000_000 or entry.flag_bits & 1
                or name.startswith("/") or ".." in parts
                or (entry.external_attr >> 16) & 0o170000 == 0o120000):
                raise ValueError("unexpected archive entry: " + name)
            if name not in ("BUNDLE_MANIFEST.json", "IMPORT_INSTRUCTIONS.txt"):
                if len(parts) != 9 or parts[:5] != tuple(Path(ROOT).parts) or parts[5] not in HEROES or parts[6:8] != ("candidates", "east-run"):
                    raise ValueError("unexpected archive entry: " + name)
            data[name] = z.read(entry)
    manifest = json.loads(data["BUNDLE_MANIFEST.json"])
    if manifest.get("status") != "QA_PENDING" or manifest.get("runtimeApplied") is not False:
        raise ValueError("candidate manifest cannot claim production approval")
    records = manifest["assets"]
    names = [r["path"] for r in records]
    if len(names) != len(set(names)) or set(names) != set(data) - {"BUNDLE_MANIFEST.json", "IMPORT_INSTRUCTIONS.txt"}:
        raise ValueError("unexpected archive entry or asset inventory mismatch")
    for record in records:
        payload = data[record["path"]]
        if record["size"] != len(payload) or record["sha256"] != sha(payload):
            raise ValueError("SHA-256 mismatch: " + record["path"])
    for hero in HEROES:
        prefix = ROOT + hero + "/candidates/east-run/"
        files = {k[len(prefix):]:v for k,v in data.items() if k.startswith(prefix)}
        qa = json.loads(files["asset-QA.json"])
        if qa.get("native3x") is not False or qa.get("runtimeApplied") is not False or qa.get("completeEightDirections") is not False or len(qa.get("frames", [])) != 4 or qa.get("qa", qa.get("identityReview")) != "QA_PENDING":
            raise ValueError("candidate QA incorrectly asserts native3x or completion")
        atlas = files[qa["atlas"]]
        size = qa.get("framePixels", qa.get("frameSize"))
        if size not in ([480,480], [512,512]) or qa["atlasPixels"] != [size[0]*4,size[1]] or pixel_dimensions(atlas, "webp") != qa["atlasPixels"] or sha(atlas) != qa["atlasSHA256"]:
            raise ValueError("atlas SHA-256 or dimensions mismatch")
        for i in range(1,5):
            file = f"{hero}-run-east-frame-{i:02}-QA-PENDING.png"
            if pixel_dimensions(files[file], "png") != size:
                raise ValueError("invalid PNG frame " + file)
        if any(f.get("native3x") is not False or f.get("status") != "QA_PENDING" for f in qa["frames"]):
            raise ValueError("candidate frame cannot claim approval")
    return {k:v for k,v in data.items() if k.startswith(ROOT)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        payloads = validate(args.archive)
        root = args.repo_root.resolve()
        for path, data in payloads.items():
            target = root/path
            if target.exists() and sha(target.read_bytes()) != sha(data):
                raise ValueError("refuse overwrite: " + path)
        inserted = 0
        for path, data in payloads.items():
            target = root/path
            if target.exists():
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            fd, temp = tempfile.mkstemp(dir=target.parent, prefix=".hero-asset-")
            try:
                with os.fdopen(fd, "wb") as output:
                    output.write(data)
                os.replace(temp, target)
            finally:
                if os.path.exists(temp):
                    os.unlink(temp)
            inserted += 1
        print(f"Staged {inserted} unchanged-source files, QA_PENDING; production art/runtime untouched")
        return 0
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as e:
        print(f"Candidate import rejected: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
