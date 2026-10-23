// Guilloché — the engraved patterns on fine watch dials, traditionally cut by a rose engine.
//
// Each pattern is a set of polylines inside a unit circle. Engraved metal shimmers because a
// groove only throws light back when it runs across the light, so every line segment is
// sorted by direction into BINS paths once; painting then strokes each bin with a brightness
// set by the angle between its direction and the light. Moving the light re-strokes ~36
// paths, not thousands of segments.

const TAU = Math.PI * 2;
const BINS = 36;

// Dial colours. `hi`/`lo` are the light and shadow of the engraving; `ink` is the printing
// on the dial, `applied` the polished indices and hands.
export const TONES = {
  midnight: { base: ['#25407A', '#0A1431'], hi: '200,216,255', lo: '2,6,20', ink: '#EDE6DA', applied: '#E2B497' },
  opaline: { base: ['#F7F6F2', '#C9C7C0'], hi: '255,255,255', lo: '96,94,88', ink: '#141821', applied: '#2747A0' },
  salmon: { base: ['#F2BC9F', '#C27A5C'], hi: '255,236,224', lo: '112,56,36', ink: '#2B1710', applied: '#2B1A12' },
  racing: { base: ['#2C6250', '#0B271E'], hi: '186,232,212', lo: '1,12,8', ink: '#EFE8DA', applied: '#E8D2A6' },
  bordeaux: { base: ['#74263A', '#290712'], hi: '255,196,208', lo: '10,1,4', ink: '#F2E6DE', applied: '#E2B497' },
  slate: { base: ['#50555F', '#191B20'], hi: '232,236,244', lo: '5,6,8', ink: '#EEF0F4', applied: '#DADDE3' },
  glacier: { base: ['#E2F0F8', '#93B3C8'], hi: '255,255,255', lo: '62,90,110', ink: '#0F1F2B', applied: '#1D3A5C' },
  onyx: { base: ['#25262C', '#040405'], hi: '205,210,224', lo: '0,0,0', ink: '#ECE7DE', applied: '#E2B497' },
  tobacco: { base: ['#80593A', '#311E0E'], hi: '255,224,188', lo: '18,9,3', ink: '#F3E7D6', applied: '#F0D3A6' },
};

export const PATTERN_NAMES = {
  wave: 'Vagues',
  barley: 'Grain d’orge',
  sunburst: 'Soleil',
  rosette: 'Rosace',
  panier: 'Panier',
  azurage: 'Azurage',
};

export function seeded(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Each returns polylines as flat [x0, y0, x1, y1, …] arrays in the unit circle.
const ring = (J, S, r0, fn) => {
  const out = [];
  for (let j = 0; j < J; j++) {
    const line = [];
    for (let s = 0; s <= S; s++) {
      const t = (s / S) * TAU;
      const r = fn(j, t, r0 + (1 - r0) * (j / (J - 1)));
      line.push(Math.cos(t) * r, Math.sin(t) * r);
    }
    out.push(line);
  }
  return out;
};

const PATTERNS = {
  // concentric rings, each waved a little out of phase with the last — the classic rose-engine wave
  wave(rnd) {
    const k = 8 + Math.floor(rnd() * 6) * 2;
    const a = 0.011 + rnd() * 0.007;
    const ph = 0.15 + rnd() * 0.2;
    return ring(88, 240, 0.06, (j, t, r) => r + a * Math.sin(k * t + j * ph));
  },
  // barleycorn: rings of little humps that shift round as they grow
  barley(rnd) {
    const k = 22 + Math.floor(rnd() * 10) * 2;
    const a = 0.014;
    const ph = (Math.PI / k) * (0.55 + rnd() * 0.3);
    return ring(74, 300, 0.05, (j, t, r) => r + a * Math.abs(Math.sin((k * t) / 2 + j * ph)));
  },
  // straight rays from the centre — the bright bow-tie that swings round with the light
  sunburst() {
    const out = [];
    const n = 420;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      out.push([Math.cos(t) * 0.035, Math.sin(t) * 0.035, Math.cos(t) * 1.02, Math.sin(t) * 1.02]);
    }
    return out;
  },
  // many rotated copies of one rose curve; where they cross, a flower appears
  rosette(rnd) {
    const k = 5 + Math.floor(rnd() * 5);
    const M = 56;
    const out = [];
    for (let m = 0; m < M; m++) {
      const rot = (m / M) * (TAU / k);
      const line = [];
      for (let s = 0; s <= 360; s++) {
        const t = (s / 360) * TAU;
        const r = 0.56 + 0.41 * Math.cos(k * t);
        line.push(Math.cos(t + rot) * r, Math.sin(t + rot) * r);
      }
      out.push(line);
    }
    return out;
  },
  // basket weave: squares of hatching that alternate direction, so they flicker as a chequer.
  // Set on the diagonal, so the house light catches one direction and not the other.
  panier(rnd) {
    const cell = 0.1 + rnd() * 0.03;
    const gap = cell / 9;
    const [c, s] = [Math.SQRT1_2, Math.SQRT1_2];
    const rot = (x, y) => [x * c - y * s, x * s + y * c];
    const out = [];
    for (let cx = -1.45; cx < 1.45; cx += cell) {
      for (let cy = -1.45; cy < 1.45; cy += cell) {
        const across = (Math.round((cx + 1.45) / cell) + Math.round((cy + 1.45) / cell)) % 2;
        for (let g = gap / 2; g < cell; g += gap) {
          const seg = across ? [cx, cy + g, cx + cell, cy + g] : [cx + g, cy, cx + g, cy + cell];
          out.push([...rot(seg[0], seg[1]), ...rot(seg[2], seg[3])]);
        }
      }
    }
    return out;
  },
  // snailing: fine concentric circles, as on a sub-dial
  azurage() {
    return ring(64, 200, 0.03, (j, t, r) => r);
  },
};

