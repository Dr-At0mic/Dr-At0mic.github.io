import { state, ticker, clamp, lerp, debounce } from './core.js';
import { mountDial, TONES } from './guilloche.js';
import { onScroll } from './smooth.js';

// The hero dial is a working watch: it keeps the time in the profile's timezone, shows
// today's date and the real phase of the moon, catches the light from the pointer, and
// as you scroll away it shrinks into the nav, where it opens the index.

const SYNODIC_DAYS = 29.530588853;
const A_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const BEATS = 8; // 28,800 vibrations an hour — the seconds hand moves in eighths

// Offset of a timezone from UTC right now, in ms (falls back to the visitor's own clock).
function tzOffset(timeZone) {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
        .formatToParts(new Date())
        .map((p) => [p.type, p.value])
    );
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    return Math.round((asUtc - Date.now()) / 60000) * 60000;
  } catch {
    return -new Date().getTimezoneOffset() * 60000;
  }
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function initHeroDial(timeZone) {
  const el = document.querySelector('[data-hero]');
  const slot = document.querySelector('.hero__slot');
  const dock = document.querySelector('.nav__dock');
  if (!el || !slot) return;

  const hands = {
    h: el.querySelector('.hand--h'),
    m: el.querySelector('.hand--m'),
    s: el.querySelector('.hand--s'),
  };
  const date = el.querySelector('[data-date]');
  const moon = el.querySelector('[data-moon]');
  let offset = tzOffset(timeZone);
  setInterval(() => (offset = tzOffset(timeZone)), 60000);

  const api = mountDial(el, { maxPx: 1600 });

  /* ---------- the movement ---------- */
  let lastBeat = -1;
  const tick = () => {
    const now = Date.now();
    const t = new Date(now + offset);
    const beat = Math.floor(t.getUTCMilliseconds() / (1000 / BEATS));
    const s = t.getUTCSeconds() + (state.reduced ? 0 : beat / BEATS);
    if (s === lastBeat) return;
    lastBeat = s;
    const m = t.getUTCMinutes() + s / 60;
    const h = (t.getUTCHours() % 12) + m / 60;
    hands.h.style.transform = `rotate(${h * 30}deg)`;
    hands.m.style.transform = `rotate(${m * 6}deg)`;
    hands.s.style.transform = `rotate(${s * 6}deg)`;
    if (date) date.textContent = t.getUTCDate();
    if (moon) {
      const age = (((now - A_NEW_MOON) / 86400000) % SYNODIC_DAYS + SYNODIC_DAYS) % SYNODIC_DAYS;
      moon.style.transform = `rotate(${((age / SYNODIC_DAYS - 0.5) * 180).toFixed(2)}deg)`;
    }
  };
  tick();
  if (state.reduced) setInterval(tick, 1000);
  else ticker(tick);

  /* ---------- day / night dial ---------- */
  const syncTone = () => {
    const tone = document.documentElement.dataset.theme === 'light' ? 'opaline' : 'midnight';
    el.dataset.tone = tone;
    el.style.setProperty('--d-ink', TONES[tone].ink);
    el.style.setProperty('--d-applied', TONES[tone].applied);
    api.repaint();
  };
  syncTone();
  new MutationObserver(syncTone).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- light from the pointer ---------- */
  let progress = 0;
  if (!state.reduced) {
    let target = api.light;
    addEventListener(
      'pointermove',
      (e) => {
        const r = el.getBoundingClientRect();
        target = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      },
      { passive: true }
    );
    ticker(() => {
      if (progress > 0.92) return;
      let d = target - api.light;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      if (Math.abs(d) > 0.003) api.setLight(api.light + d * 0.08);
    });
  }

  /* ---------- docking into the nav ---------- */
  if (state.reduced || !dock) return;
  el.classList.add('is-floating');
  let a;
  let b;
  const measure = () => {
    el.style.transform = '';
    const y = state.lenis ? state.lenis.scroll : scrollY;
    const r = slot.getBoundingClientRect();
    a = { x: r.left, y: r.top + y, s: r.width };
    const d = dock.getBoundingClientRect();
    b = { x: d.left, y: d.top, s: d.width };
    el.style.width = el.style.height = `${a.s}px`;
    api.fit();
    place();
  };
  const place = () => {
    const y = state.lenis ? state.lenis.scroll : scrollY;
    progress = clamp(y / Math.max(1, a.y + a.s));
    const e = easeInOut(progress);
    const x = lerp(a.x, b.x, e);
    const top = lerp(a.y - y, b.y, e);
    const k = lerp(a.s, b.s, e) / a.s;
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${top.toFixed(2)}px, 0) scale(${k.toFixed(4)})`;
    document.documentElement.classList.toggle('dial-docked', progress >= 1);
  };
  measure();
  onScroll(place);
  addEventListener('resize', debounce(measure, 120));
  document.fonts?.ready.then(measure);
}
