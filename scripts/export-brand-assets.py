#!/usr/bin/env python3
"""Generate downloadable PNG icons / social art and real game screenshots.

Developer tooling only. The shipped game still runs from a standalone index.html.
"""
from pathlib import Path
import os

import cairosvg
from PIL import Image, ImageOps
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
SHOTS = ASSETS / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

def svg_png(svg, target, size):
    cairosvg.svg2png(
        url=str(ASSETS / svg),
        write_to=str(ASSETS / target),
        output_width=size[0],
        output_height=size[1],
    )

def screenshot(page, target, out_size):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content((ROOT / "index.html").read_text("utf-8"), wait_until="load", timeout=60000)
    page.locator("#start").click(timeout=15000)
    page.wait_for_timeout(1800)
    assert page.locator("#hud.active").count() == 1, "Start button did not enter gameplay"
    assert not errors, f"JavaScript runtime errors: {errors[:2]}"
    temp = SHOTS / ("_temp-" + target)
    page.screenshot(path=str(temp), full_page=False)
    image = Image.open(temp).convert("RGB")
    image = ImageOps.fit(image, out_size, method=Image.Resampling.LANCZOS)
    image.save(SHOTS / target, "WEBP", quality=78, method=6)
    temp.unlink()

def main():
    svg_png("app-icon.svg", "apple-touch-icon.png", (180, 180))
    svg_png("app-icon.svg", "icon-192.png", (192, 192))
    svg_png("app-icon.svg", "icon-512.png", (512, 512))
    svg_png("og-cover.svg", "og-cover.png", (1200, 630))
    with sync_playwright() as p:
        binary = os.environ.get("CHROMIUM_BIN")
        kwargs = {"headless": True}
        if binary:
            kwargs["executable_path"] = binary
        browser = p.chromium.launch(**kwargs)
        try:
            desktop = browser.new_page(viewport={"width":1280,"height":800}, device_scale_factor=1)
            screenshot(desktop, "gameplay.webp", (960, 600))
            mobile = browser.new_page(viewport={"width":390,"height":844}, device_scale_factor=1, is_mobile=True, has_touch=True)
            screenshot(mobile, "mobile.webp", (390, 844))
        finally:
            browser.close()
    for f in [
        "apple-touch-icon.png", "icon-192.png", "icon-512.png", "og-cover.png",
        "screenshots/gameplay.webp", "screenshots/mobile.webp"
    ]:
        p = ASSETS / f
        assert p.stat().st_size > 3000, f"empty asset: {p}"
        print(f"generated {p.relative_to(ROOT)} — {p.stat().st_size:,} bytes")

if __name__ == "__main__":
    main()
