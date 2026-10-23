import { state, ticker, clamp, lerp, debounce, fontsReady } from './core.js';

// Scale a block of display type so its widest line fills the available width.
// Width isn't quite linear in font-size once the fonts' variable axes are in play,
// so a few measure/rescale passes converge on it.
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
  fit(hero, { ratio: 0.93, maxHeight: window.innerHeight * (lineCount > 1 ? 0.205 : 0.32) });
  fit(document.querySelector('.footer__name'), { ratio: 0.98, maxHeight: window.innerHeight * 0.5 });
}

// Letters near the cursor drop into an "excited state": thin and wide at rest, heavy and
// condensed up close — Anybody's weight and width axes doing the work.
function proximity(container, { base = { w: 260, x: 118 }, hot = { w: 880, x: 60 }, radiusEm = 0.65 } = {}) {
  const chars = [...container.querySelectorAll('.char:not(.char--space)')];
  if (!chars.length) return { measure() {} };
  const cur = chars.map(() => ({ ...base }));
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
      const s = cur[i];
      const nw = lerp(s.w, base.w + (hot.w - base.w) * k, 0.14);
      const nx = lerp(s.x, base.x + (hot.x - base.x) * k, 0.14);
      if (Math.abs(nw - s.w) > 0.4 || Math.abs(nx - s.x) > 0.2) {
        s.w = nw;
        s.x = nx;
        c.style.setProperty('--w', nw.toFixed(1));
        c.style.setProperty('--x', nx.toFixed(1));
      }
    });
  });

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
      if (footer) fields.push(proximity(footer));
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
