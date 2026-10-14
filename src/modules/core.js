// One requestAnimationFrame loop shared by everything that animates,
// plus a tiny bag of shared state so modules can talk to each other.

const subscribers = new Set();
let last = performance.now();

function frame(now) {
  const dt = Math.min(now - last, 64);
  last = now;
  subscribers.forEach((fn) => fn(now, dt));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

export const ticker = (fn) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};

export const state = {
  lenis: null,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  finePointer: matchMedia('(hover: hover) and (pointer: fine)').matches,
  closeMenu: () => {},
};

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const pad = (n) => String(n).padStart(2, '0');

export const debounce = (fn, ms = 150) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// Resolves when web fonts are in, or after a timeout so a slow CDN never blocks the page.
export const fontsReady = () =>
  Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))]);
