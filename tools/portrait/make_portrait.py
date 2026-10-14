# Turns a photo into the site portrait (no AI — just photo processing).
#
#   python tools/portrait/make_portrait.py path/to/photo.jpg                     # riso treatment (plain background needed)
#   python tools/portrait/make_portrait.py path/to/photo.jpg --keep-background   # keep the photo, warm film grade
#
# Writes public/images/portrait.jpg (site) and a tight 4:5 headshot at tools/resume/photo.jpg (résumé + biodata).
# Needs: pip install pillow numpy
import sys
import os
import shutil
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance

args = [a for a in sys.argv[1:] if not a.startswith('--')]
flags = {a for a in sys.argv[1:] if a.startswith('--')}
src = args[0]
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
outdir = os.path.join(root, 'tools', 'portrait', 'out')
os.makedirs(outdir, exist_ok=True)
img = Image.open(src).convert('RGB')


def film_grade(im):
    """Warm, slightly faded print look with fine grain — sits on the site's paper palette."""
    a = np.asarray(im).astype(np.float32)
    a = a * np.array([1.03, 1.0, 0.95], np.float32)[None, None]  # warm
    a = a * 0.93 + 255 * 0.035  # lift blacks, soften highlights
    rng = np.random.default_rng(5)
    a = a + rng.normal(0, 3.2, a.shape[:2])[..., None]  # grain
    out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return ImageEnhance.Contrast(out).enhance(1.04)


