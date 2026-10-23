// Decides what the particle field is doing.
//
// Every element with `data-form` is an anchor: while it fills the middle of the screen its
// formation holds; in the space between two anchors the field morphs from one to the next.
// The HUD reports it as a transaction — scrolling forward commits the next shape, scrolling
// back rolls it back.

import { state, clamp, pad, ticker } from './core.js';

const smooth = (x) => x * x * (3 - 2 * x);

export function initDirector(field, { hud, layer, boot = false } = {}) {
  const anchors = [...document.querySelectorAll('[data-form]')].map((el) => ({
    el,
    form: el.dataset.form,
    side: el.dataset.side || 'center',
    label: el.dataset.label || el.dataset.form,
    top: 0,
    bottom: 0,
  }));
  if (!anchors.length) return null;

  const resolve = (form) => form;

  function measure() {
    const y = scrollY;
    for (const a of anchors) {
      const r = a.el.getBoundingClientRect();
      a.top = r.top + y;
      a.bottom = r.bottom + y;
    }
  }

  // where each formation sits on screen, from the anchor's side and the viewport's shape
  function poseFor(a, hold = 0) {
    const aspect = innerWidth / innerHeight;
    const narrow = aspect < 0.8;
    const halfH = narrow ? 3.02 : 1.955;
    const halfW = halfH * aspect;
    const ds = a.el.dataset;
    const dim = ds.dim ? Number(ds.dim) : 1;
    // how far it turns as you scroll past; a relief like the portrait only turns a little
    const turn = hold * (ds.turn ? Number(ds.turn) : 1);
    // on a phone the shape sits above its text: it presents itself, then recedes as the text covers it
    if (narrow) {
      const cover = smooth(clamp((hold + 0.7) / 0.6));
      return { x: 0, y: halfH * 0.36, scale: Math.min(1, (halfW * 0.92) / 1.6) * Math.min(1.2, Number(ds.scale) || 1), spinY: turn * 0.5, tiltX: 0, dim: dim * (1 - 0.7 * cover) };
    }
    const off = a.side === 'right' ? 1 : a.side === 'left' ? -1 : 0;
    const fit = off ? Math.min(1, (halfW * 0.5) / 1.55) : Math.min(1.15, (halfW * 0.8) / 1.6);
    const shift = (Number(ds.shift) || 0) * halfW;
    return { x: off * halfW * 0.48 + shift, y: 0, scale: fit * (Number(ds.scale) || 1), spinY: turn * 0.45, tiltX: turn * -0.06, dim };
  }

  // the scroll position → (from, to, t), plus how far through the current hold we are
  function fromScroll() {
    const c = scrollY + innerHeight * 0.5;
    const hold = (a) => {
      const h = a.bottom - a.top;
      const inset = Math.min(h * 0.22, innerHeight * 0.32);
      return [a.top + inset, a.bottom - inset];
    };
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const [s, e] = hold(a);
      if (c <= e || i === anchors.length - 1) {
        if (c >= s || i === 0) {
          const p = e > s ? clamp((c - s) / (e - s)) * 2 - 1 : 0;
          return { a, b: a, t: 0, hold: clamp(p, -1, 1) };
        }
        const prev = anchors[i - 1];
        const [, pe] = hold(prev);
        return { a: prev, b: a, t: smooth(clamp((c - pe) / Math.max(1, s - pe))), hold: 0 };
      }
    }
    return { a: anchors[0], b: anchors[0], t: 0, hold: 0 };
  }

  /* ---------- overrides: the intro, and focusing on one project ---------- */
  // while booting, everything waits at the singularity
  let override = boot ? { from: 'singularity', to: 'singularity', t: 0, pose: poseFor(anchors[0]), labelFrom: 'boot', labelTo: 'boot' } : null;
  const tween = (o, to, duration, done) => {
    const start = performance.now();
    const from = o.t;
    const step = () => {
      const k = state.reduced ? 1 : clamp((performance.now() - start) / (duration * 1000));
      o.t = from + (to - from) * (1 - Math.pow(1 - k, 3));
      if (k < 1) requestAnimationFrame(step);
      else done?.();
    };
    step();
  };

  function intro(duration = 2.6) {
    return new Promise((resolveIntro) => {
      const o = { from: 'singularity', to: resolve(anchors[0].form), t: 0, pose: poseFor(anchors[0]), labelFrom: 'boot', labelTo: anchors[0].label };
      override = o;
      tween(o, 1, duration, () => {
        // a case study opened from a deep link may have taken over in the meantime
        if (override === o) override = null;
        resolveIntro();
      });
    });
  }

  let focused = null;
  function focus(form, side = 'right', label = form) {
    if (!field.has(form)) form = 'dust';
    const s = fromScroll();
    const here = override ? { form: override.to, label: override.labelTo } : s.t < 0.5 ? s.a : s.b;
    focused = { form, label };
    override = { from: resolve(here.form), to: resolve(form), t: 0, pose: poseFor({ side, el: { dataset: {} } }), labelFrom: here.label, labelTo: label };
    tween(override, 1, 1.5);
  }
  function unfocus() {
    if (!focused) return;
    const s = fromScroll();
    const back = s.t < 0.5 ? s.a : s.b;
    const o = { from: resolve(focused.form), to: resolve(back.form), t: 0, pose: poseFor(back), labelFrom: focused.label, labelTo: back.label };
    override = o;
    focused = null;
    tween(o, 1, 1.3, () => {
      if (override === o) override = null;
    });
  }

  /* ---------- the HUD ---------- */
  const tx = {
    id: hud?.querySelector('[data-tx-id]'),
    op: hud?.querySelector('[data-tx-op]'),
    path: hud?.querySelector('[data-tx-path]'),
    shape: hud?.querySelector('[data-tx-shape]'),
    pct: hud?.querySelector('[data-tx-pct]'),
    count: hud?.querySelector('[data-tx-count]'),
    progress: document.querySelector('[data-progress]'),
    index: document.querySelector('[data-progress-index]'),
  };
  if (tx.count) tx.count.textContent = field.count.toLocaleString('en-GB');
  let txId = 1;
  let committed = null;
  let wasSettled = true;
  let lastText = '';
  let lastY = scrollY;
  let dir = 1;
  let velocity = 0;

  const markers = [];
  const pool = (n) => {
    while (markers.length < n) {
      const m = document.createElement('div');
      m.className = 'marker';
      m.innerHTML = '<i class="marker__dot"></i><span class="marker__text caps"></span>';
      layer?.append(m);
      markers.push(m);
    }
  };
  pool(4);

  function frame(now, dt) {
    const y = scrollY;
    const dy = y - lastY;
    if (Math.abs(dy) > 0.5) dir = Math.sign(dy);
    velocity = velocity * 0.85 + (Math.abs(dy) / Math.max(dt, 1)) * 1000 * 0.15;
    lastY = y;

    const s = fromScroll();
    let from;
    let to;
    let t;
    let pose;
    let labelFrom;
    let labelTo;
    let side = 'right';
    let marks = true;
    if (override) {
      ({ from, to, t, pose, labelFrom, labelTo } = override);
    } else {
      from = resolve(s.a.form);
      to = resolve(s.b.form);
      labelFrom = s.a.label;
      labelTo = s.b.label;
      const near = s.t < 0.5 ? s.a : s.b;
      side = near.side;
      marks = near.el.dataset.markers !== 'off';
      t = state.reduced ? (s.t < 0.5 ? 0 : 1) : s.t;
      // between two anchors, the outgoing one is at the end of its hold and the incoming one at the start
      const pa = poseFor(s.a, s.a === s.b ? s.hold : 1);
      const pb = poseFor(s.b, s.a === s.b ? s.hold : -1);
      pose = Object.fromEntries(Object.keys(pa).map((k) => [k, pa[k] + (pb[k] - pa[k]) * s.t]));
    }
    field.set({ from, to, t });
    Object.assign(field.pose, pose);
    const time = field.render(now, velocity / 5000);

    // the transaction line
    const settled = t < 0.02 || t > 0.98;
    const shownLabel = t > 0.5 ? labelTo : labelFrom;
    if (settled && shownLabel !== committed) {
      if (committed !== null) txId++;
      committed = shownLabel;
      if (shownLabel !== 'boot') dispatchEvent(new CustomEvent('tx', { detail: { op: 'commit', path: shownLabel } }));
    }
    if (!settled && wasSettled) dispatchEvent(new CustomEvent('tx', { detail: { op: dir < 0 && !override ? 'rollback' : 'begin', path: committed } }));
    wasSettled = settled;
    if (hud) {
      const back = dir < 0 && !override && !settled;
      const form = settled ? (t > 0.5 ? to : from) : back ? from : to;
      const path = settled ? shownLabel : back ? labelFrom : labelTo;
      const shape = field.meta(form)?.label || '';
      const op = settled ? 'COMMIT' : back ? 'ROLLBACK' : 'BEGIN';
      const pct = settled ? '' : `${String(Math.round((back ? 1 - t : t) * 100)).padStart(2, '0')}%`;
      const text = `${op}|${path}|${pct}|${txId}`;
      if (text !== lastText) {
        lastText = text;
        tx.id.textContent = String(txId).padStart(4, '0');
        tx.op.textContent = op;
        tx.op.dataset.op = op.toLowerCase();
        tx.path.textContent = path || '';
        tx.shape.textContent = shape ? ` — ${shape}` : '';
        tx.pct.textContent = pct;
      }
    }

    // progress through the page
    if (tx.progress) {
      const max = document.documentElement.scrollHeight - innerHeight;
      tx.progress.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;
      const i = anchors.indexOf(t > 0.5 ? s.b : s.a) + 1;
      const label = `${pad(i)} / ${pad(anchors.length)}`;
      if (tx.index.textContent !== label) tx.index.textContent = label;
    }

    // labels pinned into the 3D shape, faded in once it has settled. Each stays inside the
    // formation's half of the screen — pointing right if it fits, left if not, hidden otherwise.
    const W = innerWidth;
    const near = t < 0.5 ? from : to;
    const vis = clamp(1 - Math.abs(t < 0.5 ? t : 1 - t) * 8) * (W < 720 || !marks ? 0 : 1);
    const list = field.meta(near)?.markers || [];
    const [minX, maxX] = side === 'right' ? [W * 0.47, W - 20] : side === 'left' ? [20, W * 0.58] : [W * 0.24, W * 0.64];
    const placed = [];
    markers.forEach((m, i) => {
      const mk = list[i];
      const p = mk && vis > 0.01 ? field.project(near, mk, time) : null;
      const hide = () => m.style.opacity !== '0' && (m.style.opacity = '0');
      if (!p || p[0] < minX - 4 || p[0] > maxX + 4) return hide();
      const text = m.lastChild;
      if (text.textContent !== mk.text) {
        text.textContent = mk.text;
        m._w = text.offsetWidth;
      }
      const w = (m._w ||= text.offsetWidth) + 40;
      const fitsRight = p[0] + w <= maxX;
      const fitsLeft = p[0] - w >= minX;
      if (!fitsRight && !fitsLeft) return hide();
      const flip = mk.prefer === 'left' ? fitsLeft : !fitsRight;
      const box = flip ? [p[0] - w, p[0], p[1] - 10, p[1] + 10] : [p[0], p[0] + w, p[1] - 10, p[1] + 10];
      if (placed.some((b) => box[0] < b[1] && box[1] > b[0] && box[2] < b[3] && box[3] > b[2])) return hide();
      placed.push(box);
      m.style.opacity = String(vis);
      m.style.transform = `translate3d(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px, 0)${flip ? ' translateX(-100%)' : ''}`;
      m.classList.toggle('is-flip', flip);
    });
  }

  measure();
  ticker(frame);
  addEventListener('resize', () => {
    field.resize();
    measure();
  });
  new ResizeObserver(() => measure()).observe(document.body);

  return { measure, intro, focus, unfocus };
}
