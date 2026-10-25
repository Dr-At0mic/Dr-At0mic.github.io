// The shapes the particle field can take.
//
// Every formation is the same number of points — position, size, brightness, accent, flow and
// spin — built once on the CPU and uploaded as one layer of a texture array. The GPU morphs
// between any two layers, so a "shape" here is just a list of where each atom should be.
//
// Nothing is a downloaded model: the atom is sampled from real hydrogen-like orbitals, the map
// from real city coordinates, the commit cylinder from the numbers in data.json.

const TAU = Math.PI * 2;

// mulberry32 — small, fast and seeded, so every formation looks the same on every visit
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashString = (s) => {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

/* ---------- 3×3 rotations (row-major), shared with the engine and the marker projection ---------- */
export function euler([x = 0, y = 0, z = 0] = []) {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(x), Math.sin(x), Math.cos(y), Math.sin(y), Math.cos(z), Math.sin(z)];
  // R = Rz · Ry · Rx
  return [
    cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
    sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
    -sy, cy * sx, cy * cx,
  ];
}
export const applyM = (m, [x, y, z]) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
export const transposeM = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

/* ---------- the point list ---------- */
class Cloud {
  constructor(n, seed) {
    this.n = n;
    this.i = 0;
    this.pos = new Float32Array(n * 4);
    this.aux = new Float32Array(n * 4);
    this.r = rng(seed);
    this.markers = [];
    this.spare = null;
  }

  get left() {
    return this.n - this.i;
  }

  // x, y, z, size, brightness, accent (0–1), flow (0–1 along a path, −1 for none), spin (rad/s about local Y)
  add(x, y, z, s = 1, b = 1, a = 0, f = -1, w = 0) {
    if (this.i >= this.n) return false;
    const k = this.i++ * 4;
    this.pos[k] = x;
    this.pos[k + 1] = y;
    this.pos[k + 2] = z;
    this.pos[k + 3] = s;
    this.aux[k] = b;
    this.aux[k + 1] = a;
    this.aux[k + 2] = f;
    this.aux[k + 3] = w;
    return true;
  }

  gauss() {
    if (this.spare !== null) {
      const g = this.spare;
      this.spare = null;
      return g;
    }
    let u = 0;
    while (u === 0) u = this.r();
    const v = this.r();
    const m = Math.sqrt(-2 * Math.log(u));
    this.spare = m * Math.sin(TAU * v);
    return m * Math.cos(TAU * v);
  }

  // a uniformly random unit vector
  dir() {
    const z = this.r() * 2 - 1;
    const a = this.r() * TAU;
    const s = Math.sqrt(1 - z * z);
    return [s * Math.cos(a), s * Math.sin(a), z];
  }

  // a label the DOM draws next to a point of the formation (local space, before tilt);
  // `prefer: 'left'` points it leftwards when there's room
  mark(p, text, spin = 0, prefer = 'right') {
    this.markers.push({ p, text, spin, prefer });
  }

  // the rest of the budget becomes faint dust, then the order is shuffled so that any
  // particle can travel to any other formation — that's what makes the morph swirl
  done({ dust = 3.4, dim = 1 } = {}) {
    const r = this.r;
    while (this.left) {
      const d = this.dir();
      const rad = dust * (0.35 + 0.65 * Math.cbrt(r()));
      const far = r() < 0.04;
      this.add(d[0] * rad * 1.5, d[1] * rad * 0.9, d[2] * rad, far ? 1.6 : 0.7, (far ? 0.22 : 0.07 + r() * 0.08) * dim, 0, -1, 0.015);
    }
    const { pos, aux } = this;
    for (let i = this.n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      for (let c = 0; c < 4; c++) {
        const a = i * 4 + c;
        const b = j * 4 + c;
        [pos[a], pos[b]] = [pos[b], pos[a]];
        [aux[a], aux[b]] = [aux[b], aux[a]];
      }
    }
    return { pos, aux, markers: this.markers };
  }
}

/* ---------- drawing primitives ---------- */
const O = { s: 1, b: 1, a: 0, w: 0 };

function ball(c, [x, y, z], r, count, o = O) {
  const { s = 1, b = 1, a = 0, w = 0 } = o;
  for (let i = 0; i < count; i++) c.add(x + c.gauss() * r, y + c.gauss() * r, z + c.gauss() * r, s, b * (0.75 + c.r() * 0.5), a, -1, w);
}

// points along a segment; `flow` makes pulses run from a to b, `lift` bows it towards +z
function segment(c, p, q, count, o = O, { jit = 0.003, flow = false, offset = 0, lift = 0 } = {}) {
  const { s = 1, b = 1, a = 0, w = 0 } = o;
  for (let i = 0; i < count; i++) {
    const t = c.r();
    const bow = Math.sin(Math.PI * t) * lift;
    c.add(
      p[0] + (q[0] - p[0]) * t + c.gauss() * jit,
      p[1] + (q[1] - p[1]) * t + c.gauss() * jit,
      p[2] + (q[2] - p[2]) * t + c.gauss() * jit + bow,
      s,
      b,
      a,
      flow ? (t + offset) % 1 : -1,
      w
    );
  }
}

// distributes `count` points along a polyline by length
function polyline(c, pts, count, o = O, { closed = false, jit = 0.003, flow = false } = {}) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    segs.push([p, q, total, len]);
    total += len;
  }
  const { s = 1, b = 1, a = 0, w = 0 } = o;
  for (let i = 0; i < count; i++) {
    const d = c.r() * total;
    let k = 0;
    while (k < segs.length - 1 && segs[k][2] + segs[k][3] < d) k++;
    const [p, q, start, len] = segs[k];
    const t = len ? (d - start) / len : 0;
    c.add(
      p[0] + (q[0] - p[0]) * t + c.gauss() * jit,
      p[1] + (q[1] - p[1]) * t + c.gauss() * jit,
      p[2] + (q[2] - p[2]) * t + c.gauss() * jit,
      s,
      b,
      a,
      flow ? d / total : -1,
      w
    );
  }
}

// a circle in one of the axis planes
function circle(c, [x, y, z], r, count, o = O, { plane = 'xz', jit = 0.003, flow = false, arc = [0, TAU] } = {}) {
  const { s = 1, b = 1, a = 0, w = 0 } = o;
  for (let i = 0; i < count; i++) {
    const u = c.r();
    const t = arc[0] + (arc[1] - arc[0]) * u;
    const [m, n] = [Math.cos(t) * r, Math.sin(t) * r];
    const [jx, jy, jz] = [c.gauss() * jit, c.gauss() * jit, c.gauss() * jit];
    const p = plane === 'xz' ? [x + m, y, z + n] : plane === 'xy' ? [x + m, y + n, z] : [x, y + m, z + n];
    c.add(p[0] + jx, p[1] + jy, p[2] + jz, s, b, a, flow ? u : -1, w);
  }
}

const roundedRect = (w, h, r, steps = 6) => {
  const pts = [];
  const corners = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= steps; i++) {
    const a = a0 + (i / steps) * (Math.PI / 2);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
};

// a flat shape's outline placed in 3D: `to3` maps local 2D (u, v) into the formation
const outline = (c, pts2, to3, count, o, opts) => polyline(c, pts2.map(([u, v]) => to3(u, v)), count, o, { closed: true, ...opts });

// points scattered over a rectangle (for faint "surfaces")
function sheet(c, w, h, to3, count, o = O) {
  const { s = 1, b = 1, a = 0, w: spin = 0 } = o;
  for (let i = 0; i < count; i++) {
    const p = to3((c.r() - 0.5) * w, (c.r() - 0.5) * h);
    c.add(p[0], p[1], p[2], s, b * (0.6 + c.r() * 0.8), a, -1, spin);
  }
}

// a line of "printed text": little clusters of dots, one per character
function textLine(c, to3, x0, x1, y, count, o = O, { h = 0.022, ch = 0.021, gap = 0.3 } = {}) {
  const { s = 0.8, b = 1, a = 0, w = 0 } = o;
  const chars = [];
  for (let x = x0; x < x1; x += ch) if (c.r() > gap * 0.35) chars.push(x);
  if (!chars.length) return;
  for (let i = 0; i < count; i++) {
    const x = chars[Math.floor(c.r() * chars.length)] + c.r() * ch * 0.72;
    const p = to3(x, y + (c.r() - 0.5) * h);
    c.add(p[0], p[1], p[2], s, b, a, -1, w);
  }
}

// digits the way a till or an odometer shows them: seven segments each, slightly slanted.
// `to3` maps local 2D into the formation; (x, y) is the first digit's bottom-left.
const SEVEN = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const SEGMENT_ENDS = { a: [[0, 1], [1, 1]], b: [[1, 1], [1, 0.5]], c: [[1, 0.5], [1, 0]], d: [[0, 0], [1, 0]], e: [[0, 0.5], [0, 0]], f: [[0, 1], [0, 0.5]], g: [[0, 0.5], [1, 0.5]] };
function sevenSeg(c, text, to3, x, y, { w = 0.06, h = 0.1, step = w * 1.5 } = {}, count = 0, o = O) {
  const segs = [...String(text)].flatMap((ch, i) => [...(SEVEN[ch] || '')].map((s) => [i, s]));
  const per = count / Math.max(1, segs.length);
  for (const [i, s] of segs) {
    const at = ([u, v]) => to3(x + i * step + u * w + v * h * 0.12, y + v * h);
    segment(c, at(SEGMENT_ENDS[s][0]), at(SEGMENT_ENDS[s][1]), per, o, { jit: 0.0015 });
  }
}

function boxEdges(c, [x, y, z], [w, h, d], count, o = O, rot = null) {
  const v = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) v.push([(sx * w) / 2, (sy * h) / 2, (sz * d) / 2]);
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const tr = (p) => {
    const q = rot ? applyM(rot, p) : p;
    return [q[0] + x, q[1] + y, q[2] + z];
  };
  const per = Math.floor(count / edges.length);
  for (const [i, j] of edges) segment(c, tr(v[i]), tr(v[j]), per, o, { jit: 0.0025 });
}

// a cylinder drawn the way a database icon is: rings at the top, bottom and two bands, faint sides
function dbCylinder(c, [x, y, z], r, h, count, o = O) {
  const rings = [h / 2, h / 6, -h / 6, -h / 2];
  const ringShare = 0.62;
  rings.forEach((yy, i) =>
    circle(c, [x, y + yy, z], r, Math.floor((count * ringShare) / rings.length), { ...o, b: (o.b ?? 1) * (i === 0 ? 1.15 : 0.85) }, { jit: 0.0025 })
  );
  const { s = 1, b = 1, a = 0, w = 0 } = o;
  const side = Math.floor(count * (1 - ringShare));
  for (let i = 0; i < side; i++) {
    const t = c.r() * TAU;
    const top = i < side * 0.3;
    const rr = top ? r * Math.sqrt(c.r()) : r;
    const yy = top ? h / 2 : (c.r() - 0.5) * h;
    c.add(x + Math.cos(t) * rr, y + yy, z + Math.sin(t) * rr, s * 0.8, b * 0.22, a, -1, w);
  }
}

/* =========================================================
   The formations
   ========================================================= */

// everything at one point — the frame before the big bang
function singularity(c) {
  while (c.left) {
    const d = c.dir();
    const r = Math.pow(c.r(), 3) * 0.05;
    c.add(d[0] * r, d[1] * r, d[2] * r, 0.6, 1, c.r() < 0.12 ? 1 : 0);
  }
  return c.done();
}

/* ---------- arsenic: Z = 33, [Ar] 3d¹⁰ 4s² 4p³ ---------- */

// generalised Laguerre polynomial L_k^α(x)
function laguerre(k, alpha, x) {
  if (k === 0) return 1;
  let l0 = 1;
  let l1 = 1 + alpha - x;
  for (let i = 1; i < k; i++) [l0, l1] = [l1, ((2 * i + 1 + alpha - x) * l1 - (i + alpha) * l0) / (i + 1)];
  return l1;
}

// hydrogen-like radial wavefunction (unnormalised), r in Bohr radii
const radial = (n, l, r) => {
  const rho = (2 * r) / n;
  return Math.pow(rho, l) * Math.exp(-rho / 2) * laguerre(n - l - 1, 2 * l + 1, rho);
};

