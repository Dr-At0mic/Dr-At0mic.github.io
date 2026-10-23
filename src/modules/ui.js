import { state, pad, fontsReady } from './core.js';

/* ---------- loader ---------- */
// The atom fills its shells one electron at a time; the counter keeps pace with the CSS
// (each electron lights 32 ms after the last, starting 250 ms in).
export function runLoader() {
  const el = document.querySelector('.loader');
  if (!el) return fontsReady();
  if (state.reduced) {
    el.remove();
    return fontsReady();
  }

  state.lenis?.stop();
  const count = el.querySelector('[data-electrons]');
  const total = el.querySelectorAll('.bohr__e').length;
  const dur = 250 + total * 32 + 260;
  let loaded = false;
  fontsReady().then(() => (loaded = true));
  requestAnimationFrame(() => el.classList.add('is-go'));
  const t0 = performance.now();

  return new Promise((resolve) => {
    const step = (now) => {
      let p = Math.min((now - t0) / dur, 1);
      if (!loaded) p = Math.min(p, 0.92);
      const lit = Math.max(0, Math.min(total, Math.floor((now - t0 - 250) / 32) + 1));
      count.textContent = pad(p < 1 ? Math.min(lit, total - 1) : total);
      if (p < 1) return requestAnimationFrame(step);
      setTimeout(() => {
        el.classList.add('is-done');
        state.lenis?.start();
        setTimeout(resolve, 380);
        setTimeout(() => el.remove(), 1300);
      }, 180);
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

/* ---------- theme ---------- */
export function initTheme() {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => meta?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim());
  sync();
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {}
    sync();
  });
}

/* ---------- mobile menu ---------- */
export function initMenu() {
  const btn = document.querySelector('.nav__menu-btn');
  const menu = document.getElementById('menu');
  if (!btn || !menu) return;
  const set = (open) => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    document.querySelector('.nav').classList.remove('is-hidden');
    open ? state.lenis?.stop() : state.lenis?.start();
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
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
