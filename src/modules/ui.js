import { gsap } from 'gsap';
import { state } from './core.js';
import { scrollToTarget } from './smooth.js';

/* ---------- the clock in Thiruvananthapuram ---------- */
export function initClock(timeZone = 'Asia/Kolkata') {
  const els = document.querySelectorAll('[data-clock]');
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  const tick = () => {
    const t = fmt.format(new Date());
    els.forEach((el) => el.textContent !== t && (el.textContent = t));
  };
  tick();
  setInterval(tick, 10_000);
}

/* ---------- the menu, with a preview of each project's formation ---------- */
export function initMenu(director) {
  const menu = document.getElementById('menu');
  const btn = document.querySelector('.nav__menu');
  if (!menu || !btn) return;
  const behind = () => document.querySelectorAll('main, .contact, .hud');
  const set = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    btn.firstElementChild.textContent = open ? 'Close' : 'Menu';
    behind().forEach((n) => (n.inert = open));
    open ? state.lenis?.stop() : state.lenis?.start();
    if (!open) director?.unfocus();
  };
  state.closeMenu = () => menu.classList.contains('is-open') && set(false);
  btn.addEventListener('click', () => set(!menu.classList.contains('is-open')));
  addEventListener('keydown', (e) => e.key === 'Escape' && state.closeMenu());
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    set(false);
    const target = document.querySelector(a.getAttribute('href'));
    if (target) setTimeout(() => scrollToTarget(target), 60);
  });
}

// Hovering a project name morphs the field into that project's formation.
export function initPreviews(director) {
  if (!director || !state.finePointer) return;
  let leave = null;
  document.querySelectorAll('[data-preview]').forEach((a) => {
    a.addEventListener('pointerenter', () => {
      clearTimeout(leave);
      director.focus(a.dataset.preview, 'right', a.dataset.previewLabel);
    });
    a.addEventListener('pointerleave', () => {
      leave = setTimeout(() => director.unfocus(), 140);
    });
  });
}

/* ---------- copy to clipboard ---------- */
export function initCopy() {
  const toast = document.querySelector('.toast');
  let timer;
  const show = (msg) => {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('is-on'), 2400);
  };
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      show(btn.dataset.copied || 'Copied');
    } catch {
      if (/@/.test(text)) location.href = `mailto:${text}`;
      else show(text);
    }
  });
}

/* ---------- film grain, generated rather than downloaded ---------- */
export function initGrain() {
  const el = document.querySelector('.grain');
  if (!el) return;
  const c = document.createElement('canvas');
  c.width = c.height = 180;
  const g = c.getContext('2d');
  const img = g.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  el.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
}

/* ---------- primary buttons lean towards the cursor ---------- */
export function initMagnetic() {
  if (state.reduced || !state.finePointer) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.25);
      y((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

/* ---------- the nav marks the section you're in ---------- */
export function initNavSpy() {
  const links = [...document.querySelectorAll('[data-nav]')];
  const targets = links.map((a) => document.getElementById(a.dataset.nav)).filter(Boolean);
  if (!targets.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('is-current', a.dataset.nav === e.target.id));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  targets.forEach((t) => io.observe(t));
}

/* ---------- the cursor is a charge in the field; a click is a pulse ---------- */
export function initPointer(field) {
  if (!field) return;
  addEventListener('pointermove', (e) => field.pointer(e.clientX, e.clientY, e.pointerType === 'mouse' ? 1 : 0), { passive: true });
  document.addEventListener('pointerleave', () => field.pointer(-9999, -9999, 0));
  addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, textarea, summary, .case, .menu, .nav')) return;
    field.shock(e.clientX, e.clientY);
  });
}

/* ---------- boot: count the atoms in, then let the page start ---------- */
export function bootCount(total, duration = 0.9) {
  const el = document.querySelector('[data-boot-count]');
  if (!el || state.reduced) {
    if (el) el.textContent = total.toLocaleString('en-GB');
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const o = { v: 0 };
    gsap.to(o, {
      v: total,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-GB')),
      onComplete: () => {
        document.querySelector('.boot__op').textContent = 'COMMIT;';
        resolve();
      },
    });
  });
}
