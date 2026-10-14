import { state, ticker, debounce, fontsReady } from './core.js';

// Two crossed tapes that drift on their own, rush when you scroll, and turn around when you scroll back up.
export function initMarquee() {
  const bands = [...document.querySelectorAll('[data-marquee]')].map((el) => ({
    el,
    track: el.querySelector('.marquee__track'),
    dir: Number(el.dataset.marquee) || 1,
    x: 0,
    w: 0,
  }));
  if (!bands.length || state.reduced) return;

  const measure = () => bands.forEach((b) => (b.w = b.track.firstElementChild.getBoundingClientRect().width));
  measure();
  fontsReady().then(measure);
  addEventListener('resize', debounce(measure));

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(bands[0].el.parentElement);

  let boost = 0;
  let heading = 1;
  ticker((_, dt) => {
    if (!visible) return;
    const lenis = state.lenis;
    const v = lenis ? lenis.velocity : 0;
    if (lenis && lenis.direction) heading = lenis.direction;
    boost += (Math.min(Math.abs(v), 60) * 0.35 - boost) * 0.08;
    const step = (0.55 + boost) * (dt / 16.67) * heading;
    bands.forEach((b) => {
      if (!b.w) return;
      b.x -= step * b.dir;
      if (b.x <= -b.w) b.x += b.w;
      if (b.x > 0) b.x -= b.w;
      b.track.style.transform = `translate3d(${b.x.toFixed(2)}px, 0, 0)`;
    });
  });
}
