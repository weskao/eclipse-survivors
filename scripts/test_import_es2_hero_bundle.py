"""Tests must reject changed bytes, unsafe ZIP paths and fabricated art QA."""
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

SCRIPT = Path(__file__).with_name("import_es2_hero_bundle.py")
BASE = "src/assets/es2/production/heroes/"
HEROES = [("shadowblade",480),("spirit-summoner",512)]

def fake_webp(width,height):
    box = bytes([0x10,0,0,0])+(width-1).to_bytes(3,"little")+(height-1).to_bytes(3,"little")
    chunk = b"VP8X"+(10).to_bytes(4,"little")+box
    return b"RIFF"+(len(chunk)+4).to_bytes(4,"little")+b"WEBP"+chunk

def fake_png(size):
    return b"\x89PNG\r\n\x1a\n"+(13).to_bytes(4,"big")+b"IHDR"+size.to_bytes(4,"big")*2+bytes([8,6,0,0,0])+b"\0\0\0\0"

def fixtures():
    records={}
    for hero,size in HEROES:
        root=f"{BASE}{hero}/candidates/east-run/"
        atlas=f"{hero}-run-east-4frame-QA-PENDING.webp"
        raw=fake_webp(4*size,size)
        records[root+atlas]=raw
        for i in range(1,5):
            records[root+f"{hero}-run-east-frame-{i:02}-QA-PENDING.png"]=fake_png(size)
        qa={"native3x":False,"completeEightDirections":False,"runtimeApplied":False,
            "qa":"QA_PENDING","atlas":atlas,"atlasSHA256":hashlib.sha256(raw).hexdigest(),
            "atlasPixels":[4*size,size],"framePixels":[size,size],
            "frames":[{"native3x":False,"status":"QA_PENDING"} for _ in range(4)]}
        records[root+"asset-QA.json"]=json.dumps(qa).encode()
    records["BUNDLE_MANIFEST.json"]=json.dumps({
        "status":"QA_PENDING","runtimeApplied":False,
        "assets":[{"path":p,"size":len(v),"sha256":hashlib.sha256(v).hexdigest()} for p,v in records.items()]
    }).encode()
    return records

class HeroCandidateBundleTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        self.files=fixtures()

    def invoke(self):
        bundle=self.root/"bundle.zip"
        with zipfile.ZipFile(bundle,"w",compression=zipfile.ZIP_DEFLATED) as z:
            for name,contents in self.files.items():z.writestr(name,contents)
        return subprocess.run([sys.executable,str(SCRIPT),str(bundle),"--repo-root",str(self.root)],
                              capture_output=True,text=True)

    def test_original_bytes_are_staged_without_overwriting_on_repeat(self):
        result=self.invoke()
        self.assertEqual(result.returncode,0,result.stderr)
        for path,data in self.files.items():
            if path=="BUNDLE_MANIFEST.json":continue
            self.assertEqual((self.root/path).read_bytes(),data)
        self.assertEqual(self.invoke().returncode,0)
        self.assertFalse((self.root/(BASE+"crimson-paladin")).exists())

    def test_rejects_modified_image_sha(self):
        path=next(k for k in self.files if k.endswith(".webp"))
        self.files[path]+=b"tampered"
        result=self.invoke()
        self.assertNotEqual(result.returncode,0)
        self.assertIn("SHA-256",result.stderr)
        self.assertFalse((self.root/"src").exists())

    def test_rejects_path_traversal(self):
        self.files["../../escape.txt"]=b"bad"
        result=self.invoke()
        self.assertNotEqual(result.returncode,0)
        self.assertIn("unexpected archive entry",result.stderr)
        self.assertFalse((self.root/"src").exists())

    def test_rejects_falsely_approved_art(self):
        key=BASE+"spirit-summoner/candidates/east-run/asset-QA.json"
        for field,value in [("native3x",True),("runtimeApplied",True),("qa","APPROVED")]:
            with self.subTest(field=field):
                self.files=fixtures()
                qa=json.loads(self.files[key])
                qa[field]=value
                self.files[key]=json.dumps(qa).encode()
                manifest=json.loads(self.files["BUNDLE_MANIFEST.json"])
                record=next(r for r in manifest["assets"] if r["path"]==key)
                record["size"]=len(self.files[key])
                record["sha256"]=hashlib.sha256(self.files[key]).hexdigest()
                self.files["BUNDLE_MANIFEST.json"]=json.dumps(manifest).encode()
                self.assertNotEqual(self.invoke().returncode,0)

    def test_refuses_overwriting_changed_existing_candidate(self):
        self.assertEqual(self.invoke().returncode,0)
        key=next(k for k in self.files if k.endswith(".webp"))
        (self.root/key).write_bytes(b"altered")
        result=self.invoke()
        self.assertNotEqual(result.returncode,0)
        self.assertIn("refuse overwrite",result.stderr)
        self.assertEqual((self.root/key).read_bytes(),b"altered")

if __name__=="__main__":
    unittest.main()
