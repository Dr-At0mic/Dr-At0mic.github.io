// Turns data.json into markup. Every section is optional — if its data is missing or empty,
// it simply isn't drawn and the numbering closes up.
//
// The design is "Atomic": the whole page sits over one field of particles. Each section with
// a `form` is an anchor — while you read it, the particles hold that shape; between sections
// they morph from one to the next. The HUD reports each change as a transaction.

import { FORMS } from './modules/forms.js';

export const esc = (s = '') =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pad = (n) => String(n).padStart(2, '0');
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
const chars = (s) =>
  [...s].map((c, i) => (c === ' ' ? '<span class="char char--space"> </span>' : `<span class="char" style="--i:${i}">${esc(c)}</span>`)).join('');

const arrow = `<svg class="i-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M14 7l5 5-5 5"/></svg>`;
const ext = `<svg class="i-ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16 16 8M9 8h7v7"/></svg>`;
const plus = `<svg class="i-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

// `code` → monospace, **text** → bold, *text* → serif italic accent, {text} → redacted until revealed
export const rich = (s = '') =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\{(.+?)\}/g, '<span class="redact" data-redact><span>$1</span></span>');

// A formation is `"form": "name"` or `"form": { "name", "caption", ...params }` in data.json.
export const formOf = (f, fallback = '') => {
  if (!f) return fallback ? { name: fallback } : null;
  return typeof f === 'string' ? { name: f } : f.name ? f : fallback ? { ...f, name: fallback } : null;
};
const shapeLabel = (name) => FORMS[name]?.label || '';

// `extra`: data-scale, data-dim, data-shift or data-markers="off" — how the director poses this one
const anchor = (form, side, label, extra = {}) =>
  form
    ? ` data-form="${esc(form.name)}" data-side="${side}" data-label="${esc(label)}"${Object.entries(extra)
        .map(([k, v]) => ` data-${k}="${esc(v)}"`)
        .join('')}`
    : '';
// big titles are sized by their longest word, so "PhoneInput" never breaks mid-word
const longest = (s = '') => Math.max(4, ...String(s).split(/\s+/).map((w) => w.length));
const fig = (n, form, cls = '') =>
  form?.caption ? `<p class="fig ${cls}" data-fade><span class="fig__n caps">Fig. ${pad(n)}</span><span class="fig__t">${rich(form.caption)}</span></p>` : '';

// Section headings come from data.json → "sections", falling back to these.
const SECTION_DEFAULTS = {
  about: { label: 'The maker', nav: 'About' },
  work: { label: 'Work', nav: 'Work', title: 'Things I’ve *built*', aside: '' },
  archive: { label: 'Also built', title: 'More *work*', aside: '' },
  services: { label: 'Brought in for', title: 'What I’m *brought in for*', aside: '' },
  skills: { label: 'Toolkit', nav: 'Toolkit', title: 'The *toolkit*', aside: '' },
  experience: { label: 'Experience', nav: 'Experience', title: 'Where I’ve *worked*', highlightsTitle: 'Achievements' },
  education: { label: 'Education', title: 'Where I *studied*', languagesTitle: 'Languages' },
  play: { label: 'Off the clock', title: 'Off the *clock*', aside: '', handlesTitle: 'Find me' },
  testimonials: { label: 'Kind words', title: 'In their *words*' },
  contact: { label: 'Contact', nav: 'Contact' },
};

const caption = (s = '') => esc(String(s).replace(/\s*[—–-]\s*$/, ''));
const cityOf = (p) => p.city || p.location?.split(',')[0] || '';

/* =========================================================
   Shell
   ========================================================= */
export function renderApp(d) {
  const sec = (key) => ({ ...SECTION_DEFAULTS[key], ...(d.sections?.[key] || {}) });
  const projects = list(d.projects);
  const featured = projects.filter((p) => p.featured);
  const archive = projects.filter((p) => !p.featured);

  let n = 0;
  const num = () => ++n;
  let figs = 0;
  const figNo = () => figs++;

  const sections = [
    ['about', d.about, () => about(d, num(), sec('about'), figNo)],
    ['work', featured.length, () => work(featured, projects, num(), sec('work'), figNo)],
    ['archive', archive.length, () => more(archive, projects, num(), sec('archive'))],
    ['services', list(d.services).length, () => services(d.services, num(), sec('services'), figNo)],
    ['skills', list(d.skills).length, () => toolkit(d, num(), sec('skills'), figNo)],
    ['experience', list(d.experience).length, () => experience(d, num(), sec('experience'), figNo)],
    ['education', list(d.education).length || list(d.languages).length, () => education(d, num(), sec('education'))],
    ['play', list(d.play?.games).length || list(d.play?.handles).length, () => play(d.play, num(), sec('play'), figNo)],
    ['testimonials', list(d.testimonials).length, () => testimonials(d.testimonials, num(), sec('testimonials'))],
  ].filter(([, present]) => present);

  const heroHtml = hero(d, figNo);
  const body = sections.map(([, , draw]) => draw()).join('');
  const links = [...sections.filter(([key]) => sec(key).nav).map(([key]) => ({ id: key, label: sec(key).nav })), { id: 'contact', label: sec('contact').nav || 'Contact' }];

  return `
    <a class="skip caps" href="#main">Skip to content</a>
    <canvas class="field" aria-hidden="true"></canvas>
    <div class="markers" aria-hidden="true"></div>
    <div class="grain" aria-hidden="true"></div>
    ${d.site?.preloader !== false ? boot() : ''}
    ${nav(d, links)}
    ${hud()}
    ${menu(d, links, featured, projects)}
    <main id="main">
      ${heroHtml}
      ${body}
    </main>
    ${contact(d, num(), sec('contact'), figNo)}
    <div class="case" id="case" aria-hidden="true">
      <div class="case__backdrop" data-close></div>
      <article class="case__panel" role="dialog" aria-modal="true" aria-labelledby="case-title" tabindex="-1" data-lenis-prevent></article>
    </div>
    <div class="toast caps" role="status" aria-live="polite"></div>
  `;
}

function boot() {
  return `
  <div class="boot" aria-hidden="true">
    <p class="boot__line caps"><span class="boot__op">BEGIN;</span> <span>allocating</span> <span class="boot__n" data-boot-count>0</span> <span>atoms</span></p>
  </div>`;
}

function nav(d, links) {
  const p = d.profile;
  const alias = list(d.socials).find((s) => /github\.com/.test(s.url))?.url.split('/').filter(Boolean).pop();
  return `
  <header class="nav">
    <a class="nav__brand" href="#top" aria-label="${esc(p.name)} — back to top">
      <span class="nav__name">${esc(p.name)}</span>
      ${alias ? `<span class="nav__alias caps">a.k.a. ${esc(alias)}</span>` : ''}
    </a>
    <nav class="nav__links caps" aria-label="Sections">
      ${links.map((l, i) => `<a href="#${l.id}" data-nav="${l.id}"><i>${pad(i + 1)}</i><span>${esc(l.label)}</span></a>`).join('')}
    </nav>
    <div class="nav__meta caps">
      <span class="nav__clock" title="${esc(p.location || '')}"><span data-clock>--:--</span> IST <span class="nav__ml" lang="ml">തിരുവനന്തപുരം</span></span>
      ${soundButton()}
      <button class="nav__menu" type="button" aria-expanded="false" aria-controls="menu"><span>Menu</span><i aria-hidden="true"></i></button>
    </div>
  </header>`;
}

const soundButton = () =>
  `<button class="nav__btn" type="button" data-sound aria-pressed="false"><span class="nav__wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span data-sound-label>Sound off</span></button>`;

