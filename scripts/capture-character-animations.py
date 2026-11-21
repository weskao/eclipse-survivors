#!/usr/bin/env python3
"""Capture real Canvas 2D gameplay for each hero and measure branch vs live main.

Run after pnpm build with playwright==1.58.0 and Pillow==11.1.0 installed.
Only writes ephemeral CI artifacts; never commits binary media to main.
"""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from statistics import median
import json
import subprocess
import threading

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "character-animation"
OUT.mkdir(parents=True, exist_ok=True)
LIVE_MAIN = "https://weskao.github.io/eclipse-survivors/"
HEROES = ("knight", "ranger", "wizard")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

@contextmanager
def local_site():
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT / "dist")))
    worker = threading.Thread(target=srv.serve_forever, daemon=True)
    worker.start()
    try:
        yield f"http://127.0.0.1:{srv.server_address[1]}/"
    finally:
        srv.shutdown()
        srv.server_close()
        worker.join()

DIAGNOSTICS = """
(() => {
  const old = CanvasRenderingContext2D.prototype.drawImage;
  const stats = { calls: 0, milliseconds: 0 };
  window.__captureDiagnostics = stats;
  CanvasRenderingContext2D.prototype.drawImage = function(...args) {
    const t0 = performance.now();
    try { return old.apply(this, args); }
    finally { stats.calls++; stats.milliseconds += performance.now() - t0; }
  };
})();
"""

def begin(page, url, hero):
    page.add_init_script(DIAGNOSTICS)
    page.goto(url, wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_function("window.__test && window.__test.sceneArtLoaded", timeout=45_000)
    page.locator(f'button[data-job="{hero}"]').click()
    page.locator("#start").click()
    page.wait_for_function("window.__test && window.__test.mode === 'play'", timeout=20_000)
    page.wait_for_function("window.__test.frames > 25", timeout=20_000)

def metrics(page):
    # Browser-frame throughput and Canvas drawImage work; no synthetic FPS claims.
    records = []
    for _ in range(3):
        initial = page.evaluate("""() => ({
          frames: window.__test.frames,
          t: performance.now(),
          calls: window.__captureDiagnostics.calls,
          ms: window.__captureDiagnostics.milliseconds
        })""")
        page.wait_for_timeout(1000)
        final = page.evaluate("""() => ({
          frames: window.__test.frames,
          t: performance.now(),
          calls: window.__captureDiagnostics.calls,
          ms: window.__captureDiagnostics.milliseconds
        })""")
        frames = max(1, final["frames"] - initial["frames"])
        seconds = max(0.001, (final["t"] - initial["t"]) / 1000)
        records.append({
            "fps": (frames / seconds),
            "drawImage_calls_per_frame": (final["calls"] - initial["calls"]) / frames,
            "drawImage_ms_per_frame": (final["ms"] - initial["ms"]) / frames,
        })
    return {key: round(median([row[key] for row in records]), 3) for key in records[0]}

def capture(page, url, hero, tag, record=False):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    begin(page, url, hero)
    page.wait_for_timeout(350)
    page.screenshot(path=str(OUT / f"{tag}-{hero}-idle.png"))
    page.keyboard.down("d")
    page.wait_for_timeout(850)
    page.screenshot(path=str(OUT / f"{tag}-{hero}-run.png"))
    page.keyboard.up("d")
    page.evaluate("window.__test.forceAttack()")
    page.wait_for_timeout(90)
    page.screenshot(path=str(OUT / f"{tag}-{hero}-attack.png"))
    if errors:
        raise RuntimeError(f"{tag}-{hero} page errors: {errors[:3]}")
    # Do not profile while moving screenshots are being captured.
    page.wait_for_timeout(400)
    return metrics(page)

def before_after():
    left = OUT / "before-knight-attack.png"
    right = OUT / "after-knight-attack.png"
    if not left.exists() or not right.exists():
        return
    with Image.open(left) as before, Image.open(right) as after:
        width, height = 900, 563
        result = Image.new("RGB", (width * 2, height + 57), "#151a20")
        for index, (source, label) in enumerate(((before, "BEFORE — LIVE MAIN"), (after, "AFTER — FEATURE BRANCH"))):
            pic = source.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
            result.paste(pic, (index * width, 57))
            painter = ImageDraw.Draw(result)
            painter.text((index * width + 24, 17), label, font=ImageFont.truetype(FONT, 22), fill="#e9e2d0")
        result.save(OUT / "before-after-knight.png", optimize=True)

def make_mp4(video_path, dest):
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(video_path),
         "-vf", "fps=24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dest)],
        check=True,
    )
    if dest.stat().st_size < 1_000:
        raise RuntimeError(f"Empty video: {dest}")

def main():
    report = {
        "source": {
            "before": LIVE_MAIN,
            "after": "Built feature branch (pnpm build)",
            "method": "Headless Chromium 1280x800, median of three 1-second windows",
            "note": "FPS is hardware/runner-dependent; drawImage is a partial render-cost proxy, not total frame time.",
        },
        "before": {},
        "after": {},
    }
    with local_site() as after_url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            for hero in HEROES:
                context = browser.new_context(
                    viewport={"width": 1280, "height": 800}, device_scale_factor=1,
                    reduced_motion="no-preference",
                    record_video_dir=str(OUT / "raw-video"),
                    record_video_size={"width": 1280, "height": 800},
                )
                page = context.new_page()
                report["after"][hero] = capture(page, after_url, hero, "after", record=True)
                video = page.video
                page.close()
                context.close()
                if video:
                    make_mp4(Path(video.path()), OUT / f"{hero}-idle-movement-attacks.mp4")
            try:
                context = browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=1)
                page = context.new_page()
                report["before"]["knight"] = capture(page, LIVE_MAIN, "knight", "before")
                context.close()
            except Exception as exc:
                report["before"]["error"] = str(exc)
            before_after()
            context = browser.new_context(
                viewport={"width": 390, "height": 844},
                device_scale_factor=1, is_mobile=True, has_touch=True,
                reduced_motion="reduce",
            )
            page = context.new_page()
            begin(page, after_url, "wizard")
            page.screenshot(path=str(OUT / "reduced-motion-mobile-wizard.png"))
            context.close()
        finally:
            browser.close()
    (OUT / "performance.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
