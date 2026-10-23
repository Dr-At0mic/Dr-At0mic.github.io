import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { state, ticker, clamp, fontsReady } from './core.js';

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

// Calls `fn` once, the first time `el` comes into view.
function once(el, fn, margin = '0px 0px -12% 0px') {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        fn(e.target);
      }),
    { rootMargin: margin }
  );
  io.observe(el);
}

// Headings rise out of their own lines. Lines are re-split when fonts or widths change.
function splitHeading(el) {
  let anim = null;
  let shown = false;
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line',
    autoSplit: true,
    onSplit(self) {
      anim = gsap.fromTo(self.lines, { yPercent: 108 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.085, paused: !shown });
      return anim;
    },
  });
  once(el, () => {
    shown = true;
    anim?.play();
  });
}

// The about statement lights up word by word as you read down the page.
function scrub(el) {
  const split = SplitText.create(el, { type: 'words', wordsClass: 'w' });
  const words = split.words;
  let lit = -1;
  ticker(() => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp((innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.25));
    const n = Math.round(p * words.length);
    if (n === lit) return;
    lit = n;
    words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
  });
}

function count(el) {
  const raw = String(el.dataset.count);
  const target = parseFloat(raw);
  const decimals = (raw.split('.')[1] || '').length;
  const fmt = (v) => (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-GB'));
  if (!Number.isFinite(target)) return;
  if (state.reduced) {
    el.textContent = fmt(target);
    return;
  }
  const o = { v: 0 };
  gsap.to(o, { v: target, duration: 2.2, ease: 'expo.out', onUpdate: () => (el.textContent = fmt(o.v)) });
}

// "41/41", "2,564", "10×" — decoded like a readout rather than counted
function decode(el) {
  if (state.reduced) return;
  const text = el.textContent;
  gsap.fromTo(el, { scrambleText: { text: text.replace(/[^\s]/g, '0'), chars: '0123456789' } }, { duration: 1.4, ease: 'none', scrambleText: { text, chars: '0123456789×/', speed: 0.5 } });
}

export function initReveal() {
  // block reveals, staggered within the same parent
  const io = new IntersectionObserver(
    (entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .forEach((e, i) => {
          e.target.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
    },
    { rootMargin: '0px 0px -10% 0px' }
  );
  document.querySelectorAll('[data-fade]').forEach((el) => io.observe(el));

  fontsReady().then(() => {
    if (!state.reduced) document.querySelectorAll('main [data-split], .contact [data-split]').forEach(splitHeading);
    document.querySelectorAll('[data-scrub]').forEach((el) => !state.reduced && scrub(el));
  });

  document.querySelectorAll('[data-count]').forEach((el) => once(el, count));
  document.querySelectorAll('[data-count-text]').forEach((el) => once(el, decode));
  document.querySelectorAll('main [data-redact]').forEach((el) => once(el, (n) => setTimeout(() => n.classList.add('is-open'), 900)));
}

// The name stretches into place along Archivo's width axis as the atom forms.
export function revealHero() {
  const chars = document.querySelectorAll('.hero__name .char');
  const redacts = document.querySelectorAll('.hero [data-redact]');
  if (state.reduced) {
    redacts.forEach((r) => r.classList.add('is-open'));
    return;
  }
  gsap.fromTo(
    chars,
    { '--wdth': 62, opacity: 0, yPercent: 30 },
    { '--wdth': 125, opacity: 1, yPercent: 0, duration: 1.9, ease: 'expo.out', stagger: { each: 0.045, from: 'start' }, delay: 0.25 }
  );
  setTimeout(() => redacts.forEach((r) => r.classList.add('is-open')), 2200);
}
