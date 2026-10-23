import Lenis from 'lenis';
import { state, ticker } from './core.js';

const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function initSmooth() {
  if (!state.reduced) {
    state.lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    ticker((now) => state.lenis.raf(now));
  }

  // in-page anchors glide instead of jumping (case-study links use #/work/… and are handled elsewhere)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#/')) return;
    const target = href === '#top' || href === '#' ? 0 : document.querySelector(href);
    if (target === null) return;
    e.preventDefault();
    state.closeMenu();
    scrollToTarget(target);
  });

  // nav: solid once you leave the top. It never tucks away — the hero dial docks into it.
  const nav = document.querySelector('.nav');
  const onScroll = (y) => nav.classList.toggle('is-scrolled', y > 30);
  if (state.lenis) state.lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
}

export function scrollToTarget(target, immediate = false) {
  if (state.lenis) {
    state.lenis.scrollTo(target, { duration: immediate ? 0 : 1.6, easing: easeOutExpo, immediate, force: true });
  } else if (target === 0) {
    scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
  } else {
    target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
  }
}

// Lets other modules subscribe to scroll regardless of whether Lenis is running.
export function onScroll(fn) {
  if (state.lenis) state.lenis.on('scroll', fn);
  else addEventListener('scroll', fn, { passive: true });
}
