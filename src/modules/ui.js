import { state, pad, fontsReady } from './core.js';

/* ---------- loader ---------- */
// The monogram's minute track lights up tick by tick while the fonts arrive — the watch being wound.
export function runLoader() {
  const el = document.querySelector('.loader');
  if (!el) return fontsReady();
  if (state.reduced) {
    el.remove();
    return fontsReady();
  }

  state.lenis?.stop();
  const ticks = [...el.querySelectorAll('.tk')];
  const count = el.querySelector('[data-wind]');
  const t0 = performance.now();
  const dur = 1700;
  let loaded = false;
  fontsReady().then(() => (loaded = true));

  return new Promise((resolve) => {
    const step = (now) => {
      let p = Math.min((now - t0) / dur, 1);
      if (!loaded) p = Math.min(p, 0.92);
      const lit = Math.round((1 - Math.pow(1 - p, 2)) * ticks.length);
      ticks.forEach((t, i) => t.classList.toggle('is-lit', i < lit));
      count.textContent = pad(lit);
      if (p < 1) return requestAnimationFrame(step);
      setTimeout(() => {
        el.classList.add('is-done');
        state.lenis?.start();
        setTimeout(resolve, 450);
        setTimeout(() => el.remove(), 1600);
      }, 260);
    };
    requestAnimationFrame(step);
  });
}

/* ---------- local time ---------- */
export function initClock(timezone) {
  const opts = { hour: '2-digit', minute: '2-digit', hour12: false };
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: timezone });
  } catch {
    fmt = new Intl.DateTimeFormat('en-GB', opts);
  }
  const nodes = document.querySelectorAll('[data-clock]');
  const tick = () => {
    const t = fmt.format(new Date());
    nodes.forEach((n) => (n.textContent = t));
  };
  tick();
  setInterval(tick, 15000);
}

/* ---------- day / night dial ---------- */
export function initTheme() {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const btn = document.querySelector('.theme-toggle');
  const label = btn?.querySelector('.theme-toggle__label');
  const sync = () => {
    meta?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
    if (label) label.textContent = root.dataset.theme === 'light' ? 'Day' : 'Night';
  };
  sync();
  btn?.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {}
    sync();
  });
}

/* ---------- the index (chapters set round a dial) ---------- */
export function initIndex() {
  const btn = document.querySelector('.nav__index');
  const panel = document.getElementById('index');
  if (!btn || !panel) return;
  const behind = () => document.querySelectorAll('main, .contact');
  let lastFocus = null;
  const set = (open) => {
    if (open === panel.classList.contains('is-open')) return;
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    behind().forEach((n) => (n.inert = open));
    if (open) {
      lastFocus = document.activeElement;
      state.lenis?.stop();
      setTimeout(() => panel.querySelector('a')?.focus({ preventScroll: true }), 400);
    } else {
      state.lenis?.start();
      lastFocus?.focus?.({ preventScroll: true });
    }
  };
  btn.addEventListener('click', () => set(!panel.classList.contains('is-open')));
  panel.querySelector('.index__close')?.addEventListener('click', () => set(false));
  state.closeMenu = () => set(false);
  addEventListener('keydown', (e) => e.key === 'Escape' && set(false));
}

/* ---------- copy email ---------- */
export function initCopy() {
  const toast = document.querySelector('.toast');
  let timer;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
  };
  document.querySelectorAll('[data-copy]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        say(b.dataset.copied || 'Copied — talk soon');
      } catch {
        if (b.dataset.copy.includes('@')) location.href = `mailto:${b.dataset.copy}`;
      }
    })
  );
}

/* ---------- testimonials ---------- */
export function initQuotes() {
  const quotes = [...document.querySelectorAll('.quote')];
  const current = document.querySelector('.quotes__current');
  if (quotes.length < 2) return;
  let i = 0;
  let timer;
  let paused = false;

  const go = (n) => {
    i = (n + quotes.length) % quotes.length;
    quotes.forEach((q, k) => {
      q.classList.toggle('is-active', k === i);
      q.setAttribute('aria-hidden', String(k !== i));
    });
    if (current) current.textContent = pad(i + 1);
  };
  const schedule = () => {
    clearInterval(timer);
    if (!state.reduced) timer = setInterval(() => !paused && go(i + 1), 7000);
  };

  document.querySelectorAll('.quotes__btn').forEach((b) =>
    b.addEventListener('click', () => {
      go(i + Number(b.dataset.dir));
      schedule();
    })
  );
  const wrap = document.querySelector('.quotes__wrap');
  wrap.addEventListener('mouseenter', () => (paused = true));
  wrap.addEventListener('mouseleave', () => (paused = false));
  schedule();
}
