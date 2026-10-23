# Builds the 3D portrait that the particle field assembles in "The maker".
#
#   python tools/portrait/make_portrait3d.py                    # uses tools/portrait/source.png
#   python tools/portrait/make_portrait3d.py path/to/photo.jpg
#
# Two small open models, run locally with ONNX Runtime, reconstruct the head and shoulders:
#   MODNet (Apache-2.0)                  portrait matting — cuts the person out, hair and all
#   Depth Anything V2 Small (Apache-2.0) monocular depth — the shape of the face and shoulders
# From the depth it works out surface normals and relights the bust like a sculpture (a key
# light, a fill and a rim), then closes the shape with an inflated back so it stays solid as it
# turns. Writes public/images/portrait-3d.png:
#   R = brightness (0 = not part of the bust), G = front depth, B = back depth
# A preview of each stage goes to tools/portrait/out/. The models (~125 MB) are downloaded once
# into tools/portrait/models/.
#
# Needs: pip install onnxruntime pillow numpy
import os
import sys
import urllib.request
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')  # Windows consoles default to cp1252

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
here = os.path.join(root, 'tools', 'portrait')
models = os.path.join(here, 'models')
outdir = os.path.join(here, 'out')
os.makedirs(models, exist_ok=True)
os.makedirs(outdir, exist_ok=True)

MODELS = {
    'modnet.onnx': 'https://huggingface.co/Xenova/modnet/resolve/main/onnx/model.onnx',
    'depth-anything-v2-small.onnx': 'https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx',
}

# Output: the bust from just above the head to the bottom of the frame, at this width.
OUT_W = 320
CROP_TOP = 0.15


def fetch(name):
    path = os.path.join(models, name)
    if not os.path.exists(path):
        print(f'  downloading {name} …')
        tmp = path + '.part'
        urllib.request.urlretrieve(MODELS[name], tmp)
        os.replace(tmp, path)
    return path


def session(name):
    import onnxruntime as ort

    return ort.InferenceSession(fetch(name), providers=['CPUExecutionProvider'])


def to_tensor(im, mean, std):
    a = np.asarray(im).astype(np.float32) / 255.0
    a = (a - np.array(mean, np.float32)) / np.array(std, np.float32)
    return a.transpose(2, 0, 1)[None]


def matte(img):
    """MODNet: shortest edge 512, both sides a multiple of 32, pixels in [-1, 1]."""
    s = 512 / min(img.size)
    w = max(32, round(img.width * s / 32) * 32)
    h = max(32, round(img.height * s / 32) * 32)
    x = to_tensor(img.resize((w, h), Image.BILINEAR), [0.5] * 3, [0.5] * 3)
    sess = session('modnet.onnx')
    a = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).resize(img.size, Image.BILINEAR)


