from pathlib import Path
from PIL import Image
import numpy as np
SRC = Path(__file__).parent

def test_atlas_alpha_and_safe_gutters():
    atlas=Image.open(SRC/'shadowblade-run-east-4frame-QA-PENDING.webp').convert('RGBA')
    assert atlas.size == (1920,480)
    a = np.array(atlas)[:,:,3]
    for index in range(4):
        cell = a[:,index*480:(index+1)*480]
        assert np.count_nonzero(cell)>10000
        for border in (cell[:18,:],cell[-18:,:],cell[:,:18],cell[:,-18:]):
            assert np.count_nonzero(border>10)==0

def test_distinct_frames():
    a=np.array(Image.open(SRC/'shadowblade-run-east-4frame-QA-PENDING.webp').convert('RGBA'))
    import hashlib
    hashes = [hashlib.sha256(a[:,480*i:480*(i+1)].tobytes()).hexdigest() for i in range(4)]
    assert len(set(hashes))==4
