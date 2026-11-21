#!/usr/bin/env python3
"""Browser smoke test + screenshots from real running Vue/Canvas gameplay."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "artifacts" / "v1-responsive"
VIEWPORTS = (
    ("desktop", 1440, 900, False),
    ("mobile-portrait", 390, 844, True),
    ("mobile-landscape", 844, 390, True),
)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def serve():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT / "dist")))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/index.html?showcase=1"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def capture(browser, url, label, width, height, mobile):
    page = browser.new_page(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=mobile,
        has_touch=mobile,
    )
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_function("window.__test && window.__test.sceneArtLoaded", timeout=45000)
        assert page.locator("#start").is_visible(), f"{label}: missing start button"
        page.screenshot(path=str(OUTPUT / f"{label}-menu.png"), animations="disabled")
        page.locator("#start").click()
        page.wait_for_function("window.__test?.mode === 'play'", timeout=15000)
        page.wait_for_function("window.__test?.frames > 25", timeout=15000)
        page.screenshot(path=str(OUTPUT / f"{label}-gameplay.png"), animations="disabled")
        page.keyboard.press("p")
        page.wait_for_function("window.__test?.mode === 'paused'", timeout=10000)
        page.keyboard.press("p")
        page.wait_for_function("window.__test?.mode === 'play'", timeout=10000)
        if label == "desktop":
            for index in range(4):
                page.evaluate("(n) => window.__test.previewBiome(n)", index)
                page.wait_for_timeout(120)
                page.screenshot(path=str(OUTPUT / f"biome-{index}.png"), animations="disabled")
        assert not errors, f"{label}: JavaScript exceptions: {errors[:3]}"
    finally:
        page.close()


def main():
    assert (ROOT / "dist" / "index.html").exists(), "Build with pnpm build first"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with serve() as url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        try:
            for name, w, h, mobile in VIEWPORTS:
                capture(browser, url, name, w, h, mobile)
        finally:
            browser.close()
    evidence = list(OUTPUT.glob("*.png"))
    assert len(evidence) == 10 and all(path.stat().st_size > 5000 for path in evidence)
    print(f"Validated {len(evidence)} actual gameplay/menu screenshots across three viewports.")


if __name__ == "__main__":
    main()