// inverse-CDF table for the radial probability r²R², and the radius holding 95% of it
function radialSampler(n, l) {
  const bins = 4096;
  const rMax = 3.4 * n * n + 10;
  const cdf = new Float64Array(bins + 1);
  for (let i = 1; i <= bins; i++) {
    const r = (i / bins) * rMax;
    const R = radial(n, l, r);
    cdf[i] = cdf[i - 1] + r * r * R * R;
  }
  const total = cdf[bins];
  const at = (u) => {
    const target = u * total;
    let lo = 0;
    let hi = bins;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < target) lo = mid;
      else hi = mid;
    }
    return (hi / bins) * rMax;
  };
  return { sample: (r) => at(r), r95: at(0.95) };
}

// real spherical harmonics on a unit vector, scaled so |Y| ≤ 1
const ANGULAR = {
  0: [() => 1],
  1: [(x) => x, (x, y) => y, (x, y, z) => z],
  2: [(x, y) => 2 * x * y, (x, y, z) => 2 * y * z, (x, y, z) => (3 * z * z - 1) / 2, (x, y, z) => 2 * x * z, (x, y) => x * x - y * y],
};

function atom(c, { size = 1 } = {}) {
  const N = c.n;
  const spin = 0.07;

  // the nucleus: 33 protons and 42 neutrons, packed
  const nucleons = [];
  while (nucleons.length < 75) {
    const d = c.dir();
    const r = Math.cbrt(c.r()) * 0.085 * size;
    const p = [d[0] * r, d[1] * r, d[2] * r];
    if (nucleons.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 0.024 * size)) nucleons.push(p);
  }
  const per = Math.max(2, Math.floor((N * 0.02) / 75));
  nucleons.forEach((p, i) => ball(c, p, 0.0075 * size, per, { s: 0.7, b: 1.1, a: i < 33 ? 1 : 0, w: spin }));

  // The s shells are spherical, so they stay as faint clouds: n, display radius, share, brightness.
  for (const [n, rDisplay, share, bright] of [[1, 0.1, 0.015, 0.5], [2, 0.26, 0.01, 0.3], [3, 0.55, 0.012, 0.26], [4, 1.1, 0.02, 0.2]]) {
    const { sample, r95 } = radialSampler(n, 0);
    const k = (rDisplay * size) / r95;
    for (let i = 0; i < N * share; i++) {
      const d = c.dir();
      const r = sample(c.r()) * k;
      c.add(d[0] * r, d[1] * r, d[2] * r, 0.7, bright * (0.7 + c.r() * 0.6), 0, -1, spin);
    }
  }

  // The p and d orbitals are drawn the way physicists picture them: as the surface where
  // |ψ|² = R(r)²·Y² reaches one level. (A full subshell's density sums to a perfect sphere —
  // Unsöld's theorem — so a plain cloud of all of them is just a fuzzy ball.)
  // n, l, display radius of the lobe tips, share, brightness
  const lobes = [
    [2, 1, 0.28, 0.035, 0.5],
    [3, 1, 0.52, 0.06, 0.55],
    [3, 2, 0.82, 0.26, 0.62],
    [4, 1, 1.6, 0.42, 0.95],
  ];
  for (const [n, l, rDisplay, share, bright] of lobes) {
    const bins = 2048;
    const rMax = 3.4 * n * n + 10;
    const R = new Float64Array(bins + 1);
    for (let i = 0; i <= bins; i++) R[i] = radial(n, l, (i / bins) * rMax);
    // the outermost peak of R², and a level 42% of the way up it — high enough that each lobe
    // is a slim teardrop rather than a hemisphere
    let peak = 1;
    for (let i = 1; i < bins; i++) if (R[i] * R[i] >= R[i - 1] * R[i - 1] && R[i] * R[i] >= R[i + 1] * R[i + 1] && R[i] * R[i] > 1e-14) peak = i;
    const iso = R[peak] * R[peak] * 0.42;
    // where, beyond the peak, R² falls to iso / y² — the surface in that direction
    const surface = (y2) => {
      const want = iso / y2;
      let lo = peak;
      let hi = bins;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (R[mid] * R[mid] > want) lo = mid;
        else hi = mid;
      }
      return (lo / bins) * rMax;
    };
    const tip = surface(1);
    const k = (rDisplay * size) / tip;
    const sign = Math.sign(R[peak]) || 1;
    const orbitals = ANGULAR[l];
    const valence = n === 4;
    const count = Math.floor(N * share);
    let made = 0;
    let guard = 0;
    while (made < count && guard++ < count * 40) {
      const Y = orbitals[made % orbitals.length];
      const d = c.dir();
      const y = Y(d[0], d[1], d[2]);
      if (y * y * R[peak] * R[peak] < iso) continue;
      const r = surface(y * y);
      // even out the surface density, which is otherwise thinnest at the tips
      if (c.r() > Math.pow(r / tip, 1.4)) continue;
      const inside = c.r() < 0.18;
      const rr = (inside ? r * Math.cbrt(c.r()) : r) * k;
      const negative = y * sign < 0;
      c.add(d[0] * rr, d[1] * rr, d[2] * rr, valence ? 0.95 : 0.75, bright * (inside ? 0.3 : 0.75 + c.r() * 0.5), valence && negative ? 1 : 0, -1, spin);
      made++;
    }
  }

  // Seen down the (1,1,1) diagonal, the six 4p lobes fall 60° apart with their phases
  // alternating — a flower, gold and bone. So that diagonal becomes the atom's own spin axis,
  // and the registry's tilt turns it to face the camera.
  const M = rotateTo([1, 1, 1], [0, 1, 0]);
  for (let i = 0; i < c.i; i++) {
    const k = i * 4;
    const [x, y, z] = applyM(M, [c.pos[k], c.pos[k + 1], c.pos[k + 2]]);
    c.pos[k] = x;
    c.pos[k + 1] = y;
    c.pos[k + 2] = z;
  }
  c.mark([0, 0, 0], '33 protons · 42 neutrons', spin);
  c.mark(applyM(M, [1.12 * size, 0, 0]), '4p³ — the three valence electrons', spin);
  return c.done({ dust: 3.6 });
}

// the rotation taking direction a onto direction b (Rodrigues)
function rotateTo(a, b) {
  const u = norm(a);
  const v = norm(b);
  const k = cross(u, v);
  const s = Math.hypot(...k);
  const cth = u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  if (s < 1e-9) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [x, y, z] = k.map((e) => e / s);
  const C = 1 - cth;
  return [
    cth + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, cth + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, cth + z * z * C,
  ];
}

/* ---------- the maker: a 3D bust reconstructed from the photo ---------- */
// `img` is { data, width, height } read from public/images/portrait-3d.png, which
// tools/portrait/make_portrait3d.py builds with a matting model and a depth model:
// R = relit brightness (0 = not part of the bust), G = front depth, B = back depth.
function portrait(c, { img } = {}) {
  if (!img) return c.done();
  const { data, width: W, height: H } = img;
  const R = (x, y) => data[(y * W + x) * 4];
  let [x0, x1, y0, y1] = [W, 0, H, 0];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (R(x, y)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 <= x0) return c.done();

  const k = 3.1 / (y1 - y0); // world units per pixel
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const FRONT = 0.95;
  const BACK = 0.6;
  const pick = () => {
    const x = x0 + Math.floor(c.r() * (x1 - x0 + 1));
    const y = y0 + Math.floor(c.r() * (y1 - y0 + 1));
    const i = (y * W + x) * 4;
    return data[i] ? { x: x + c.r(), y: y + c.r(), s: data[i] / 255, f: data[i + 1] / 255, b: data[i + 2] / 255 } : null;
  };
  const at = (p, z, size, bright) => c.add((p.x - cx) * k, (cy - p.y) * k, z - FRONT * 0.45, size, bright);

  // the lit front surface: denser and brighter where the light falls
  const front = Math.floor(c.n * 0.78);
  let guard = 0;
  while (c.i < front && guard++ < c.n * 80) {
    const p = pick();
    if (!p || c.r() > 0.05 + 0.95 * Math.pow(p.s, 1.15)) continue;
    at(p, p.f * FRONT + c.gauss() * 0.004, 0.68 + 0.42 * p.s, 0.1 + 0.95 * p.s);
  }
  // the back and the sides, faint, so it has volume when it turns
  const back = c.i + Math.floor(c.n * 0.08);
  while (c.i < back && guard++ < c.n * 120) {
    const p = pick();
    if (p) at(p, -p.b * BACK, 0.6, 0.07);
  }
  const sides = c.i + Math.floor(c.n * 0.06);
  while (c.i < sides && guard++ < c.n * 160) {
    const p = pick();
    if (p && p.b < 0.2) at(p, -p.b * BACK + c.r() * (p.f * FRONT + p.b * BACK), 0.6, 0.08 + 0.2 * p.s);
  }
  c.mark([0, (cy - y0) * k + 0.04, 0.2], 'the maker, assembled');
  return c.done({ dust: 3.8, dim: 0.8 });
}

/* ---------- Breathe: 29 cities, message passing ---------- */
const CITIES = [
  ['Delhi', 28.61, 77.21], ['Mumbai', 19.08, 72.88], ['Kolkata', 22.57, 88.36], ['Chennai', 13.08, 80.27],
  ['Bengaluru', 12.97, 77.59], ['Hyderabad', 17.39, 78.49], ['Ahmedabad', 23.02, 72.57], ['Pune', 18.52, 73.86],
  ['Jaipur', 26.91, 75.79], ['Lucknow', 26.85, 80.95], ['Kanpur', 26.45, 80.33], ['Nagpur', 21.15, 79.09],
  ['Indore', 22.72, 75.86], ['Bhopal', 23.26, 77.41], ['Patna', 25.59, 85.14], ['Guwahati', 26.14, 91.74],
  ['Thiruvananthapuram', 8.52, 76.94], ['Kochi', 9.93, 76.27], ['Visakhapatnam', 17.69, 83.22], ['Bhubaneswar', 20.3, 85.82],
  ['Chandigarh', 30.73, 76.78], ['Amritsar', 31.63, 74.87], ['Varanasi', 25.32, 82.97], ['Coimbatore', 11.02, 76.96],
  ['Madurai', 9.93, 78.12], ['Raipur', 21.25, 81.63], ['Ranchi', 23.34, 85.31], ['Dehradun', 30.32, 78.03], ['Jodhpur', 26.24, 73.02],
];

// a coarse outline of the mainland, lon/lat — drawn faintly, it only has to read as India
const INDIA = [
  [68.2, 23.7], [69.1, 22.4], [70.1, 21.0], [71.2, 20.7], [72.6, 21.3], [72.8, 19.0], [73.4, 16.4], [74.1, 14.8], [74.8, 12.9],
  [75.7, 11.3], [76.3, 9.9], [77.0, 8.4], [77.5, 8.1], [78.2, 8.9], [79.3, 10.3], [79.9, 11.6], [80.3, 13.2], [80.1, 15.4],
  [81.3, 16.4], [82.3, 17.0], [83.4, 17.8], [84.9, 19.3], [86.5, 20.0], [87.0, 21.5], [88.3, 21.6], [88.9, 22.2], [88.8, 23.6],
  [88.2, 24.4], [88.6, 25.5], [88.4, 26.4], [89.8, 26.3], [92.0, 25.2], [92.4, 24.0], [93.3, 23.0], [93.5, 24.4], [94.5, 25.6],
  [95.2, 26.6], [97.0, 27.6], [96.3, 29.2], [94.4, 29.3], [92.1, 27.8], [89.8, 26.9], [88.8, 27.3], [88.1, 27.9], [88.0, 26.6],
  [86.0, 26.6], [84.1, 27.4], [83.2, 27.4], [81.0, 28.5], [80.1, 28.9], [81.0, 30.2], [79.1, 31.0], [78.7, 32.3], [79.4, 33.2],
  [79.5, 34.6], [78.0, 35.4], [76.6, 34.9], [75.2, 34.6], [74.0, 34.0], [74.3, 32.8], [74.9, 32.0], [74.5, 30.9], [73.9, 30.0],
  [73.2, 29.0], [72.0, 28.0], [70.7, 27.8], [69.6, 26.8], [70.2, 25.8], [70.9, 25.1], [70.6, 24.3], [69.3, 24.3],
];

