"""Optional local pixel-review helper; uses Pillow but does not add a project dependency.

Run: python3 src/assets/es2/production/heroes/review-pixels.py
This intentionally does not certify artistic quality or animation continuity.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image
from hashlib import sha256
import json

root=Path(__file__).resolve().parent
manifest=json.loads((root/'manifest.json').read_text())
report={'status':'NOT_APPROVED','count':len(manifest['assets']),'assets':[],
        'blockingVisualIssues':[
          'Only four illustrated key poses per hero; continuous run cycles and eight facing directions are absent.',
          'Recovery returns to a near-identical ready pose rather than a verified seamless sequence.',
          'Bright strike effects touch or cross individual frame bounds and need per-frame retouch.',
          'Pixel alpha and identity are checked; there is no in-game 1x/on-device readability signoff.',
          'Unrelated enemy, boss, biome, and UI categories have not been delivered.'
        ]}
for entry in manifest['assets']:
    p=root/entry['path']; raw=p.read_bytes()
    im=Image.open(p).convert('RGBA')
    alpha=im.getchannel('A')
    frames=[]
    for n in range(entry.get('columns', entry['frames'] if isinstance(entry['frames'], int) else len(entry['frames']))):
        cell_width=entry.get('frameWidth',96)
        left=n*cell_width
        crop=im.crop((left,0,left+cell_width,96))
        mask=crop.getchannel('A')
        histogram=mask.histogram()
        bbox=mask.getbbox()
        opaque=sum(histogram[250:])
        transparent=histogram[0]
        # alpha touching cell edges can indicate clipped hairs/FX
        edge=sum(1 for x in range(96) if mask.getpixel((x,0))>20)+sum(1 for x in range(96) if mask.getpixel((x,95))>20)
        edge+=sum(1 for y in range(1,95) if mask.getpixel((0,y))>20 or mask.getpixel((95,y))>20)
        frames.append({'pose':['ready','windup','strike','recovery'][n],
          'alphaNonzero':sum(histogram[1:]),'transparentPixels':transparent,'opaquePixels':opaque,
          'alphaBounds':bbox,'edgePixels':edge})
    assert im.size==(384,96)
    assert sha256(raw).hexdigest()==entry['sha256']
    assert all(f['alphaNonzero']>400 and f['transparentPixels']>200 for f in frames)
    report['assets'].append({'id':entry['id'],'bytes':len(raw),'sha256':entry['sha256'],
      'dimensions':list(im.size),'alphaRange':list(alpha.getextrema()),'frames':frames,'status':'technical-valid-visual-pending'})
(root/'review.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':report['status'],'assets':[{a['id']: {f['pose']:f['edgePixels'] for f in a['frames']}} for a in report['assets']], 'blockingIssues':len(report['blockingVisualIssues'])},indent=2))
