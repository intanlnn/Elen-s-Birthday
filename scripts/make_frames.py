"""
Generates 3 dummy transparent PNG photobooth frames.
These are placeholders — replace them later with your own designs
in public/assets/frames/ (keep the same filenames or update FrameSelector.jsx).
"""
from PIL import Image, ImageDraw
import math
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "frames")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 1080, 1920
GOLD = (200, 169, 126, 255)
GOLD_SOFT = (200, 169, 126, 160)
PINK = (243, 200, 214, 255)
PINK_SOFT = (243, 200, 214, 200)
IVORY = (253, 251, 248, 255)


def new_canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def save(img, name):
    path = os.path.join(OUT_DIR, name)
    img.save(path, "PNG")
    print("saved", path)


# ---------- Frame 1: Golden Elegance ----------
img = new_canvas()
d = ImageDraw.Draw(img)
margin = 26
d.rectangle([margin, margin, W - margin, H - margin], outline=GOLD, width=5)
margin2 = 46
d.rectangle([margin2, margin2, W - margin2, H - margin2], outline=GOLD, width=2)

def corner_diamond(cx, cy, r, fill):
    pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    d.polygon(pts, fill=fill)

for cx, cy in [(margin, margin), (W - margin, margin), (margin, H - margin), (W - margin, H - margin)]:
    corner_diamond(cx, cy, 16, GOLD)

# small title plate area at bottom (kept empty; JS overlays real text)
d.rectangle([W / 2 - 220, H - 150, W / 2 + 220, H - 90], outline=GOLD, width=2)

save(img, "frame-gold-elegance.png")

# ---------- Frame 2: Pink Blossom ----------
img = new_canvas()
d = ImageDraw.Draw(img)

def dotted_line(a, b, steps, r, fill):
    (x1, y1), (x2, y2) = a, b
    for i in range(steps):
        t = i / (steps - 1)
        x = x1 + (x2 - x1) * t
        y = y1 + (y2 - y1) * t
        d.ellipse([x - r, y - r, x + r, y + r], fill=fill)

edge = 34
dotted_line((edge, edge), (W - edge, edge), 34, 4, PINK)
dotted_line((edge, H - edge), (W - edge, H - edge), 34, 4, PINK)
dotted_line((edge, edge), (edge, H - edge), 60, 4, PINK)
dotted_line((W - edge, edge), (W - edge, H - edge), 60, 4, PINK)

def blossom(cx, cy, r, petals, fill):
    for i in range(petals):
        angle = (2 * math.pi / petals) * i
        px = cx + math.cos(angle) * r
        py = cy + math.sin(angle) * r
        d.ellipse([px - 10, py - 10, px + 10, py + 10], fill=fill)
    d.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=GOLD)

for cx, cy in [(70, 70), (W - 70, 70), (70, H - 70), (W - 70, H - 70)]:
    blossom(cx, cy, 16, 6, PINK)

save(img, "frame-pink-blossom.png")

# ---------- Frame 3: Ivory Classic (ornate corner brackets) ----------
img = new_canvas()
d = ImageDraw.Draw(img)
m = 30
d.rectangle([m, m, W - m, H - m], outline=IVORY, width=6)
d.rectangle([m + 12, m + 12, W - m - 12, H - m - 12], outline=GOLD, width=2)

def bracket(x, y, flip_x, flip_y, size=90, w=4):
    sx = -1 if flip_x else 1
    sy = -1 if flip_y else 1
    d.line([(x, y), (x + sx * size, y)], fill=GOLD, width=w)
    d.line([(x, y), (x, y + sy * size)], fill=GOLD, width=w)
    d.line([(x + sx * 18, y + sy * 18), (x + sx * size * 0.55, y + sy * 18)], fill=GOLD, width=2)
    d.line([(x + sx * 18, y + sy * 18), (x + sx * 18, y + sy * size * 0.55)], fill=GOLD, width=2)

bracket(m + 20, m + 20, False, False)
bracket(W - m - 20, m + 20, True, False)
bracket(m + 20, H - m - 20, False, True)
bracket(W - m - 20, H - m - 20, True, True)

save(img, "frame-ivory-classic.png")

print("All 3 dummy frames generated.")
