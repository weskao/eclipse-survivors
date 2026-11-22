"""Explicit, fail-closed sprite cutter. Never infer grids from marketing artwork."""
from dataclasses import dataclass
from PIL import Image

class UnsafeSpriteCrop(ValueError):
    """Source has ambiguous geometry or pixels crossing a frame boundary."""

@dataclass(frozen=True)
class SpriteLayout:
    columns: int
    rows: int
    frame_width: int
    frame_height: int
    origin_x: int = 0
    origin_y: int = 0
    column_gap: int = 0
    row_gap: int = 0

def extract_atlas(source: Image.Image, layout: SpriteLayout):
    """Return an isolated row-major RGBA atlas and original source boxes.

    Guardrails deliberately reject touching alpha, opaque contact sheets,
    overlapping rectangles, and out-of-range crops. Art must be repaired
    rather than cropping artwork from a neighboring frame.
    """
    args=(layout.columns, layout.rows, layout.frame_width, layout.frame_height,
          layout.origin_x, layout.origin_y,layout.column_gap,layout.row_gap)
    if any(type(v) is not int for v in args):
        raise UnsafeSpriteCrop("All geometry fields must be integers")
    if min(layout.columns,layout.rows,layout.frame_width,layout.frame_height)<1:
        raise UnsafeSpriteCrop("Positive frame sizes and grid counts required")
    if min(layout.origin_x,layout.origin_y,layout.column_gap,layout.row_gap)<0:
        raise UnsafeSpriteCrop("Negative gaps and origins are unsafe")
    w=layout.columns*layout.frame_width+(layout.columns-1)*layout.column_gap+layout.origin_x
    h=layout.rows*layout.frame_height+(layout.rows-1)*layout.row_gap+layout.origin_y
    if w>source.width or h>source.height:
        raise UnsafeSpriteCrop("Grid exceeds original image bounds")

    original=source.convert("RGBA")
    atlas=Image.new("RGBA",
                    (layout.columns*layout.frame_width,layout.rows*layout.frame_height),
                    (0,0,0,0))
    boxes=[]
    for row in range(layout.rows):
        for col in range(layout.columns):
            x=layout.origin_x+col*(layout.frame_width+layout.column_gap)
            y=layout.origin_y+row*(layout.frame_height+layout.row_gap)
            box=(x,y,x+layout.frame_width,y+layout.frame_height)
            cell=original.crop(box)
            alpha=cell.getchannel("A")
            if not alpha.getbbox():
                raise UnsafeSpriteCrop(f"Empty frame row={row} col={col}")
            top=alpha.crop((0,0,layout.frame_width,1)).getextrema()[1]
            bottom=alpha.crop((0,layout.frame_height-1,layout.frame_width,layout.frame_height)).getextrema()[1]
            left=alpha.crop((0,0,1,layout.frame_height)).getextrema()[1]
            right=alpha.crop((layout.frame_width-1,0,layout.frame_width,layout.frame_height)).getextrema()[1]
            if max(top,bottom,left,right)>16:
                raise UnsafeSpriteCrop(f"Frame touches boundary: row={row} col={col}")
            atlas.paste(cell,(col*layout.frame_width,row*layout.frame_height))
            boxes.append(box)
    return atlas,boxes
