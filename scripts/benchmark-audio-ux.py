#!/usr/bin/env python3
"""Compare actual game frame callback cost against pinned main and capture gameplay.

This is deliberately a browser measurement, not a promise of device-specific FPS.
Both versions run on the same CI-hosted Chromium software/hardware configuration.
"""
import argparse
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import shutil
import subprocess
import threading
import time

from playwright.sync_api import sync_playwright

INSTRUMENT = """
(() => {
  const nativeRAF = window.requestAnimationFrame.bind(window);
  window.__measureFrames = false;
  window.__frameCosts = [];
  window.requestAnimationFrame = callback => nativeRAF(ts => {
    const begin = performance.now();
    try { return callback(ts); }
    finally {
      if (window.__measureFrames) window.__frameCosts.push(performance.now() - begin);
    }
  });
})();
"""


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def serve(directory):
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(directory))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/index.html"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def percentile(values, proportion):
    if not values:
        raise AssertionError("No frame callback samples were collected")
    ordered = sorted(values)
    return round(ordered[max(0, math.ceil(len(ordered) * proportion) - 1)], 3)


def capture(browser, directory, viewport, mobile=False, shot=None, video=None):
    with serve(directory) as url:
        opts = dict(viewport=viewport, device_scale_factor=1,
                    is_mobile=mobile, has_touch=mobile)
        if video:
            opts["record_video_dir"] = str(video.parent)
            opts["record_video_size"] = viewport
        context = browser.new_context(**opts)
        page = context.new_page()
        page.add_init_script(INSTRUMENT)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_function(
            "window.__test && window.__test.sceneArtLoaded", timeout=40000
        )
        page.locator("#start").click(timeout=20000)
        page.wait_for_function(
            'window.__test && window.__test.mode === "play"', timeout=15000
        )
        page.wait_for_timeout(1400)
        page.evaluate("window.__frameCosts = []; window.__measureFrames = true")
        start = time.monotonic()
        page.wait_for_timeout(5000)
        elapsed = time.monotonic() - start
        samples = page.evaluate(
            "window.__measureFrames = false; window.__frameCosts"
        )
        if shot:
            page.screenshot(path=str(shot), timeout=25000)
        if errors:
            raise AssertionError(f"Uncaught browser errors: {errors[:3]}")
        recorded = page.video if video else None
        page.close()
        context.close()

    if recorded is not None:
        recorded_path = Path(recorded.path())
        if shutil.which("ffmpeg"):
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                 "-i", str(recorded_path), "-an", "-c:v", "libx264",
                 "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video)],
                check=True,
            )
            recorded_path.unlink()
        else:
            recorded_path.rename(video.with_suffix(".webm"))

    return {
        "sample_count": len(samples),
        "callback_median_ms": percentile(samples, 0.5),
        "callback_p95_ms": percentile(samples, 0.95),
        "observed_fps": round(len(samples) / elapsed, 1),
        "viewport": f'{viewport["width"]}x{viewport["height"]}',
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    for folder in (args.baseline, args.candidate):
        if not (folder / "index.html").is_file():
            raise FileNotFoundError(f"Build is missing: {folder}")
    args.out.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--disable-dev-shm-usage", "--no-sandbox"]
        )
        try:
            desktop = {"width": 1280, "height": 800}
            before = capture(browser, args.baseline, desktop)
            after = capture(
                browser, args.candidate, desktop,
                shot=args.out / "desktop-gameplay.png",
                video=args.out / "desktop-gameplay.mp4",
            )
            portrait = capture(
                browser, args.candidate, {"width": 390, "height": 844},
                mobile=True, shot=args.out / "mobile-portrait.png",
            )
            landscape = capture(
                browser, args.candidate, {"width": 844, "height": 390},
                mobile=True, shot=args.out / "mobile-landscape.png",
            )
        finally:
            browser.close()

    result = {"baseline_main_commit": "fe6161fa9deea23d4447b39b2085689744f531fe",
              "desktop_baseline": before, "desktop_candidate": after,
              "mobile_portrait": portrait, "mobile_landscape": landscape}
    (args.out / "performance.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    lines = [
        "## Eclipse Survivors — actual browser frame measurements",
        "",
        "Same CI runner, Chromium and 1280×800 viewport. Values are main-thread "
        "requestAnimationFrame callback duration, **not** GPU frame time.",
        "",
        "| Desktop measurement | Pinned main | Feature branch |",
        "|---|---:|---:|",
        f'| Samples | {before["sample_count"]} | {after["sample_count"]} |',
        f'| Median callback (ms) | {before["callback_median_ms"]} | {after["callback_median_ms"]} |',
        f'| P95 callback (ms) | {before["callback_p95_ms"]} | {after["callback_p95_ms"]} |',
        f'| Observed callbacks / second | {before["observed_fps"]} | {after["observed_fps"]} |',
        "",
        "Screenshots: `desktop-gameplay.png`, `mobile-portrait.png`, "
        "`mobile-landscape.png`. Representative recording: "
        "`desktop-gameplay.mp4` (or WebM if ffmpeg is unavailable).",
        "",
        "This measures headless desktop Chromium only. Physical iOS/Android performance "
        "and interruptions still require device verification.",
    ]
    (args.out / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
