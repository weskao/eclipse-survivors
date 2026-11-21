#!/usr/bin/env python3
"""Export real Eclipse Survivors artwork and gameplay captures, never concept/mockup art."""
import base64
from io import BytesIO
from pathlib import Path
import os
import re
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'assets'
SHOTS=ASSETS/'screenshots'
RESAMPLE=Image.Resampling.LANCZOS
SERIF='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
SANS='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

def get_game_images(html):
    images={}
    for key,encoded in re.findall(r'artSources\.([\w-]+)="data:image/(?:webp|png);base64,([A-Za-z0-9+/=]+)";',html):
        images[key]=Image.open(BytesIO(base64.b64decode(encoded))).convert('RGBA')
    if not {'knight','ranger','wizard','golem','ground'} <= images.keys():
        raise ValueError('Missing real in-game sprites in index.html')
    return images

def background(size,ground):
    canvas=Image.new('RGBA',size,(10,21,25,255))
    texture=ImageOps.fit(ground,size,method=RESAMPLE).convert('RGBA')
    return Image.blend(canvas,texture,.31)

def radial_glow(canvas,center,radius,rgb,opacity=.65):
    overlay=Image.new('RGBA',canvas.size,(0,0,0,0));px=overlay.load()
    cx,cy=center;r2=radius*radius
    for y in range(max(0,cy-radius),min(canvas.height,cy+radius)):
        for x in range(max(0,cx-radius),min(canvas.width,cx+radius)):
            d=((x-cx)**2+(y-cy)**2)/r2
            if d<1:px[x,y]=(*rgb,int(255*opacity*(1-d)**2))
    canvas.alpha_composite(overlay)

def add_sprite(canvas,sprite,box,opacity=1):
    sprite=ImageOps.contain(sprite,(box[2],box[3]),method=RESAMPLE)
    x=box[0]+(box[2]-sprite.width)//2;y=box[1]+(box[3]-sprite.height)//2
    if opacity<1:sprite.putalpha(sprite.getchannel('A').point(lambda a:int(a*opacity)))
    shadow=Image.new('RGBA',sprite.size,(0,0,0,0))
    shadow.putalpha(sprite.getchannel('A').filter(ImageFilter.GaussianBlur(15)).point(lambda a:int(a*.72)))
    canvas.alpha_composite(shadow,(x+8,y+13));canvas.alpha_composite(sprite,(x,y))

def icon512(images):
    c=background((512,512),images['ground'])
    radial_glow(c,(245,206),248,(58,152,151),.48)
    radial_glow(c,(376,384),194,(239,150,76),.48)
    d=ImageDraw.Draw(c,'RGBA')
    d.ellipse((54,57,458,461),outline=(213,183,121,210),width=8)
    d.ellipse((70,73,442,445),outline=(147,170,162,132),width=3)
    for x,y,r in [(76,98,2),(420,128,3),(87,361,3),(434,416,2),(241,36,3)]:
        d.ellipse((x-r,y-r,x+r,y+r),fill=(238,195,125,240))
    add_sprite(c,images['knight'],(31,75,450,438))
    d=ImageDraw.Draw(c,'RGBA')
    d.arc((24,24,488,488),-14,145,fill=(255,204,124,235),width=10)
    d.arc((32,32,480,480),163,335,fill=(125,197,201,170),width=7)
    d.line([(145,474),(367,474)],fill=(224,173,101,210),width=5)
    return c.convert('RGB')

def draw_title(draw,xy,text,size,fill,stroke=2):
    font=ImageFont.truetype(SERIF,size)
    draw.text(xy,text,font=font,fill=fill,stroke_width=stroke,stroke_fill=(24,19,25,255))