function hud() {
  return `
  <div class="hud caps" aria-hidden="true">
    <p class="hud__tx">
      <span class="hud__id">TX <b data-tx-id>0001</b></span>
      <span class="hud__op" data-tx-op data-op="begin">BEGIN</span>
      <span class="hud__label"><b data-tx-path></b><span data-tx-shape></span></span>
      <span class="hud__pct" data-tx-pct></span>
    </p>
    <p class="hud__meta"><span data-tx-count>65,536</span> atoms <span class="hud__sep">·</span> <span data-progress-index>01 / 01</span></p>
    <span class="hud__bar"><i data-progress></i></span>
  </div>`;
}

function menu(d, links, featured, all) {
  return `
  <div class="menu" id="menu" aria-hidden="true" data-lenis-prevent>
    <div class="menu__inner">
      <nav class="menu__sections" aria-label="Sections">
        ${links.map((l, i) => `<a href="#${l.id}"><span class="caps">${pad(i + 1)}</span><span class="menu__big">${esc(l.label)}</span></a>`).join('')}
      </nav>
      <div class="menu__work">
        <p class="caps menu__title">Work</p>
        <ol>${featured
          .map((p) => `<li><a href="#work-${esc(p.id)}" data-preview="${esc(formOf(p.form, 'globe').name)}" data-preview-label="work/${esc(p.id)}"><span class="caps">${pad(all.indexOf(p) + 1)}</span><span>${esc(p.title)}</span><span class="caps menu__cat">${esc(p.category)}</span></a></li>`)
          .join('')}</ol>
        <a class="menu__mail" href="mailto:${esc(d.profile.email)}">${esc(d.profile.email)}</a>
      </div>
      <div class="menu__controls caps">
        <span><span data-clock>--:--</span> IST · <span lang="ml" class="nav__ml">തിരുവനന്തപുരം</span></span>
        ${soundButton()}
      </div>
    </div>
  </div>`;
}

