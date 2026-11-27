#!/usr/bin/env python3
"""Rasterize the deterministic boss-attack SVG masters into transparent `<id>@3x.webp` combat textures.

1. `render-boss-attack-art.mjs <staging>` writes the original SVG masters (not committed).
2. Chromium renders each SVG at 3x its largest combat display box, with a transparent background.
3. Polytool `towebp -q 90` (VFX drawn at <= 84% alpha) encodes the PNGs inside the isolated staging dir (it deletes its inputs).
4. Every WebP is checked for VP8X + alpha and its exact size before it replaces the shipped file.

Display boxes come from `src/game/balance/bosses.json` and the renderers in `src/game/content/bosses/render.ts`
and `src/game/render/pixi-vfx/renderer.ts`: circle/ring/arena textures fill `2 * radius`, beams fill
`(length + 2 * width) x 2 * width` (kept at the SVG's 4:1 aspect), projectile art only paints a release disk of
radius <= 42 + 13 * weight (<= 55), so it keeps its 384 px SVG size (>= 3 * 110).
"""
from __future__ import annotations

import base64
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/es2/production/skills/boss-attacks'
PROJECTILE_SIZE = 384


def target_size(attack: dict) -> tuple[int, int]:
    if attack['kind'] == 'projectile':
        return PROJECTILE_SIZE, PROJECTILE_SIZE
    if attack['shape'] == 'beam':
        width = 3 * (attack['length'] + 2 * attack['width'])
        return width, max(round(width / 4), 6 * attack['width'])
    side = 6 * attack['radius']
    return side, side


def webp_info(data: bytes) -> tuple[int, int, bool]:
    if data[:4] != b'RIFF' or data[8:12] != b'WEBP' or data[12:16] != b'VP8X':
        raise ValueError('expected an extended (VP8X) WebP')
    return int.from_bytes(data[24:27], 'little') + 1, int.from_bytes(data[27:30], 'little') + 1, bool(data[20] & 0x10)


def main() -> int:
    attacks = json.loads((ROOT / 'src/game/balance/bosses.json').read_text(encoding='utf-8'))['attacks']
    with tempfile.TemporaryDirectory() as tmp:
        masters, staging = Path(tmp) / 'svg', Path(tmp) / 'png'
        staging.mkdir()
        subprocess.run(['node', str(ROOT / 'scripts/render-boss-attack-art.mjs'), str(masters)], check=True)
        sizes = {id: target_size(attack) for id, attack in attacks.items()}
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(device_scale_factor=1)
            for id, (width, height) in sizes.items():
                svg = base64.b64encode((masters / f'{id}.svg').read_bytes()).decode()
                page.set_viewport_size({'width': width, 'height': height})
                page.set_content(
                    '<style>html,body{margin:0;background:transparent}'
                    f'img{{display:block;width:{width}px;height:{height}px}}</style>'
                    f'<img src="data:image/svg+xml;base64,{svg}">')
                page.evaluate('document.images[0].decode()')
                page.screenshot(path=str(staging / f'{id}@3x.png'), omit_background=True)
            browser.close()
        subprocess.run(['towebp', '-c', '-q', '90'], cwd=staging, check=True)
        for id, (width, height) in sizes.items():
            webp = staging / f'{id}@3x.webp'
            actual = webp_info(webp.read_bytes())
            if actual != (width, height, True):
                raise SystemExit(f'{webp.name}: got {actual}, expected {(width, height, True)}')
        OUT.mkdir(parents=True, exist_ok=True)
        for id in sizes:
            shutil.copyfile(staging / f'{id}@3x.webp', OUT / f'{id}@3x.webp')
            print(f'{id}@3x.webp {sizes[id][0]}x{sizes[id][1]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
