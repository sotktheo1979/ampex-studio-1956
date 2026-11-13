"""Recolour the tape in the master photograph as real 2-inch quadruplex videotape.

The generated photograph showed the tape as bright, translucent amber, like
film stock. Real quad tape (e.g. Scotch 400) is an opaque ribbon: dark
chocolate-brown oxide with a soft satin sheen. Only tape pixels change:

* along the threaded path, tape is found by comparing with empty.webp (the same
  studio with no reels or tape) and keeping the warm, saturated difference;
* on the reels, the wound pack is the warm band between the two flanges.

Usage: python3 tools/recolour_tape.py SOURCE OUT
SOURCE is the original amber plate, kept in git history (master.webp before
this script was introduced); OUT is normally master.webp.
"""
import sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, binary_dilation

src_path, out_path = sys.argv[1], sys.argv[2]
img = Image.open(src_path).convert('RGB')
W, H = img.size
K = W / 960.0
a = np.asarray(img, dtype=np.float32) / 255
e = np.asarray(Image.open('empty.webp').convert('RGB').resize((W, H)), dtype=np.float32) / 255

mx, mn = a.max(2), a.min(2)
sat = (mx - mn) / (mx + 1e-4)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
hue = np.zeros_like(mx)
m = (mx == r) & (mx > mn)
hue[m] = ((g - b)[m] / (mx - mn)[m]) % 6 * 60
warm = np.clip((sat - .28) / .2, 0, 1) * ((hue > 8) & (hue < 48))

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) / K

# ---- 1. threaded path: tape is what differs from the empty deck ------------------
path_zone = (yy > 168) & (yy < 214) & (xx > 232) & (xx < 742) & ~((xx > 443) & (xx < 538))  # tape runs behind the head block
tails = ((xx > 238) & (xx < 270) & (yy > 132) & (yy < 175)) | ((xx > 698) & (xx < 730) & (yy > 132) & (yy < 168))
diff = np.abs(a - e).sum(2)
on_path = (path_zone | tails) & (diff > .16)
on_path = binary_dilation(on_path, iterations=int(2 * K)) & (path_zone | tails)

# ---- 2. wound packs: the band between the upper and lower flange ------------------
REELS = [(336.6, 82.5, 111.2, 50.4, -.013, 11), (624.5, 85.2, 112.9, 51.2, .028, 19)]
pack = np.zeros((H, W), bool)
for cx, cy, rx, ry, sl, d in REELS:
    c, s = np.cos(sl), np.sin(sl)
    def inside(h, scale=1.0):
        X, Y = xx - cx, yy - (cy + h)
        u, v = (c * X + s * Y) / (rx * scale), (-s * X + c * Y) / (ry * scale)
        return u * u + v * v <= 1
    band = np.zeros((H, W), bool)
    for h in np.linspace(0, d + 6, 30):   # pack wall plus its reflection in the lower flange
        band |= inside(h, 1.002)
    pack |= band & ~inside(0, 0.985)

mask = (on_path | pack).astype(np.float32) * warm
mask = gaussian_filter(mask, .8 * K)

# ---- recolour: opaque satin oxide ------------------------------------------------
L = (.3 * r + .59 * g + .11 * b)
t = np.clip((L - .12) / .8, 0, 1) ** 1.15
dark = np.array([.115, .068, .041])      # deep shadow on the oxide
mid = np.array([.33, .215, .145])        # oxide under the studio light
sheen = np.array([.70, .60, .50])        # satin highlight, never mirror-bright
tape = dark + (mid - dark) * t[..., None]
hi = np.clip((t - .72) / .28, 0, 1)[..., None] ** 1.6
tape = tape + (sheen - tape) * hi * .55
out = a * (1 - mask[..., None]) + tape * mask[..., None]
Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8)).save(out_path, quality=90, method=6)
print('recoloured', round(float((mask > .5).mean()) * 100, 2), '% of the plate ->', out_path)