/* =========================================================
   Sections
   ========================================================= */
function hero(d, figNo) {
  const p = d.profile;
  const h = d.hero || {};
  const form = formOf(h.form, 'atom');
  const words = p.name.trim().split(/\s+/);
  const spec = [
    ['Role', p.role],
    ['Based', p.location],
    ['Status', p.available ? p.availability : ''],
  ].filter(([, v]) => v);
  const functions = list(d.marquee);

  return `
  <section class="hero" id="top"${anchor(form, 'center', 'hero', { shift: -0.1, scale: 0.9 })}>
    <div class="hero__top" data-hero-fade>
      ${h.eyebrow ? `<p class="caps hero__eyebrow">${esc(h.eyebrow)}</p>` : ''}
      <p class="caps hero__z" aria-hidden="true"><span>Z</span> 33</p>
    </div>

    <div class="hero__intro">
      ${h.intro ? `<p class="hero__lede" data-hero-fade>${rich(h.intro)}</p>` : ''}
      ${h.note ? `<p class="hero__note" data-hero-fade>${esc(h.note)}</p>` : ''}
      <dl class="hero__spec caps" data-hero-fade>${spec.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    </div>

    ${fig(figNo(), form, 'hero__fig')}

    <h1 class="hero__name" aria-label="${esc(p.name)}">
      ${words.map((w) => `<span class="hero__line" aria-hidden="true">${chars(w.toUpperCase())}</span>`).join('')}
    </h1>

    <div class="hero__foot caps" data-hero-fade>
      <span class="hero__scroll"><i aria-hidden="true"></i>Scroll — every section is a transaction</span>
      ${functions.length ? `<p class="hero__functions">${functions.map((f) => `<span>${esc(f)}</span>`).join('<i aria-hidden="true">/</i>')}</p>` : ''}
    </div>
  </section>`;
}

function sectionHead(num, s, { note = '', big = false } = {}) {
  return `
  <header class="s-head${big ? ' s-head--big' : ''}">
    <p class="s-head__index caps"><span class="s-head__num">${pad(num)}</span><span class="s-head__label">${esc(s.label)}</span></p>
    ${s.title ? `<h2 class="s-head__title" data-split>${rich(s.title)}</h2>` : ''}
    ${s.aside || note ? `<div class="s-head__side" data-fade>${s.aside ? `<p class="s-head__aside">${rich(s.aside)}</p>` : ''}${note ? `<p class="caps s-head__note">${note}</p>` : ''}</div>` : ''}
  </header>`;
}

