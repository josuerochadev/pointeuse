"""Generate Pointeuse app icons — abstract progress arc (270deg).
Usage: python3 generate-icons.py
Requires: pip install Pillow
"""
from PIL import Image, ImageDraw
import math

# Color constants
DARK_BG = (15, 20, 25)         # #0F1419
TEAL_START = (26, 138, 110)    # #1A8A6E
TEAL_END = (111, 211, 172)     # #6FD3AC
WHITE = (255, 255, 255)


def lerp_color(c1, c2, t):
    """Linearly interpolate between two RGB colors."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def draw_arc(draw, cx, cy, radius, stroke_w, color_start, color_end, segments=120):
    """Draw a 270-degree arc from 135deg to 45deg clockwise (through top).

    135deg = bottom-left gap start
    Arc goes: 135 -> 360/0 -> 45 (clockwise, i.e. increasing angle)
    Total sweep: 270 degrees
    """
    # Arc starts at 135deg and sweeps 270deg clockwise
    start_angle_deg = 135.0
    sweep_deg = 270.0

    # Half stroke for ellipse radii of end-cap dots
    hw = stroke_w / 2.0

    # Draw segments as thick lines approximated by polygons
    for i in range(segments):
        t0 = i / segments
        t1 = (i + 1) / segments

        a0 = math.radians(start_angle_deg + t0 * sweep_deg)
        a1 = math.radians(start_angle_deg + t1 * sweep_deg)

        # Midpoint color for this segment
        t_mid = (t0 + t1) / 2.0
        color = lerp_color(color_start, color_end, t_mid)

        # Build a thick segment as a parallelogram (4 corner points)
        # Perpendicular direction to the arc tangent at midpoint
        a_mid = (a0 + a1) / 2.0
        # Tangent direction at midpoint
        tx = -math.sin(a_mid)
        ty = math.cos(a_mid)

        # Four corners of the thick segment
        x0 = cx + radius * math.cos(a0)
        y0 = cy + radius * math.sin(a0)
        x1 = cx + radius * math.cos(a1)
        y1 = cy + radius * math.sin(a1)

        # Perpendicular offsets at each endpoint
        nx0 = -math.sin(a0) * hw
        ny0 = math.cos(a0) * hw
        nx1 = -math.sin(a1) * hw
        ny1 = math.cos(a1) * hw

        polygon = [
            (x0 - nx0, y0 - ny0),
            (x0 + nx0, y0 + ny0),
            (x1 + nx1, y1 + ny1),
            (x1 - nx1, y1 - ny1),
        ]
        draw.polygon(polygon, fill=color)

    # Round end caps — ellipses at start and end of arc
    # Start cap (at 135deg) — use color_start
    a_start = math.radians(start_angle_deg)
    xs = cx + radius * math.cos(a_start)
    ys = cy + radius * math.sin(a_start)
    draw.ellipse(
        [xs - hw, ys - hw, xs + hw, ys + hw],
        fill=color_start
    )

    # End cap (at 405deg = 45deg) — use color_end
    a_end = math.radians(start_angle_deg + sweep_deg)
    xe = cx + radius * math.cos(a_end)
    ye = cy + radius * math.sin(a_end)
    draw.ellipse(
        [xe - hw, ye - hw, xe + hw, ye + hw],
        fill=color_end
    )

    # Progress cursor dot at end — slightly larger (~0.7x stroke_w radius)
    dot_r = stroke_w * 0.7
    draw.ellipse(
        [xe - dot_r, ye - dot_r, xe + dot_r, ye + dot_r],
        fill=color_end
    )


def generate_icon(filepath, size, bg_color, arc_color_start, arc_color_end, maskable=False):
    """Generate one icon variant at `size`x`size`, then save as PNG.

    Renders at 4x resolution and downsamples with LANCZOS for anti-aliasing.
    """
    scale = 4
    render_size = size * scale

    img = Image.new("RGB", (render_size, render_size), bg_color)
    draw = ImageDraw.Draw(img)

    cx = render_size / 2.0
    cy = render_size / 2.0

    if maskable:
        # Safe zone: arc must stay within inner 60% of the icon
        # (40% padding on each side = 20% of render_size each side)
        usable_r = render_size * 0.30  # radius of safe usable area
        # stroke ~15% of the full render_size (spec requirement)
        stroke_w = render_size * 0.15
        radius = usable_r - stroke_w / 2.0
    else:
        # Normal icons: ~15% padding, stroke = 15% of full canvas
        padding = render_size * 0.15
        stroke_w = render_size * 0.15
        usable_r = render_size / 2.0 - padding
        radius = usable_r - stroke_w / 2.0

    draw_arc(draw, cx, cy, radius, stroke_w, arc_color_start, arc_color_end)

    # Downsample with LANCZOS for smooth anti-aliasing
    img = img.resize((size, size), Image.LANCZOS)
    img.save(filepath, "PNG")
    print(f"  Saved {filepath} ({size}x{size})")


def main():
    print("Generating Pointeuse icons...")

    generate_icon(
        "icons/icon-192.png",
        192,
        DARK_BG,
        TEAL_START,
        TEAL_END,
    )

    generate_icon(
        "icons/icon-512.png",
        512,
        DARK_BG,
        TEAL_START,
        TEAL_END,
    )

    generate_icon(
        "icons/icon-maskable-512.png",
        512,
        TEAL_START,
        WHITE,
        WHITE,
        maskable=True,
    )

    generate_icon(
        "icons/apple-touch-icon.png",
        180,
        DARK_BG,
        TEAL_START,
        TEAL_END,
    )

    print("Done.")


if __name__ == "__main__":
    main()
