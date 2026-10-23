import { state, ticker, lerp } from './core.js';

// The hero atom leans toward the pointer, and a click excites it: the outer
// electrons jump up a shell, give off a flash and fall back.
export function initAtom() {
  const atom = document.querySelector('[data-atom]');
  if (!atom) return;
  const tilt = atom.querySelector('.atom__tilt');

  // no orbiting while the hero is off screen
  let visible = true;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    atom.classList.toggle('is-paused', !visible);
  }).observe(atom);

  let timer;
  atom.addEventListener('click', () => {
    atom.classList.remove('is-excited');
    void atom.offsetWidth; // restart the flash
    atom.classList.add('is-excited');
    clearTimeout(timer);
    timer = setTimeout(() => atom.classList.remove('is-excited'), 1100);
  });

  if (state.reduced || !state.finePointer) return;

  let tx = 0;
  let ty = 0;
  let x = 0;
  let y = 0;
  addEventListener(
    'pointermove',
    (e) => {
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
    },
    { passive: true }
  );

  ticker(() => {
    if (!visible) return;
    x = lerp(x, tx, 0.05);
    y = lerp(y, ty, 0.05);
    tilt.style.setProperty('--rx', `${(63 - y * 18).toFixed(2)}deg`);
    tilt.style.setProperty('--rz', `${(-16 + x * 26).toFixed(2)}deg`);
  });
}