def social_cover(images,screenshot):
    size=(1200,630)
    with Image.open(screenshot) as source:
        bg=ImageOps.fit(source.convert('RGB'),size,method=RESAMPLE,centering=(.50,.51)).convert('RGBA')
    bg=Image.blend(bg,Image.new('RGBA',size,(15,26,35,255)),.23)
    gradient=Image.new('RGBA',size);p=gradient.load()
    for y in range(630):
        for x in range(1200):
            dark=int(238*max(0,1-x/910)**1.3)
            edge=min(65,int(110*abs(y-315)/315))
            p[x,y]=(6,13,22,min(250,dark+edge))
    bg.alpha_composite(gradient)
    # Three ORIGINAL playable heroes, including the ranger previously omitted.
    # Keep the title area free, fit every portrait entirely inside 1200 × 630,
    # and draw the foreground knight last for a natural layered composition.
    radial_glow(bg,(765,301),170,(88,174,123),.30)
    radial_glow(bg,(1087,296),192,(151,125,217),.36)
    radial_glow(bg,(926,276),235,(239,183,102),.30)
    add_sprite(bg,images['ranger'],(674,168,202,396),.98)
    add_sprite(bg,images['wizard'],(982,147,208,403),.98)
    add_sprite(bg,images['knight'],(804,88,260,488))
    d=ImageDraw.Draw(bg,'RGBA')
    hero_label=ImageFont.truetype(SANS,15)
    for label,x,accent in (
        ('RANGER',715,(143,213,160,255)),
        ('KNIGHT',887,(248,209,142,255)),
        ('MAGE',1070,(190,170,244,255)),
    ):
        d.rounded_rectangle((x-11,581,x+86,609),radius=5,
                            fill=(9,19,30,224),outline=(*accent[:3],130),width=1)
        d.text((x,586),label,font=hero_label,fill=accent)
    d.rounded_rectangle((43,46,76,50),radius=2,fill=(227,185,111,240))
    d.text((48,69),'FANTASY SURVIVAL ACTION',font=ImageFont.truetype(SANS,21),fill=(222,194,144,255))
    draw_title(d,(42,169),'ECLIPSE',86,(250,244,228,255),2)
    draw_title(d,(42,266),'SURVIVORS',70,(244,204,136,255),2)
    d.line([(47,366),(674,366)],fill=(201,162,99,230),width=3)
    d.text((48,401),'CHOOSE YOUR HERO. SURVIVE THE NIGHT.',font=ImageFont.truetype(SANS,18),fill=(230,228,218,255))
    d.rounded_rectangle((46,472,385,526),radius=13,fill=(26,42,53,238),outline=(209,178,125,235),width=2)
    d.text((73,487),'PLAY FREE IN BROWSER',font=ImageFont.truetype(SANS,20),fill=(240,220,185,255))
    d.text((48,577),'REAL IN-GAME ART  •  ORIGINAL AUDIO',font=ImageFont.truetype(SANS,14),fill=(178,198,195,220))
    d.rectangle((12,12,1188,618),outline=(190,155,103,150),width=2)
    return bg.convert('RGB')

def render_brand_images(html,screenshot,outdir):
    outdir=Path(outdir);outdir.mkdir(parents=True,exist_ok=True)
    images=get_game_images(html);icon=icon512(images)
    for size,name in [(180,'apple-touch-icon.png'),(192,'icon-192.png'),(512,'icon-512.png')]:
        icon.resize((size,size),RESAMPLE).save(outdir/name,optimize=True)
    social_cover(images,screenshot).save(outdir/'og-cover.png',optimize=True)

def capture_game(page,filename,upgrade=False):
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('about:blank')
    page.set_content((ROOT/'index.html').read_text(encoding='utf-8'),wait_until='domcontentloaded',timeout=60000)
    page.wait_for_function('window.__test && window.__test.sceneArtLoaded',timeout=40000)
    page.locator('#start').click(timeout=18000)
    page.wait_for_function('window.__test && window.__test.mode === "play"',timeout=15000)
    page.wait_for_timeout(2400)
    if upgrade:
        if page.evaluate('window.__test.mode')=='play':page.evaluate('window.__test.level()')
        page.wait_for_function('window.__test.mode === "level"',timeout=10000)
    else:
        for _ in range(5):
            if page.evaluate('window.__test.mode')=='play':break
            page.locator('#upgrades .upgrade').first.click()
            page.wait_for_timeout(200)
    assert page.evaluate('window.__test.frames')>20,'Game canvas did not render'
    assert not errors,f'JavaScript errors: {errors[:3]}'
    page.screenshot(path=str(filename),full_page=False,timeout=25000)
    with Image.open(filename) as shot:
        shot.convert('RGB').save(filename.with_suffix('.webp'),quality=82,method=5)
    filename.unlink()

def main():
    from playwright.sync_api import sync_playwright
    SHOTS.mkdir(parents=True,exist_ok=True)
    html=(ROOT/'index.html').read_text('utf-8')
    with sync_playwright() as p:
        kwargs={'headless':True,'args':['--disable-dev-shm-usage','--no-sandbox']}
        if os.environ.get('CHROMIUM_BIN'):kwargs['executable_path']=os.environ['CHROMIUM_BIN']
        browser=p.chromium.launch(**kwargs)
        try:
            desktop=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
            capture_game(desktop,SHOTS/'gameplay.png');desktop.close()
            mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
            capture_game(mobile,SHOTS/'mobile.png');mobile.close()
            upgrade=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=1)
            capture_game(upgrade,SHOTS/'upgrade.png',upgrade=True);upgrade.close()
        finally:browser.close()
    render_brand_images(html,SHOTS/'gameplay.webp',ASSETS)
    for name in ['icon-192.png','icon-512.png','apple-touch-icon.png','og-cover.png','screenshots/gameplay.webp','screenshots/mobile.webp','screenshots/upgrade.webp']:
        f=ASSETS/name
        assert f.is_file() and f.stat().st_size>5000,f'Missing or empty asset: {name}'
        print(f'{name}: {f.stat().st_size:,} bytes')

if __name__=='__main__':main()
