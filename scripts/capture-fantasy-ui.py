#!/usr/bin/env python3
"""Capture real Vue game UI states from a production build, without mockups."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "artifacts" / "fantasy-ui"
VIEWPORTS = [
    ("desktop", 1440, 900, False),
    ("phone", 390, 844, True),
    ("landscape", 844, 390, True),
]


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def serve():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT / "dist")))
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/index.html?showcase=1"
    finally:
        server.shutdown()
        server.server_close()
        worker.join()


def capture(browser, url, name, width, height, mobile):
    page = browser.new_page(
        viewport={"width": width, "height": height},
        device_scale_factor=1,
        is_mobile=mobile,
        has_touch=mobile,
    )
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_function("window.__test?.sceneArtLoaded", timeout=45000)
        webp = page.request.get(url.split("/index.html")[0] + "/assets/skill-icons/frost@3x.webp")
        assert webp.ok and webp.body()[:4] == b"RIFF", f"{name}: generated WebP not served"
        page.screenshot(path=str(OUTPUT / f"{name}-hero-knight.png"), animations="disabled")
        drawer = page.locator(".progression-drawer")
        if drawer.count():
            drawer.locator("summary").click()
            drawer.scroll_into_view_if_needed()
            page.wait_for_timeout(380)
            page.screenshot(path=str(OUTPUT / f"{name}-progression.png"), animations="disabled")
            # Reset browser-capture setup directly. After opening the long drawer,
            # its summary scrolls beyond the clipped menu panel, so a second
            # Playwright click would hit the parent surface instead of the summary.
            drawer.evaluate("(element) => { element.open = false }")
            page.evaluate("""() => {
                const panel = document.querySelector('#menu .menu-panel');
                const selection = document.querySelector('#menu .menu-selection');
                if (panel) panel.scrollTop = 0;
                if (selection) selection.scrollTop = 0;
            }""")

        ranger = page.locator('[data-job="ranger"]')
        ranger.click()
        assert ranger.get_attribute("aria-pressed") == "true"
        assert page.locator('[data-job="knight"]').get_attribute("aria-pressed") == "false"
        assert "點擊選擇" in page.locator('[data-job="knight"] .job-choose').inner_text()
        page.screenshot(path=str(OUTPUT / f"{name}-hero-ranger.png"), animations="disabled")

        mode = page.locator('.mode-choice').nth(2)
        mode.click()
        assert mode.get_attribute("aria-checked") == "true"
        page.screenshot(path=str(OUTPUT / f"{name}-mode-selected.png"), animations="disabled")

        page.locator("#start").click()
        page.wait_for_function("window.__test?.mode === 'play'")
        page.evaluate("window.__test.level()")
        page.wait_for_function("window.__test?.mode === 'level'")
        page.wait_for_function("document.querySelectorAll('#level.active .upgrade').length === 3")
        page.wait_for_function("Array.from(document.querySelectorAll('#level.active img.skill-art')).every(img => img.complete && img.naturalWidth > 0)")
        page.wait_for_timeout(550)  # Ensure entrance animations and loaded artwork have settled.
        if height <= 500:
            cards = page.locator("#level.active .upgrade").evaluate_all(
                "(nodes) => nodes.map((node) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; })"
            )
            assert all(card["top"] >= 0 and card["bottom"] <= height for card in cards), (
                f"{name}: upgrade options extend outside the short landscape viewport: {cards}"
            )
        page.screenshot(path=str(OUTPUT / f"{name}-level-up.png"), animations="disabled")
        assert not errors, f"{name}: browser errors: {errors[:3]}"
    finally:
        page.close()


def main():
    assert (ROOT / "dist" / "index.html").exists(), "Run pnpm build first"
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with serve() as url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        try:
            for args in VIEWPORTS:
                capture(browser, url, *args)
        finally:
            browser.close()
    images = list(OUTPUT.glob("*.png"))
    assert len(images) == 15 and all(image.stat().st_size > 3000 for image in images)
    print(f"Captured {len(images)} real-game UI screenshots.")


if __name__ == "__main__":
    main()
