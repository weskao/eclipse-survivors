"""Deterministic c104 source art normalization into ES2's actual 3x runtime assets.

Never guess grids. Every cropped pose/prop/UI icon has one explicit, disjoint
source ownership rectangle. Neighbouring art is never read outside the rectangle.
Inputs: the ten immutable assets/images/imgs{1..10}.png files from c104b4be.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

SOURCE_FILES = tuple(f'imgs{i}.png' for i in range(1, 11))
ROOT = Path(__file__).resolve().parents[2]
ASSET_BOXES: dict[int, dict[str, tuple[int,int,int,int]]] = {i:{} for i in range(1,11)}

# Source 6 = shadow assassin, necromancer, archer, plague carrier, guardian.
# Source 5 = phantom, fire imp, frost wraith, berserker, crystal sentinel.
ROWS={
  6:[('shadow-assassin', (0,204)), ('necromancer',(213,421)),
     ('dark-archer',(434,631)), ('plague-carrier',(645,822)),
     ('shield-guardian',(849,1067))],
  5:[('phantom',(2,208)), ('fire-imp',(220,411)),
     ('frost-wraith',(426,625)), ('berserker',(636,834)),
     ('crystal-sentinel',(844,1075))]
}
SMALL_POSES={
  6:[(0,240),(258,411),(428,585),(976,1138)],
  5:[(0,238),(251,373),(381,504),(974,1107)]
}
TELEGRAPHS={6:(1156,1440),5:(1125,1441)}
# Manually reviewed per-enemy 3rd/4th source poses; source sheet columns are
# irregular. Reusing generic 381-504 / 974-1107 rectangles imported neighboring
# spell fragments and sometimes clipped the actor. Four distinct authored poses
# must fit entirely within their exclusive source boxes.
REVIEWED_POSE_BOXES = {
  'shadow-assassin': {2:(447,589),3:(593,778)},
  'necromancer': {2:(448,588),3:(594,788)},
  'dark-archer': {2:(439,589),3:(594,790)},
  'plague-carrier': {2:(440,586),3:(596,795)},
  'shield-guardian': {2:(437,592),3:(594,788)},
  'phantom': {2:(394,522),3:(684,832)},
  'fire-imp': {2:(381,491),3:(505,615)},
  'frost-wraith': {2:(384,503),3:(510,627)},
  'berserker': {2:(379,490),3:(637,726)},
  'crystal-sentinel': {2:(375,491),3:(502,626)},
}
for source, rows in ROWS.items():
  for name,(y0,y1) in rows:
    for k,(default_x0,default_x1) in enumerate(SMALL_POSES[source]):
      x0,x1=REVIEWED_POSE_BOXES.get(name,{}).get(k,(default_x0,default_x1))
      ASSET_BOXES[source][f'frame:{name}:{k}']=(x0,y0,x1,y1)
    tx0,tx1=TELEGRAPHS[source]
    ASSET_BOXES[source][f'telegraph:{name}']=(tx0,y0+1,tx1,y1-1)

BOSSES={
 'abyss-monarch':(7,[(424,3,706,185),(735,3,1027,185),(1066,3,1431,185)]),
 'frost-sovereign':(7,[(421,538,703,700),(740,537,1032,700),(1065,537,1432,704)]),
 'infernal-titan':(8,[(371,6,570,308),(578,6,801,309),(810,5,1094,306)]),
 'eclipse-seraph':(8,[(371,541,568,817),(568,538,827,818),(836,530,1094,816)]),
}
for boss,(source,boxes) in BOSSES.items():
  for i,b in enumerate(boxes):ASSET_BOXES[source][f'frame:boss:{boss}:{i}']=b

SCENES={
 'abyssal-necropolis':(1,(14,15,687,412)),
 'celestial-rift':(1,(14,427,688,910)),
 'blood-moon-cathedral':(9,(14,42,714,437)),
 'cursed-forest':(9,(12,463,716,884)),
}
DECOR={
 'abyssal-necropolis':(1,[(698,23,827,154),(857,30,983,150),(1090,19,1239,155),(1316,22,1440,158)]),
 'celestial-rift':(1,[(700,435,835,566),(842,438,972,569),(984,437,1102,570),(1168,438,1308,573)]),
 'blood-moon-cathedral':(9,[(730,50,807,202),(811,53,883,201),(1024,50,1120,204),(1239,199,1361,332)]),
 'cursed-forest':(9,[(729,473,879,607),(886,473,1044,606),(1046,475,1183,605),(1390,475,1514,608)]),
}
for name,(source,b) in SCENES.items():ASSET_BOXES[source][f'scene:{name}']=b
for name,(source,boxes) in DECOR.items():
  for i,b in enumerate(boxes): ASSET_BOXES[source][f'frame:decor:{name}:{i}']=b

UI_BOXES={
 'treasure-common':(40,55,242,216),
 'treasure-rare':(257,52,466,219),
 'treasure-legendary':(715,32,938,215),
 'treasure-cursed':(482,48,694,217),
 'rarity-common':(1239,14,1319,140),
 'rarity-rare':(1326,14,1398,119),
 'rarity-legendary':(1550,10,1640,139),
 'hud-health':(1025,216,1206,366),
 'hud-xp':(1220,215,1372,367),
 'hud-cooldown':(707,218,855,359),
 'hud-quest':(1376,520,1471,652),
 'achievement-boss':(659,726,823,914),
 'achievement-survivor':(30,737,165,913),
 'achievement-evolution':(331,741,486,916),
 'achievement-explorer':(1252,718,1434,917),
 'achievement-collector':(493,737,654,913),
 'achievement-flawless':(1577,718,1647,912),
}
for key,box in UI_BOXES.items():ASSET_BOXES[10][f'ui:{key}']=box

# All three skills use an actual authored source atlas cell, not an unrelated icon.
# Local 8x4 WebPs already contain individually validated 128-pixel direction cells.
SPECIALS=('shadowblade','spirit-summoner','crimson-paladin')


def validate_geometry(source_dir: Path)->None:
    for source, rects in ASSET_BOXES.items():
        with Image.open(source_dir/f'imgs{source}.png') as im:
            for label,(x0,y0,x1,y1) in rects.items():
                if not(0<=x0<x1<=im.width and 0<=y0<y1<=im.height):
                    raise ValueError(f'Out-of-bounds {source}: {label}')
            fr=[(k,b) for k,b in rects.items() if k.startswith('frame:')]
            for i,(key,a) in enumerate(fr):
                for key2,b in fr[i+1:]:
                    overlap=max(a[0],b[0])<min(a[2],b[2]) and max(a[1],b[1])<min(a[3],b[3])
                    if overlap:raise ValueError(f'Source frame crop overlap: {source} {key} {key2}')


def matte(im:Image.Image, source:int)->Image.Image:
    im=im.convert('RGBA')
    # The two enemy sheets have baked alpha matte. Remove only low-opacity
    # ghost pixels; keep fully opaque authored character details.
    # RGB prop sheets have black matting, which must be keyed independently.
    if source in (1,9):
        rgba=[]
        for r,g,b,a in im.getdata():
            v=max(r,g,b)
            rgba.append((r,g,b,0 if v<=30 else min(255,max(0,(v-30)*255//45))))
        im.putdata(rgba)
    elif source == 5:
        # This PNG has a very pale baked matte, unlike the other transparent
        # sheets. Eliminate neutral near-white background before trimming;
        # never use an opaque rectangular sprite as a gameplay frame.
        pixels=[]
        for r,g,b,a in im.getdata():
            neutral=max(r,g,b)-min(r,g,b)
            remove=(min(r,g,b)>197 and neutral<42) or (min(r,g,b)>178 and neutral<24 and a<238)
            aa=0 if remove or a<65 else min(255,(a-65)*255//165)
            pixels.append((r,g,b,aa))
        im.putdata(pixels)
    else:
        im.putalpha(im.getchannel('A').point(lambda a: 0 if a<45 else min(255,(a-45)*255//160)))
    return im


def fit(source:Image.Image, box:tuple[int,int,int,int], size:tuple[int,int], source_id:int, border:int=7)->Image.Image:
    x0,y0,x1,y1=box
    cut=matte(source.crop((x0,y0,x1,y1)),source_id)
    alpha=cut.getchannel('A')
    bbox=alpha.getbbox()
    if bbox is None: raise ValueError(f'Empty source box: {source_id} {box}')
    cut=cut.crop(bbox)
    scale=min((size[0]-2*border)/cut.width, (size[1]-2*border)/cut.height)
    shape=(max(1,round(cut.width*scale)),max(1,round(cut.height*scale)))
    cut=cut.resize(shape,Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',size,(0,0,0,0))
    canvas.alpha_composite(cut,((size[0]-cut.width)//2,(size[1]-cut.height)//2))
    return canvas


def fit_scene(source:Image.Image, box:tuple[int,int,int,int], size:tuple[int,int])->Image.Image:
    """Preserve the whole cinematic illustration, including genuine dark pixels.

    The RGB scene sheets have near-black painted architecture. Alpha-keying
    black is valid for isolated props, never for a full backdrop.
    """
    return ImageOps.pad(
        source.crop(box).convert('RGB'), size,
        method=Image.Resampling.LANCZOS, color=(16,12,26),
    ).convert('RGBA')


def isolate_main_alpha_component(image:Image.Image)->Image.Image:
    """Remove detached neighbouring-sheet fragments without touching the main silhouette."""
    from collections import deque
    im=image.copy().convert('RGBA')
    w,h=im.size
    pixels=im.getchannel('A').tobytes()
    visited=bytearray(w*h)
    largest=[]
    for i,a in enumerate(pixels):
        if a<24 or visited[i]: continue
        visited[i]=1
        q=deque([i]);group=[]
        while q:
            k=q.popleft();group.append(k)
            x=k%w;y=k//w
            for j in ((k-1 if x else -1),(k+1 if x+1<w else -1),(k-w if y else -1),(k+w if y+1<h else -1)):
                if j>=0 and not visited[j] and pixels[j]>=24:
                    visited[j]=1;q.append(j)
        if len(group)>len(largest):largest=group
    if not largest:return im
    # Retain 1px anti-aliased edge around the selected main silhouette.
    keep=bytearray(w*h)
    for k in largest:
        x=k%w;y=k//w;keep[k]=1
        if x:keep[k-1]=1
        if x+1<w:keep[k+1]=1
        if y:keep[k-w]=1
        if y+1<h:keep[k+w]=1
    im.putalpha(Image.frombytes('L',(w,h),bytes(a if keep[i] else 0 for i,a in enumerate(pixels))))
    return im


def add_atlas(images:list[Image.Image],size:tuple[int,int])->Image.Image:
    w,h=size
    atlas=Image.new('RGBA',(w*len(images),h),(0,0,0,0))
    for i,im in enumerate(images):
        if im.size!=size:raise ValueError('Unequal animation cell dimensions')
        atlas.alpha_composite(im,(i*w,0))
    return atlas


def generate_assets(source_dir:Path,output:Path)->list[dict]:
    source_dir=Path(source_dir)
    output=Path(output)
    validate_geometry(source_dir)
    sources={i:Image.open(source_dir/f'imgs{i}.png').convert('RGBA') for i in range(1,11)}
    produced=[]
    def emit(name:str,kind:str,image:Image.Image,frames:int,cell:tuple[int,int],source:int|None,boxes:list[tuple[int,int,int,int]],max_bytes:int)->None:
        path=output/name
        path.parent.mkdir(parents=True,exist_ok=True)
        image.save(path,'WEBP',quality=80,alpha_quality=86,method=5)
        if path.stat().st_size>=max_bytes:
            image.save(path,'WEBP',quality=64,alpha_quality=72,method=5)
        if path.stat().st_size>=max_bytes:raise ValueError(f'Budget exceeded: {name} {path.stat().st_size}')
        produced.append({'path':name,'kind':kind,'size':list(image.size),'frames':frames,
            'cell':list(cell),'source':f'imgs{source}.png' if source else 'hero-8dir-WebP',
            'sourceBoxes':boxes,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'bytes':path.stat().st_size,'max_bytes':max_bytes})

    for src_id, rows in ROWS.items():
        for id, interval in rows:
            poses=(0,1,2,3)
            frames=[fit(sources[src_id], ASSET_BOXES[src_id][f'frame:{id}:{i}'], (96,96),src_id) for i in poses]
            # Four REAL source poses, natural ping-pong (not generated extras).
            sequence=[frames[i] for i in (0,1,2,3,2,1)]
            emit(f'src/assets/es2/production/enemies/{id}-body@3x.webp','enemy-body',add_atlas(sequence,(96,96)),6,(96,96),src_id,
                 [ASSET_BOXES[src_id][f'frame:{id}:{poses[i]}'] for i in (0,1,2,3,2,1)],110000)
            tbox=ASSET_BOXES[src_id][f'telegraph:{id}']
            emit(f'src/assets/es2/production/enemies/{id}-telegraph@3x.webp','enemy-telegraph',fit(sources[src_id],tbox,(96,96),src_id),1,(96,96),src_id,[tbox],50000)

    # Exact masks for five already-confirmed neighboring-source fragments.
    # Each lies outside the corresponding boss silhouette on the 192px frame;
    # do not discard floating spell effects elsewhere in the illustration.
    boss_bleed_masks = {
        'frost-sovereign': {0: [(0,0,192,32)], 1: [(0,0,192,55)]},
        'eclipse-seraph': {0: [(0,0,33,192)], 1: [(0,0,20,192)],
                           2: [(0,0,192,14)]},
    }
    for id,(src_id,boxes) in BOSSES.items():
        images=[fit(sources[src_id],box,(192,192),src_id,10) for box in boxes]
        for pose,rects in boss_bleed_masks.get(id,{}).items():
            alpha=images[pose].getchannel('A')
            for rect in rects: alpha.paste(0,rect)
            images[pose].putalpha(alpha)
        emit(f'src/assets/es2/production/bosses/{id}-phases@3x.webp','boss-phases',add_atlas(images,(192,192)),3,(192,192),src_id,boxes,300000)

    for id,(src_id,boxes) in DECOR.items():
        ims=[fit(sources[src_id],box,(96,96),src_id) for box in boxes]
        emit(f'src/assets/es2/production/biomes/{id}-decor@3x.webp','biome-decor',add_atlas(ims,(96,96)),4,(96,96),src_id,boxes,180000)
    for id,(src_id,box) in SCENES.items():
        # Cinematic biome illustration for real menu/UI use. NOT a repeat tile.
        im=fit_scene(sources[src_id],box,(768,432))
        emit(f'src/assets/es2/production/biomes/{id}-scene@3x.webp','biome-scene',im,1,(768,432),src_id,[box],450000)

    for id,box in UI_BOXES.items():
        im=fit(sources[10],box,(192,192),10,11)
        if id in {'achievement-flawless','achievement-explorer','rarity-legendary','rarity-common','hud-health','hud-quest','hud-xp'}:
            im=isolate_main_alpha_component(im)
        emit(f'src/assets/es2/production/ui/{id}@3x.webp','ui',im,1,(192,192),10,[box],75000)

    for id in SPECIALS:
        existing=output/f'src/assets/es2/production/heroes/{id}-special@3x.webp'
        if existing.exists():
            # Preserve other parallel art branches' approved source illustrations.
            # Never overwrite a real specialized ability icon with a cropped
            # directional-character pose during the final integration.
            with Image.open(existing) as icon:
                width,height=icon.size
                if width<64 or height<64 or width>1024 or height>1024:
                    raise ValueError(f'Invalid existing hero ability icon dimensions: {id} {icon.size}')
                if not icon.convert('RGBA').getchannel('A').getbbox():
                    raise ValueError(f'Empty existing hero ability icon: {id}')
            raw=existing.read_bytes()
            if len(raw)>=75000:raise ValueError(f'Existing hero skill exceeds budget: {id}')
            produced.append({'path':str(existing.relative_to(output)),'kind':'hero-special',
                'size':[width,height],'frames':1,'cell':[width,height],
                'source':'existing-integrated-hero-special','sourceBoxes':[],
                'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'max_bytes':75000})
            continue
        path=output/f'src/assets/es2/production/heroes/{id}-8dir@3x.webp'
        if not path.exists():
            # Local testing can point to previously validated source 8-direction atlas.
            fallback=ROOT/f'src/assets/es2/production/heroes/{id}-8dir@3x.webp'
            if fallback.exists():path=fallback
        if not path.exists():raise FileNotFoundError(f'Need committed 8-dir atlas for skill: {id}')
        with Image.open(path) as atlas:
            if atlas.size!=(1024,512): raise ValueError(f'Unexpected hero atlas dimensions: {id}')
            # last row = cast/action, fourth direction: isolated authored cell
            box=(3*128,3*128,4*128,4*128)
            crop=atlas.convert('RGBA').crop(box)
            image=fit(crop,(0,0,128,128),(192,192),0,12)
        emit(f'src/assets/es2/production/heroes/{id}-special@3x.webp','hero-special',image,1,(192,192),None,[box],75000)

    for category in ('enemies','bosses','biomes','ui'):
        manifest=output/f'src/assets/es2/production/{category}/manifest.json'
        if not manifest.exists():continue
        data=json.loads(manifest.read_text())
        for art in data['assets']:
            item=next((x for x in produced if x['path'].endswith('/'+category+'/'+art['path'])),None)
            if item:
                art['sha256']=item['sha256']
                art['qaNote']=f"Explicit c104 source region(s): {item['source']}; visually review animation continuity and alpha."
        manifest.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    prov=output/'src/assets/es2/production/c104-provenance.json'
    prov.parent.mkdir(parents=True,exist_ok=True)
    prov.write_text(json.dumps({'schemaVersion':1,'sourceCommit':'c104b4be43fbfe9dad2dd8a1b270b9e47d63e1c0',
      'sourceAssets':{f'imgs{i}.png':hashlib.sha256((source_dir/f'imgs{i}.png').read_bytes()).hexdigest() for i in range(1,11)},
      'visualStatus':'review-required', 'derived':produced},ensure_ascii=False,indent=2)+'\n')
    return produced


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',type=Path,default=ROOT/'assets/images')
    parser.add_argument('--output',type=Path,default=ROOT)
    args=parser.parse_args()
    items=generate_assets(args.source,args.output)
    print(f'Generated {len(items)} exact-source images + c104-provenance.json')