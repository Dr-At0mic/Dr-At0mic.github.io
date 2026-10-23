import { state, ticker, clamp, lerp, debounce, fontsReady } from './core.js';

// Scale the footer name so it fills the width. Archivo's width axis changes as the cursor
// passes, so it's fitted at the narrowest setting and then allowed to breathe outwards.
function fit(el) {
  if (!el) return;
  el.style.setProperty('--fs', '100px');
  const w = el.scrollWidth || 1;
  const fs = Math.min((100 * el.clientWidth * 0.985) / w, innerHeight * 0.3);
  el.style.setProperty('--fs', `${fs.toFixed(2)}px`);
}

// Letters near the cursor widen to the axis maximum — the name leans towards you.
function proximity(container, { base = 100, hot = 125 } = {}) {
  const chars = [...container.querySelectorAll('.char:not(.char--space)')];
  const cur = chars.map(() => base);
  let centers = [];
  let mx = -1e5;
  let my = -1e5;
  let visible = false;
  let radius = 200;

  const measure = () => {
    radius = parseFloat(getComputedStyle(container).fontSize) * 0.9;
    centers = chars.map((c) => {
      const r = c.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2 + scrollY];
    });
  };

  addEventListener(
    'pointermove',
    (e) => {
      mx = e.clientX;
      my = e.clientY + scrollY;
    },
    { passive: true }
  );
  document.addEventListener('pointerleave', () => (mx = my = -1e5));
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) measure();
  }).observe(container);

  ticker(() => {
    if (!visible || !centers.length) return;
    chars.forEach((c, i) => {
      const [cx, cy] = centers[i];
      const t = clamp(1 - Math.hypot(mx - cx, my - cy) / radius);
      const w = lerp(cur[i], base + (hot - base) * t * t * (3 - 2 * t), 0.14);
      if (Math.abs(w - cur[i]) > 0.2) {
        cur[i] = w;
        c.style.setProperty('--wdth', w.toFixed(1));
        c.style.color = t > 0.6 ? 'var(--accent)' : '';
      }
    });
  });
  return { measure };
}

export function initType() {
  const footer = document.querySelector('.footer__name');
  let field = { measure() {} };
  fontsReady().then(() => {
    fit(footer);
    if (footer && !state.reduced && state.finePointer) field = proximity(footer);
  });
  const refit = debounce(() => {
    fit(footer);
    field.measure();
  }, 80);
  document.fonts?.addEventListener?.('loadingdone', refit);
  addEventListener('resize', refit);
}
