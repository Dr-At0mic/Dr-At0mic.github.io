import { state, clamp } from './core.js';
import { onScroll } from './smooth.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Wraps every word in a span, preserving inline markup like <em> and the circled word.
function wrapWords(el, make) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          frag.appendChild(/^\s+$/.test(part) ? document.createTextNode(part) : make(part, i++));
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.namespaceURI !== SVG_NS) {
        walk(child);
      }
    });
  };
  walk(el);
  return i;
}

const maskedWord = (text, i) => {
  const w = document.createElement('span');
  const inner = document.createElement('span');
  w.className = 'w';
  inner.textContent = text;
  inner.style.setProperty('--i', Math.min(i, 40));
  w.appendChild(inner);
  return w;
};

const scrubWord = (text) => {
  const s = document.createElement('span');
  s.className = 'sw';
  s.textContent = text;
  return s;
};

export function initReveal() {
  document.querySelectorAll('[data-split]').forEach((el) => wrapWords(el, maskedWord));

  // menu words get a stagger index
  document.querySelectorAll('.menu__word').forEach((el, i) => el.style.setProperty('--i', i));

  const targets = document.querySelectorAll(
    '[data-split]:not(.hero [data-split]), [data-fade]:not(.hero [data-fade]), [data-reveal]'
  );

  if (state.reduced) {
    targets.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        let k = 0;
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          // things that arrive together get a gentle stagger
          if (e.target.hasAttribute('data-fade')) e.target.style.setProperty('--d', `${k++ * 0.09}s`);
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    targets.forEach((el) => io.observe(el));
  }

  initCounters();
  initScrub();
  initParallax();
}

// Hero reveals are choreographed after the loader instead of on scroll.
export function revealHero() {
  const root = document.documentElement;
  root.classList.add('is-ready');
  const seq = [
    ['.hero__eyebrow', 0.2],
    ['.hero__name', 0.35],
    ['.hero__intro', 0.8],
    ['.hero__right', 1.0],
    ['.hero__foot', 1.2],
  ];
  seq.forEach(([sel, d]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.style.setProperty('--d', `${d}s`);
    if (el.matches('[data-split]')) el.querySelectorAll('.w > span').forEach((s) => (s.style.transitionDelay = `calc(${d}s + var(--i) * 28ms)`));
    el.classList.add('is-in');
  });
}

function initCounters() {
  const nums = document.querySelectorAll('[data-count]');
  const run = (el) => {
    const raw = String(el.dataset.count || '0');
    const end = Number(raw) || 0;
    const decimals = (raw.split('.')[1] || '').length;
    const fmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (state.reduced) return (el.textContent = fmt.format(end));
    const t0 = performance.now();
    const dur = 1800;
    const tick = (now) => {
      const p = clamp((now - t0) / dur);
      el.textContent = fmt.format(end * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      }),
    { rootMargin: '0px 0px -15% 0px' }
  );
  nums.forEach((n) => io.observe(n));
}

// About statement: words ink in as you scroll past.
function initScrub() {
  const el = document.querySelector('[data-scrub]');
  if (!el) return;
  if (state.reduced) return;
  const n = wrapWords(el, scrubWord);
  const words = [...el.querySelectorAll('.sw')];
  const last = new Array(n).fill(-1);

  const update = () => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    const p = clamp((vh * 0.88 - r.top) / (vh * 0.35 + r.height));
    words.forEach((w, i) => {
      const o = Math.round((0.15 + 0.85 * clamp(p * n * 1.15 - i)) * 100) / 100;
      if (o !== last[i]) {
        w.style.opacity = o;
        last[i] = o;
      }
    });
  };
  onScroll(update);
  addEventListener('resize', update);
  update();
}

function initParallax() {
  if (state.reduced) return;
  const items = [...document.querySelectorAll('[data-parallax]')].map((img) => ({
    img,
    box: img.parentElement,
    speed: Number(img.dataset.parallax) || 0.08,
  }));
  if (!items.length) return;
  const update = () => {
    const vh = window.innerHeight;
    items.forEach(({ img, box, speed }) => {
      const r = box.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const progress = (r.top + r.height / 2 - vh / 2) / vh; // -1 … 1 across the screen
      img.style.transform = `translate3d(0, ${(-progress * speed * r.height).toFixed(1)}px, 0)`;
    });
  };
  onScroll(update);
  addEventListener('resize', update);
  update();
}
