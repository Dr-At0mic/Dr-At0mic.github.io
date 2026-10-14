import { state, ticker, clamp, lerp, debounce, fontsReady } from './core.js';

// Scale a block of display type so its widest line fills the available width.
// Fraunces' optical-size axis makes letters relatively wider at smaller sizes,
// so width isn't linear in font-size — a few measure/rescale passes converge on it.
function fit(el, { ratio = 1, maxHeight = Infinity } = {}) {
  if (!el) return;
  const lines = [...el.querySelectorAll('.hero__line-inner, .footer__name-inner')];
  const target = el.clientWidth * ratio;
  let fs = 100;
  for (let i = 0; i < 4; i++) {
    el.style.setProperty('--fs', `${fs}px`);
    const widest = Math.max(...lines.map((l) => l.getBoundingClientRect().width), 1);
    const next = Math.min((fs * target) / widest, maxHeight);
    if (Math.abs(next - fs) < 0.5) break;
    fs = next;
  }
  el.style.setProperty('--fs', `${fs.toFixed(2)}px`);
}

function fitAll() {
  const hero = document.querySelector('.hero__name');
  const lineCount = hero?.querySelectorAll('.hero__line').length || 1;
  fit(hero, { ratio: 0.93, maxHeight: (window.innerHeight * (lineCount > 1 ? 0.27 : 0.4)) });
  fit(document.querySelector('.footer__name'), { ratio: 0.98, maxHeight: window.innerHeight * 0.5 });
}

// Letters swell and soften as the cursor comes near — Fraunces' variable axes doing the work.
function proximity(container, { base = 300, max = 780, radiusEm = 0.6 } = {}) {
  const chars = [...container.querySelectorAll('.char:not(.char--space)')];
  if (!chars.length) return { measure() {} };
  const cur = chars.map(() => ({ w: base, s: 0 }));
  const lineBase = chars.map((c) => Number(getComputedStyle(c).getPropertyValue('--w')) || base);
  let centers = [];
  let mx = -1e5;
  let my = -1e5;
  let visible = false;
  let radius = 300;

  const measure = () => {
    radius = parseFloat(getComputedStyle(container).fontSize) * radiusEm;
    centers = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2 + window.scrollY];
    });
  };

  addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY + window.scrollY;
  }, { passive: true });
  document.addEventListener('mouseleave', () => (mx = my = -1e5));

  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(container);

  ticker(() => {
    if (!visible || !centers.length) return;
    chars.forEach((c, i) => {
      const [cx, cy] = centers[i];
      const d = Math.hypot(mx - cx, my - cy);
      const t = clamp(1 - d / radius);
      const k = t * t * (3 - 2 * t); // smoothstep
      const tw = lineBase[i] + (max - lineBase[i]) * k;
      const ts = 100 * k;
      const s = cur[i];
      const nw = lerp(s.w, tw, 0.14);
      const ns = lerp(s.s, ts, 0.14);
      if (Math.abs(nw - s.w) > 0.4 || Math.abs(ns - s.s) > 0.4) {
        s.w = nw;
        s.s = ns;
        c.style.setProperty('--w', nw.toFixed(1));
        c.style.setProperty('--s', ns.toFixed(1));
      }
    });
  });

  // seed current values from each line's base weight so nothing jumps on first move
  chars.forEach((c, i) => (cur[i].w = lineBase[i]));
  return { measure };
}

export function initType() {
  const fields = [];
  const measureAll = () => fields.forEach((f) => f.measure());

  fontsReady().then(() => {
    fitAll();
    if (!state.reduced && state.finePointer) {
      const hero = document.querySelector('.hero__name');
      const footer = document.querySelector('.footer__name');
      if (hero) fields.push(proximity(hero));
      if (footer) fields.push(proximity(footer, { base: 300, max: 760 }));
      // measure once the letters have risen into place
      setTimeout(measureAll, 2600);
      measureAll();
    }
  });

  // Fonts can land after the timeout (slow network) and change widths — re-fit when they do.
  const refit = debounce(() => {
    fitAll();
    measureAll();
  }, 60);
  document.fonts?.addEventListener?.('loadingdone', refit);
  addEventListener('load', refit);

  addEventListener(
    'resize',
    debounce(() => {
      fitAll();
      measureAll();
    }, 120)
  );
}
