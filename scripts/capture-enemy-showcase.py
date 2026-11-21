#!/usr/bin/env python3
"""Capture genuine canvas-rendered boss phases from the feature branch build."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'artifacts' / 'advanced-enemies'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

@contextmanager
def serve_game():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'dist')))
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        yield f'http://127.0.0.1:{server.server_address[1]}/'
    finally:
        server.shutdown()
        server.server_close()
        worker.join()

def launch(page, url):
    page.goto(url, wait_until='domcontentloaded')
    page.wait_for_function('window.__test && window.__test.sceneArtLoaded', timeout=45000)
    page.locator('#start').click()
    page.wait_for_function('window.__test.mode === "play"')
    page.evaluate('window.__test.showcaseBoss(1)')

def main():
    if not (ROOT / 'dist' / 'index.html').is_file():
        raise RuntimeError('Build the branch with pnpm build before capturing')
    if not shutil.which('ffmpeg'):
        raise RuntimeError('ffmpeg is required for playable MP4 output')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with serve_game() as url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(
            viewport={'width': 1280, 'height': 720},
            device_scale_factor=1,
            record_video_dir=str(OUTPUT),
            record_video_size={'width': 1280, 'height': 720},
        )
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        launch(page, url)
        page.wait_for_timeout(1150)
        page.screenshot(path=str(OUTPUT / 'boss-phase-1.png'))
        for phase in (2, 3):
            page.evaluate('(p) => window.__test.showcaseBoss(p)', phase)
            page.wait_for_timeout(1800)
            page.screenshot(path=str(OUTPUT / f'boss-phase-{phase}.png'))
            page.wait_for_timeout(1200)
        assert page.evaluate('window.__test.frames') > 40
        assert not errors, errors[:5]
        video = page.video
        page.close()
        context.close()
        source = Path(video.path())
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
            '-i', str(source), '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', '-crf', '25',
            str(OUTPUT / 'boss-showcase.mp4'),
        ], check=True)
        source.unlink(missing_ok=True)
        mobile = browser.new_page(viewport={'width': 390, 'height': 844},
                                  device_scale_factor=1, is_mobile=True, has_touch=True)
        launch(mobile, url)
        mobile.wait_for_timeout(600)
        mobile.screenshot(path=str(OUTPUT / 'mobile-boss.png'))
        mobile.close()
        browser.close()
    for path in OUTPUT.iterdir():
        print(f'{path.name}: {path.stat().st_size} bytes')

if __name__ == '__main__':
    main()
