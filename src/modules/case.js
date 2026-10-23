import { state } from './core.js';
import { renderCase } from '../render.js';
import { initDials } from './guilloche.js';

// Case studies open in a sliding panel and live at #/work/<id>, so they can be linked and the back button closes them.
export function initCase(projects = [], experience = []) {
  // a project made at a company listed in experience links to that company's site
  const companyUrl = (p) => experience.find((e) => e.url && [p.client, p.context].some((t) => String(t || '').startsWith(e.company)))?.url || '';
  const el = document.getElementById('case');
  const panel = el?.querySelector('.case__panel');
  if (!el || !projects.length) return;

  const behind = () => document.querySelectorAll('main, .nav, .contact, .menu');
  let isOpen = false;
  let lastFocus = null;

  const open = (id) => {
    const i = projects.findIndex((p) => String(p.id) === id);
    if (i < 0) return close();
    const next = projects.length > 1 ? projects[(i + 1) % projects.length] : null;
    const featured = projects.filter((p) => p.featured);
    const fi = featured.indexOf(projects[i]);
    panel.innerHTML = renderCase(projects[i], i, projects.length, next, companyUrl(projects[i]), fi < 0 ? i : fi);
    initDials(panel, { reduced: state.reduced });
    panel.scrollTop = 0;
    if (!isOpen) {
      isOpen = true;
      lastFocus = document.activeElement;
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      behind().forEach((n) => (n.inert = true));
      state.lenis?.stop();
    }
    panel.focus({ preventScroll: true });
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    behind().forEach((n) => (n.inert = false));
    state.lenis?.start();
    lastFocus?.focus?.({ preventScroll: true });
  };

  const route = () => {
    const m = location.hash.match(/^#\/work\/(.+)$/);
    m ? open(decodeURIComponent(m[1])) : close();
  };

  const dismiss = () => {
    if (history.state?.case) history.back();
    else {
      history.replaceState(null, '', location.pathname + location.search);
      route();
    }
  };

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#/work/"]');
    if (link) {
      e.preventDefault();
      // hopping to the next project replaces the entry, so "back" still closes the panel
      const method = isOpen ? 'replaceState' : 'pushState';
      history[method]({ case: true }, '', link.getAttribute('href'));
      route();
      return;
    }
    if (isOpen && e.target.closest('[data-close]')) {
      e.preventDefault();
      dismiss();
    }
  });

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) dismiss();
  });
  addEventListener('popstate', route);
  addEventListener('hashchange', route);

  return route;
}