function about(d, num, s, figNo) {
  const a = d.about;
  const form = d.profile.portrait ? formOf(s.form, 'portrait') : formOf(s.form, 'dust');
  return `
  <section class="section about" id="about"${anchor(form, 'left', 'about/the-maker', { turn: 0.55 })}>
    <div class="about__grid">
      <div class="about__stage" aria-hidden="true"></div>
      <div class="about__text">
        ${sectionHead(num, { label: s.label })}
        <p class="about__statement" data-scrub>${rich(a.statement)}</p>
        <div class="about__body" data-fade>${list(a.body).map((t) => `<p>${rich(t)}</p>`).join('')}</div>
        ${
          list(a.currently).length
            ? `<dl class="about__now" data-fade>${a.currently.map((c) => `<div><dt class="caps">${esc(c.label)}</dt><dd>${rich(c.value)}</dd></div>`).join('')}</dl>`
            : ''
        }
      </div>
    </div>
    ${
      list(a.stats).length
        ? `<ul class="stats">${a.stats
            .map(
              (st) => `
            <li class="stat" data-fade>
              <span class="stat__num"><span data-count="${esc(st.value)}">0</span><em>${esc(st.suffix || '')}</em></span>
              <span class="caps stat__label">${esc(st.label)}</span>
            </li>`
            )
            .join('')}</ul>`
        : ''
    }
    ${d.profile.portrait ? `<noscript><img class="about__photo" src="${esc(d.profile.portrait)}" alt="Portrait of ${esc(d.profile.name)}" /></noscript>` : ''}
    ${fig(figNo(), form, 'about__fig')}
  </section>`;
}

function work(featured, all, num, s, figNo) {
  const intro = `
  <section class="section work-intro" id="work" data-form="dust" data-side="center" data-label="work/index">
    ${sectionHead(num, s, { note: `${pad(featured.length)} projects in depth · ${pad(all.length - featured.length)} more after`, big: true })}
    <ol class="work-index" data-fade>
      ${featured
        .map(
          (p) => `
        <li><a href="#work-${esc(p.id)}" data-preview="${esc(formOf(p.form, 'globe').name)}" data-preview-label="work/${esc(p.id)}">
          <span class="caps work-index__n">${pad(all.indexOf(p) + 1)}</span>
          <span class="work-index__t">${esc(p.title)}</span>
          <span class="caps work-index__c">${esc(p.category)}</span>
        </a></li>`
        )
        .join('')}
    </ol>
  </section>`;

  const chapters = featured
    .map((p, i) => {
      const n = all.indexOf(p) + 1;
      const form = formOf(p.form, 'globe');
      const side = i % 2 ? 'left' : 'right';
      const metrics = list(p.metrics).slice(0, 4);
      const links = list(p.links);
      return `
    <article class="chapter chapter--${side === 'right' ? 'text-left' : 'text-right'}" id="work-${esc(p.id)}"${anchor(form, side, `work/${p.id}`)}>
      <div class="chapter__text">
        <p class="chapter__meta caps"><span class="chapter__n">${pad(i + 1)} <i>/ ${pad(featured.length)}</i></span><span>${esc(p.category)}</span><span>${esc(p.period || p.year)}</span></p>
        <h3 class="chapter__title" data-split style="--len:${longest(p.title)}">${esc(p.title)}</h3>
        <p class="chapter__context caps" data-fade>${esc(p.client || p.context || '')}</p>
        <p class="chapter__summary" data-fade>${rich(p.summary)}</p>
        ${
          metrics.length
            ? `<dl class="metrics" data-fade>${metrics.map((m, k) => `<div class="${k === 0 ? 'is-lead' : ''}"><dd>${esc(m.value)}</dd><dt class="caps">${esc(m.label)}</dt></div>`).join('')}</dl>`
            : ''
        }
        ${list(p.stack).length ? `<p class="chapter__stack caps" data-fade>${list(p.stack).map(esc).join('<i> · </i>')}</p>` : ''}
        <div class="chapter__actions" data-fade>
          <a class="cta" href="#/work/${esc(p.id)}" data-magnetic><span>The full story</span>${arrow}</a>
          ${links.map((l) => `<a class="ext caps" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}${ext}</a>`).join('')}
        </div>
      </div>
      ${fig(figNo(), form, `chapter__fig chapter__fig--${side}`)}
      <span class="chapter__ghost" aria-hidden="true">${pad(n)}</span>
    </article>`;
    })
    .join('');

  return intro + chapters;
}

