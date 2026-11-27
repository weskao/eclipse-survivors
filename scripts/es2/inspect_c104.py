"""Read all ten source WebP masters without editing or assuming sprite-grid geometry."""
from PIL import Image, ImageOps, ImageDraw, ImageFont
from pathlib import Path
import hashlib, json, math

source = Path("assets/images")
out = Path("art-inspection")
out.mkdir(exist_ok=True)
meta=[]
tiles=[]
for n in range(1,11):
    src=source / f"imgs{n}.webp"
    with Image.open(src) as original:
        img=original.convert("RGBA")
        width,height=img.size
        bbox=img.getchannel("A").getbbox()
        alpha=img.getchannel("A").getextrema()
        ratio=width/height
        thumb=ImageOps.contain(img,(420,420),Image.Resampling.LANCZOS)
        card=Image.new("RGBA",(440,470),(30,29,40,255))
        card.alpha_composite(thumb,((440-thumb.width)//2,20+(420-thumb.height)//2))
        d=ImageDraw.Draw(card)
        d.text((10,444),f"imgs{n}.webp | {width} x {height} | alpha {alpha}",fill=(255,245,225))
        tiles.append(card)
        meta.append({"path":str(src),"width":width,"height":height,
            "ratio":ratio,"mode":original.mode,"alpha_extrema":alpha,
            "alpha_bbox":bbox,"bytes":src.stat().st_size,
            "sha256":hashlib.sha256(src.read_bytes()).hexdigest()})
sheet=Image.new("RGBA",(440*5,470*2),(8,9,13,255))
for i,t in enumerate(tiles):sheet.alpha_composite(t,((i%5)*440,(i//5)*470))
sheet.convert("RGB").save(out/"all-ten-contact.jpg",quality=85)
(out/"metadata.json").write_text(json.dumps(meta,indent=2)+"\n",encoding="utf8")
print(json.dumps(meta,indent=2))
