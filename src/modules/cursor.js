import { state, ticker } from './core.js';

export function initCursor(enabled = true) {
  if (!enabled || !state.finePointer) return;

  const root = document.documentElement;
  const el = document.querySelector('.cursor');
  const label = el.querySelector('.cursor__label');
  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let cx = x;
  let cy = y;
  let mode = '';

  addEventListener(
    'mousemove',
    (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!root.classList.contains('has-cursor')) {
        cx = x;
        cy = y;
        root.classList.add('has-cursor');
      }
    },
    { passive: true }
  );

  document.addEventListener('mouseleave', () => el.classList.add('is-hidden'));
  document.addEventListener('mouseenter', () => el.classList.remove('is-hidden'));

  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-cursor], a, button');
    const next = !t ? '' : t.dataset.cursor ? 'label' : 'link';
    if (next === 'label') label.textContent = t.dataset.cursor;
    if (next === mode) return;
    mode = next;
    el.classList.toggle('is-link', mode === 'link');
    el.classList.toggle('is-label', mode === 'label');
  });

  ticker(() => {
    cx += (x - cx) * 0.3;
    cy += (y - cy) * 0.3;
    el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
  });

  // magnetic elements lean toward the pointer
  document.querySelectorAll('[data-magnetic]').forEach((m) => {
    m.addEventListener('mousemove', (e) => {
      const r = m.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      m.style.transform = `translate(${dx * 0.28}px, ${dy * 0.28}px)`;
    });
    m.addEventListener('mouseleave', () => (m.style.transform = ''));
  });
}