function more(items, all, num, s) {
  return `
  <section class="section archive" id="archive" data-form="dust" data-side="center" data-label="work/more">
    ${sectionHead(num, s)}
    <ol class="ledger">
      ${items
        .map((p) => {
          const n = all.indexOf(p) + 1;
          const form = formOf(p.form);
          return `
        <li data-fade>
          <a class="ledger__row" href="#/work/${esc(p.id)}"${form ? ` data-preview="${esc(form.name)}" data-preview-label="work/${esc(p.id)}"` : ''}>
            <span class="ledger__n caps">${pad(n)}</span>
            <span class="ledger__t">${esc(p.title)}</span>
            <span class="ledger__s">${rich(p.summary)}</span>
            <span class="ledger__c caps">${esc(p.category)}</span>
            <span class="ledger__y caps">${esc(p.year)}</span>
            ${arrow}
          </a>
        </li>`;
        })
        .join('')}
    </ol>
  </section>`;
}

function services(items, num, s, figNo) {
  const form = formOf(s.form, 'stack');
  return `
  <section class="section services" id="services"${anchor(form, 'right', 'services/stack')}>
    ${sectionHead(num, s)}
    <ol class="crafts">
      ${items
        .map(
          (sv, i) => `
        <li class="craft" data-fade>
          <span class="craft__n caps">${pad(i + 1)}</span>
          <h3 class="craft__t">${esc(sv.title)}</h3>
          <p class="craft__d">${rich(sv.description)}</p>
          <p class="craft__tags caps">${list(sv.deliverables).map(esc).join('<i> · </i>')}</p>
        </li>`
        )
        .join('')}
    </ol>
    ${fig(figNo(), form, 'services__fig')}
  </section>`;
}

// The toolkit. Core strengths are the bright beads on the armillary.
function toolkit(d, num, s, figNo) {
  const isCore = (t) => /^\*[^*]+\*/.test(t);
  const all = d.skills.flatMap((g) => list(g.items));
  const core = all.filter(isCore).length;
  const form = formOf(s.form, 'armillary');
  return `
  <section class="section skills" id="skills"${anchor(form, 'left', 'toolkit/armillary', { scale: 0.9 })}>
    ${sectionHead(num, s, { note: `${core} core · ${all.length} tools · ${d.skills.length} areas` })}
    <div class="toolkit">
      ${d.skills
        .map(
          (g) => `
        <div class="toolkit__group" data-fade>
          <h3 class="toolkit__area caps">${esc(g.area)} <i>${pad(list(g.items).length)}</i></h3>
          <p class="toolkit__items">${list(g.items)
            .map((t) => (isCore(t) ? `<span class="tool is-core">${esc(t.replace(/^\*([^*]+)\*/, '$1'))}</span>` : `<span class="tool">${esc(t)}</span>`))
            .join('')}</p>
        </div>`
        )
        .join('')}
    </div>
    ${
      list(d.domains).length
        ? `<div class="domains" data-fade>
            <p class="caps domains__title">Domains I know</p>
            <p class="domains__list">${d.domains.map((x) => `<span>${esc(x)}</span>`).join('')}</p>
          </div>`
        : ''
    }
    ${fig(figNo(), form, 'skills__fig')}
  </section>`;
}

function highlightList(items = []) {
  return `<ul class="bullets">${items.map((h) => `<li>${rich(h)}</li>`).join('')}</ul>`;
}