function gnnIndia(c) {
  const N = c.n;
  const k = 0.1;
  const geo = ([lon, lat]) => [(lon - 81.8) * k, (lat - 21.6) * k, 0];
  const nodes = CITIES.map(([name, lat, lon]) => ({ name, p: geo([lon, lat]) }));

  polyline(c, INDIA.map(geo), Math.floor(N * 0.1), { s: 0.7, b: 0.32 }, { closed: true, jit: 0.004 });

  // each city to its three nearest, both ways — the graph the model passes messages over
  const edges = new Set();
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => [j, Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1])])
      .filter(([j]) => j !== i)
      .sort((x, y) => x[1] - y[1])
      .slice(0, 3)
      .forEach(([j]) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  const list = [...edges].map((e) => e.split('-').map(Number));
  const lens = list.map(([i, j]) => Math.hypot(nodes[i].p[0] - nodes[j].p[0], nodes[i].p[1] - nodes[j].p[1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const edgeBudget = N * 0.36;
  list.forEach(([i, j], e) => {
    const [a, b] = c.r() < 0.5 ? [nodes[i].p, nodes[j].p] : [nodes[j].p, nodes[i].p];
    segment(c, a, b, Math.floor((edgeBudget * lens[e]) / total), { s: 0.75, b: 0.55 }, { flow: true, offset: c.r(), lift: lens[e] * 0.35, jit: 0.0035 });
  });

  const home = nodes.findIndex((n) => n.name === 'Thiruvananthapuram');
  const perNode = Math.floor((N * 0.2) / nodes.length);
  nodes.forEach((n, i) => {
    const me = i === home;
    ball(c, n.p, me ? 0.022 : 0.014, me ? perNode * 3 : perNode, { s: me ? 1.1 : 0.9, b: me ? 1.4 : 1, a: me ? 1 : 0 });
  });
  const ring = Math.floor(N * 0.02);
  circle(c, nodes[home].p, 0.075, ring, { s: 0.7, b: 0.8, a: 1 }, { plane: 'xy', jit: 0.002, flow: true });
  circle(c, nodes[home].p, 0.13, ring / 2, { s: 0.6, b: 0.35, a: 1 }, { plane: 'xy', jit: 0.002 });

  // the air itself: particulate haze drifting over the map
  for (let i = 0; i < N * 0.16; i++) {
    const n = nodes[Math.floor(c.r() * nodes.length)].p;
    c.add(n[0] + c.gauss() * 0.28, n[1] + c.gauss() * 0.28, Math.abs(c.gauss()) * 0.22, 0.9, 0.1 + c.r() * 0.1, 0, -1, 0);
  }

  c.mark(nodes[home].p, 'Thiruvananthapuram — home');
  c.mark(nodes.find((n) => n.name === 'Delhi').p, 'Delhi');
  c.mark(nodes.find((n) => n.name === 'Kolkata').p, 'Kolkata');
  return c.done({ dust: 3.6 });
}

/* ---------- PhoneInput: Opus frames leaving the phone ---------- */
function phoneWave(c) {
  const N = c.n;
  const px = -1.18;
  const flat = (ox, oy, oz) => (u, v) => [ox + u, oy + v, oz];

  // the phone: two outlines for its thickness, the screen, the mic button and a level meter
  const body = roundedRect(0.62, 1.24, 0.1);
  outline(c, body, flat(px, 0, 0.035), Math.floor(N * 0.05), { s: 0.8, b: 1 });
  outline(c, body, flat(px, 0, -0.035), Math.floor(N * 0.03), { s: 0.7, b: 0.5 });
  outline(c, roundedRect(0.54, 1.08, 0.05), flat(px, 0, 0.036), Math.floor(N * 0.025), { s: 0.6, b: 0.35 });
  circle(c, [px, 0.08, 0.04], 0.12, Math.floor(N * 0.02), { s: 0.8, b: 1.1, a: 1 }, { plane: 'xy' });
  ball(c, [px, 0.08, 0.04], 0.028, Math.floor(N * 0.012), { s: 0.8, b: 1, a: 1 });
  for (let i = 0; i < 11; i++) {
    const h = 0.03 + 0.12 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
    const x = px - 0.2 + i * 0.04;
    segment(c, [x, -0.38, 0.04], [x, -0.38 + h, 0.04], Math.floor((N * 0.02) / 11), { s: 0.7, b: 0.8 }, { jit: 0.002 });
  }
  textLine(c, flat(px, 0, 0.04), -0.2, 0.08, 0.44, Math.floor(N * 0.006), { b: 0.7 });
  textLine(c, flat(px, 0, 0.04), -0.2, 0.18, -0.2, Math.floor(N * 0.006), { b: 0.5 });
  [0.2, 0.3, 0.41].forEach((r, i) =>
    circle(c, [px, 0.08, 0.04], r, Math.floor(N * 0.012), { s: 0.6, b: 0.45 - i * 0.1 }, { plane: 'xy', arc: [-0.9, 0.9], flow: true })
  );

  // the stream: a helix of 10 ms packets
  const path = (u) => {
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.6);
    const a = TAU * u * 2.1;
    return [-0.82 + u * 1.55, 0.06 + Math.sin(a) * 0.17 * env, Math.cos(a) * 0.17 * env];
  };
  const packets = 30;
  const perPacket = Math.floor((N * 0.24) / packets);
  for (let i = 0; i < packets; i++) {
    const u = (i + 0.5) / packets;
    const [x, y, z] = path(u);
    const sq = 0.022;
    polyline(c, [[x - sq, y - sq, z], [x + sq, y - sq, z], [x + sq, y + sq, z], [x - sq, y + sq, z]], perPacket, { s: 0.75, b: 0.95 }, { closed: true, jit: 0.002 });
    for (let j = 0; j < perPacket / 3; j++) c.add(x + (c.r() - 0.5) * sq * 1.6, y + (c.r() - 0.5) * sq * 1.6, z, 0.6, 0.35, 0, u, 0);
  }
  for (let i = 0; i < N * 0.06; i++) {
    const u = c.r();
    const p = path(u);
    c.add(p[0] + c.gauss() * 0.006, p[1] + c.gauss() * 0.006, p[2] + c.gauss() * 0.006, 0.55, 0.4, 0, u, 0);
  }

  // the desktop: a monitor, its stand and the voice arriving as a waveform
  const mx = 1.22;
  outline(c, roundedRect(0.92, 0.6, 0.025), flat(mx, 0.1, 0), Math.floor(N * 0.05), { s: 0.8, b: 1 });
  segment(c, [mx, -0.2, 0], [mx, -0.36, 0], Math.floor(N * 0.006), { s: 0.7, b: 0.7 });
  segment(c, [mx - 0.16, -0.36, 0], [mx + 0.16, -0.36, 0], Math.floor(N * 0.008), { s: 0.7, b: 0.7 });
  const wave = [];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    const env = Math.sin(Math.PI * u);
    const y = env * (0.14 * Math.sin(u * 47) * Math.sin(u * 7.3) + 0.05 * Math.sin(u * 131));
    wave.push([mx - 0.38 + u * 0.76, 0.1 + y, 0.005]);
  }
  polyline(c, wave, Math.floor(N * 0.07), { s: 0.7, b: 1, a: 1 }, { jit: 0.002, flow: true });

  c.mark([px, 0.72, 0.04], 'phone — 48 kHz, Opus, 10 ms frames');
  c.mark([path(0.62)[0], 0.36, 0], 'adaptive jitter buffer, 30–250 ms');
  c.mark([mx, 0.48, 0], 'desktop — a virtual microphone');
  return c.done({ dust: 3.6 });
}

/* ---------- FloatPro: an ESC/POS receipt curling out of the printer ---------- */
function receipt(c) {
  const N = c.n;
  const W = 0.78;
  const slot = -0.86;
  const top = 0.82;
  const straight = top - slot;
  // paper path: up out of the slot, then curling back on itself
  const r0 = 0.2;
  const curl = (th) => {
    const r = r0 * (1 - th / (TAU * 1.7));
    return [top + r * Math.sin(th), -r0 + r * Math.cos(th)];
  };
  const onPaper = (u, v) => [u, slot + v, 0.0];

  // printer body and slot
  boxEdges(c, [0, -1.04, -0.02], [1.08, 0.34, 0.7], Math.floor(N * 0.08), { s: 0.8, b: 0.85 });
  segment(c, [-0.42, slot, 0.0], [0.42, slot, 0.0], Math.floor(N * 0.01), { s: 0.7, b: 1 });
  ball(c, [0.38, -1.04, 0.33], 0.012, Math.floor(N * 0.004), { s: 0.8, b: 1.2, a: 1 });

  // the paper surface, faint
  sheet(c, W, straight, (u, v) => onPaper(u, v + straight / 2), Math.floor(N * 0.12), { s: 0.6, b: 0.1 });
  for (let i = 0; i < N * 0.07; i++) {
    const th = c.r() * TAU * 1.55;
    const [y, z] = curl(th);
    c.add((c.r() - 0.5) * W, y, z, 0.6, 0.12 + 0.1 * Math.cos(th), 0, -1, 0);
  }
  for (const e of [-W / 2, W / 2]) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const th = (i / 60) * TAU * 1.55;
      const [y, z] = curl(th);
      pts.push([e, y, z]);
    }
    polyline(c, [[e, slot, 0], [e, top, 0], ...pts], Math.floor(N * 0.03), { s: 0.7, b: 0.55 });
  }

  // what's printed, from the top down
  const rows = [
    ['title'], ['blank'], ['centre', 0.42], ['centre', 0.3], ['rule'], ['item', 0.42], ['item', 0.3], ['item', 0.36], ['item', 0.22],
    ['item', 0.4], ['item', 0.28], ['rule'], ['item', 0.2], ['item', 0.16], ['total'], ['rule'], ['barcode'], ['blank'], ['centre', 0.34],
  ];
  const rowH = 0.072;
  const per = Math.floor((N * 0.34) / rows.length);
  rows.forEach(([kind, len = 0], i) => {
    const y = straight - 0.12 - i * rowH;
    const L = -W / 2 + 0.06;
    const R = W / 2 - 0.06;
    if (kind === 'title') {
      textLine(c, onPaper, -0.18, 0.18, y, per * 2, { s: 1, b: 1.2 }, { h: 0.04, ch: 0.04, gap: 0.05 });
    } else if (kind === 'centre') {
      textLine(c, onPaper, -len / 2, len / 2, y, per * 0.7, { b: 0.6 });
    } else if (kind === 'rule') {
      for (let x = L; x < R; x += 0.03) segment(c, onPaper(x, y), onPaper(x + 0.016, y), Math.floor(per / 22), { s: 0.6, b: 0.6 }, { jit: 0.001 });
    } else if (kind === 'item') {
      textLine(c, onPaper, L, L + len, y, per * 0.7, { b: 0.85 });
      textLine(c, onPaper, R - 0.1, R, y, per * 0.3, { b: 0.85 });
    } else if (kind === 'total') {
      textLine(c, onPaper, L, L + 0.16, y, per * 1.2, { s: 1, b: 1.3, a: 1 }, { h: 0.03, ch: 0.03, gap: 0.05 });
      textLine(c, onPaper, R - 0.16, R, y, per * 1.2, { s: 1, b: 1.3, a: 1 }, { h: 0.03, ch: 0.03, gap: 0.05 });
    } else if (kind === 'barcode') {
      for (let x = -0.26; x < 0.26; x += 0.012) {
        if (c.r() < 0.35) continue;
        segment(c, onPaper(x, y - 0.035), onPaper(x, y + 0.035), Math.floor(per / 14), { s: 0.6, b: 0.9 }, { jit: 0.001 });
      }
    }
  });

  c.mark(onPaper(W / 2 - 0.14, straight - 0.12 - 14 * rowH), 'printed over ESC/POS, from a template');
  c.mark([0.54, -1.04, 0.33], 'found over Bluetooth & mDNS');
  return c.done({ dust: 3.6 });
}

/* ---------- README Templates: Singularity ---------- */
function blackHole(c) {
  const N = c.n;
  const tilt = euler([-0.24, 0, 0.16]);
  const facing = transposeM(tilt); // pre-rotation that makes a ring face the camera once tilted
  const view = (x, y) => applyM(facing, [x, y, 0]);
  const r0 = 0.46;
  const r1 = 1.7;

  // the accretion disk: differential rotation, spiral streaks, a hot inner edge
  const disk = Math.floor(N * 0.62);
  for (let i = 0; i < disk; i++) {
    const r = r0 + (r1 - r0) * Math.pow(c.r(), 1.7);
    let th;
    do th = c.r() * TAU;
    while (c.r() > 0.5 + 0.5 * Math.cos(3 * (th - 2.4 * Math.log(r))));
    const hot = Math.max(0, Math.min(1, (0.7 - r) / 0.24));
    c.add(
      Math.cos(th) * r,
      c.gauss() * 0.01 * r,
      Math.sin(th) * r,
      0.65 + hot * 0.4,
      0.2 + 0.85 * Math.pow(r0 / r, 1.25),
      hot,
      -1,
      0.42 * Math.pow(r / r0, -1.5)
    );
  }

  // the far side of the disk, lensed up and over the shadow
  for (let i = 0; i < N * 0.14; i++) {
    const a = c.r() * TAU;
    const r = 0.5 + Math.abs(c.gauss()) * 0.09;
    const p = view(Math.cos(a) * r, Math.sin(a) * r * 1.02);
    c.add(p[0], p[1], p[2], 0.7, (0.12 + 0.75 * Math.pow(Math.abs(Math.sin(a)), 3)) * (r < 0.56 ? 1.2 : 0.7), 0.6, -1, 0);
  }
  // the photon ring
  for (let i = 0; i < N * 0.05; i++) {
    const a = c.r() * TAU;
    const r = 0.468 + c.gauss() * 0.004;
    const p = view(Math.cos(a) * r, Math.sin(a) * r);
    c.add(p[0], p[1], p[2], 0.6, 1.1, 1, -1, 0);
  }

  c.mark(view(0, 0.47), 'event horizon');
  c.mark([1.5, 0, 0.1], 'a particle per day of contributions');
  return { ...c.done({ dust: 3.8 }), tilt: [-0.24, 0, 0.16] };
}