def depth(img):
    """Depth Anything V2: sides a multiple of 14, ImageNet normalisation. Higher = nearer."""
    w = 588
    h = round(w * img.height / img.width / 14) * 14
    x = to_tensor(img.resize((w, h), Image.BICUBIC), [0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    sess = session('depth-anything-v2-small.onnx')
    d = sess.run(None, {sess.get_inputs()[0].name: x})[0][0]
    return Image.fromarray(d.astype(np.float32), mode='F').resize(img.size, Image.BICUBIC)


def blur(a, sigma):
    """Separable Gaussian blur on a float array (Pillow's only works on 8-bit images)."""
    r = max(1, int(sigma * 3))
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    a = np.pad(a.astype(np.float32), r, mode='edge')
    a = np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(v, k, mode='valid'), 1, a)


def chamfer(mask):
    """Distance from each inside pixel to the silhouette, in pixels (two-pass 3-4 chamfer)."""
    h, w = mask.shape
    big = 1e6
    d = np.where(mask, big, 0.0)
    for y in range(h):
        row = d[y]
        if y:
            up = d[y - 1]
            row[:] = np.minimum(row, up + 3)
            row[1:] = np.minimum(row[1:], up[:-1] + 4)
            row[:-1] = np.minimum(row[:-1], up[1:] + 4)
        for x in range(1, w):
            if row[x - 1] + 3 < row[x]:
                row[x] = row[x - 1] + 3
    for y in range(h - 1, -1, -1):
        row = d[y]
        if y < h - 1:
            dn = d[y + 1]
            row[:] = np.minimum(row, dn + 3)
            row[1:] = np.minimum(row[1:], dn[:-1] + 4)
            row[:-1] = np.minimum(row[:-1], dn[1:] + 4)
        for x in range(w - 2, -1, -1):
            if row[x + 1] + 3 < row[x]:
                row[x] = row[x + 1] + 3
    return d / 3.0


def norm_in(a, mask, lo=2, hi=99.5):
    v = a[mask]
    p0, p1 = np.percentile(v, lo), np.percentile(v, hi)
    return np.clip((a - p0) / max(p1 - p0, 1e-6), 0, 1)


def preview(a, name):
    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(os.path.join(outdir, name))


def main():
    src = next((a for a in sys.argv[1:] if not a.startswith('--')), os.path.join(here, 'source.png'))
    img = Image.open(src).convert('RGB')
    print(f'Reconstructing {os.path.relpath(src, root)} ({img.width}×{img.height})')

    print('  matting …')
    alpha_full = matte(img)
    print('  depth …')
    depth_full = depth(img)

    # crop to the bust and drop to the working size
    top = int(img.height * CROP_TOP)
    box = (0, top, img.width, img.height)
    W = OUT_W
    H = round(W * (img.height - top) / img.width)
    photo = img.crop(box).resize((W, H), Image.LANCZOS)
    alpha = np.asarray(alpha_full.crop(box).resize((W, H), Image.BILINEAR)).astype(np.float32) / 255
    disp = np.asarray(depth_full.crop(box).resize((W, H), Image.BILINEAR)).astype(np.float32)

    inside = alpha > 0.4
    # keep only the largest piece (drops stray specks the matte lets through)
    inside &= blur(inside.astype(np.float32), 2) > 0.3

    # front surface: relative depth inside the silhouette, smoothed so normals aren't noisy
    front = norm_in(blur(disp, 1.2), inside)
    front = np.where(inside, front, 0)
    front_s = blur(front, 1.5)

    # surface normals, with x right, y up and z towards the viewer
    z = front_s * W * 0.32
    gy, gx = np.gradient(z)
    n = np.dstack([-gx, gy, np.ones_like(z)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)

    def light(v):
        v = np.array(v, np.float32)
        v /= np.linalg.norm(v)
        return np.clip((n * v).sum(axis=2), 0, 1)

    key = light([-0.5, 0.55, 0.68])
    fill = light([0.75, 0.05, 0.65])
    rim = np.power(1 - np.clip(n[..., 2], 0, 1), 2.2)

    # albedo: the photo's own tones, compressed so dark skin, hair and the jacket still catch
    # light, plus its fine detail (eyes, brows, beard, collar) so it's recognisably him
    L = np.asarray(photo.convert('L')).astype(np.float32) / 255
    # tones compressed at the top so the white shirt doesn't outshine the face
    tone = np.power(norm_in(blur(L, 2.5), inside), 0.7)
    detail = L - blur(L, 6)
    albedo = np.clip(0.58 + 0.42 * tone + 2.4 * detail, 0, 1.2)

    shade = albedo * (0.12 + 0.72 * key + 0.22 * fill) + 0.55 * rim * (0.6 + 0.4 * key)
    # the bust fades out towards the bottom of the frame, like a sculpted one
    rows = np.linspace(0, 1, H)[:, None]
    fade = np.clip((1 - rows) / 0.3, 0, 1) ** 1.5
    shade = np.clip(shade * fade * np.clip((alpha - 0.4) / 0.35, 0, 1), 0, 1)

    # back surface: the silhouette inflated, so the bust has volume when it turns
    dist = chamfer(inside)
    back = np.sqrt(dist / max(dist.max(), 1)) * inside

    out = np.zeros((H, W, 3), np.uint8)
    on = inside & (shade > 0.004)
    out[..., 0] = np.where(on, 1 + np.round(shade * 254), 0)
    out[..., 1] = np.where(on, np.round(front * 255), 0)
    out[..., 2] = np.where(on, np.round(back * 255), 0)
    dest = os.path.join(root, 'public', 'images', 'portrait-3d.png')
    Image.fromarray(out).save(dest, optimize=True)

    preview(alpha, '3d-1-matte.png')
    preview(front, '3d-2-depth.png')
    preview(key, '3d-3-light.png')
    preview(shade, '3d-4-shade.png')
    print(f'✓ {os.path.relpath(dest, root)} ({W}×{H}, {os.path.getsize(dest) // 1024} KB) — previews in tools/portrait/out/')


if __name__ == '__main__':
    main()