function experience(d, num, s, figNo) {
  const hl = list(d.highlights);
  const form = formOf(s.form, 'commit-graph');
  return `
  <section class="section experience" id="experience"${anchor(form, 'right', 'experience/commits', { scale: 0.82 })}>
    ${sectionHead(num, s)}
    <ol class="roles">
      ${d.experience
        .map(
          (e) => `
        <li class="role" data-fade>
          <p class="role__period caps">${esc(e.period)}</p>
          <div class="role__main">
            <h3 class="role__t">${esc(e.role)}</h3>
            <p class="role__co caps">${e.url ? `<a class="ext" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.company)}${ext}</a>` : esc(e.company)}${e.location ? ` <span>· ${esc(e.location)}</span>` : ''}</p>
            <p class="role__d">${rich(e.description || '')}</p>
            ${
              list(e.highlights).length
                ? `<details class="more">
                    <summary class="caps"><span class="more__open">What I did · ${pad(e.highlights.length)}</span><span class="more__close">Show less</span>${plus}</summary>
                    ${highlightList(e.highlights)}
                  </details>`
                : ''
            }
          </div>
        </li>`
        )
        .join('')}
    </ol>
    ${
      hl.length
        ? `<div class="achievements">
            <p class="caps achievements__title" data-fade>${caption(s.highlightsTitle)} <i>${pad(hl.length)} / ${pad(hl.length)} unlocked</i></p>
            <ul>${hl
              .map(
                (h) => `<li class="ach" data-fade><span class="ach__tag" data-count-text>${esc(h.tag || h.year || '')}</span><span class="ach__t">${esc(h.title)}</span><span class="ach__d">${esc(h.detail || h.org || '')}</span></li>`
              )
              .join('')}</ul>
          </div>`
        : ''
    }
    ${fig(figNo(), form, 'experience__fig')}
  </section>`;
}

function education(d, num, s) {
  const langs = list(d.languages);
  return `
  <section class="section education" id="education" data-form="dust" data-side="center" data-label="education">
    ${sectionHead(num, s)}
    <ol class="schools">
      ${list(d.education)
        .map(
          (e) => `
        <li class="school" data-fade>
          <p class="school__period caps">${esc(e.period)}</p>
          <div class="school__main">
            <h3 class="school__t">${esc(e.degree)}</h3>
            <p class="school__inst">${esc(e.institution)}${e.board ? ` <span>· ${esc(e.board)}</span>` : ''}</p>
            ${e.detail ? `<p class="school__d">${rich(e.detail)}</p>` : ''}
          </div>
          ${
            e.score || e.result
              ? `<p class="school__score">${e.score ? `<span class="school__v">${esc(e.score)}<small>${esc(e.scoreUnit || '')}</small></span>` : ''}${e.result ? `<span class="caps">${esc(e.result)}</span>` : ''}</p>`
              : ''
          }
        </li>`
        )
        .join('')}
    </ol>
    ${
      langs.length
        ? `<div class="langs" data-fade>
            <p class="caps langs__title">${caption(s.languagesTitle)}</p>
            <ul>${langs
              .map((l) => {
                const lvl = Math.max(0, Math.min(5, Number(l.level) || 0));
                return `<li>
                  <span class="langs__name">${esc(l.name)}</span>
                  <span class="langs__level" role="img" aria-label="${lvl} out of 5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>
                  <span class="langs__note caps">${esc(l.note || '')}</span>
                </li>`;
              })
              .join('')}</ul>
          </div>`
        : ''
    }
  </section>`;
}

