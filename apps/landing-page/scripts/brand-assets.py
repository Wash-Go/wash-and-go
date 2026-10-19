#!/usr/bin/env python3
"""Build the landing page brand assets from the whale lockup JPEG.

Usage:
    python3 scripts/brand-assets.py path/to/logo-whale-lockup.jpeg

The source is a 1254x1254 JPEG of the whale mark above the "WASH & GO"
wordmark on a white field. This script:

1. Keys out the white background. The background is found by flood fill from
   the corner (so the whale's white belly and eye stay opaque), plus every
   near-white pixel in the wordmark band (the letter counters). Edge pixels get
   a soft alpha by projecting each pixel onto the line between white and the
   closer of the two measured brand colours (sky #4EBBE6, navy #0B3773), so
   anti-aliased edges stay smooth and the blues are never lightened; solid
   interior pixels are copied unchanged. One short barrier line closes the
   gap between the tail fin tip and the wave so the belly does not leak.
2. Writes the transparent lockup and mark (PNG + WebP), the favicons, the
   apple touch icon, the PWA icons and the 1200x630 Open Graph image (tagline
   set in the repo's Atkinson Hyperlegible Next 800 woff2).

Requires Pillow >= 10 and numpy. Run from apps/landing-page.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / 'src/assets/brand'
PUBLIC = ROOT / 'public'
FONTS = ROOT / 'src/assets/fonts'

WHITE = np.array([255.0, 255.0, 255.0])
NAVY = (11, 55, 115)  # #0B3773, measured from the wordmark
SKY = (78, 187, 230)  # #4EBBE6, measured from the whale body

NEAR_WHITE_MIN = 225  # min channel above this counts as background-ish
WORDMARK_TOP = 790  # empty rows 772-815 separate mark and wordmark
EDGE = 3  # px either side of the boundary that get a soft alpha
TAGLINE = 'Laundry pickup, delivery and settlement for Zamboanga City'
FIN_GAP_BARRIER = ((585, 713), (585, 737))  # fin tip to wave top


def dilate(mask: np.ndarray, px: int) -> np.ndarray:
    img = Image.fromarray((mask * 255).astype(np.uint8), 'L')
    return np.array(img.filter(ImageFilter.MaxFilter(2 * px + 1))) > 127


def erode(mask: np.ndarray, px: int) -> np.ndarray:
    img = Image.fromarray((mask * 255).astype(np.uint8), 'L')
    return np.array(img.filter(ImageFilter.MinFilter(2 * px + 1))) > 127


def background_mask(rgb: np.ndarray) -> np.ndarray:
    near = rgb.min(axis=2) > NEAR_WHITE_MIN
    fill = Image.fromarray((near * 255).astype(np.uint8), 'L').copy()
    ImageDraw.Draw(fill).line(FIN_GAP_BARRIER, fill=0, width=3)
    ImageDraw.floodfill(fill, (0, 0), 128)
    bg = np.array(fill) == 128
    bg[WORDMARK_TOP:, :] |= near[WORDMARK_TOP:, :]
    return bg


def key_white(rgb8: np.ndarray) -> np.ndarray:
    rgb = rgb8.astype(float)
    bg = background_mask(rgb8)
    fg = ~bg
    solid = erode(fg, EDGE)
    band = dilate(fg, EDGE) & ~solid

    # Every edge that meets the background is sky or navy, so each edge pixel
    # is a mix of white and one of the two measured brand colours. Pick the
    # colour whose white-to-colour line the pixel sits closest to, and take
    # alpha as the pixel's position along that line.
    best_alpha = np.zeros(rgb.shape[:2])
    best_resid = np.full(rgb.shape[:2], np.inf)
    best_colour = np.zeros_like(rgb)
    for colour in (np.array(SKY, float), np.array(NAVY, float)):
        d = WHITE - colour
        a = ((WHITE - rgb) @ d) / (d @ d)
        resid = np.linalg.norm((WHITE - rgb) - a[..., None] * d, axis=2)
        better = resid < best_resid
        best_resid[better] = resid[better]
        best_alpha[better] = a[better]
        best_colour[better] = colour

    alpha = np.where(solid, 1.0, 0.0)
    alpha[band] = np.clip(best_alpha[band], 0.0, 1.0)
    out_rgb = np.where(band[..., None], best_colour, rgb)

    # The belly is white foreground that touches the background only at the
    # fin barrier; soften that one edge from the mask instead.
    belly = band & fg & (rgb8.min(axis=2) > NEAR_WHITE_MIN)
    belly_zone = dilate(belly, EDGE) & band & (rgb8.min(axis=2) > NEAR_WHITE_MIN)
    blurred = np.array(
        Image.fromarray((fg * 255).astype(np.uint8), 'L').filter(
            ImageFilter.GaussianBlur(0.8)
        )
    ) / 255.0
    alpha[belly_zone] = blurred[belly_zone]
    out_rgb[belly_zone] = WHITE
    alpha[alpha < 0.03] = 0.0

    out = np.dstack([np.clip(out_rgb, 0, 255), alpha * 255]).round().astype(np.uint8)
    out[alpha == 0, :3] = 255
    return out


def crop_to_content(img: Image.Image, pad: int) -> Image.Image:
    box = img.getchannel('A').getbbox()
    assert box is not None
    l, t, r, b = box
    return img.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, img.width), min(b + pad, img.height)))


def square(img: Image.Image, size: int, pad_ratio: float, bg: tuple | None) -> Image.Image:
    inner = round(size * (1 - 2 * pad_ratio))
    scale = inner / max(img.width, img.height)
    w, h = round(img.width * scale), round(img.height * scale)
    fitted = img.resize((w, h), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (*bg, 255) if bg else (255, 255, 255, 0))
    canvas.alpha_composite(fitted, ((size - w) // 2, (size - h) // 2))
    return canvas


def wrap(text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines: list[str] = []
    for word in text.split():
        trial = f'{lines[-1]} {word}' if lines else word
        if lines and font.getlength(trial) <= width:
            lines[-1] = trial
        else:
            lines.append(word)
    return lines


def og_image(lockup: Image.Image) -> Image.Image:
    W, H, margin = 1200, 630, 64
    og = Image.new('RGBA', (W, H), (255, 255, 255, 255))
    logo_w = 560
    scale = logo_w / lockup.width
    logo = lockup.resize((logo_w, round(lockup.height * scale)), Image.LANCZOS)
    og.alpha_composite(logo, (margin, (H - logo.height) // 2))
    draw = ImageDraw.Draw(og)
    font = ImageFont.truetype(str(FONTS / 'atkinson-hyperlegible-next-latin.woff2'), 46)
    font.set_variation_by_axes([800])
    x = margin + logo_w + 56
    lines = wrap(TAGLINE, font, W - margin - x)
    line_h = 58
    y = (H - line_h * len(lines)) // 2
    for line in lines:
        draw.text((x, y), line, font=font, fill=(*NAVY, 255))
        y += line_h
    draw.rectangle((0, H - 16, W, H), fill=(*SKY, 255))
    return og


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Image.open(sys.argv[1]).convert('RGB')
    keyed = Image.fromarray(key_white(np.array(src)), 'RGBA')

    BRAND.mkdir(parents=True, exist_ok=True)
    lockup = crop_to_content(keyed, 8)
    mark = crop_to_content(keyed.crop((0, 0, keyed.width, WORDMARK_TOP)), 8)
    for name, img in (('logo-lockup', lockup), ('logo-mark', mark)):
        img.save(BRAND / f'{name}.png', optimize=True)
        img.save(BRAND / f'{name}.webp', quality=90, method=6)

    fav32 = square(mark, 32, 0.0, None)
    fav32.save(PUBLIC / 'favicon-32.png', optimize=True)
    fav16 = square(mark, 16, 0.0, None)
    fav32.save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32)], append_images=[fav16])
    square(mark, 180, 0.1, (255, 255, 255)).convert('RGB').save(PUBLIC / 'apple-touch-icon.png', optimize=True)
    # PWA icons: opaque white with a safe-zone margin so maskable crops keep the whale.
    square(mark, 192, 0.12, (255, 255, 255)).convert('RGB').save(PUBLIC / 'icon-192.png', optimize=True)
    square(mark, 512, 0.12, (255, 255, 255)).convert('RGB').save(PUBLIC / 'icon-512.png', optimize=True)
    og_image(lockup).convert('RGB').save(PUBLIC / 'og.png', optimize=True)


if __name__ == '__main__':
    main()
