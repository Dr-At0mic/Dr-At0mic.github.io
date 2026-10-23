import { state, ticker, clamp, lerp, debounce, fontsReady } from './core.js';

// Scale a line of display type so it fills the available width. Bodoni Moda's optical-size
// axis changes the letter widths with the size, so a few measure/rescale passes converge on it.
function fit(el, { ratio = 1, maxHeight = Infinity } = {}) {
  if (!el) return;
  const lines = [...el.querySelectorAll('.footer__name-inner')];
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

const fitAll = () => fit(document.querySelector('.footer__name'), { ratio: 0.99, maxHeight: window.innerHeight * 0.4 });

// The hairlines of the footer name thicken as the cursor passes — Bodoni's weight axis doing the work.
function proximity(container, { base = 400, hot = 900, radiusEm = 0.7 } = {}) {
  const chars = [...container.querySelectorAll('.char:not(.char--space)')];
  if (!chars.length) return { measure() {} };
  const cur = chars.map(() => base);
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

  addEventListener(
    'mousemove',
    (e) => {
      mx = e.clientX;
      my = e.clientY + window.scrollY;
    },
    { passive: true }
  );
  document.addEventListener('mouseleave', () => (mx = my = -1e5));
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) measure();
  }).observe(container);

  ticker(() => {
    if (!visible || !centers.length) return;
    chars.forEach((c, i) => {
      const [cx, cy] = centers[i];
      const t = clamp(1 - Math.hypot(mx - cx, my - cy) / radius);
      const w = lerp(cur[i], base + (hot - base) * t * t * (3 - 2 * t), 0.12);
      if (Math.abs(w - cur[i]) > 0.5) {
        cur[i] = w;
        c.style.setProperty('--w', w.toFixed(1));
      }
    });
  });

  return { measure };
}

export function initType() {
  let field = { measure() {} };

  fontsReady().then(() => {
    fitAll();
    const footer = document.querySelector('.footer__name');
    if (footer && !state.reduced && state.finePointer) field = proximity(footer);
  });

  // Fonts can land after the timeout (slow network) and change widths — re-fit when they do.
  const refit = debounce(() => {
    fitAll();
    field.measure();
  }, 80);
  document.fonts?.addEventListener?.('loadingdone', refit);
  addEventListener('load', refit);
  addEventListener('resize', refit);
}
