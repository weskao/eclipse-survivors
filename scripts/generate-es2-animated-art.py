#!/usr/bin/env python3
"""Bake 12-frame transparent 384x384 WebP animation from original ES2 illustrations.

Only independent spell particles, blade glints and energy ribbons move.
The original weapon pixels are never scaled, warped or translated.
Usage: python scripts/generate-es2-animated-art.py --batch 1|2|3|all
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src' / 'assets' / 'es2' / 'production'
SIZE = 384
FRAMES = 12
FRAME_MS = 100
TAU = math.tau

WEAPONS = {
    'shadow-daggers': ('slash', (190, 118, 255)),
    'holy-lance': ('lance', (255, 224, 150)),
    'blood-scythe': ('scythe', (255, 91, 115)),
    'arcane-mines': ('sigil', (181, 130, 255)),
    'bone-spears': ('lance', (255, 160, 105)),
    'poison-cloud': ('mist', (118, 230, 149)),
    'ricochet-blades': ('slash', (146, 228, 255)),
    'spirit-wolves': ('mist', (117, 228, 252)),
    'solar-beam': ('solar', (255, 223, 122)),
    'gravity-orbs': ('sigil', (169, 136, 255)),
    'spectral-bow': ('lance', (144, 238, 250)),
    'thorn-chain': ('vine', (122, 236, 157)),
}
EVOLUTIONS = {
    'nightfall-torrent': ('slash', (190, 116, 255)),
    'dawn-judgment': ('lance', (255, 236, 163)),
    'crimson-reaper': ('scythe', (255, 79, 115)),
    'singularity-minefield': ('sigil', (197, 143, 255)),
    'toxic-permafrost': ('mist', (146, 248, 204)),
    'infinite-rebound': ('slash', (148, 216, 255)),
    'wild-hunt': ('mist', (134, 255, 198)),
    'solar-tempest': ('solar', (255, 229, 127)),
    'celestial-collapse': ('sigil', (255, 163, 139)),
    'spectral-volley': ('lance', (153, 234, 254)),
    'bonefire-barrage': ('solar', (255, 151, 111)),
    'verdant-snare': ('vine', (131, 248, 178)),
}
BATCHES = {
    1: [('weapons', x) for x in ('shadow-daggers', 'holy-lance', 'blood-scythe', 'arcane-mines', 'poison-cloud')]
       + [('evolutions', x) for x in ('nightfall-torrent', 'dawn-judgment', 'crimson-reaper', 'singularity-minefield', 'toxic-permafrost')],
    2: [('weapons', x) for x in ('bone-spears', 'ricochet-blades', 'spirit-wolves', 'solar-beam', 'gravity-orbs')]
       + [('evolutions', x) for x in ('bonefire-barrage', 'infinite-rebound', 'wild-hunt', 'solar-tempest', 'celestial-collapse')],
    3: [('weapons', x) for x in ('spectral-bow', 'thorn-chain')]
       + [('evolutions', x) for x in ('spectral-volley', 'verdant-snare')],
}
ALL = [(folder, slug) for folder, group in (('weapons', WEAPONS), ('evolutions', EVOLUTIONS)) for slug in group]
assert len(ALL) == 24
assert sorted(sum(BATCHES.values(), [])) == sorted(ALL)


def effect(kind: str, color: tuple[int, int, int], frame: int, evolved: bool) -> Image.Image:
    overlay = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    pen = ImageDraw.Draw(overlay, 'RGBA')
    phase = TAU * frame / FRAMES
    cx = cy = SIZE / 2
    count = 8 if evolved else 5
    for i in range(count):
        angle = phase * (0.62 if i % 2 else -0.48) + TAU * i / count
        radius = 110 + 9 * math.sin(phase + i * 1.4)
        x, y = cx + radius * math.cos(angle), cy + radius * 0.86 * math.sin(angle)
        r = 2 + i % 3
        intensity = 0.7 + 0.3 * (0.5 + 0.5 * math.sin(phase + i))
        pen.ellipse((x-r, y-r, x+r, y+r), fill=(*color, int(155*intensity)))
        pen.line((x-4*math.cos(angle), y-4*math.sin(angle), x, y),
                 fill=(*color, 72), width=2)

    if kind == 'slash':
        for i in range(2):
            progress = (frame / FRAMES + i * 0.47) % 1
            x, y = 90 + i*75 + 140*progress, 270 - i*42 - 145*progress
            pen.line((x-18, y+18, x+13, y-13), fill=(*color, 164),
                     width=5 if evolved else 3)
            pen.ellipse((x-3, y-3, x+3, y+3), fill=(255, 251, 246, 183))
            angle = (phase + i*2.6) * 180 / math.pi
            box = (45+i*24, 45+i*24, SIZE-45-i*24, SIZE-45-i*24)
            pen.arc(box, start=angle, end=angle+49, fill=(*color, 85), width=4)
    elif kind == 'lance':
        for i in range(2):
            x = 156 + 46*i + 9*math.sin(phase+i)
            y = 303 - ((frame/FRAMES + i*0.54) % 1)*242
            pen.line((x+12, y+32, x, y-31), fill=(*color, 115), width=3)
            pen.ellipse((x-3, y-3, x+3, y+3), fill=(255, 255, 230, 170))
    elif kind == 'scythe':
        for i in range(2):
            angle = (frame / FRAMES*360 + i*155) % 360
            box = (54+19*i, 64+14*i, 330-19*i, 320-14*i)
            pen.arc(box, angle, angle+100, fill=(*color, 128),
                    width=6 if evolved else 4)
            x = 192 + 104*math.cos(phase+i*2.3)
            y = 192 + 90*math.sin(phase+i*2.3)
            pen.ellipse((x-4,y-3,x+4,y+6), fill=(235,38,74,150))
    elif kind == 'sigil':
        for i in range(3):
            angle = (frame/FRAMES*(360 if i%2 else -300)+i*120)%360
            radius = 87 + 16*i
            pen.arc((cx-radius,cy-radius,cx+radius,cy+radius),
                    angle,angle+71,fill=(*color,103),width=3 if evolved else 2)
            theta = phase*0.8 + TAU*i/3
            x,y = cx+110*math.cos(theta),cy+92*math.sin(theta)
            pen.line((x-5,y-5,x+5,y+5), fill=(*color,140),width=2)
    elif kind == 'mist':
        for i in range(4):
            path = [(round(88+i*58+12*math.sin(4*j/10+phase+i*0.6)),
                     round(322-j/10*210-((frame*5+i*13)%38)))
                    for j in range(11)]
            pen.line(path,fill=(*color,78+i*12),
                     width=4 if evolved else 3,joint='curve')
    elif kind == 'solar':
        for i in range(9):
            angle = TAU*i/9+0.15*math.sin(phase)
            length = 22+9*math.sin(phase+TAU*i/9)
            radius = 97
            pen.line((cx+radius*math.cos(angle),cy+radius*math.sin(angle),
                      cx+(radius+length)*math.cos(angle),
                      cy+(radius+length)*math.sin(angle)),
                     fill=(*color,98),width=4 if evolved else 3)
        pen.arc((85,85,299,299),math.degrees(phase),
                math.degrees(phase)+110,fill=(*color,86),width=4)
    else:  # vine — growing curling tendrils and independently moving thorns
        for i in range(4):
            path = [(round(78+i*77+13*math.sin(j/9*6+phase+i)),
                     round(312-j/9*232)) for j in range(10)]
            pen.line(path,fill=(*color,110),
                     width=3 if evolved else 2,joint='curve')
            x,y = path[2+(frame+i*3)%6]
            pen.line((x-8,y+8,x+6,y-8),fill=(*color,125),width=3)
    return overlay


def produce(folder: str, slug: str) -> dict:
    family, tint = (WEAPONS if folder == 'weapons' else EVOLUTIONS)[slug]
    source = ART / folder / (slug+'@3x.webp')
    target = ART / folder / (slug+'@3x-animated.webp')
    with Image.open(source) as original:
        if original.size != (SIZE, SIZE):
            raise ValueError(f'{source}: must be {SIZE}x{SIZE}')
        still = original.convert('RGBA')
    if still.getchannel('A').getextrema()[0] != 0:
        raise ValueError(f'{source}: expected transparent source')
    frames = [Image.alpha_composite(still, effect(family,tint,i,folder=='evolutions'))
              for i in range(FRAMES)]
    frames[0].save(target,format='WEBP',save_all=True,append_images=frames[1:],
                   duration=FRAME_MS,loop=0,quality=63,method=4)
    with Image.open(target) as checked:
        if checked.size != (SIZE,SIZE) or checked.n_frames != FRAMES:
            raise ValueError(f'{target}: invalid 3x animation')
        if checked.convert('RGBA').getpixel((0,0))[3] != 0:
            raise ValueError(f'{target}: corner must be transparent')
    data=target.read_bytes()
    if len(data)>1_200_000:
        raise ValueError(f'{target}: exceeds animation byte budget ({len(data)})')
    print(f'{folder}/{slug}: {len(data):,} bytes, {FRAMES} frames')
    return {
        'id':('weapons:' if folder=='weapons' else 'evolution2:')+slug,
        'file':f'{folder}/{target.name}',
        'source':f'{folder}/{source.name}',
        'scale':3, 'width':SIZE, 'height':SIZE,
        'frames':FRAMES, 'durationMs':FRAME_MS, 'motionFamily':family,
        'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest(),
    }


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--batch',choices=('1','2','3','all'),default='all')
    args=cli.parse_args()
    selected=ALL if args.batch=='all' else BATCHES[int(args.batch)]
    manifest_path=ART/'animated-skill-manifest.json'
    previous=json.loads(manifest_path.read_text()) if manifest_path.exists() else {'assets':[]}
    rows={row['id']:row for row in previous['assets']}
    for folder,slug in selected:
        row=produce(folder,slug)
        rows[row['id']]=row
    ordered=[rows[('weapons:' if folder=='weapons' else 'evolution2:')+slug]
             for folder,slug in ALL
             if (('weapons:' if folder=='weapons' else 'evolution2:')+slug) in rows]
    manifest={'schemaVersion':1,'status':'generated-production-animation',
              'scale':3,'frames':FRAMES,'durationMs':FRAME_MS,
              'animation':'independent magical highlights and motion; rigid icon silhouette',
              'assets':ordered}
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Manifest: {len(ordered)}/24')


if __name__=='__main__':
    main()
