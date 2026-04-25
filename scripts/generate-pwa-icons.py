"""Generate PWA icons from a parametrized design.

Run from repo root:
    python scripts/generate-pwa-icons.py

If Pillow is not installed:
    pip install Pillow
"""
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit(
        "Pillow not installed. Run:\n"
        "  pip install Pillow\n"
        "and re-run this script."
    )

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
PUBLIC.mkdir(parents=True, exist_ok=True)

BG = (10, 10, 10, 255)        # #0a0a0a
ACCENT = (200, 255, 0, 255)   # #c8ff00


def find_font(size: int, italic: bool = True) -> ImageFont.FreeTypeFont:
    """Try common serif italic fonts. Fallback to default."""
    candidates = []
    if italic:
        candidates += [
            "georgiai.ttf", "Georgia Italic.ttf",
            "timesi.ttf", "Times New Roman Italic.ttf",
            "DejaVuSerif-Italic.ttf",
        ]
    candidates += [
        "georgia.ttf", "Georgia.ttf",
        "times.ttf", "Times New Roman.ttf",
        "DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf",
        "arial.ttf", "Arial.ttf",
    ]
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render_icon(size: int, *, maskable: bool = False, rounded: bool = True) -> Image.Image:
    """Render the EL icon at a given size.

    maskable=True: 80% safe area, full-bleed background (Android maskable spec).
    rounded=True: corner radius ~18.75% of size (matches the SVG).
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    if maskable:
        # Maskable icons need full-bleed background; OS will mask to circle/squircle.
        # Don't round corners — the OS shape clips it.
        draw.rectangle([0, 0, size, size], fill=BG)
        text_scale = 0.44  # smaller so it fits in the safe circle
    else:
        if rounded:
            radius = int(size * 0.1875)  # 96/512 ≈ 0.1875
            draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)
        else:
            draw.rectangle([0, 0, size, size], fill=BG)
        text_scale = 0.55

    # Render "EL" centered.
    font_size = int(size * text_scale)
    font = find_font(font_size, italic=True)

    text = "EL"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    # Center, with optical adjustment (italic skews to right slightly)
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    # Slight upward nudge so it looks visually centered (italic descender drops below)
    y -= int(size * 0.02)
    draw.text((x, y), text, fill=ACCENT, font=font)

    return img


def main() -> None:
    targets = [
        ("icon-192.png", 192, False, True),
        ("icon-512.png", 512, False, True),
        ("icon-maskable-512.png", 512, True, False),
        ("apple-touch-icon.png", 180, False, False),  # iOS rounds it itself
    ]
    for filename, size, maskable, rounded in targets:
        img = render_icon(size, maskable=maskable, rounded=rounded)
        out = PUBLIC / filename
        # apple-touch-icon must be opaque (no alpha)
        if filename.startswith("apple-touch-icon"):
            bg = Image.new("RGB", img.size, BG[:3])
            bg.paste(img, mask=img.split()[3] if img.mode == "RGBA" else None)
            bg.save(out, "PNG")
        else:
            img.save(out, "PNG")
        print(f"  wrote {out.relative_to(ROOT)} ({size}x{size}{', maskable' if maskable else ''})")
    print("Done.")


if __name__ == "__main__":
    main()
