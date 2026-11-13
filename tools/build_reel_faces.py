"""Build clean, stationary-lit top-flange textures for the two photographed reels.

The photographed reels carry painted-in openings at fixed positions. When the
reels spin, those openings must rotate while the brushed-metal highlights stay
still (concentric lathe grain reflects the room the same way at every angle).

This script unprojects each flange from master.webp into a flat disc, measures
the metal's lighting as a function of angle and radius from the parts that are
genuinely metal, and rebuilds the whole flange from that model plus fine
concentric grain. The hub is kept from the original photograph.

Output: reels.webp (2048 x 1024, RGBA) - left reel face, right reel face.
Run:   python3 tools/build_reel_faces.py   (from the repository root)
"""
import numpy as np
from PIL import Image

N = 1024            # disc tile size; maps u,v in [-1, 1]
PHOTO = 'master.webp'
REELS = [  # cx, cy, rx, ry, slant  (960 x 540 plate coordinates, see geometry.js)
    (336.6, 82.5, 111.2, 50.4, -.013),
    (624.5, 85.2, 112.9, 51.2, .028),
]
HUB = [  # centre offset (u, v) and radius of the photographed hub in disc space
    (0.0, -0.07, 0.318),
    (0.0, -0.07, 0.318),
]

photo = np.asarray(Image.open(PHOTO).convert('RGB'), dtype=np.float32)
PH, PW = photo.shape[:2]
K = PW / 960.0
rng = np.random.default_rng(1956)


def bilinear(img, x, y):
    x = np.clip(x, 0, img.shape[1] - 1.001)
    y = np.clip(y, 0, img.shape[0] - 1.001)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    a, b = img[y0, x0], img[y0, x0 + 1]
    c, d = img[y0 + 1, x0], img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def smooth1d(v, sigma, circular):
    n = len(v)
    r = int(sigma * 4) + 1
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    mode = 'wrap' if circular else 'edge'
    pad = np.pad(v, [(r, r)] + [(0, 0)] * (v.ndim - 1), mode=mode)
    return np.stack([np.convolve(pad[:, c], k, 'valid') for c in range(v.shape[1])], 1) if v.ndim > 1 \
        else np.convolve(pad, k, 'valid')


def noise1d(n, scale, seed):
    g = np.random.default_rng(seed).standard_normal(n + 8)
    g = smooth1d(g, scale, False)[:n]
    return g / (g.std() + 1e-6)


