import 'lenis/dist/lenis.css';
import './style.css';

// ✏️  All the words, links and images live in data.json — edit that file, not this one.
import data from '../data.json';

import { renderApp, formOf } from './render.js';
import { state, fontsReady } from './modules/core.js';
import { initSmooth, scrollToTarget } from './modules/smooth.js';
import { initReveal, revealHero } from './modules/reveal.js';
import { initType } from './modules/type.js';
import { initDirector } from './modules/director.js';
import { initCase } from './modules/case.js';
import { initTrace } from './modules/trace.js';
import { initSound } from './modules/sound.js';
import { bootCount, initClock, initMenu, initPreviews, initCopy, initGrain, initMagnetic, initNavSpy, initPointer } from './modules/ui.js';

const root = document.documentElement;
const site = data.site || {};

root.classList.add('js', 'is-booting');
document.title = site.title || data.profile.name;
document.querySelector('meta[name="description"]')?.setAttribute('content', site.description || '');

document.getElementById('app').innerHTML = renderApp(data);

// Always start at the top so the intro plays properly (deep links are restored after).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const startHash = location.hash;
scrollTo(0, 0);

// Every formation the page can show: the section anchors, plus each project's (for its case study).
function formsOnPage() {
  const names = [...document.querySelectorAll('[data-form]')].map((el) => el.dataset.form);
  for (const p of data.projects || []) {
    const f = formOf(p.form);
    if (f) names.push(f.name);
  }
  return names;
}

// Extra keys on a `form` object in data.json are that formation's parameters.
function formParams() {
  const params = { armillary: { groups: data.skills || [] } };
  const all = [data.hero?.form, ...Object.values(data.sections || {}).map((s) => s?.form), ...(data.projects || []).map((p) => p.form)];
  for (const f of all) {
    if (!f || typeof f !== 'object' || !f.name) continue;
    const { name, caption, ...rest } = f;
    params[name] = { ...(params[name] || {}), ...rest };
  }
  return params;
}

// The portrait formation is sampled from the 3D bust that tools/portrait/make_portrait3d.py bakes
// into one image (brightness, front depth, back depth).
function loadBust(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, w, h);
      resolve({ data: g.getImageData(0, 0, w, h).data, width: w, height: h });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const preloader = site.preloader !== false && !state.reduced;

initSmooth();
initGrain();
initClock(data.profile.timezone);
initCopy();
initNavSpy();
initReveal();
initType();
initTrace();
initSound();
initMagnetic();

const hasWebGL = (() => {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
})();
if (!hasWebGL) root.classList.add('no-webgl');

// The particle engine (three.js) is by far the heaviest part of the page, so it loads on its
// own — alongside the fonts, and not at all on a device without WebGL 2.
async function startField() {
  if (!hasWebGL) return {};
  try {
    const { createField } = await import('./modules/field.js');
    const field = createField(document.querySelector('.field'), { forms: formsOnPage(), params: formParams() });
    const director = initDirector(field, { hud: document.querySelector('.hud'), layer: document.querySelector('.markers'), boot: preloader });
    return { field, director };
  } catch (err) {
    console.warn('The particle field is unavailable on this device:', err);
    root.classList.add('no-webgl');
    return {};
  }
}

(async () => {
  state.lenis?.stop();
  const [{ field = null, director = null }] = await Promise.all([startField(), fontsReady()]);

  initMenu(director);
  initPreviews(director);
  initPointer(field);
  const route = initCase(data.projects, data.experience, director);

  const bust = formParams().portrait?.src || 'images/portrait-3d.png';
  if (field?.has('portrait')) loadBust(bust).then((img) => img && field.provide('portrait', { img }));

  // Handy while editing: the parsed data and the field are in the console as `portfolio`.
  if (import.meta.env.DEV) window.portfolio = { data, state, field, director };

  if (preloader && field) await bootCount(field.count);
  root.classList.remove('is-booting');
  root.classList.add('is-booted');
  state.lenis?.start();
  director?.intro(preloader ? 2.8 : 0);
  revealHero();
  if (startHash.startsWith('#/work/')) route?.();
  else if (startHash.length > 1) {
    const target = document.getElementById(decodeURIComponent(startHash.slice(1)));
    if (target) setTimeout(() => scrollToTarget(target), 700);
  }
})();