/* ---------- AI Hub: retrieval in an embedding space ---------- */
// Cosine similarity only cares about direction, so every embedding is drawn where it really
// lives: on the unit sphere. Topics cluster on the surface; the query's nearest five are the
// ones closest along it.
function embeddings(c) {
  const N = c.n;
  const spin = 0.07;
  const R = 1.22;
  const unit = (v) => norm(v);
  const slerp = (a, b, t) => {
    const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const th = Math.acos(d);
    if (th < 1e-4) return a;
    const s = Math.sin(th);
    const ka = Math.sin((1 - t) * th) / s;
    const kb = Math.sin(t * th) / s;
    return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
  };

  // the sphere itself: an equator, two latitudes and four meridians, faint
  circle(c, [0, 0, 0], R, Math.floor(N * 0.035), { s: 0.55, b: 0.3, w: spin });
  [-0.5, 0.5].forEach((y) => circle(c, [0, y * R, 0], R * Math.sqrt(1 - y * y), Math.floor(N * 0.02), { s: 0.55, b: 0.2, w: spin }));
  for (let m = 0; m < 4; m++) {
    const phi = (m / 4) * Math.PI;
    for (let i = 0; i < N * 0.018; i++) {
      const th = c.r() * TAU;
      c.add(R * Math.cos(th) * Math.cos(phi), R * Math.sin(th), R * Math.cos(th) * Math.sin(phi), 0.55, 0.18, 0, -1, spin);
    }
  }

  // topics: tight clusters of directions
  const centers = [];
  while (centers.length < 9) {
    const d = c.dir();
    if (centers.every((q) => q[0] * d[0] + q[1] * d[1] + q[2] * d[2] < 0.72)) centers.push(d);
  }
  const docs = [];
  centers.forEach((ctr) => {
    const sig = 0.1 + c.r() * 0.1;
    for (let i = 0; i < (N * 0.4) / centers.length; i++) {
      const d = unit([ctr[0] + c.gauss() * sig, ctr[1] + c.gauss() * sig, ctr[2] + c.gauss() * sig]);
      const rr = R * (1 + c.gauss() * 0.008);
      c.add(d[0] * rr, d[1] * rr, d[2] * rr, 0.62, 0.3 + c.r() * 0.3, 0, -1, spin);
    }
    for (let i = 0; i < 22; i++) docs.push(unit([ctr[0] + c.gauss() * sig, ctr[1] + c.gauss() * sig, ctr[2] + c.gauss() * sig]));
  });
  const perDoc = Math.max(2, Math.floor((N * 0.1) / docs.length));
  docs.forEach((d) => ball(c, [d[0] * R, d[1] * R, d[2] * R], 0.008, perDoc, { s: 0.85, b: 1, w: spin }));

  // the query: a vector from the origin, landing near one topic; its five nearest light up
  const q = unit([centers[1][0] + 0.12, centers[1][1] + 0.14, centers[1][2] - 0.06]);
  const Q = [q[0] * R, q[1] * R, q[2] * R];
  segment(c, [0, 0, 0], Q, Math.floor(N * 0.02), { s: 0.7, b: 0.9, a: 1, w: spin }, { flow: true, jit: 0.0015 });
  ball(c, [0, 0, 0], 0.016, Math.floor(N * 0.01), { s: 0.8, b: 1, w: spin });
  ball(c, Q, 0.02, Math.floor(N * 0.03), { s: 1, b: 1.35, a: 1, w: spin });
  const near = docs
    .map((d) => [d, d[0] * q[0] + d[1] * q[1] + d[2] * q[2]])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  near.forEach(([d]) => {
    for (let i = 0; i < N * 0.008; i++) {
      const t = c.r();
      const p = slerp(q, d, t);
      const lift = R * (1.015 + Math.sin(Math.PI * t) * 0.05);
      c.add(p[0] * lift, p[1] * lift, p[2] * lift, 0.65, 0.95, 1, t, spin);
    }
    ball(c, [d[0] * R, d[1] * R, d[2] * R], 0.013, Math.floor(N * 0.004), { s: 0.9, b: 1.2, a: 1, w: spin });
  });

  c.mark(Q, 'query', spin);
  c.mark([0, -R * 1.02, 0], 'cosine lives on a sphere', spin);
  return { ...c.done({ dust: 3.6 }), tilt: [0.32, -0.3, 0.08] };
}

/* ---------- OG Converter: the radial menu ---------- */
function wheel(c) {
  const N = c.n;
  const tiltE = [1.08, 0.32, 0];
  const facing = transposeM(euler(tiltE));
  const rings = [
    [0.34, 0.6, 6, 'Convert', 0.05],
    [0.66, 0.98, 8, 'Tools', -0.035],
    [1.04, 1.38, 10, 'Actions', 0.025],
  ];
  rings.forEach(([a, b, segs, , w], ri) => {
    const gap = 0.07;
    const hot = (ri * 3 + 1) % segs;
    const y = -ri * 0.07;
    for (let s = 0; s < segs; s++) {
      const t0 = (s / segs) * TAU + gap / 2;
      const t1 = ((s + 1) / segs) * TAU - gap / 2;
      const lit = s === hot;
      const o = { s: 0.75, b: lit ? 1.15 : 0.8, a: lit ? 1 : 0, w };
      const share = (N * 0.24) / (rings.length * segs);
      circle(c, [0, y, 0], a, share * 0.22, o, { arc: [t0, t1], jit: 0.0025 });
      circle(c, [0, y, 0], b, share * 0.3, o, { arc: [t0, t1], jit: 0.0025 });
      segment(c, [Math.cos(t0) * a, y, Math.sin(t0) * a], [Math.cos(t0) * b, y, Math.sin(t0) * b], share * 0.1, o);
      segment(c, [Math.cos(t1) * a, y, Math.sin(t1) * a], [Math.cos(t1) * b, y, Math.sin(t1) * b], share * 0.1, o);
      const fill = share * (lit ? 1.6 : 0.5);
      for (let i = 0; i < fill; i++) {
        const t = t0 + (t1 - t0) * c.r();
        const r = Math.sqrt(a * a + (b * b - a * a) * c.r());
        c.add(Math.cos(t) * r, y + c.gauss() * 0.004, Math.sin(t) * r, 0.6, lit ? 0.5 : 0.12, lit ? 1 : 0, -1, w);
      }
    }
  });

  // the dragged file and the cursor, facing the viewer
  const f = (u, v) => applyM(facing, [u, v, 0.12]);
  const file = [[-0.1, 0.13], [0.04, 0.13], [0.1, 0.07], [0.1, -0.13], [-0.1, -0.13]];
  polyline(c, file.map(([u, v]) => f(u, v)), Math.floor(N * 0.03), { s: 0.8, b: 1.1 }, { closed: true, jit: 0.002 });
  polyline(c, [f(0.04, 0.13), f(0.04, 0.07), f(0.1, 0.07)], Math.floor(N * 0.006), { s: 0.7, b: 0.9 });
  for (let i = 0; i < 4; i++) textLine(c, f, -0.07, 0.06 - (i % 2) * 0.04, 0.02 - i * 0.04, Math.floor(N * 0.003), { s: 0.6, b: 0.6 }, { h: 0.01, ch: 0.012 });
  const cur = [[0.08, -0.06], [0.08, -0.26], [0.12, -0.21], [0.155, -0.28], [0.18, -0.27], [0.145, -0.2], [0.2, -0.2]];
  polyline(c, cur.map(([u, v]) => f(u, v)), Math.floor(N * 0.015), { s: 0.8, b: 1.2, a: 1 }, { closed: true, jit: 0.0015 });

  c.mark([0.47 * Math.cos(1.2), 0, 0.47 * Math.sin(1.2)], 'Shift — Convert', rings[0][4]);
  c.mark([0.82 * Math.cos(2.9), -0.07, 0.82 * Math.sin(2.9)], 'Ctrl — Tools', rings[1][4]);
  c.mark([1.21 * Math.cos(4.6), -0.14, 1.21 * Math.sin(4.6)], 'Alt — Actions', rings[2][4]);
  return { ...c.done({ dust: 3.6 }), tilt: tiltE };
}

/* ---------- ClinicFlow: an append-only, hash-chained ledger ---------- */
function hashChain(c) {
  const N = c.n;
  const blocks = 7;
  const size = 0.34;
  const centres = Array.from({ length: blocks }, (_, i) => [0.95 - i * 0.44, -0.42 + i * 0.1 + Math.sin(i * 1.3) * 0.1, 0.55 - i * 0.36]);
  const per = Math.floor((N * 0.72) / blocks);
  centres.forEach((p, i) => {
    const rot = euler([c.r() * 0.3, 0.3 + c.r() * 0.3, c.r() * 0.2]);
    const newest = i === 0;
    const o = { s: 0.8, b: newest ? 1.2 : 0.95 - i * 0.06, a: newest ? 1 : 0 };
    boxEdges(c, p, [size, size, size], per * 0.55, o, rot);
    // faces, faint
    for (let k = 0; k < per * 0.25; k++) {
      const face = Math.floor(c.r() * 6);
      const axis = face >> 1;
      const sign = face & 1 ? 1 : -1;
      const q = [(c.r() - 0.5) * size, (c.r() - 0.5) * size, (c.r() - 0.5) * size];
      q[axis] = (sign * size) / 2;
      const w = applyM(rot, q);
      c.add(p[0] + w[0], p[1] + w[1], p[2] + w[2], 0.6, newest ? 0.3 : 0.12, o.a, -1, 0);
    }
    // the hash printed on the front face
    const front = (u, v) => {
      const w = applyM(rot, [u, v, size / 2 + 0.002]);
      return [p[0] + w[0], p[1] + w[1], p[2] + w[2]];
    };
    textLine(c, front, -0.12, 0.12, 0.06, per * 0.1, { s: 0.6, b: 0.9, a: o.a }, { h: 0.012, ch: 0.014, gap: 0.1 });
    textLine(c, front, -0.12, 0.04, -0.02, per * 0.06, { s: 0.6, b: 0.6, a: o.a }, { h: 0.012, ch: 0.014, gap: 0.1 });
    if (i < blocks - 1) segment(c, centres[i + 1], p, Math.floor(N * 0.025), { s: 0.65, b: 0.7, a: 0.4 }, { flow: true, jit: 0.002 });
  });
  c.mark([centres[0][0], centres[0][1] + size * 0.75, centres[0][2]], 'newest entry → sha256(previous)');
  c.mark([centres[5][0], centres[5][1] + size * 0.75, centres[5][2]], 'append-only');
  return { ...c.done({ dust: 3.6 }), tilt: [0.12, 0.38, 0] };
}

