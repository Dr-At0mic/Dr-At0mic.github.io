import { state, ticker, clamp } from './core.js';

// Floating image preview that trails the cursor across the archive list.
export function initArchive() {
  const rows = [...document.querySelectorAll('.row[data-preview]')];
  const list = document.querySelector('.archive__list');
  const preview = document.querySelector('.preview');
  if (!rows.length || !preview) return;

  // which edge the ink fill wipes in from depends on where the pointer entered
  const setOrigin = (row, e) => {
    const r = row.getBoundingClientRect();
    row.style.setProperty('--origin', e.clientY < r.top + r.height / 2 ? 'top' : 'bottom');
  };
  rows.forEach((row) => {
    row.addEventListener('mouseenter', (e) => setOrigin(row, e));
    row.addEventListener('mouseleave', (e) => setOrigin(row, e));
  });

  if (!state.finePointer) return;

  const inner = preview.querySelector('.preview__inner');
  const images = new Map();
  rows.forEach((row) => {
    const src = row.dataset.preview;
    if (!src || images.has(src)) return;
    const img = new Image();
    img.src = src;
    img.alt = '';
    img.decoding = 'async';
    inner.appendChild(img);
    images.set(src, img);
  });

  let x = 0;
  let y = 0;
  let cx = 0;
  let cy = 0;
  let rot = 0;
  let active = false;

  addEventListener('mousemove', (e) => {
    x = e.clientX;
    y = e.clientY;
  }, { passive: true });

  rows.forEach((row) => {
    row.addEventListener('mouseenter', () => {
      images.forEach((img, src) => img.classList.toggle('is-active', src === row.dataset.preview));
      if (!active) {
        cx = x;
        cy = y;
      }
      active = true;
      preview.classList.add('is-visible');
    });
  });
  list.addEventListener('mouseleave', () => {
    active = false;
    preview.classList.remove('is-visible');
  });

  ticker(() => {
    if (!active && !preview.classList.contains('is-visible')) return;
    const dx = x - cx;
    cx += dx * 0.12;
    cy += (y - cy) * 0.12;
    rot += (clamp(dx * 0.05, -9, 9) - rot) * 0.12;
    const w = preview.offsetWidth;
    const h = preview.offsetHeight;
    preview.style.transform = `translate3d(${(cx - w / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
  });
}
