import json, hashlib, sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent
m=json.loads((root/'concept-manifest.json').read_text())
assert m['status']=='concept-only'
assert len(m['assets'])==24
seen=set()
for a in m['assets']:
 assert a['id'] not in seen; seen.add(a['id'])
 p=root/a['path']; assert p.is_file(),p
 b=p.read_bytes();assert b[:4]==b'RIFF' and b[8:12]==b'WEBP'
 assert hashlib.sha256(b).hexdigest()==a['sha256']
 with Image.open(p) as im:
  assert im.size==(a['width'],a['height']) and im.mode in ('RGBA','RGB')
  assert im.getpixel((0,0))[3] <= 30 if im.mode=='RGBA' else False
a=m['atlas']; p=root/a['path']
with Image.open(p) as im:
 assert im.size==(a['width'],a['height'])
 assert im.size==(a['cellWidth']*a['columns'],a['cellHeight']*a['rows'])
assert set(m['canonicalContentIds'])=={'weapons','evolutions'}
assert len(set(sum(m['canonicalContentIds'].values(),[])))==24
print('PASS: 24 concept WebPs, alpha corners, SHA-256, WebP signatures, geometry, atlas, canonical-ID inventory')
