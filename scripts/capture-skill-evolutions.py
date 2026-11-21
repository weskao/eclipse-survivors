#!/usr/bin/env python3
"""Capture genuine gameplay from the built app, including upgrade cards and evolved skills."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import subprocess
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'artifacts' / 'skill-evolution'
EVOLUTIONS = (
    'frozen-thunderstorm',
    'infernal-singularity',
    'apocalypse-rain',
    'blade-tempest',
    'guardian-sanctuary',
)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def serve(directory):
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(directory)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_address[1]}/index.html'
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def capture(browser, url, evolution, first=False):
    options = {'viewport': {'width': 1280, 'height': 800}, 'device_scale_factor': 1}
    if first:
        options['record_video_dir'] = str(OUTPUT)
        options['record_video_size'] = {'width': 1280, 'height': 800}
    context = browser.new_context(**options)
    page = context.new_page()
    page_errors = []
    page.on('pageerror', lambda e: page_errors.append(str(e)))
    page.goto(url, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_function('window.__test && window.__test.sceneArtLoaded', timeout=45000)
    page.locator('#start').click()
    page.wait_for_function('window.__test.mode === "play"', timeout=15000)
    page.evaluate('(id) => window.__test.prepareEvolution(id)', evolution)
    page.evaluate('window.__test.level()')
    card = page.locator(f'[data-up="{evolution}"]')
    card.wait_for(timeout=10000)
    if first:
        page.screenshot(path=str(OUTPUT / 'upgrade-cards.png'))
    card.click()
    page.locator(f'.skill[data-skill="{evolution}"]').wait_for(timeout=10000)
    if first:
        page.screenshot(path=str(OUTPUT / 'equipped-skills-hud.png'))
    page.wait_for_timeout(110)
    page.screenshot(path=str(OUTPUT / f'evolved-{evolution}.png'))
    if first:
        page.wait_for_timeout(1800)
    assert not page_errors, f'Browser errors for {evolution}: {page_errors}'
    video = page.video if first else None
    context.close()
    if video is not None:
        webm = Path(video.path())
        mp4 = OUTPUT / 'evolution-gameplay.mp4'
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(webm),
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            str(mp4)
        ], check=True)
        webm.unlink()
        assert mp4.stat().st_size > 10000


def main():
    assert (ROOT / 'dist' / 'index.html').exists(), 'Build first: pnpm build'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with serve(ROOT / 'dist') as url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--disable-dev-shm-usage', '--no-sandbox'])
        try:
            for i, evolution in enumerate(EVOLUTIONS):
                capture(browser, url, evolution, first=(i == 0))
        finally:
            browser.close()
    for image in OUTPUT.glob('*.png'):
        assert image.stat().st_size > 5000
    print('Saved', len(list(OUTPUT.glob('*.png'))), 'gameplay screenshots and an MP4')


if __name__ == '__main__':
    main()