def face_box(im):
    """Rough head location: the largest skin-toned blob in the upper two-thirds."""
    small = im.resize((im.width // 8, im.height // 8))
    a = np.asarray(small).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    skin = (r > 60) & (r > g + 8) & (g > b - 10) & (r - b > 15) & (r < 250)
    skin[int(skin.shape[0] * 0.7):] = False
    ys, xs = np.nonzero(skin)
    if len(xs) < 20:
        return im.width / 2, im.height * 0.38
    # trim outliers
    x0, x1 = np.percentile(xs, [10, 90])
    y0, y1 = np.percentile(ys, [10, 90])
    return (x0 + x1) / 2 * 8, (y0 + y1) / 2 * 8


if '--keep-background' in flags:
    W, H = img.size
    cx, cy = face_box(img)
    # site: 4:5, as wide as possible, face in the upper-middle
    cw = min(int(W * 0.8), int(H * 4 / 5))
    chh = int(cw * 5 / 4)
    left = int(min(max(cx - cw / 2, 0), W - cw))
    top = int(min(max(cy - chh * 0.33, 0), H - chh))
    site = film_grade(img.crop((left, top, left + cw, top + chh)).resize((960, 1200), Image.LANCZOS))
    # résumé: tight head & shoulders, 4:5
    hw = int(W * 0.62)
    hh = int(hw * 5 / 4)
    hl = int(min(max(cx - hw / 2, 0), W - hw))
    ht = int(min(max(cy - hh * 0.4, 0), H - hh))
    head = img.crop((hl, ht, hl + hw, ht + hh)).resize((720, 900), Image.LANCZOS)
    site.save(f'{outdir}/portrait.jpg', quality=86, optimize=True, progressive=True)
    head.save(f'{outdir}/portrait-headshot.jpg', quality=88, optimize=True, progressive=True)
    shutil.copyfile(f'{outdir}/portrait.jpg', os.path.join(root, 'public', 'images', 'portrait.jpg'))
    shutil.copyfile(f'{outdir}/portrait-headshot.jpg', os.path.join(root, 'tools', 'resume', 'photo.jpg'))
    print('Portrait updated (kept background): public/images/portrait.jpg (site), tools/resume/photo.jpg (resume + biodata headshot)')
    sys.exit(0)

W, H = img.size
ch = int(W * 5 / 4)
img = img.crop((0, 10, W, 10 + ch)).resize((960, 1200), Image.LANCZOS)
w, h = img.size
SHOULDER = 760  # above this, the left/right edges are background

# ---------- background model: per-channel quadratic surface fitted to border samples ----------
soft = np.asarray(img.filter(ImageFilter.MedianFilter(5))).astype(np.float32)
yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
sample = np.zeros((h, w), bool)
sample[:28, :] = True
sample[:SHOULDER, :28] = True
sample[:SHOULDER, -28:] = True
X = np.stack([np.ones_like(xx), xx / w, yy / h, (xx / w) ** 2, (yy / h) ** 2, xx * yy / (w * h)], -1)
A = X[sample]
model = np.zeros_like(soft)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, soft[..., c][sample], rcond=None)
    model[..., c] = X @ coef
diff = np.abs(soft - model).max(-1)
cand = Image.fromarray(((diff < 15) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))

# background = candidate pixels connected to the frame edges above the shoulders
cm = cand.convert('RGB')
for s in [(x, 3) for x in range(5, w, 20)] + [(3, y) for y in range(5, SHOULDER, 20)] + [(w - 4, y) for y in range(5, SHOULDER, 20)]:
    if cm.getpixel(s) == (255, 255, 255):
        ImageDraw.floodfill(cm, s, (0, 0, 255), thresh=0)
c = np.asarray(cm)
bg = (c[..., 2] == 255) & (c[..., 0] == 0)
subj = Image.fromarray(((~bg) * 255).astype(np.uint8))

# keep the part connected to the face, drop specks, fill holes
mk = subj.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7)).convert('RGB')
ImageDraw.floodfill(mk, (480, 520), (255, 0, 0), thresh=0)
k = np.asarray(mk)
main = Image.fromarray((((k[..., 0] == 255) & (k[..., 1] == 0)) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(13))
keep = (np.asarray(subj) > 128) & (np.asarray(main) > 128)
hm = Image.fromarray((keep * 255).astype(np.uint8)).convert('RGB')
ImageDraw.floodfill(hm, (2, 2), (0, 0, 255), thresh=0)
hk = np.asarray(hm)
mask = Image.fromarray(((~((hk[..., 2] == 255) & (hk[..., 0] == 0))) * 255).astype(np.uint8))
mask = mask.filter(ImageFilter.MinFilter(5))
mask_soft = mask.filter(ImageFilter.GaussianBlur(1.2))
mask_soft.save(f'{outdir}/mask.png')

def hexrgb(hx):
    hx = hx.lstrip('#')
    return np.array([int(hx[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)
INK, BONE, VERM, OCHRE, BLUSH = map(hexrgb, ['#17140F', '#EFE9DD', '#E8461E', '#E6A93A', '#EDB9A8'])
rng = np.random.default_rng(3)
m = np.asarray(mask_soft).astype(np.float32)[..., None] / 255

# ---------- red-filter monochrome mapped to ink → paper ----------
a = np.asarray(img).astype(np.float32) / 255
lum = 0.62 * a[..., 0] + 0.30 * a[..., 1] + 0.08 * a[..., 2]
lo, hi = np.percentile(lum[np.asarray(mask) > 128], [1.5, 99.2])
t = np.clip((lum - lo) / (hi - lo), 0, 1) ** 0.82
t = np.clip(t + rng.normal(0, 0.028, t.shape), 0, 1)
subject = INK[None, None] * (1 - t[..., None]) + BONE[None, None] * t[..., None]

def backdrop(color, circle, ccol):
    out = np.ones((h, w, 3), np.float32) * color[None, None]
    cx, cy, r = circle
    out[((xx - cx) ** 2 + (yy - cy) ** 2) < r * r] = ccol
    return out + rng.normal(0, 4, (h, w, 1))

# misregistered vermilion "second drum" silhouette, offset down-left, no wrap-around
shift = np.zeros_like(m)
shift[14:, :-16] = m[:-14, 16:]

def compose(bgcol, circle, ccol, shadowcol=VERM):
    bgc = backdrop(bgcol, circle, ccol)
    with_shadow = bgc * (1 - shift) + (bgc * shadowcol[None, None] / 255) * shift
    return with_shadow * (1 - m) + subject * m

def save(arr, name, q=88):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(f'{outdir}/{name}', quality=q, optimize=True, progressive=True)

save(compose(OCHRE, (480, 470, 330), BONE), 'portrait.jpg')
save(compose(BONE, (480, 500, 360), BLUSH), 'portrait-bone.jpg')

# natural colour, cut out onto a soft paper backdrop — for the biodata
paper = np.ones((h, w, 3), np.float32) * np.array([244, 241, 235], np.float32)[None, None]
natural = np.asarray(ImageEnhance.Contrast(img).enhance(1.04)).astype(np.float32)
save(paper * (1 - m) + natural * m, 'portrait-photo.jpg', 90)
import shutil
shutil.copyfile(f'{outdir}/portrait.jpg', os.path.join(root, 'public', 'images', 'portrait.jpg'))
shutil.copyfile(f'{outdir}/portrait-photo.jpg', os.path.join(root, 'tools', 'resume', 'photo.jpg'))
print('Portrait updated: public/images/portrait.jpg, tools/resume/photo.jpg (alternates + cut-out mask in tools/portrait/out/)')
