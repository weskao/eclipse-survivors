#!/usr/bin/env python3
"""Isolate generated Shadowblade concept keyframes with safe transparent gutters.

This does not claim to replace the full 8-direction production motion contract.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import cv2,numpy as np,hashlib,json

ROOT=Path(__file__).parent
SOURCE=Path('/mnt/data/a_clean_high_detail_game_art_sprite_sheet_on_a_tr.png')
CELL=480;GUTTER=24
im=np.array(Image.open(SOURCE).convert('RGB'))
height,width=im.shape[:2]
assert (width,height)==(1774,887)
atlas=Image.new('RGBA',(CELL*4,CELL),(0,0,0,0))
meta=[]
for i in range(4):
    row,col=divmod(i,2)
    y0,y1=(0,443) if row==0 else (443,887)
    x0,x1=(0,887) if col==0 else (887,1774)
    rgb=im[y0:y1,x0:x1].copy()
    # A checkered near-white preview backdrop requires alpha reconstruction.
    mx=rgb.max(axis=2).astype(int);mn=rgb.min(axis=2).astype(int)
    neutral=(mx-mn)<22
    brightness=rgb.mean(axis=2)
    mask=np.full(brightness.shape,cv2.GC_PR_FGD,np.uint8)
    mask[(neutral)&(brightness>243)]=cv2.GC_BGD
    mask[(neutral)&(brightness>219)&(brightness<=243)]=cv2.GC_PR_BGD
    mask[brightness<95]=cv2.GC_FGD
    mask[:2,:]=cv2.GC_BGD;mask[-2:,:]=cv2.GC_BGD;mask[:,:2]=cv2.GC_BGD;mask[:,-2:]=cv2.GC_BGD
    # Preserve independently illustrated details, remove checkerboard backdrop.
    bgd=np.zeros((1,65),np.float64);fgd=np.zeros((1,65),np.float64)
    cv2.grabCut(rgb[:,:,::-1],mask,None,bgd,fgd,4,cv2.GC_INIT_WITH_MASK)
    alpha=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    # Keep only meaningful silhouette components (avoid isolated checkerboard pixels).
    n,labels,stats,centers=cv2.connectedComponentsWithStats(alpha,connectivity=8)
    keep=np.zeros_like(alpha)
    for k in range(1,n):
        if stats[k,cv2.CC_STAT_AREA]>=30:
            keep[labels==k]=255
    alpha=keep
    alpha=cv2.GaussianBlur(alpha,(3,3),0.5)
    ys,xs=np.where(alpha>16)
    assert len(xs)>30000, ('no figure',i)
    box=(int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
    # Crop the *whole* figure and fit it inside a square without distorting proportions.
    cut=Image.fromarray(np.dstack([rgb,alpha]),'RGBA').crop(box)
    ratio=min((CELL-2*GUTTER)/cut.width,(CELL-2*GUTTER)/cut.height,1.0)
    w,h=round(cut.width*ratio),round(cut.height*ratio)
    cut=cut.resize((w,h),Image.Resampling.LANCZOS)
    x=GUTTER+(CELL-2*GUTTER-w)//2
    # Place feet consistently near bottom 24px to avoid animated vertical foot jitter.
    y=CELL-GUTTER-h
    canvas=Image.new('RGBA',(CELL,CELL),(0,0,0,0));canvas.alpha_composite(cut,(x,y))
    border=np.asarray(canvas.getchannel('A'))
    assert all(np.count_nonzero(region>10)==0 for region in [border[:GUTTER-2,:],border[-(GUTTER-2):,:],border[:,:GUTTER-2],border[:,-(GUTTER-2):]])
    atlas.alpha_composite(canvas,(i*CELL,0))
    canvas.save(ROOT/f'shadowblade-run-east-frame-{i+1:02d}-QA-PENDING.png')
    meta.append({'index':i,'sourceCell':[887,y1-y0],'sourceFigureBoundingBox':box,'exportCell':[CELL,CELL],'contentPixels':[w,h], 'alphaGutterMin':GUTTER-2,'native3x':False,'status':'QA_PENDING'})
    print(i,box,'size',w,h)

atlas.save(ROOT/'shadowblade-run-east-4frame-QA-PENDING.webp','WEBP',lossless=True,method=6)
# Contact sheet: use a checkerboard only for review, never bake it into exported runtime images.
preview=Image.new('RGB',atlas.size,(43,43,48));preview.paste(atlas,mask=atlas.getchannel('A'))
d=ImageDraw.Draw(preview)
for i in range(1,4):d.line([(i*CELL,0),(i*CELL,CELL)],fill=(230,195,106),width=2)
preview.save(ROOT/'shadowblade-crop-safe-preview.png',optimize=True)
report={'source':SOURCE.name,'sourceSHA256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'atlas':'shadowblade-run-east-4frame-QA-PENDING.webp','atlasSHA256':hashlib.sha256((ROOT/'shadowblade-run-east-4frame-QA-PENDING.webp').read_bytes()).hexdigest(),'atlasPixels':list(atlas.size),'frameSize':[CELL,CELL],'frames':meta,'transparent':True,'noCrossCellVisiblePixels':True,'identityReview':'QA_PENDING','native3x':False,'completeEightDirections':False,'runtimeApplied':False,'description':'Art candidate for directional East run only; not wired to the renderer until 8-direction complete art QA'}
(ROOT/'asset-QA.json').write_text(json.dumps(report,indent=2))