const cache = new Map();

// Cut a pattern into direction bins once; the result is reused by every paint.
export function engrave(pattern, seed = '') {
  const key = `${pattern}|${seed}`;
  if (cache.has(key)) return cache.get(key);
  const lines = (PATTERNS[pattern] || PATTERNS.wave)(seeded(seed));
  const bins = Array.from({ length: BINS }, () => new Path2D());
  const ends = new Array(BINS).fill(null);
  for (const l of lines) {
    for (let i = 0; i + 3 < l.length; i += 2) {
      const [x0, y0, x1, y1] = [l[i], l[i + 1], l[i + 2], l[i + 3]];
      let a = Math.atan2(y1 - y0, x1 - x0);
      if (a < 0) a += Math.PI;
      const b = Math.min(BINS - 1, Math.floor((a / Math.PI) * BINS));
      const end = ends[b];
      if (!end || end[0] !== x0 || end[1] !== y0) bins[b].moveTo(x0, y0);
      bins[b].lineTo(x1, y1);
      ends[b] = [x1, y1];
    }
  }
  const eng = { bins };
  cache.set(key, eng);
  return eng;
}

// Paint a dial face. `light` is the direction the light comes from, in radians.
export function paint(canvas, eng, tone, light = -2.3) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const R = w / 2;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, w);
  ctx.save();
  ctx.translate(R, R);

  // the enamel: lighter on the side the light comes from
  const lx = Math.cos(light) * R * 0.45;
  const ly = Math.sin(light) * R * 0.45;
  const g = ctx.createRadialGradient(lx, ly, R * 0.05, 0, 0, R * 1.05);
  g.addColorStop(0, tone.base[0]);
  g.addColorStop(1, tone.base[1]);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();

  ctx.scale(R, R);
  ctx.lineWidth = Math.max(1, w / 900) / R;
  ctx.lineCap = 'round';
  for (let b = 0; b < BINS; b++) {
    const dir = ((b + 0.5) / BINS) * Math.PI;
    const f = Math.pow(Math.abs(Math.sin(dir - light)), 4);
    if (f > 0.28) {
      ctx.strokeStyle = `rgba(${tone.hi},${(0.05 + 0.8 * Math.pow((f - 0.28) / 0.72, 1.6)).toFixed(3)})`;
    } else {
      ctx.strokeStyle = `rgba(${tone.lo},${(0.38 * (1 - f / 0.28)).toFixed(3)})`;
    }
    ctx.stroke(eng.bins[b]);
  }
  ctx.restore();
}

/* ---------- dials on the page ---------- */

const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

// Size a dial's canvas to its box and paint it; returns a repaint function.
export function mountDial(el, { maxPx = 1500 } = {}) {
  if (el._dial) return el._dial;
  const canvas = el.querySelector('canvas');
  const tone = () => TONES[el.dataset.tone] || TONES.midnight;
  const eng = engrave(el.dataset.pattern, el.dataset.seed);
  let light = Number(el.dataset.light || -2.3);
  let size = 0;

  const fit = () => {
    const px = Math.min(maxPx, Math.round(el.getBoundingClientRect().width * dpr()));
    if (px && px !== size) {
      size = canvas.width = canvas.height = px;
      paint(canvas, eng, tone(), light);
    }
  };
  const api = {
    fit,
    get light() {
      return light;
    },
    setLight(a) {
      light = a;
      if (size) paint(canvas, eng, tone(), light);
    },
    repaint() {
      if (size) paint(canvas, eng, tone(), light);
    },
  };
  el._dial = api;
  fit();
  return api;
}

const live = new Set();
let watchingResize = false;

// Paint every collection dial as it nears the screen; the light follows the pointer while it's over one.
export function initDials(root = document, { reduced = false } = {}) {
  const dials = [...root.querySelectorAll('[data-dial]:not([data-hero])')];
  if (!dials.length) return;
  dials.forEach((d) => live.add(d));
  if (!watchingResize) {
    watchingResize = true;
    addEventListener('resize', () =>
      live.forEach((d) => (d.isConnected ? d._dial?.fit() : live.delete(d)))
    );
  }
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        mountDial(e.target);
        io.unobserve(e.target);
      }),
    { rootMargin: '300px 0px' }
  );
  dials.forEach((d) => io.observe(d));

  if (reduced) return;
  dials.forEach((el) => {
    let raf = 0;
    let target = null;
    const home = Number(el.dataset.light || -2.3);
    const move = (e) => {
      const r = el.getBoundingClientRect();
      target = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      if (!raf) raf = requestAnimationFrame(step);
    };
    const step = () => {
      raf = 0;
      const api = mountDial(el);
      if (target == null) return;
      let d = target - api.light;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) < 0.004) return;
      api.setLight(api.light + d * 0.22);
      raf = requestAnimationFrame(step);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => {
      target = home;
      if (!raf) raf = requestAnimationFrame(step);
    });
  });
}
