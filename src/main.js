import 'lenis/dist/lenis.css';
import './style.css';

// ✏️  All the words, links and images live in data.json — edit that file, not this one.
import data from '../data.json';

import { renderApp } from './render.js';
import { state } from './modules/core.js';
import { initSmooth, scrollToTarget } from './modules/smooth.js';
import { initReveal, revealHero } from './modules/reveal.js';
import { initType } from './modules/type.js';
import { initCursor } from './modules/cursor.js';
import { initAtom } from './modules/atom.js';
import { initCase } from './modules/case.js';
import { runLoader, initClock, initTheme, initMenu, initCopy, initQuotes } from './modules/ui.js';

const root = document.documentElement;
const site = data.site || {};

document.title = site.title || data.profile.name;
document.querySelector('meta[name="description"]')?.setAttribute('content', site.description || '');
if (!root.dataset.theme) root.dataset.theme = site.defaultTheme === 'light' ? 'light' : 'dark';

document.getElementById('app').innerHTML = renderApp(data);

// Always start at the top so the intro plays properly (deep links are restored after).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const startHash = location.hash;
scrollTo(0, 0);

initSmooth();
initReveal();
initType();
initCursor(site.customCursor !== false);
initAtom();
initClock(data.profile.timezone);
initTheme();
initMenu();
initCopy();
initQuotes();
const route = initCase(data.projects, data.experience);

runLoader().then(() => {
  revealHero();
  if (startHash.startsWith('#/work/')) route?.();
  else if (startHash.length > 1) {
    const target = document.getElementById(decodeURIComponent(startHash.slice(1)));
    if (target) setTimeout(() => scrollToTarget(target), 600);
  }
});

// Handy while editing: the parsed data is available in the console as `portfolio`.
if (import.meta.env.DEV) window.portfolio = { data, state };