/* ---------- Easy Learn: a knowledge graph that keeps its sources ---------- */
function knowledgeGraph(c) {
  const N = c.n;
  const nodes = [];
  let guard = 0;
  while (nodes.length < 46 && guard++ < 5000) {
    const d = c.dir();
    const r = Math.cbrt(c.r()) * 1.1;
    const p = [d[0] * r * 1.05 - 0.35, d[1] * r * 0.9, d[2] * r * 0.8];
    if (nodes.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 0.24)) nodes.push(p);
  }
  const edges = new Set();
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => [j, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])])
      .filter(([j]) => j !== i)
      .sort((x, y) => x[1] - y[1]);
    near.slice(0, c.r() < 0.3 ? 3 : 2).forEach(([j]) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  const deg = nodes.map(() => 0);
  const list = [...edges].map((e) => e.split('-').map(Number));
  list.forEach(([i, j]) => {
    deg[i]++;
    deg[j]++;
  });
  const perEdge = Math.floor((N * 0.3) / list.length);
  list.forEach(([i, j]) => segment(c, nodes[i], nodes[j], perEdge, { s: 0.6, b: 0.45 }, { flow: true, offset: c.r(), jit: 0.002 }));

  // the cited node is the one nearest the page
  const page = [1.42, 0.12, 0.25];
  const cited = nodes.reduce((best, p, i) => (Math.hypot(p[0] - page[0], p[1] - page[1]) < Math.hypot(nodes[best][0] - page[0], nodes[best][1] - page[1]) ? i : best), 0);
  const perNode = Math.floor((N * 0.22) / nodes.length);
  nodes.forEach((p, i) => {
    const me = i === cited;
    ball(c, p, 0.012 + deg[i] * 0.004, me ? perNode * 3 : perNode, { s: 0.9, b: me ? 1.4 : 1, a: me ? 1 : 0 });
  });

  // the source passage it was approved from
  const onPage = (u, v) => [page[0] + u, page[1] + v, page[2]];
  outline(c, [[-0.27, 0.36], [0.17, 0.36], [0.27, 0.26], [0.27, -0.36], [-0.27, -0.36]], onPage, Math.floor(N * 0.04), { s: 0.75, b: 0.95 }, { jit: 0.002 });
  for (let i = 0; i < 10; i++) {
    const y = 0.26 - i * 0.058;
    const hot = i === 5;
    textLine(c, onPage, -0.21, 0.21 - (i % 3) * 0.06, y, Math.floor(N * (hot ? 0.012 : 0.005)), { s: 0.65, b: hot ? 1.3 : 0.55, a: hot ? 1 : 0 }, { h: 0.016, ch: 0.017 });
  }
  segment(c, nodes[cited], onPage(-0.23, 0.26 - 5 * 0.058), Math.floor(N * 0.02), { s: 0.7, b: 0.9, a: 1 }, { flow: true, jit: 0.0015 });

  c.mark(onPage(-0.27, -0.44), 'its source, quoted');
  return { ...c.done({ dust: 3.6 }), tilt: [0.05, -0.3, 0] };
}

/* ---------- CareRez: database-per-tenant ---------- */
// A solid-looking cylinder for a fixed view: `v` is the direction to the camera in the
// formation's own space, which gives the silhouette edges and which half of each ring faces you.
function dbSolid(c, [x, y, z], r, h, count, o, v) {
  const { s = 0.8, b = 1, a = 0 } = o;
  const facing = (t) => Math.cos(t) * v[0] + Math.sin(t) * v[2];
  const ring = (yy, n, k) => {
    for (let i = 0; i < n; i++) {
      const t = c.r() * TAU;
      const front = facing(t) > 0;
      c.add(x + Math.cos(t) * r, y + yy, z + Math.sin(t) * r, s, b * k * (front || yy === h / 2 ? 1 : 0.3), a, -1, 0);
    }
  };
  ring(h / 2, count * 0.24, 1.15);
  ring(h / 6, count * 0.12, 0.8);
  ring(-h / 6, count * 0.12, 0.8);
  ring(-h / 2, count * 0.16, 0.95);
  const t1 = Math.atan2(-v[0], v[2]);
  for (const t of [t1, t1 + Math.PI]) segment(c, [x + Math.cos(t) * r, y - h / 2, z + Math.sin(t) * r], [x + Math.cos(t) * r, y + h / 2, z + Math.sin(t) * r], count * 0.07, { s, b: b * 0.9, a }, { jit: 0.0018 });
  // the body, shaded by how squarely it faces you; the lid, filled faintly
  for (let i = 0; i < count * 0.24; i++) {
    const t = c.r() * TAU;
    const lit = facing(t);
    if (lit < 0) continue;
    c.add(x + Math.cos(t) * r, y + (c.r() - 0.5) * h, z + Math.sin(t) * r, s * 0.8, b * (0.08 + 0.3 * lit), a, -1, 0);
  }
  for (let i = 0; i < count * 0.1; i++) {
    const t = c.r() * TAU;
    const rr = r * Math.sqrt(c.r());
    c.add(x + Math.cos(t) * rr, y + h / 2, z + Math.sin(t) * rr, s * 0.8, b * 0.16, a, -1, 0);
  }
}

function dbTenants(c) {
  const N = c.n;
  const tilt = [0.5, 0.62, 0];
  const v = applyM(transposeM(euler(tilt)), [0, 0, 1]);
  const xs = [-1.08, -0.36, 0.36, 1.08];
  const zs = [-0.72, 0, 0.72];
  const per = Math.floor((N * 0.6) / 12);
  const router = [0, 1.06, 0];
  const active = 6;
  let i = 0;
  for (const z of zs)
    for (const x of xs) {
      const me = i === active;
      dbSolid(c, [x, -0.22, z], 0.17, 0.4, per, { s: 0.8, b: me ? 1.3 : 0.85, a: me ? 1 : 0 }, v);
      segment(c, router, [x, -0.02, z], Math.floor(N * (me ? 0.02 : 0.005)), { s: 0.6, b: me ? 0.95 : 0.26, a: me ? 1 : 0 }, { flow: me, jit: 0.002 });
      if (me) circle(c, [x, -0.42, z], 0.28, Math.floor(N * 0.015), { s: 0.6, b: 0.7, a: 1 }, { jit: 0.002 });
      i++;
    }
  ball(c, router, 0.022, Math.floor(N * 0.02), { s: 0.9, b: 1.25 });
  circle(c, router, 0.08, Math.floor(N * 0.01), { s: 0.6, b: 0.7 }, { plane: 'xy' });
  // the floor they stand on: a faint grid, one cell per tenant
  for (let k = 0; k < N * 0.05; k++) {
    const onX = c.r() < 0.5;
    const gx = onX ? -1.44 + Math.floor(c.r() * 5) * 0.72 : (c.r() - 0.5) * 2.88;
    const gz = onX ? (c.r() - 0.5) * 2.16 : -1.08 + Math.floor(c.r() * 4) * 0.72;
    c.add(gx, -0.42, gz, 0.5, 0.14, 0, -1, 0);
  }

  c.mark(router, 'resolved by subdomain');
  c.mark([xs[2], 0.0, zs[1]], 'one database per home');
  return { ...c.done({ dust: 3.6 }), tilt };
}

/* ---------- Zynk Suite: five user tiers on one platform ---------- */
// system admins at the top, client-portal users at the base — a plate per tier, each wider
// than the one above, with a bead per seat and scope flowing down through the middle
function tiers(c) {
  const N = c.n;
  const spin = 0.06;
  // height, half-width, seats per side
  const levels = [
    [0.9, 0.17, 1],
    [0.45, 0.36, 2],
    [0, 0.57, 3],
    [-0.45, 0.8, 5],
    [-0.9, 1.05, 8],
  ];
  const square = (h) => [[-h, -h], [h, -h], [h, h], [-h, h]];
  levels.forEach(([y, h, seats], i) => {
    const top = i === 0;
    const on = (u, v) => [u, y, v];
    outline(c, square(h), on, N * 0.022 * (0.6 + h), { s: 0.75, b: top ? 1.1 : 0.85, a: top ? 1 : 0, w: spin }, { jit: 0.002 });
    sheet(c, h * 2, h * 2, on, N * 0.03 * h, { s: 0.55, b: 0.1, w: spin });
    const step = (h * 2) / (seats + 1);
    const per = (N * (top ? 0.03 : 0.07)) / (seats * seats);
    for (let gx = 1; gx <= seats; gx++)
      for (let gz = 1; gz <= seats; gz++) ball(c, [-h + gx * step, y + 0.015, -h + gz * step], top ? 0.03 : 0.013, per, { s: 0.85, b: top ? 1.3 : 0.9, a: top ? 1 : 0, w: spin });
    // the ziggurat's edges: each corner steps down to the next tier's
    if (i < levels.length - 1) {
      const [y2, h2] = levels[i + 1];
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) segment(c, [sx * h, y, sz * h], [sx * h2, y2, sz * h2], N * 0.006, { s: 0.6, b: 0.45, w: spin }, { flow: true, jit: 0.002 });
    }
  });
  segment(c, [0, 0.9, 0], [0, -0.9, 0], N * 0.02, { s: 0.6, b: 0.6, a: 1, w: spin }, { flow: true, jit: 0.002 });

  c.mark([0, 0.95, 0], 'system admins', spin);
  c.mark([0.57, 0, 0.57], 'agency admins', spin);
  c.mark([1.05, -0.9, 1.05], 'client-portal users', spin);
  return { ...c.done({ dust: 3.6 }), tilt: [0.42, 0, 0] };
}

/* ---------- Subscription Service: billing periods, prorated mid-cycle ---------- */
// Time climbs the coil, one turn per billing period, a bead per day and an invoice at every
// renewal. Partway through the third period the plan is upgraded: the coil widens, and the
// unused days of the old plan cross over as credit.
function billingCoil(c) {
  const N = c.n;
  const spin = 0.05;
  const turns = 4;
  const H = 2.1;
  const [R0, R1] = [0.58, 0.9];
  const up = 2.45;
  const widen = 0.12;
  const ease = (x) => x * x * (3 - 2 * x);
  const radius = (k) => (k < up ? R0 : k > up + widen ? R1 : R0 + (R1 - R0) * ease((k - up) / widen));
  const at = (k, r = radius(k)) => [Math.cos(k * TAU) * r, -H / 2 + (k / turns) * H, Math.sin(k * TAU) * r];

  for (let i = 0; i < N * 0.26; i++) {
    const k = c.r() * turns;
    const p = at(k);
    c.add(p[0] + c.gauss() * 0.004, p[1] + c.gauss() * 0.004, p[2] + c.gauss() * 0.004, 0.65, 0.55, 0, k / turns, spin);
  }
  // a bead a day
  const days = turns * 30;
  for (let d = 0; d <= days; d++) {
    const k = d / 30;
    ball(c, at(k), 0.007, (N * 0.12) / days, { s: 0.75, b: k > up ? 1 : 0.8, w: spin });
  }

  // the old plan's unused days, and the credit carried onto the new one
  for (let i = 0; i < N * 0.05; i++) {
    const k = up + c.r() * (Math.ceil(up) - up);
    const p = at(k, R0);
    c.add(p[0], p[1] + c.gauss() * 0.003, p[2], 0.6, 0.45, 1, -1, spin);
  }
  for (let j = 0; j < 7; j++) {
    const k = up + 0.04 + (j / 6) * (Math.ceil(up) - up - 0.08);
    segment(c, at(k, R0), at(k), N * 0.005, { s: 0.6, b: 0.75, a: 1, w: spin }, { flow: true, jit: 0.002 });
  }

  // an invoice card at every renewal, and a prorated one at the upgrade
  const invoice = (k, lit) => {
    const r = radius(k);
    const th = k * TAU;
    const p = at(k, r + 0.2);
    const t = [-Math.sin(th), 0, Math.cos(th)];
    const card = (u, v) => [p[0] + t[0] * u, p[1] + v, p[2] + t[2] * u];
    const o = { s: 0.65, b: lit ? 1.15 : 0.8, a: lit ? 1 : 0, w: spin };
    segment(c, at(k, r), at(k, r + 0.13), N * 0.003, { ...o, b: 0.5 });
    outline(c, [[-0.065, -0.085], [0.065, -0.085], [0.065, 0.085], [-0.065, 0.085]], card, N * 0.008, o, { jit: 0.0015 });
    for (let l = 0; l < 3; l++) textLine(c, card, -0.045, 0.02 + (l % 2) * 0.02, 0.045 - l * 0.03, N * 0.0015, { ...o, s: 0.55 }, { h: 0.008, ch: 0.012 });
    textLine(c, card, 0.0, 0.045, -0.06, N * 0.002, { ...o, a: 1 }, { h: 0.01, ch: 0.012, gap: 0.05 });
  };
  for (let k = 0; k <= turns; k++) invoice(k, false);
  invoice(up, true);
  segment(c, [0, -H / 2, 0], [0, H / 2, 0], N * 0.02, { s: 0.55, b: 0.25, w: spin }, { flow: true, jit: 0.002 });

  c.mark(at(up), 'upgraded mid-cycle — prorated in cents', spin);
  c.mark(at(turns, R1 + 0.2), 'invoice, with its tax snapshot', spin);
  return { ...c.done({ dust: 3.6 }), tilt: [0.26, 0, 0.1] };
}

