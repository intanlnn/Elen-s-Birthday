from PIL import Image, ImageDraw
import os, random

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "images")
os.makedirs(OUT, exist_ok=True)

palettes = [
    [(253,251,248),(248,232,238)],
    [(239,230,221),(248,232,238)],
    [(248,232,238),(200,169,126)],
    [(253,251,248),(239,230,221)],
    [(248,232,238),(253,251,248)],
    [(239,230,221),(200,169,126)],
]

def gradient(w,h,c1,c2):
    img = Image.new("RGB",(w,h),c1)
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y/h
        r = int(c1[0]*(1-t)+c2[0]*t)
        g = int(c1[1]*(1-t)+c2[1]*t)
        b = int(c1[2]*(1-t)+c2[2]*t)
        d.line([(0,y),(w,y)], fill=(r,g,b))
    return img

def blob(d,cx,cy,r,color):
    d.ellipse([cx-r,cy-r,cx+r,cy+r], fill=color)

random.seed(7)
for i,(c1,c2) in enumerate(palettes, start=1):
    w,h = 800,1000
    img = gradient(w,h,c1,c2)
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(5):
        cx = random.randint(0,w)
        cy = random.randint(0,h)
        r = random.randint(80,220)
        blob(d, cx, cy, r, (255,255,255,40))
    img.save(os.path.join(OUT, f"memory-{i}.jpg"), quality=88)
    print("saved memory-%d.jpg" % i)
