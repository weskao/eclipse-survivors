#!/usr/bin/env python3
"""Capture *running game canvases* in Chromium, plus a real-frame showcase video."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import shutil
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
OUT = ROOT / 'artifacts' / 'biomes'
NAMES = ('dawn-ruins', 'thunder-sanctuary', 'frozen-corridor', 'ashen-battlefield')

spec = spec_from_file_location('brand_exports', ROOT / 'scripts' / 'export-brand-assets.py')
assert spec and spec.loader
brand = module_from_spec(spec)
spec.loader.exec_module(brand)

def main():
    if not (DIST / 'index.html').is_file():
        raise SystemExit('Run pnpm build before capturing gameplay.')
    if not shutil.which('ffmpeg'):
        raise SystemExit('ffmpeg is required to encode the real gameplay frames.')
    OUT.mkdir(parents=True, exist_ok=True)
    frames = OUT / '_frames'
    frames.mkdir(exist_ok=True)
    screenshot_count = 0
    errors = []
    try:
        with brand.serve_dir(DIST) as base, sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--disable-dev-shm-usage', '--no-sandbox'])
            try:
                page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
                page.on('pageerror', lambda exc: errors.append(str(exc)))
                page.goto(base + '/index.html?showcase=1', wait_until='domcontentloaded')
                page.wait_for_function('window.__test && window.__test.sceneArtLoaded', timeout=40000)
                page.locator('#start').click()
                page.wait_for_function('window.__test && window.__test.mode === "play"', timeout=15000)
                for index, name in enumerate(NAMES):
                    page.evaluate('(n) => window.__test.previewBiome(n)', index)
                    page.wait_for_timeout(300)
                    assert page.evaluate('window.__test.mode') == 'play'
                    assert page.evaluate('window.__test.frames') > 10
                    page.screenshot(path=str(OUT / (name + '.png')), animations='disabled')
                    for _ in range(28):
                        page.screenshot(path=str(frames / f'frame_{screenshot_count:04d}.png'))
                        screenshot_count += 1
                        page.wait_for_timeout(85)
                if errors:
                    raise AssertionError('Browser game errors: ' + '; '.join(errors[:3]))
                # Include one touch-sized screenshot to verify mobile readability.
                page.set_viewport_size({'width': 390, 'height': 844})
                page.evaluate('(n) => window.__test.previewBiome(n)', 2)
                page.wait_for_timeout(300)
                page.screenshot(path=str(OUT / 'mobile-frozen-corridor.png'))
            finally:
                browser.close()
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '12',
            '-i', str(frames / 'frame_%04d.png'), '-c:v', 'libx264', '-preset', 'fast',
            '-crf', '25', '-pix_fmt', 'yuv420p', str(OUT / 'biome-showcase.mp4'),
        ], check=True)
        assert (OUT / 'biome-showcase.mp4').stat().st_size > 10000
        print(f'Captured {len(NAMES)} real desktop screenshots, one mobile capture, '
              f'{screenshot_count} gameplay video frames and an MP4.')
    finally:
        shutil.rmtree(frames, ignore_errors=True)

if __name__ == '__main__':
    main()