tiles = []
for (cx, cy, rx, ry, sl), (hu, hv, hr) in zip(REELS, HUB):
    t = (np.arange(N) + .5) / N * 2 - 1
    U, V = np.meshgrid(t, t)
    X, Y = U * rx, V * ry
    px = cx + np.cos(sl) * X - np.sin(sl) * Y
    py = cy + np.sin(sl) * X + np.cos(sl) * Y
    src = bilinear(photo, px * K, py * K)
    R = np.hypot(U, V)
    TH = np.arctan2(V, U)

    # ---- polar statistics of genuine metal ---------------------------------
    NT, NR = 720, 256
    th = (np.arange(NT) + .5) / NT * 2 * np.pi - np.pi
    rr = (np.arange(NR) + .5) / NR
    TT, RR = np.meshgrid(th, rr, indexing='ij')
    pol = bilinear(src, (RR * np.cos(TT) + 1) * N / 2 - .5, (RR * np.sin(TT) + 1) * N / 2 - .5)
    lum = pol @ np.array([.3, .59, .11], np.float32)
    metal = (lum > 118) & (RR > .40) & (RR < .975)
    # Angular lighting A(theta): median luminance-normalised colour over metal radii.
    A = np.zeros((NT, 3), np.float32)
    for i in range(NT):
        m = metal[i]
        if m.sum() < 6:  # fall back to neighbours later
            A[i] = np.nan
        else:
            A[i] = np.median(pol[i][m], 0)
    bad = np.isnan(A[:, 0])
    if bad.any():
        idx = np.arange(NT)
        for c in range(3):
            A[bad, c] = np.interp(idx[bad], idx[~bad], A[~bad, c], period=NT)
    A = smooth1d(A, 2.2, True)
    # Radial profile B(r): how brightness changes towards rim and hub.
    ratio = pol / np.maximum(A[:, None, :], 1)
    B = np.ones((NR, 3), np.float32)
    for j in range(NR):
        m = metal[:, j]
        if m.sum() > 40:
            B[j] = np.median(ratio[m, j], 0)
    good = (rr > .40) & (rr < .975)
    for c in range(3):
        B[~good, c] = np.interp(rr[~good], rr[good], B[good, c])
    B = smooth1d(B, 3, False)

    # ---- rebuild the flange in Cartesian disc space -------------------------
    ti = ((TH + np.pi) / (2 * np.pi) * NT - .5) % NT
    i0 = np.floor(ti).astype(int) % NT
    f = (ti - np.floor(ti))[..., None]
    Acart = A[i0] * (1 - f) + A[(i0 + 1) % NT] * f
    rj = np.clip(R * NR - .5, 0, NR - 1.001)
    j0 = np.floor(rj).astype(int)
    g = (rj - j0)[..., None]
    Bcart = B[j0] * (1 - g) + B[np.minimum(j0 + 1, NR - 1)] * g
    face = Acart * Bcart

    # Fine concentric lathe grain + a whisper of non-uniform pressure marks.
    grain_r = noise1d(4096, 1.3, 11) * .030 + noise1d(4096, 9, 12) * .018
    gr = grain_r[np.clip((R * 4096 * .98).astype(int), 0, 4095)]
    pressure = .010 * np.sin(TH * 3 + 1.1) * np.sin(R * 31)
    fine = rng.standard_normal(R.shape).astype(np.float32) * .012
    face *= (1 + gr + pressure + fine)[..., None]

    # Studio tungsten makes the photo read warm; keep aluminium a touch cooler.
    grey = face.mean(-1, keepdims=True)
    face = grey + (face - grey) * .78

    # Rolled outer edge: a thin bright lip then a darker turn-down.
    lip = np.exp(-((R - .985) / .008) ** 2) * .16 - np.exp(-((R - .998) / .004) ** 2) * .20
    face *= (1 + lip)[..., None]

    # Photographic hub, feathered into the rebuilt flange.
    # The hub is a tall machined part: its cap and spindle rise above the base
    # ring in this view, so the mask is the hub's silhouette, not a circle.
    Rh = np.hypot(U - hu, V - hv)
    base = np.clip((hr + .012 - Rh) / .026, 0, 1)
    cap = np.clip((1 - np.hypot(U / .262, (V + .2) / .235)) / .06, 0, 1)
    spindle = np.clip((.05 - np.abs(U)) / .015, 0, 1) * np.clip((V + .455) / .025, 0, 1) * (V < 0)
    w = np.maximum(np.maximum(base, cap), spindle)
    # never borrow the dark edge of a photographed opening near the hub's rim
    dark = (src @ np.array([.3, .59, .11], np.float32) < 95) & (Rh > .3) & (cap < .01) & (spindle < .01)
    w = np.where(dark, 0, w)
    from scipy.ndimage import gaussian_filter
    w = np.minimum(w, gaussian_filter(w, 4) * 1.15)[..., None]   # soft, seamless edge
    face = face * (1 - w) + src * w

    alpha = np.clip((1.003 - R) * N / 2.2, 0, 1)
    rgba = np.dstack([np.clip(face, 0, 255), alpha * 255]).astype(np.uint8)
    tiles.append(rgba)

atlas = np.concatenate(tiles, 1)
Image.fromarray(atlas, 'RGBA').save('reels.webp', quality=88, method=6)
print('reels.webp', atlas.shape)