/* ---------- Siga POS: an EAN-13 barcode crossing the scanner ---------- */
// The bars really encode 890123456789 and its check digit — 890 is India's GS1 prefix.
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_FIRST = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
function ean13(first12) {
  const d = [...first12].map(Number);
  const sum = d.reduce((s, x, i) => s + x * (i % 2 ? 3 : 1), 0);
  d.push((10 - (sum % 10)) % 10);
  const R = (x) => [...EAN_L[x]].map((b) => (b === '1' ? '0' : '1')).join('');
  const G = (x) => [...R(x)].reverse().join('');
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += EAN_FIRST[d[0]][i - 1] === 'L' ? EAN_L[d[i]] : G(d[i]);
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R(d[i]);
  return { bits: bits + '101', digits: d.join('') };
}

function barcode(c) {
  const N = c.n;
  const { bits, digits } = ean13('890123456789');
  const W = 2.1;
  const m = W / bits.length;
  const x0 = -W / 2;
  const [top, bottom, guardBottom] = [0.55, -0.4, -0.52];
  const guard = (i) => i < 3 || (i >= 45 && i < 50) || i >= 92;
  const dark = [...bits].flatMap((b, i) => (b === '1' ? [i] : []));
  const per = (N * 0.38) / dark.length;
  for (const i of dark) {
    const lo = guard(i) ? guardBottom : bottom;
    for (let k = 0; k < per; k++) c.add(x0 + (i + c.r() * 0.92) * m, lo + c.r() * (top - lo), (c.r() - 0.5) * 0.025, 0.6, 0.38 + c.r() * 0.18, 0, -1, 0);
  }

  // the digits under it, in the usual three groups
  const flat = (u, v) => [u, v, 0];
  const glyph = { w: 0.075, h: 0.11, step: 7 * m };
  const o = { s: 0.65, b: 0.9 };
  sevenSeg(c, digits[0], flat, x0 - 6 * m - glyph.w / 2, -0.6, glyph, N * 0.006, o);
  sevenSeg(c, digits.slice(1, 7), flat, x0 + 6.5 * m - glyph.w / 2, -0.6, glyph, N * 0.03, o);
  sevenSeg(c, digits.slice(7), flat, x0 + 53.5 * m - glyph.w / 2, -0.6, glyph, N * 0.03, o);

  // the laser line, and the scanner's fan of light behind it
  const ly = 0.06;
  const [L, R] = [[x0 - 0.12, ly, 0.05], [-x0 + 0.12, ly, 0.05]];
  segment(c, L, R, N * 0.035, { s: 0.7, b: 1.25, a: 1 }, { flow: true, jit: 0.0015 });
  for (let i = 0; i < N * 0.02; i++) {
    const t = c.r();
    c.add(L[0] + (R[0] - L[0]) * t, ly + c.gauss() * 0.018, 0.05, 0.7, 0.2, 1, -1, 0);
  }
  const S = [0.35, 1.18, 0.9];
  boxEdges(c, S, [0.42, 0.09, 0.16], N * 0.03, { s: 0.7, b: 0.85 });
  segment(c, [S[0] - 0.16, S[1] - 0.05, S[2] + 0.08], [S[0] + 0.16, S[1] - 0.05, S[2] + 0.08], N * 0.006, { s: 0.65, b: 1.1, a: 1 });
  for (const e of [L, R]) segment(c, [S[0], S[1] - 0.05, S[2]], e, N * 0.008, { s: 0.6, b: 0.4, a: 1 }, { jit: 0.002 });
  for (let i = 0; i < N * 0.04; i++) {
    let [u, v] = [c.r(), c.r()];
    if (u + v > 1) [u, v] = [1 - u, 1 - v];
    c.add(S[0] + (L[0] - S[0]) * u + (R[0] - S[0]) * v, S[1] - 0.05 + (ly - S[1] + 0.05) * (u + v), S[2] + (0.05 - S[2]) * (u + v), 0.55, 0.07, 1, -1, 0);
  }

  c.mark([x0 - 6 * m, -0.6, 0], '890 — India’s GS1 prefix', 0, 'left');
  c.mark(R, 'scanned at the till');
  return { ...c.done({ dust: 3.6 }), tilt: [0.1, -0.42, 0] };
}

/* ---------- PropSure: a house inside its verification score ---------- */
// Around the plot, the checklist as a dial: one arc per category, its length the category's
// weight, gold for the share of its items that passed — and a tick per item outside it.
const CHECKLIST = [
  [0.3, [1, 1, 1, 1, 0]],
  [0.25, [1, 1, 1, 0]],
  [0.2, [1, 1, 0]],
  [0.15, [1, 1, 1]],
  [0.1, [1, 0]],
];
function houseScore(c) {
  const N = c.n;
  const spin = 0.045;
  const o = (b, a = 0) => ({ s: 0.75, b, a, w: spin });
  const ground = -0.62;

  // the walls, the door and two windows
  const [hw, hd, eaves] = [0.5, 0.36, -0.12];
  boxEdges(c, [0, (ground + eaves) / 2, 0], [hw * 2, eaves - ground, hd * 2], N * 0.08, o(0.9));
  const front = (u, v) => [u, v, hd + 0.002];
  outline(c, [[-0.08, ground], [0.08, ground], [0.08, ground + 0.28], [-0.08, ground + 0.28]], front, N * 0.012, o(0.9), { jit: 0.0015 });
  for (const x of [-0.29, 0.29]) {
    outline(c, [[x - 0.09, -0.42], [x + 0.09, -0.42], [x + 0.09, -0.26], [x - 0.09, -0.26]], front, N * 0.01, o(0.85), { jit: 0.0015 });
    segment(c, front(x, -0.42), front(x, -0.26), N * 0.002, o(0.6));
  }
  sheet(c, hw * 2, eaves - ground, (u, v) => front(u, (ground + eaves) / 2 + v), N * 0.03, { s: 0.55, b: 0.07, w: spin });

  // a steep hipped roof with deep eaves, the way they're built in Kerala
  const E = [[-hw - 0.14, eaves - 0.04, -hd - 0.12], [hw + 0.14, eaves - 0.04, -hd - 0.12], [hw + 0.14, eaves - 0.04, hd + 0.12], [-hw - 0.14, eaves - 0.04, hd + 0.12]];
  const [r0, r1] = [[-0.2, 0.32, 0], [0.2, 0.32, 0]];
  polyline(c, E, N * 0.04, o(0.95), { closed: true, jit: 0.002 });
  segment(c, r0, r1, N * 0.008, o(1));
  for (const [e, r] of [[E[0], r0], [E[3], r0], [E[1], r1], [E[2], r1]]) segment(c, e, r, N * 0.01, o(0.9));
  const mix = (p, q, t) => p.map((x, k) => x + (q[k] - x) * t);
  for (let i = 0; i < N * 0.07; i++) {
    const [u, v] = [c.r(), c.r()];
    const face = Math.floor(c.r() * 4);
    // two trapezoids along the ridge, two triangles at its ends
    const p =
      face === 0 ? mix(mix(E[3], E[2], u), mix(r0, r1, u), v)
      : face === 1 ? mix(mix(E[0], E[1], u), mix(r0, r1, u), v)
      : face === 2 ? mix(mix(E[0], E[3], u), r0, v)
      : mix(mix(E[1], E[2], u), r1, v);
    c.add(p[0], p[1], p[2], 0.55, face === 0 ? 0.2 : 0.1, 0, -1, spin);
  }

  // the plot, surveyed, with its corner pegs
  const plot = [[-0.85, ground, -0.65], [0.85, ground, -0.65], [0.85, ground, 0.65], [-0.85, ground, 0.65]];
  plot.forEach((p, i) => {
    const q = plot[(i + 1) % 4];
    const len = Math.hypot(q[0] - p[0], q[2] - p[2]);
    for (let s = 0; s < len; s += 0.06) segment(c, mix(p, q, s / len), mix(p, q, Math.min(1, (s + 0.035) / len)), N * 0.0012, o(0.55), { jit: 0.0015 });
    ball(c, p, 0.014, N * 0.003, o(1.2, 1));
  });

  // the score dial
  const R = 1.24;
  const gap = 0.07;
  const span = TAU - gap * CHECKLIST.length;
  let a0 = -Math.PI / 2;
  let score = 0;
  for (const [weight, items] of CHECKLIST) {
    const a1 = a0 + span * weight;
    const passed = items.filter(Boolean).length / items.length;
    score += weight * passed;
    const split = a0 + (a1 - a0) * passed;
    circle(c, [0, ground, 0], R, N * 0.12 * weight * passed, o(1.1, 1), { arc: [a0, split], jit: 0.003 });
    circle(c, [0, ground, 0], R, N * 0.06 * weight * (1 - passed), o(0.4), { arc: [split, a1], jit: 0.003 });
    items.forEach((ok, k) => {
      const a = a0 + ((k + 0.5) / items.length) * (a1 - a0);
      const at = (r) => [Math.cos(a) * r, ground, Math.sin(a) * r];
      segment(c, at(R + 0.05), at(R + 0.14), N * 0.0025, ok ? o(1.1, 1) : o(0.4), { jit: 0.0015 });
    });
    a0 = a1 + gap;
  }

  c.mark([0, 0.36, 0], 'Know Before You Buy', spin);
  c.mark([0, ground, R], `${Math.round(score * 100)} / 100 — weighted, two levels`, spin);
  return { ...c.done({ dust: 3.6 }), tilt: [0.4, 0, 0] };
}