function play(p, num, s, figNo) {
  const games = list(p.games);
  const handles = list(p.handles);
  const form = formOf(s.form, 'chess-king');
  return `
  <section class="section play" id="play"${anchor(form, 'right', 'off-the-clock')}>
    ${sectionHead(num, s)}
    <div class="play__grid">
      <ol class="games">
        ${games
          .map(
            (g) => `
          <li class="game${/now/i.test(g.status || '') ? ' is-live' : ''}" data-fade>
            <p class="game__status caps"><i></i>${esc(g.status || '')}</p>
            <h3 class="game__t">${g.url ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.title)}</a>` : esc(g.title)}</h3>
            ${g.note || g.tag ? `<p class="game__note">${g.note ? rich(g.note) : ''}${g.tag ? ` <span class="caps game__tag">${esc(g.tag)}</span>` : ''}</p>` : ''}
          </li>`
          )
          .join('')}
      </ol>
      ${
        handles.length
          ? `<aside class="handles" data-fade>
              <p class="caps handles__title">${caption(s.handlesTitle)}</p>
              <ul>${handles
                .map(
                  (h) => `<li>
                    <span class="caps handles__platform">${esc(h.platform)}</span>
                    ${
                      h.url
                        ? `<a class="handles__id" href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.handle)}${ext}</a>`
                        : `<button class="handles__id" type="button" data-copy="${esc(h.handle)}" data-copied="Copied — see you in game">${esc(h.handle)}<span class="caps">copy</span></button>`
                    }
                  </li>`
                )
                .join('')}</ul>
            </aside>`
          : ''
      }
    </div>
    ${fig(figNo(), form, 'play__fig')}
  </section>`;
}

function testimonials(items, num, s) {
  return `
  <section class="section quotes" id="kind-words" data-form="dust" data-side="center" data-label="kind-words">
    ${sectionHead(num, s)}
    <div class="quotes__list">
      ${items
        .map(
          (q) => `
        <figure class="quote" data-fade>
          <blockquote>${rich(q.quote)}</blockquote>
          <figcaption><span class="quote__name">${esc(q.name)}</span><span class="caps">${esc(q.role)}</span></figcaption>
        </figure>`
        )
        .join('')}
    </div>
  </section>`;
}

function contact(d, num, s, figNo) {
  const c = d.contact || {};
  const p = d.profile;
  const form = formOf(s.form, 'atom');
  const year = new Date().getFullYear();
  return `
  <footer class="contact" id="contact"${anchor(form, 'center', 'contact', { scale: 1.45, dim: 0.42, markers: 'off' })}>
    <div class="contact__inner">
      <p class="s-head__index caps"><span class="s-head__num">${pad(num)}</span><span class="s-head__label">${esc(s.label)}</span></p>
      <h2 class="contact__headline" data-split>${rich(c.headline || "Let's make something *together*.")}</h2>
      ${c.text ? `<p class="contact__text" data-fade>${rich(c.text)}</p>` : ''}
      <div class="contact__actions" data-fade>
        <button class="email" type="button" data-copy="${esc(p.email)}" data-copied="Email copied — I read everything">
          <span class="email__text">${esc(p.email).replace('@', '<wbr>@')}</span>
          <span class="caps email__hint">Click to copy</span>
        </button>
        <a class="cta" href="mailto:${esc(p.email)}" data-magnetic><span>${esc(c.cta || 'Say hello')}</span>${arrow}</a>
        ${p.phone ? `<a class="ext caps" href="tel:${esc(p.phone.replace(/\s+/g, ''))}">${esc(p.phone)}</a>` : ''}
      </div>
      ${
        list(d.socials).length
          ? `<ul class="socials caps" data-fade>${d.socials
              .map((so) => `<li><a href="${esc(so.url)}" target="_blank" rel="noopener">${esc(so.label)}${ext}</a>${so.note ? `<span class="socials__note">${esc(so.note)}</span>` : ''}</li>`)
              .join('')}</ul>`
          : ''
      }
      ${fig(figNo(), form, 'contact__fig')}
    </div>

    <section class="trace" aria-labelledby="trace-title" data-fade>
      <header class="trace__head caps">
        <h2 id="trace-title">Your visit, traced</h2>
        <p><span>trace_id</span> <b data-trace-id>…</b></p>
        <p><span>GET</span> /portfolio <b class="trace__ok">200</b> <span data-trace-total>0.0 s</span></p>
      </header>
      <ol class="trace__spans" data-trace-spans></ol>
      <p class="trace__note">This page instruments itself the way I instrument production — one span per section you read. It's computed in your browser and never leaves it.</p>
    </section>

    <div class="footer__sign" aria-hidden="true">
      <div class="footer__name">${chars(p.name.toUpperCase())}</div>
    </div>

    <div class="footer__bar caps">
      <span>© ${year} ${esc(p.name)}</span>
      <span class="footer__colophon">${esc(d.footer?.colophon || '')}</span>
      <span>It's <span data-clock>--:--</span> in ${esc(cityOf(p))}</span>
      <a href="#top">Back to top</a>
    </div>
  </footer>`;
}

/* =========================================================
   Case study — a project's full story (rendered on demand)
   ========================================================= */
export function renderCase(p, index, total, next, companyUrl = '') {
  const n = index + 1;
  const form = formOf(p.form);
  const gallery = list(p.gallery).map((g) => (typeof g === 'string' ? { src: g } : g));
  const links = [...list(p.links), ...(p.link ? [{ label: 'Visit the live site', url: p.link }] : [])];
  const spec = [
    ['Made at', p.client || p.context, companyUrl],
    ['When', p.period || p.year],
    ['Role', list(p.role).join(', ')],
    ['Built with', list(p.stack).join(' · ')],
  ].filter(([, v]) => v);

  return `
    <div class="case__bar caps">
      <span>Case ${pad(n)} <i>/ ${pad(total)}</i>${form ? ` <span class="case__shape">— ${esc(shapeLabel(form.name))}</span>` : ''}</span>
      <button class="case__close caps" type="button" data-close>Close <kbd>Esc</kbd></button>
    </div>
    <header class="case__head">
      <p class="caps case__cat">${esc(p.category)}${p.context ? ` · ${esc(p.context)}` : ''}</p>
      <h2 class="case__title" id="case-title" style="--len:${longest(p.title)}">${esc(p.title)}</h2>
      <p class="case__summary">${rich(p.summary)}</p>
    </header>
    ${
      list(p.metrics).length
        ? `<dl class="metrics metrics--case">${list(p.metrics).map((m, k) => `<div class="${k === 0 ? 'is-lead' : ''}"><dd>${esc(m.value)}</dd><dt class="caps">${esc(m.label)}</dt></div>`).join('')}</dl>`
        : ''
    }
    <div class="case__grid">
      <dl class="case__spec">${spec
        .map(([k, v, url]) => `<div><dt class="caps">${esc(k)}</dt><dd>${url ? `<a class="ext" href="${esc(url)}" target="_blank" rel="noopener">${esc(v)}${ext}</a>` : esc(v)}</dd></div>`)
        .join('')}</dl>
      <div class="case__text">
        ${list(p.description).map((t) => `<p>${rich(t)}</p>`).join('')}
        ${list(p.highlights).length ? `<h3 class="caps case__hl">How it works</h3><ol class="case__points">${p.highlights.map((h) => `<li>${rich(h)}</li>`).join('')}</ol>` : ''}
        ${
          links.length
            ? `<div class="case__links">${links.map((l, i) => `<a class="${i ? 'ext caps' : 'cta'}" href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span>${i ? ext : arrow}</a>`).join('')}</div>`
            : ''
        }
      </div>
    </div>
    ${form?.caption ? `<p class="fig case__fig"><span class="fig__n caps">Fig.</span><span class="fig__t">${rich(form.caption)}</span></p>` : ''}
    ${
      gallery.length
        ? `<div class="case__gallery">${gallery
            .map(
              (g, i) =>
                `<figure class="${g.wide ? 'is-wide' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt || `${p.title} — screenshot ${i + 1}`)}" loading="lazy" decoding="async" />${g.alt ? `<figcaption class="caps">${pad(i + 1)} — ${esc(g.alt)}</figcaption>` : ''}</figure>`
            )
            .join('')}</div>`
        : ''
    }
    ${
      next
        ? `<a class="case__next" href="#/work/${esc(next.id)}">
            <span class="caps">Next — ${pad(index + 2 > total ? 1 : index + 2)}</span>
            <span class="case__next-t">${esc(next.title)}</span>
            ${arrow}
          </a>`
        : ''
    }
  `;
}
