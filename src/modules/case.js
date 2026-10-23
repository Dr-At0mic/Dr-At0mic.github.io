import { state } from './core.js';
import { renderCase, formOf } from '../render.js';

// Case studies open in a panel and live at #/work/<id>, so they can be linked and the back
// button closes them. While one is open the field takes that project's formation.
export function initCase(projects = [], experience = [], director = null) {
  // a project made at a company listed in experience links to that company's site
  const companyUrl = (p) => experience.find((e) => e.url && [p.client, p.context].some((t) => String(t || '').startsWith(e.company)))?.url || '';
  const el = document.getElementById('case');
  const panel = el?.querySelector('.case__panel');
  if (!el || !projects.length) return;

  const behind = () => document.querySelectorAll('main, .nav, .contact, .menu, .hud');
  let isOpen = false;
  let lastFocus = null;

  const open = (id) => {
    const i = projects.findIndex((p) => String(p.id) === id);
    if (i < 0) return close();
    const p = projects[i];
    const next = projects.length > 1 ? projects[(i + 1) % projects.length] : null;
    panel.innerHTML = renderCase(p, i, projects.length, next, companyUrl(p));
    panel.scrollTop = 0;
    director?.focus(formOf(p.form, 'dust').name, 'right', `work/${p.id}`);
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
    director?.unfocus();
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