/* ---------- PropSure LMS: leads, qualified on the way down ---------- */
// Leads fall in at the top. Each ring is a stage — MQL, SQL, opportunity — and those that
// don't qualify leave through the wall. The few that convert land in the tenant's own database.
function funnel(c) {
  const N = c.n;
  const spin = 0.08;
  // height, radius
  const stages = [[1.0, 1.05], [0.42, 0.74], [-0.12, 0.48], [-0.58, 0.27], [-0.88, 0.12]];
  const radiusAt = (y) => {
    if (y >= stages[0][0]) return stages[0][1];
    for (let i = 0; i < stages.length - 1; i++) {
      const [y0, r0] = stages[i];
      const [y1, r1] = stages[i + 1];
      if (y <= y0 && y >= y1) return r0 + ((y0 - y) / (y0 - y1)) * (r1 - r0);
    }
    return stages[stages.length - 1][1];
  };
  stages.forEach(([y, r], i) => {
    const last = i === stages.length - 1;
    circle(c, [0, y, 0], r, N * 0.03 * (0.4 + r), { s: 0.7, b: last ? 1.2 : 0.85, a: last ? 1 : 0, w: spin }, { jit: 0.002 });
  });
  for (let i = 0; i < N * 0.12; i++) {
    const y = stages[stages.length - 1][0] + c.r() * (stages[0][0] - stages[stages.length - 1][0]);
    const r = radiusAt(y);
    const th = c.r() * TAU;
    c.add(Math.cos(th) * r, y, Math.sin(th) * r, 0.55, 0.1, 0, -1, spin);
  }

  // the leads, each a spiral down; `reach` is the last stage it qualified for
  const leads = 44;
  const reach = Array.from({ length: leads }, (_, i) => (i < 4 ? 4 : i < 9 ? 3 : i < 16 ? 2 : i < 27 ? 1 : 0));
  const perLead = (N * 0.3) / leads;
  reach.forEach((stage, i) => {
    const won = stage === 4;
    const f = 0.25 + c.r() * 0.6;
    const th0 = c.r() * TAU;
    const yStart = 1.32 + c.r() * 0.15;
    const yEnd = won ? -1.0 : stages[stage + 1][0] + 0.1;
    const pts = [];
    for (let s = 0; s <= 24; s++) {
      const y = yStart + (yEnd - yStart) * (s / 24);
      const r = radiusAt(y) * f;
      const th = th0 + (yStart - y) * 2.2;
      pts.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    // and out through the wall if it didn't make it
    if (!won) {
      const th = th0 + (yStart - yEnd) * 2.2;
      const r = radiusAt(yEnd) + 0.32;
      pts.push([Math.cos(th + 0.3) * r, yEnd - 0.22, Math.sin(th + 0.3) * r]);
    }
    polyline(c, pts, perLead * (won ? 1.6 : 1), { s: 0.65, b: won ? 1.1 : 0.5, a: won ? 1 : 0, w: spin }, { flow: true, jit: 0.003 });
    ball(c, pts[0], 0.012, N * 0.0012, { s: 0.8, b: 0.95, a: won ? 1 : 0, w: spin });
  });

  dbCylinder(c, [0, -1.14, 0], 0.2, 0.16, N * 0.04, { s: 0.7, b: 0.95, a: 1, w: spin });

  c.mark([stages[1][1], stages[1][0], 0], 'MQL', spin);
  c.mark([stages[2][1], stages[2][0], 0], 'SQL', spin);
  c.mark([0.2, -1.14, 0], 'won — into the tenant’s own database', spin);
  return { ...c.done({ dust: 3.6 }), tilt: [0.3, 0, 0] };
}

/* ---------- FleetBooks: a vehicle, its odometer and the road it bills for ---------- */
const CAR = (() => {
  const arch = (cx) => Array.from({ length: 11 }, (_, i) => [cx + Math.cos(Math.PI - (i / 10) * Math.PI) * 0.19, -0.3 + Math.sin(Math.PI - (i / 10) * Math.PI) * 0.19]);
  return [
    [-0.74, -0.3], ...arch(-0.46), ...arch(0.46), [0.76, -0.3], [0.79, -0.12], [0.62, -0.03], [0.26, 0.0], [0.06, 0.23], [-0.34, 0.24], [-0.58, 0.03], [-0.77, 0.0], [-0.79, -0.15],
  ];
})();
function vehicle(c) {
  const N = c.n;
  const hw = 0.3;
  const o = (b, a = 0) => ({ s: 0.75, b, a });

  // the body: its outline on both sides, struts across, a faint roof and bonnet
  for (const [z, b] of [[hw, 1], [-hw, 0.5]]) {
    polyline(c, CAR.map(([x, y]) => [x, y, z]), N * (z > 0 ? 0.08 : 0.05), o(b), { closed: true, jit: 0.002 });
    polyline(c, [[0.22, 0.02], [0.05, 0.2], [-0.32, 0.21], [-0.53, 0.04]].map(([x, y]) => [x, y, z]), N * 0.025, o(b * 0.8), { closed: true, jit: 0.0015 });
    segment(c, [-0.12, 0.21, z], [-0.12, 0.02, z], N * 0.003, o(b * 0.7));
  }
  for (const [x, y] of [[0.79, -0.12], [0.62, -0.03], [0.26, 0.0], [0.06, 0.23], [-0.34, 0.24], [-0.58, 0.03], [-0.77, 0.0]]) segment(c, [x, y, hw], [x, y, -hw], N * 0.004, o(0.55));
  const roof = [[0.79, -0.12], [0.62, -0.03], [0.26, 0.0], [0.06, 0.23], [-0.34, 0.24], [-0.58, 0.03], [-0.77, 0.0]];
  for (let i = 0; i < N * 0.06; i++) {
    const k = Math.floor(c.r() * (roof.length - 1));
    const t = c.r();
    const [p, q] = [roof[k], roof[k + 1]];
    c.add(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, (c.r() - 0.5) * hw * 2, 0.55, 0.13, 0, -1, 0);
  }
  ball(c, [0.78, -0.08, hw * 0.7], 0.018, N * 0.004, o(1.3, 1));
  ball(c, [0.78, -0.08, -hw * 0.7], 0.018, N * 0.003, o(0.8, 1));

  // the wheels; light running round the tyres reads as rolling
  for (const x of [-0.46, 0.46])
    for (const z of [hw + 0.01, -hw - 0.01]) {
      const near = z > 0;
      circle(c, [x, -0.3, z], 0.15, N * 0.02, o(near ? 1 : 0.5), { plane: 'xy', flow: true, jit: 0.002 });
      circle(c, [x, -0.3, z], 0.08, N * 0.006, o(near ? 0.7 : 0.35), { plane: 'xy', jit: 0.0015 });
      for (let s = 0; s < 5; s++) {
        const a = (s / 5) * TAU;
        segment(c, [x, -0.3, z], [x + Math.cos(a) * 0.08, -0.3 + Math.sin(a) * 0.08, z], N * 0.0012, o(near ? 0.7 : 0.35));
      }
    }

  // the road, with a post every kilometre
  const ry = -0.46;
  for (const z of [-0.55, 0.55]) segment(c, [-1.6, ry, z], [1.6, ry, z], N * 0.035, o(0.45), { jit: 0.002 });
  for (let x = -1.6; x < 1.6; x += 0.2) segment(c, [x, ry, 0], [x + 0.1, ry, 0], N * 0.003, o(0.6, 0.3), { flow: true, jit: 0.0015 });
  for (let i = 0; i < N * 0.04; i++) c.add((c.r() - 0.5) * 3.2, ry, (c.r() - 0.5) * 1.1, 0.5, 0.06, 0, -1, 0);
  [-1.45, -0.75, 0.05, 0.85, 1.55].forEach((x, i) => {
    const ahead = i === 3;
    segment(c, [x, ry, 0.7], [x, ry + 0.2, 0.7], N * 0.003, o(ahead ? 1 : 0.6, ahead ? 1 : 0));
    ball(c, [x, ry + 0.21, 0.7], 0.014, N * 0.002, o(ahead ? 1.3 : 0.8, ahead ? 1 : 0));
  });

  // the odometer reading it all comes from
  const dial = (u, v) => [u, v, 0];
  const read = '048213';
  const glyph = { w: 0.055, h: 0.09, step: 0.09 };
  const x0 = -0.27;
  outline(c, [[x0 - 0.04, 0.47], [x0 + read.length * glyph.step + 0.01, 0.47], [x0 + read.length * glyph.step + 0.01, 0.64], [x0 - 0.04, 0.64]], dial, N * 0.02, o(0.7), { jit: 0.0015 });
  sevenSeg(c, read.slice(0, -1), dial, x0, 0.51, glyph, N * 0.03, o(1));
  sevenSeg(c, read.slice(-1), dial, x0 + (read.length - 1) * glyph.step, 0.51, glyph, N * 0.008, o(1.2, 1));
  segment(c, [0.0, 0.46, 0], [0.0, 0.26, 0], N * 0.004, o(0.4), { flow: true });

  c.mark([x0 + read.length * glyph.step + 0.01, 0.56, 0], 'odometer → allowances & receivables');
  c.mark([0.85, ry + 0.21, 0.7], 'a post every kilometre');
  return { ...c.done({ dust: 3.6 }), tilt: [0.32, -0.55, 0] };
}

/* ---------- Engineering Playbooks: an open book, loaded by an agent ---------- */
// Two playbooks — multitenancy and permissions — open on the table, pages turning, and the
// lines on them streaming up into the coding agent that reads them.
function playbook(c) {
  const N = c.n;
  const W = 0.95;
  const L = 0.62;
  // a page turned to angle `phi` about the spine (the z axis), curling by `curl` towards its edge
  const page = (phi, curl, lift = 0) => (s, z) => {
    const a = phi + curl * s;
    return [Math.cos(a) * s * W, Math.sin(a) * s * W + lift, z];
  };
  const edges = (to3, count, o) => {
    const across = Array.from({ length: 13 }, (_, i) => i / 12);
    polyline(c, [...across.map((s) => to3(s, -L)), ...across.slice().reverse().map((s) => to3(s, L))], count, o, { closed: true, jit: 0.002 });
  };
  const fill = (to3, count, b) => {
    for (let i = 0; i < count; i++) {
      const p = to3(c.r(), (c.r() * 2 - 1) * L);
      c.add(p[0], p[1], p[2], 0.55, b, 0, -1, 0);
    }
  };

  // the two open pages, with their lines of text
  const right = page(0.16, -0.22);
  const leftRaw = page(0.16, -0.22);
  const left = (s, z) => {
    const p = leftRaw(s, z);
    return [-p[0], p[1], p[2]];
  };
  const lines = [];
  for (const [to3, o] of [[left, { s: 0.6, b: 0.75 }], [right, { s: 0.6, b: 0.75 }]]) {
    edges(to3, N * 0.05, { s: 0.7, b: 0.9 });
    fill(to3, N * 0.05, 0.08);
    const lift = (s, z) => {
      const p = to3(s, z);
      return [p[0], p[1] + 0.006, p[2]];
    };
    textLine(c, lift, 0.1, 0.6, -L + 0.12, N * 0.012, { ...o, b: 1.1 }, { h: 0.035, ch: 0.04, gap: 0.05 });
    for (let j = 0; j < 11; j++) {
      const z = -L + 0.26 + j * 0.088;
      const end = 0.88 - ((j * 37) % 5) * 0.08;
      textLine(c, lift, 0.1, end, z, N * 0.006, o, { h: 0.02, ch: 0.026 });
      if (j % 3 === 1) lines.push(lift(0.1 + c.r() * (end - 0.1), z));
    }
  }

  // pages lifting off the right, mid-turn
  [[0.3, 0.8], [0.75, 0.55], [1.3, 0.25]].forEach(([phi, curl], i) => {
    const to3 = page(phi, curl);
    edges(to3, N * 0.022, { s: 0.6, b: 0.6 - i * 0.1 });
    fill(to3, N * 0.02, 0.07);
  });

  // the block of pages and the cover under them
  for (const x of [-1, 1]) for (let k = 0; k < 4; k++) segment(c, [x * (W - 0.01), -0.012 - k * 0.012, -L], [x * (W - 0.01), -0.012 - k * 0.012, L], N * 0.004, { s: 0.55, b: 0.4 });
  outline(c, [[-W - 0.05, -L - 0.04], [W + 0.05, -L - 0.04], [W + 0.05, L + 0.04], [-W - 0.05, L + 0.04]], (u, v) => [u, -0.065, v], N * 0.04, { s: 0.7, b: 0.7 }, { jit: 0.002 });
  // a ribbon, hanging out of the spine
  polyline(c, [[0, 0, L - 0.1], [0.03, 0.0, L + 0.02], [0.07, -0.06, L + 0.16], [0.05, -0.16, L + 0.26]], N * 0.012, { s: 0.7, b: 1.1, a: 1 }, { jit: 0.004 });

  // what the agent loads
  const agent = [0, 1.02, -0.15];
  ball(c, agent, 0.03, N * 0.02, { s: 0.9, b: 1.3, a: 1 });
  circle(c, agent, 0.1, N * 0.012, { s: 0.6, b: 0.75, a: 1 }, { plane: 'xy', jit: 0.0015, flow: true });
  lines.forEach((p) => {
    const mid = [p[0] * 0.45, 0.62, (p[2] + agent[2]) / 2];
    const pts = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      const a = [p[0] + (mid[0] - p[0]) * t, p[1] + (mid[1] - p[1]) * t, p[2] + (mid[2] - p[2]) * t];
      const b = [mid[0] + (agent[0] - mid[0]) * t, mid[1] + (agent[1] - mid[1]) * t, mid[2] + (agent[2] - mid[2]) * t];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    });
    polyline(c, pts, N * 0.008, { s: 0.6, b: 0.6, a: 0.7 }, { flow: true, jit: 0.002 });
  });

  c.mark(agent, 'loaded by the coding agent');
  c.mark(left(0.55, -L), 'multitenancy', 0, 'left');
  c.mark(right(0.75, -L), 'pac — DENY always wins');
  return { ...c.done({ dust: 3.6 }), tilt: [0.62, -0.18, 0] };
}

/* ---------- services: the stack, exploded ---------- */
function stack(c) {
  const N = c.n;
  const spin = 0.05;
  const o = (b, a = 0) => ({ s: 0.8, b, a, w: spin });
  const flatAt = (y) => (u, v) => [u, y, v];

  dbCylinder(c, [0, -1.12, 0], 0.42, 0.32, Math.floor(N * 0.16), o(0.95));

  const api = -0.42;
  outline(c, [[-0.66, -0.66], [0.66, -0.66], [0.66, 0.66], [-0.66, 0.66]], flatAt(api), Math.floor(N * 0.05), o(0.85), { jit: 0.002 });
  for (let gx = 0; gx < 7; gx++)
    for (let gz = 0; gz < 7; gz++) ball(c, [-0.5 + gx * (1 / 6), api, -0.5 + gz * (1 / 6)], 0.008, Math.floor((N * 0.07) / 49), o(0.9));

  const web = 0.24;
  outline(c, [[-0.72, -0.48], [0.72, -0.48], [0.72, 0.48], [-0.72, 0.48]], flatAt(web), Math.floor(N * 0.05), o(0.9), { jit: 0.002 });
  segment(c, [-0.72, web, -0.36], [0.72, web, -0.36], Math.floor(N * 0.012), o(0.7));
  outline(c, [[-0.62, -0.26], [-0.1, -0.26], [-0.1, 0.38], [-0.62, 0.38]], flatAt(web), Math.floor(N * 0.02), o(0.5), { jit: 0.002 });
  for (let k = 0; k < 4; k++) textLine(c, flatAt(web), 0.0, 0.6 - k * 0.08, -0.2 + k * 0.12, Math.floor(N * 0.006), o(0.6), { h: 0.02 });

  const phone = 0.9;
  outline(c, roundedRect(0.44, 0.82, 0.06).map(([u, v]) => [u, v]), flatAt(phone), Math.floor(N * 0.04), o(1));
  circle(c, [0, phone, 0.05], 0.08, Math.floor(N * 0.01), o(1, 1));

  // requests travelling up through the layers
  const lanes = [[-0.4, -0.25], [0.3, 0.32], [0.05, -0.05], [-0.15, 0.4], [0.45, -0.35]];
  lanes.forEach(([x, z]) => segment(c, [x * 0.6, -0.96, z * 0.6], [x * 0.35, phone, z * 0.5], Math.floor(N * 0.02), o(0.55, 0.6), { flow: true, jit: 0.002 }));

  c.mark([0.72, -1.0, 0], 'database', spin);
  c.mark([0.7, api, 0.66], 'API', spin);
  c.mark([0.74, web, 0.48], 'web', spin);
  c.mark([0.24, phone, 0.4], 'phone', spin);
  return { ...c.done({ dust: 3.6 }), tilt: [0.5, 0.62, 0] };
}

