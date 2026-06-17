"""Generate Pointeuse app icons from source artwork.

Usage: python3 generate-icons.py
Requires: pip install Pillow
"""

from PIL import Image

SOURCE = "icons/Pointeuse App Icon (Progress Arc) (1).png"
DARK_BG = (15, 20, 25)  # #0F1419

VARIANTS = [
    ("icons/icon-512.png", 512, 0.12, False),
    ("icons/icon-192.png", 192, 0.12, False),
    ("icons/apple-touch-icon.png", 180, 0.10, False),
    ("icons/icon-maskable-512.png", 512, 0.20, True),
]


def generate(src, output, size, padding_pct, maskable):
    """Place source artwork centered on dark background with padding."""
    canvas = Image.new("RGB", (size, size), DARK_BG)

    pad = int(size * padding_pct)
    inner = size - 2 * pad

    # Find bounding box of non-transparent content
    bbox = src.getchannel("A").getbbox()
    if bbox:
        cropped = src.crop(bbox)
    else:
        cropped = src

    # Resize to fit inner area, maintaining aspect ratio
    cropped.thumbnail((inner, inner), Image.LANCZOS)

    # Paste centered (use alpha channel as mask for transparency)
    x = (size - cropped.width) // 2
    y = (size - cropped.height) // 2
    canvas.paste(cropped, (x, y), cropped)

    canvas.save(output, "PNG")
    print(f"  {output} ({size}x{size})")


def main():
    print("Generating Pointeuse icons...")
    src = Image.open(SOURCE).convert("RGBA")

    for output, size, padding, maskable in VARIANTS:
        generate(src, output, size, padding, maskable)

    print("Done!")


if __name__ == "__main__":
    main()