/* ---------- the toolkit as an armillary sphere: a ring per area, a bead per tool ---------- */
function armillary(c, { groups = [] } = {}) {
  const N = c.n;
  const rings = groups.length ? groups : [{ items: Array(8).fill('x') }];
  const isCore = (t) => /^\*[^*]+\*/.test(t);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const beads = rings.reduce((n, g) => n + (g.items?.length || 0), 0) || 1;
  rings.forEach((g, i) => {
    const items = g.items || [];
    // ring normals spread over a sphere so no two rings share a plane
    const y = 1 - ((i + 0.5) / rings.length) * 2;
    const rr = Math.sqrt(1 - y * y);
    const nrm = [Math.cos(golden * i * 2.3) * rr, y, Math.sin(golden * i * 2.3) * rr];
    const ref = Math.abs(nrm[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm(cross(nrm, ref));
    const v = cross(nrm, u);
    const R = 1.3 - i * 0.05;
    const w = 0.03 + 0.025 * ((i * 7) % 3) * (i % 2 ? -1 : 1);
    const at = (t, r = R) => [(u[0] * Math.cos(t) + v[0] * Math.sin(t)) * r, (u[1] * Math.cos(t) + v[1] * Math.sin(t)) * r, (u[2] * Math.cos(t) + v[2] * Math.sin(t)) * r];
    for (let k = 0; k < (N * 0.4) / rings.length; k++) {
      const p = at(c.r() * TAU);
      c.add(p[0] + c.gauss() * 0.003, p[1] + c.gauss() * 0.003, p[2] + c.gauss() * 0.003, 0.6, 0.32, 0, -1, w);
    }
    const off = c.r() * TAU;
    items.forEach((t, k) => {
      const core = isCore(t);
      const p = at(off + (k / items.length) * TAU);
      ball(c, p, core ? 0.022 : 0.012, Math.floor((N * 0.36 * (core ? 2.2 : 1)) / (beads * 1.25)), { s: core ? 1 : 0.8, b: core ? 1.25 : 0.85, a: core ? 1 : 0, w });
    });
    if (i < 3) c.mark(at(off, R + 0.02), String(g.area || ''), w);
  });
  ball(c, [0, 0, 0], 0.05, Math.floor(N * 0.03), { s: 0.8, b: 1, a: 0.3 });
  return { ...c.done({ dust: 3.6 }), tilt: [0.25, 0, 0.1] };
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/* ---------- experience: every production repository as a lane of commits ---------- */
function commitGraph(c, { lanes = 14, commits = 1070 } = {}) {
  const N = c.n;
  const spin = 0.09;
  const R = 1.08;
  const H = 2.5;
  const ang = (i) => (i / lanes) * TAU;
  const at = (a, y) => [Math.cos(a) * R, y, Math.sin(a) * R];
  for (let i = 0; i < lanes; i++) segment(c, at(ang(i), -H / 2), at(ang(i), H / 2), Math.floor((N * 0.16) / lanes), { s: 0.55, b: 0.28, w: spin }, { jit: 0.002 });

  const weights = Array.from({ length: lanes }, () => 0.25 + Math.pow(c.r(), 2) * 2);
  const sum = weights.reduce((a, b) => a + b, 0);
  const per = Math.max(2, Math.floor((N * 0.42) / commits));
  let made = 0;
  weights.forEach((wt, i) => {
    const n = i === lanes - 1 ? commits - made : Math.round((commits * wt) / sum);
    made += n;
    const ys = Array.from({ length: n }, () => -H / 2 + 0.05 + c.r() * (H - 0.1)).sort((a, b) => a - b);
    ys.forEach((y, k) => ball(c, at(ang(i), y), 0.006, per, { s: 0.8, b: k === n - 1 ? 1.3 : 0.7, a: k === n - 1 ? 1 : 0, w: spin }));
  });

  // merges between neighbouring repositories
  for (let m = 0; m < 70; m++) {
    const i = Math.floor(c.r() * lanes);
    const y0 = -H / 2 + c.r() * (H - 0.2);
    const pts = [];
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      pts.push(at(ang(i) + (TAU / lanes) * t, y0 + 0.16 * t));
    }
    polyline(c, pts, Math.floor((N * 0.1) / 70), { s: 0.6, b: 0.55, a: 0.2, w: spin }, { jit: 0.002, flow: true });
  }
  c.mark(at(ang(0), H / 2 + 0.06), 'HEAD', spin);
  return { ...c.done({ dust: 3.6 }), tilt: [0.18, 0, -0.06] };
}

/* ---------- off the clock: a Staunton king, lathe-turned ---------- */
function chessKing(c) {
  const N = c.n;
  const prof = [
    [0, -1.15], [0.56, -1.15], [0.56, -1.06], [0.5, -1.0], [0.52, -0.95], [0.42, -0.87], [0.3, -0.79], [0.25, -0.55], [0.2, -0.1],
    [0.17, 0.24], [0.31, 0.31], [0.31, 0.38], [0.2, 0.42], [0.22, 0.5], [0.35, 0.78], [0.35, 0.84], [0.28, 0.87], [0.18, 0.95], [0.06, 1.0], [0, 1.0],
  ];
  const L = norm([-0.55, 0.65, 0.75]);
  const segs = [];
  let total = 0;
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i];
    const [r1, y1] = prof[i + 1];
    const area = Math.PI * (r0 + r1) * Math.hypot(r1 - r0, y1 - y0);
    segs.push([r0, y0, r1, y1, total, area]);
    total += area;
  }
  const body = Math.floor(N * 0.62);
  for (let i = 0; i < body; i++) {
    const d = c.r() * total;
    const [r0, y0, r1, y1] = segs.find((s) => s[4] + s[5] >= d) || segs[segs.length - 1];
    const t = c.r();
    const r = r0 + (r1 - r0) * t;
    const y = y0 + (y1 - y0) * t;
    const a = c.r() * TAU;
    const nr = norm([y1 - y0, -(r1 - r0), 0]);
    const n = [nr[0] * Math.cos(a), nr[1], nr[0] * Math.sin(a)];
    const lit = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    const rim = Math.pow(1 - Math.abs(n[2]), 3) * 0.35;
    c.add(Math.cos(a) * r, y, Math.sin(a) * r, 0.8, 0.12 + 0.95 * Math.pow(lit, 0.9) + rim, 0);
  }
  // the cross
  const crossBox = (cx, cy, w, h, d, count) => {
    for (let i = 0; i < count; i++) {
      const p = [(c.r() - 0.5) * w, (c.r() - 0.5) * h, (c.r() - 0.5) * d];
      const axis = Math.floor(c.r() * 3);
      p[axis] = (c.r() < 0.5 ? -0.5 : 0.5) * [w, h, d][axis];
      const lit = axis === 0 ? (p[0] < 0 ? 0.9 : 0.2) : axis === 1 ? (p[1] > 0 ? 1 : 0.1) : p[2] > 0 ? 0.8 : 0.15;
      c.add(cx + p[0], cy + p[1], p[2], 0.8, 0.15 + lit, 0);
    }
  };
  crossBox(0, 1.17, 0.075, 0.34, 0.075, Math.floor(N * 0.03));
  crossBox(0, 1.2, 0.26, 0.075, 0.075, Math.floor(N * 0.02));

  // the board under it
  const sq = 0.3;
  for (let i = 0; i < N * 0.16; i++) {
    const gx = Math.floor(c.r() * 8);
    const gz = Math.floor(c.r() * 8);
    const dark = (gx + gz) % 2 === 0;
    if (!dark && c.r() < 0.7) continue;
    const x = (gx - 4 + c.r()) * sq;
    const z = (gz - 4 + c.r()) * sq;
    const fade = Math.max(0, 1 - Math.hypot(x, z) / 1.7);
    c.add(x, -1.16, z, 0.6, (dark ? 0.28 : 0.1) * fade, 0);
  }
  return { ...c.done({ dust: 3.6 }), tilt: [0.32, 0.4, 0] };
}

/* ---------- a resting field, for the quieter sections ---------- */
function dust(c) {
  return c.done({ dust: 3.2, dim: 2.2 });
}

/* ---------- a generic globe, for a project that hasn't been given a formation ---------- */
function globe(c) {
  const N = c.n;
  const spin = 0.08;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts = Math.floor(N * 0.5);
  for (let i = 0; i < pts; i++) {
    const y = 1 - (i / (pts - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    c.add(Math.cos(t) * r * 1.2, y * 1.2, Math.sin(t) * r * 1.2, 0.6, 0.5, 0, -1, spin);
  }
  [0.4, 0, -0.4].forEach((y) => circle(c, [0, y * 1.2, 0], Math.sqrt(1 - y * y) * 1.22, Math.floor(N * 0.05), { s: 0.7, b: 1, w: spin }));
  circle(c, [0, 0, 0], 1.6, Math.floor(N * 0.06), { s: 0.7, b: 0.9, a: 1, w: -spin }, { plane: 'xy' });
  return { ...c.done({ dust: 3.6 }), tilt: [0.3, 0, 0.35] };
}

/* =========================================================
   Registry
   ========================================================= */
export const FORMS = {
  singularity: { build: singularity, label: 'singularity' },
  atom: { build: atom, label: 'As · Z = 33', tilt: [Math.PI / 2, 0, 0.28] },
  portrait: { build: portrait, label: 'the maker', needs: 'img' },
  'gnn-india': { build: gnnIndia, label: '29 cities · message passing', tilt: [-0.62, 0, 0] },
  'phone-wave': { build: phoneWave, label: 'Opus · 10 ms frames', tilt: [0.08, -0.32, 0] },
  receipt: { build: receipt, label: 'ESC/POS receipt', tilt: [0.12, 0.5, 0] },
  'black-hole': { build: blackHole, label: 'singularity · a particle per day' },
  embeddings: { build: embeddings, label: 'pgvector · top-k cosine' },
  wheel: { build: wheel, label: 'radial menu at the cursor' },
  'hash-chain': { build: hashChain, label: 'append-only · sha-256 chained' },
  'knowledge-graph': { build: knowledgeGraph, label: 'knowledge graph · cited' },
  'db-tenants': { build: dbTenants, label: 'database-per-tenant' },
  tiers: { build: tiers, label: 'five user tiers' },
  'billing-coil': { build: billingCoil, label: 'billing periods · prorated' },
  barcode: { build: barcode, label: 'EAN-13 · scanned at the till' },
  'house-score': { build: houseScore, label: 'verified · weighted score' },
  funnel: { build: funnel, label: 'lead → MQL → SQL → won' },
  vehicle: { build: vehicle, label: 'odometer → receivables' },
  playbook: { build: playbook, label: 'playbooks an agent loads' },
  stack: { build: stack, label: 'database → api → web → phone' },
  armillary: { build: armillary, label: 'the toolkit' },
  'commit-graph': { build: commitGraph, label: 'commits × repositories' },
  'chess-king': { build: chessKing, label: 'king, e1' },
  dust: { build: dust, label: 'at rest' },
  globe: { build: globe, label: 'work' },
};

// Builds one formation: { pos, aux, markers, tilt, label }. `params` come from data.json.
export function buildForm(name, n, params = {}) {
  const def = FORMS[name] || FORMS.globe;
  const c = new Cloud(n, hashString(name) ^ 0x33);
  const out = def.build(c, params);
  return { ...out, tilt: out.tilt || def.tilt || [0, 0, 0], label: params.label || def.label };
}
