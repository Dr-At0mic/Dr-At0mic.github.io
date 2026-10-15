// Turns data.json into markup. Every section is optional — if its data is
// missing or empty, it simply isn't drawn and the numbering closes up.

export const esc = (s = '') =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- hand-drawn bits ---------- */

export const doodle = {
  circle: `<svg class="doodle doodle--circle" viewBox="0 0 220 90" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M178 14C128-2 38 4 14 34c-18 24 40 50 110 46 62-4 92-26 82-46C196 10 150 4 104 10"/></svg>`,
  underline: `<svg class="doodle doodle--underline" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M3 13C40 6 70 15 110 9s80-6 120 0 50 6 67-1"/></svg>`,
  arrow: `<svg class="doodle doodle--arrow" viewBox="0 0 120 90" aria-hidden="true"><path pathLength="1" d="M10 10c30-6 60 4 74 24s14 32 10 46"/><path pathLength="1" d="M80 64l14 17 11-19"/></svg>`,
  quote: `<svg class="doodle doodle--quote" viewBox="0 0 120 90" aria-hidden="true"><path d="M50 8C24 16 8 36 8 60c0 14 9 24 21 24 11 0 19-8 19-19 0-10-7-18-17-18-3 0-5 1-7 2 2-14 12-26 28-33zM110 8C84 16 68 36 68 60c0 14 9 24 21 24 11 0 19-8 19-19 0-10-7-18-17-18-3 0-5 1-7 2 2-14 12-26 28-33z"/></svg>`,
};

export const asterisk = `<svg class="asterisk" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5v30M7 12.5l26 15M7 27.5l26-15"/></svg>`;
// The brand mark — three orbits round a nucleus, an electron on each (Dr. Atomic).
const orbit = (deg) =>
  `<g transform="rotate(${deg} 20 20)"><ellipse cx="20" cy="20" rx="17.5" ry="6.6"/><circle class="atom__e" cx="31.2" cy="25.1" r="2.3"/></g>`;
export const atom = `<svg class="atom" viewBox="0 0 40 40" aria-hidden="true">${[0, 60, -60].map(orbit).join('')}<circle cx="20" cy="20" r="3.4"/></svg>`;
const arrowIcon = `<svg class="i-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8.5 7H17v8.5"/></svg>`;
const plusIcon = `<svg class="i-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

// `code` → monospace, **text** → bold, *text* → italic accent, {text} → hand-circled
export const rich = (s = '') =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\{(.+?)\}/g, (_, t) => `<span class="circled">${t}${doodle.circle}</span>`);

const pad = (n) => String(n).padStart(2, '0');
const chars = (s) =>
  [...s].map((c) => (c === ' ' ? '<span class="char char--space">&nbsp;</span>' : `<span class="char">${esc(c)}</span>`)).join('');
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);

// Section headings come from data.json → "sections", falling back to these.
const SECTION_DEFAULTS = {
  about: { label: 'About', nav: 'About' },
  work: { label: 'Selected work', nav: 'Work', title: 'Selected *work*', aside: 'Click any project for the full story.' },
  archive: { label: 'Archive', title: 'More *projects*', aside: '' },
  services: { label: 'Services', nav: '', title: 'What I *do*', aside: '' },
  skills: { label: 'Toolkit', nav: 'Skills', title: 'The *toolkit*', aside: '' },
  experience: { label: 'Experience', nav: 'Experience', title: 'Where I’ve *worked*', highlightsTitle: 'a few nice things —' },
  education: { label: 'Education', nav: '', title: 'Where I *studied*', languagesTitle: 'languages —' },
  play: { label: 'Off the clock', nav: '', title: 'Off the *clock*', aside: '', handlesTitle: 'find me —' },
  testimonials: { label: 'Kind words', title: 'In their *words*' },
  contact: { label: 'Contact', nav: 'Contact' },
};

/* ---------- shell ---------- */

export function renderApp(d) {
  const sec = (key) => ({ ...SECTION_DEFAULTS[key], ...(d.sections?.[key] || {}) });
  const projects = list(d.projects);
  const featured = projects.filter((p) => p.featured);
  const archive = projects.filter((p) => !p.featured);

  let n = 0;
  const num = () => pad(++n);

  // Which sections exist, in page order. Each knows how to draw itself.
  const sections = [
    ['about', d.about, () => about(d, num(), sec('about'))],
    ['work', featured.length, () => work(featured, projects, num(), sec('work'))],
    ['archive', archive.length, () => archiveList(archive, num(), sec('archive'))],
    ['services', list(d.services).length, () => services(d.services, num(), sec('services'))],
    ['skills', list(d.skills).length, () => skills(d, num(), sec('skills'))],
    ['experience', list(d.experience).length, () => experience(d, num(), sec('experience'))],
    ['education', list(d.education).length || list(d.languages).length, () => education(d, num(), sec('education'))],
    ['play', list(d.play?.games).length || list(d.play?.handles).length, () => play(d.play, num(), sec('play'))],
    ['testimonials', list(d.testimonials).length, () => testimonials(d.testimonials, num(), sec('testimonials'))],
  ].filter(([, present]) => present);

  const links = [
    ...sections.filter(([key]) => sec(key).nav).map(([key]) => ({ id: key === 'testimonials' ? 'kind-words' : key, label: sec(key).nav })),
    { id: 'contact', label: sec('contact').nav || 'Contact' },
  ];

  const body = sections.map(([, , draw]) => draw()).join('');

  return `
    ${d.site?.preloader !== false ? loader(d) : ''}
    <div class="cursor" aria-hidden="true"><span class="cursor__label"></span></div>
    <div class="grain" aria-hidden="true"></div>
    ${nav(d, links)}
    ${menu(d, links)}
    <main id="main">
      ${hero(d)}
      ${list(d.marquee).length ? marquee(d.marquee) : ''}
      ${body}
    </main>
    ${contact(d, num(), sec('contact'))}
    <div class="case" id="case" aria-hidden="true">
      <div class="case__backdrop" data-close></div>
      <article class="case__panel" role="dialog" aria-modal="true" aria-labelledby="case-title" tabindex="-1" data-lenis-prevent></article>
    </div>
    <div class="preview" aria-hidden="true"><div class="preview__inner"></div></div>
    <div class="toast hand" role="status" aria-live="polite"></div>
  `;
}

function loader(d) {
  return `
  <div class="loader" aria-hidden="true">
    <div class="loader__top label"><span>${esc(d.profile.name)}</span><span class="loader__eyebrow">${esc(d.hero?.eyebrow || '')}</span></div>
    <div class="loader__mark">${atom}</div>
    <div class="loader__bottom">
      <span class="label">Loading the good stuff</span>
      <span class="loader__count">000</span>
    </div>
  </div>`;
}

function nav(d, links) {
  const p = d.profile;
  return `
  <header class="nav">
    <a class="nav__brand" href="#top" aria-label="${esc(p.name)} — back to top">
      <span class="nav__mark">${atom}</span>
      <span class="nav__name">${esc(p.name)}</span>
    </a>
    <div class="nav__meta label">
      ${p.availability ? `<span class="status ${p.available ? 'is-open' : ''}"><i></i>${esc(p.availability)}</span>` : ''}
      <span class="nav__clock"><span data-clock>--:--</span> in ${esc(p.city || p.location?.split(',')[0] || '')}</span>
    </div>
    <nav class="nav__links" aria-label="Primary">
      ${links.map((l) => `<a class="roll" href="#${l.id}"><span data-text="${esc(l.label)}">${esc(l.label)}</span></a>`).join('')}
    </nav>
    <button class="theme-toggle" type="button" aria-label="Switch light / dark"><span></span></button>
    <button class="nav__menu-btn roll" type="button" aria-expanded="false" aria-controls="menu"><span data-text="Close">Menu</span></button>
  </header>`;
}

function menu(d, links) {
  return `
  <div class="menu" id="menu" aria-hidden="true">
    <nav class="menu__links" aria-label="Mobile">
      ${links.map((l, i) => `<a href="#${l.id}"><span class="label">${pad(i + 1)}</span><span class="menu__word">${esc(l.label)}</span></a>`).join('')}
    </nav>
    <div class="menu__foot">
      <a class="label menu__email" href="mailto:${esc(d.profile.email)}">${esc(d.profile.email)}</a>
      <div class="menu__socials">${list(d.socials).map((s) => `<a class="label" href="${esc(s.url)}" target="_blank" rel="noopener"${s.note ? ` title="${esc(s.note)}"` : ""}>${esc(s.label)}${s.note ? "*" : ""}</a>`).join('')}</div>
    </div>
  </div>`;
}

/* ---------- sections ---------- */

function hero(d) {
  const p = d.profile;
  const h = d.hero || {};
  const words = p.name.trim().split(/\s+/);
  const lines = [words[0], words.slice(1).join(' ')].filter(Boolean);
  const badge = h.badge || 'Available for work ✺ ';

  return `
  <section class="hero" id="top">
    <div class="hero__body">
      ${h.eyebrow ? `<p class="label hero__eyebrow" data-fade>${esc(h.eyebrow)}</p>` : ''}
      ${h.intro ? `<p class="hero__intro" data-split>${rich(h.intro)}</p>` : ''}
      ${h.note ? `<p class="hand hero__note" data-fade>${esc(h.note)}${doodle.arrow}</p>` : ''}
    </div>

    <div class="hero__aside">
      ${
        p.portrait
          ? `<figure class="polaroid" data-fade>
              <span class="tape" aria-hidden="true"></span>
              <div class="polaroid__img"><img src="${esc(p.portrait)}" alt="Portrait of ${esc(p.name)}" /></div>
              ${p.portraitCaption ? `<figcaption class="hand">${esc(p.portraitCaption)}</figcaption>` : ''}
            </figure>`
          : ''
      }
      <a class="badge ${p.portrait ? '' : 'badge--solo'}" href="#contact" data-magnetic data-fade aria-label="Get in touch">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs><path id="badge-path" d="M100 100m-76 0a76 76 0 1 1 152 0a76 76 0 1 1-152 0"/></defs>
          <text><textPath href="#badge-path" textLength="474" lengthAdjust="spacing">${esc(badge)}</textPath></text>
        </svg>
        <span class="badge__core">${arrowIcon}</span>
      </a>
    </div>

    <h1 class="hero__name" aria-label="${esc(p.name)}">
      ${lines
        .map(
          (l, i) =>
            `<span class="hero__line hero__line--${i + 1}" aria-hidden="true"><span class="hero__line-inner">${chars(l)}</span></span>`
        )
        .join('')}
    </h1>

    <div class="hero__foot label" data-fade>
      <span>${esc(p.role)}</span>
      <span class="hero__loc">${esc(p.location || '')}</span>
      <span class="hero__scroll">Scroll <i></i></span>
    </div>
  </section>`;
}

function marquee(items) {
  const group = (alt) =>
    `<span class="marquee__group">${items
      .map((t, i) => `<span class="marquee__item ${(i + alt) % 2 ? 'is-italic' : ''}">${esc(t)}</span>${asterisk}`)
      .join('')}</span>`;
  const band = (cls, dir, alt) =>
    `<div class="marquee ${cls}" data-marquee="${dir}"><div class="marquee__track">${group(alt).repeat(4)}</div></div>`;
  return `
  <section class="marquees" aria-label="Disciplines">
    ${band('marquee--b', 1, 1)}
    ${band('marquee--a', -1, 0)}
  </section>`;
}

function sectionHead(num, s, extraTitle = '') {
  return `
  <header class="s-head">
    <div class="s-head__meta label"><span>(${num})</span><span>${esc(s.label)}</span></div>
    <h2 class="s-head__title" data-split>${rich(s.title || s.label)}${extraTitle}</h2>
    ${s.aside ? `<p class="s-head__aside" data-fade>${rich(s.aside)}</p>` : ''}
  </header>`;
}

function about(d, num, s) {
  const a = d.about;
  return `
  <section class="section about" id="about">
    <div class="about__top">
      <div class="s-head__meta label about__meta"><span>(${num})</span><span>${esc(s.label)}</span></div>
      <p class="about__statement" data-scrub>${rich(a.statement)}</p>
    </div>

    <div class="about__details">
      <div class="about__body" data-fade>
        ${list(a.body).map((t) => `<p>${rich(t)}</p>`).join('')}
      </div>
      ${
        list(a.currently).length
          ? `<aside class="now" data-fade>
              <p class="hand now__title">currently —</p>
              <dl>${a.currently.map((c) => `<div><dt class="label">${esc(c.label)}</dt><dd>${rich(c.value)}</dd></div>`).join('')}</dl>
            </aside>`
          : ''
      }
    </div>

    ${
      list(a.stats).length
        ? `<ul class="stats">
            ${a.stats
              .map(
                (st) => `
              <li class="stat" data-fade>
                <span class="stat__num"><span data-count="${esc(st.value)}">0</span>${esc(st.suffix || '')}</span>
                <span class="label">${esc(st.label)}</span>
              </li>`
              )
              .join('')}
          </ul>`
        : ''
    }
  </section>`;
}

const stackTags = (p, max = 4) =>
  list(p.stack).length
    ? `<ul class="mini-tags">${p.stack
        .slice(0, max)
        .map((t) => `<li>${esc(t)}</li>`)
        .join('')}${p.stack.length > max ? `<li>+${p.stack.length - max}</li>` : ''}</ul>`
    : '';

function work(featured, all, num, s) {
  return `
  <section class="section work" id="work">
    ${sectionHead(num, s, `<sup>(${pad(featured.length)})</sup>`)}
    <div class="work__grid">
      ${featured
        .map(
          (p, i) => `
        <article class="card card--${(i % 4) + 1}">
          <a class="card__link" href="#/work/${esc(p.id)}" data-cursor="View">
            <div class="card__media" data-reveal-media>
              <img src="${esc(p.cover)}" alt="${esc(p.title)} — cover" loading="lazy" data-parallax="0.08" />
              ${p.context ? `<span class="card__context label">${esc(p.context)}</span>` : ''}
            </div>
            <div class="card__meta">
              <span class="label">${pad(all.indexOf(p) + 1)}</span>
              <h3 class="card__title">${esc(p.title)}</h3>
              <span class="label card__cat">${esc(p.category)} — ${esc(p.year)}</span>
            </div>
            <p class="card__summary">${rich(p.summary)}</p>
            ${stackTags(p)}
          </a>
        </article>`
        )
        .join('')}
    </div>
  </section>`;
}

function archiveList(items, num, s) {
  return `
  <section class="section archive" id="archive">
    ${sectionHead(num, s)}
    <div class="archive__head label" aria-hidden="true"><span>Year</span><span>Project</span><span>Discipline</span><span>Made at</span><span></span></div>
    <ul class="archive__list">
      ${items
        .map(
          (p) => `
        <li>
          <a class="row" href="#/work/${esc(p.id)}" data-preview="${esc(p.cover)}" data-cursor="Open">
            <span class="row__year label">${esc(p.year)}</span>
            <span class="row__title">${esc(p.title)}</span>
            <span class="row__cat">${esc(p.category)}</span>
            <span class="row__client">${esc(p.context || p.client || '')}</span>
            <span class="row__arrow">${arrowIcon}</span>
          </a>
        </li>`
        )
        .join('')}
    </ul>
  </section>`;
}

function services(items, num, s) {
  return `
  <section class="section services" id="services">
    ${sectionHead(num, s)}
    <ol class="services__list">
      ${items
        .map(
          (sv, i) => `
        <li class="service" data-fade>
          <span class="service__num label">${pad(i + 1)}</span>
          <h3 class="service__title"><span class="service__star">${asterisk}</span>${esc(sv.title)}</h3>
          <p class="service__desc">${rich(sv.description)}</p>
          <ul class="tags">${list(sv.deliverables).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </li>`
        )
        .join('')}
    </ol>
  </section>`;
}

function skills(d, num, s) {
  return `
  <section class="section skills" id="skills">
    ${sectionHead(num, s)}
    <div class="skills__list">
      ${d.skills
        .map(
          (g, i) => `
        <div class="skill-row" data-fade>
          <span class="label skill-row__num">${pad(i + 1)}</span>
          <h3 class="skill-row__area">${esc(g.area)}</h3>
          <p class="skill-row__items">${list(g.items)
            .map((t) => {
              const core = /^\*[^*]+\*/.test(t);
              return `<span class="skill ${core ? 'is-core' : ''}">${core ? esc(t.replace(/^\*([^*]+)\*/, '$1')) : esc(t)}</span>`;
            })
            .join('<span class="skill-sep" aria-hidden="true">/</span>')}</p>
        </div>`
        )
        .join('')}
    </div>
    ${
      list(d.domains).length
        ? `<div class="domains" data-fade>
            <p class="hand domains__title">domains I know —</p>
            <ul class="tags tags--loose">${d.domains.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </div>`
        : ''
    }
  </section>`;
}

function highlightList(items = []) {
  return `<ul class="bullets">${items.map((h) => `<li>${rich(h)}</li>`).join('')}</ul>`;
}

function experience(d, num, s) {
  const hl = list(d.highlights);
  return `
  <section class="section experience" id="experience">
    ${sectionHead(num, s)}
    <div class="experience__grid ${hl.length ? '' : 'is-solo'}">
      <ol class="ledger">
        ${d.experience
          .map(
            (e) => `
          <li class="ledger__row" data-fade>
            <span class="label ledger__period">${esc(e.period)}</span>
            <div class="ledger__main">
              <h3 class="ledger__role">${esc(e.role)}</h3>
              <p class="ledger__co">${e.url ? `<a class="ledger__link" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.company)} ${arrowIcon}</a>` : esc(e.company)}${e.location ? ` <span>· ${esc(e.location)}</span>` : ''}</p>
            </div>
            <div class="ledger__body">
              <p class="ledger__desc">${rich(e.description || '')}</p>
              ${
                list(e.highlights).length
                  ? `<details class="more">
                      <summary class="label"><span class="more__open">What I did (${e.highlights.length})</span><span class="more__close">Show less</span>${plusIcon}</summary>
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
          ? `<aside class="awards" data-fade>
              <p class="hand awards__title">${esc(s.highlightsTitle)}</p>
              <ul>${hl
                .map((h) => `<li><span class="awards__tag">${esc(h.tag || h.year || '')}</span><span class="awards__t">${esc(h.title)}</span><span class="awards__o">${esc(h.detail || h.org || '')}</span></li>`)
                .join('')}</ul>
            </aside>`
          : ''
      }
    </div>
  </section>`;
}

function education(d, num, s) {
  const langs = list(d.languages);
  return `
  <section class="section education" id="education">
    ${sectionHead(num, s)}
    <div class="education__grid ${langs.length ? '' : 'is-solo'}">
      <ol class="edu__list">
        ${list(d.education)
          .map(
            (e) => `
          <li class="edu" data-fade>
            <span class="label edu__period">${esc(e.period)}</span>
            <div class="edu__main">
              <h3 class="edu__degree">${esc(e.degree)}</h3>
              <p class="edu__inst">${esc(e.institution)}${e.board ? ` <span>· ${esc(e.board)}</span>` : ''}</p>
              ${e.detail ? `<p class="edu__detail">${rich(e.detail)}</p>` : ''}
            </div>
            ${
              e.score || e.result
                ? `<div class="edu__result">
                    ${e.score ? `<span class="edu__score">${esc(e.score)}<small>${esc(e.scoreUnit || '')}</small></span>` : ''}
                    ${e.result ? `<span class="label">${esc(e.result)}</span>` : ''}
                  </div>`
                : ''
            }
          </li>`
          )
          .join('')}
      </ol>
      ${
        langs.length
          ? `<aside class="langs" data-fade>
              <p class="hand langs__title">${esc(s.languagesTitle)}</p>
              <ul>${langs
                .map((l) => {
                  const lvl = Math.max(0, Math.min(5, Number(l.level) || 0));
                  return `<li>
                    <span class="langs__name">${esc(l.name)}</span>
                    <span class="langs__dots" role="img" aria-label="${lvl} out of 5">${'<i class="on"></i>'.repeat(lvl)}${'<i></i>'.repeat(5 - lvl)}</span>
                    <span class="langs__note">${esc(l.note || '')}</span>
                  </li>`;
                })
                .join('')}</ul>
            </aside>`
          : ''
      }
    </div>
  </section>`;
}

function play(p, num, s) {
  const games = list(p.games);
  const handles = list(p.handles);
  return `
  <section class="section play" id="play">
    ${sectionHead(num, s)}
    <div class="play__grid ${handles.length ? '' : 'is-solo'}">
      <ol class="games">
        ${games
          .map(
            (g) => `
          <li class="game" data-fade>
            <span class="label game__status">${esc(g.status || '')}</span>
            <div class="game__main">
              <h3 class="game__title">${
                g.url ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.title)}${arrowIcon}</a>` : esc(g.title)
              }</h3>
              ${g.note ? `<p class="game__note">${rich(g.note)}</p>` : ''}
            </div>
            ${g.tag ? `<span class="game__tag hand">${esc(g.tag)}</span>` : ''}
          </li>`
          )
          .join('')}
      </ol>
      ${
        handles.length
          ? `<aside class="handles" data-fade>
              <p class="hand handles__title">${esc(s.handlesTitle)}</p>
              <ul>${handles
                .map(
                  (h) => `<li>
                    <span class="label handles__platform">${esc(h.platform)}</span>
                    ${
                      h.url
                        ? `<a class="handles__id" href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.handle)}${arrowIcon}</a>`
                        : `<button class="handles__id" type="button" data-copy="${esc(h.handle)}" data-copied="copied — see you in game" data-cursor="Copy">${esc(h.handle)}</button>`
                    }
                  </li>`
                )
                .join('')}</ul>
            </aside>`
          : ''
      }
    </div>
  </section>`;
}

function testimonials(items, num, s) {
  return `
  <section class="section quotes" id="kind-words">
    ${sectionHead(num, s)}
    <div class="quotes__wrap">
      ${doodle.quote}
      <div class="quotes__stage" aria-live="polite">
        ${items
          .map(
            (q, i) => `
          <figure class="quote ${i === 0 ? 'is-active' : ''}" aria-hidden="${i !== 0}">
            <blockquote>${rich(q.quote)}</blockquote>
            <figcaption><span class="quote__name">${esc(q.name)}</span><span class="label">${esc(q.role)}</span></figcaption>
          </figure>`
          )
          .join('')}
      </div>
      ${
        items.length > 1
          ? `<div class="quotes__nav">
              <button class="quotes__btn" data-dir="-1" type="button" aria-label="Previous testimonial">${arrowIcon}</button>
              <span class="label"><span class="quotes__current">01</span> / ${pad(items.length)}</span>
              <button class="quotes__btn" data-dir="1" type="button" aria-label="Next testimonial">${arrowIcon}</button>
            </div>`
          : ''
      }
    </div>
  </section>`;
}

function contact(d, num, s) {
  const c = d.contact || {};
  const p = d.profile;
  const year = new Date().getFullYear();
  return `
  <footer class="contact" id="contact">
    <div class="contact__inner">
      <div class="s-head__meta label"><span>(${num})</span><span>${esc(s.label)}</span></div>
      <h2 class="contact__headline" data-split>${rich(c.headline || "Let's make something *together*.")}</h2>

      <div class="contact__grid">
        ${c.text ? `<p class="contact__text" data-fade>${rich(c.text)}</p>` : ''}
        <div class="contact__actions" data-fade>
          <button class="email" type="button" data-copy="${esc(p.email)}" data-cursor="Copy">
            <span class="email__text">${esc(p.email).replace("@", "@<wbr>")}</span>${doodle.underline}
          </button>
          ${p.phone ? `<a class="contact__phone label" href="tel:${esc(p.phone.replace(/\s+/g, ''))}">${esc(p.phone)}</a>` : ''}
          <a class="btn" href="mailto:${esc(p.email)}" data-magnetic><span>${esc(c.cta || 'Say hello')}</span>${arrowIcon}</a>
        </div>
        ${
          list(d.socials).length
            ? `<ul class="socials" data-fade>${d.socials
                .map((so) => `<li><a href="${esc(so.url)}" target="_blank" rel="noopener"><span class="social__label"><span class="roll"><span data-text="${esc(so.label)}">${esc(so.label)}</span></span>${so.note ? `<span class="social__note hand">${esc(so.note)}</span>` : ""}</span>${arrowIcon}</a></li>`)
                .join('')}</ul>`
            : ''
        }
      </div>
    </div>

    <div class="footer__name" aria-hidden="true"><span class="footer__name-inner">${chars(p.name)}</span></div>

    <div class="footer__bar label">
      <span>© ${year} ${esc(p.name)}</span>
      <span class="footer__colophon">${esc(d.footer?.colophon || '')}</span>
      <span><span data-clock>--:--</span> · ${esc(p.city || p.location?.split(',')[0] || '')}</span>
      <a class="roll" href="#top"><span data-text="Back to top ↑">Back to top ↑</span></a>
    </div>
  </footer>`;
}

/* ---------- case study (rendered on demand) ---------- */

export function renderCase(p, index, total, next, companyUrl = '') {
  const meta = [
    ['Made at', p.client || p.context],
    ['When', p.period || p.year],
    ['Role', list(p.role).join(', ')],
  ].filter(([, v]) => v);
  const gallery = list(p.gallery);
  const links = [...list(p.links), ...(p.link ? [{ label: 'Visit the live site', url: p.link }] : [])];
  const metrics = list(p.metrics);

  return `
    <div class="case__bar">
      <span class="label">Case study — ${pad(index + 1)} / ${pad(total)}</span>
      <button class="case__close roll" type="button" data-close><span data-text="Close ✕">Close ✕</span></button>
    </div>
    <header class="case__head">
      <p class="label case__cat">${esc(p.category)}${p.context ? ` · ${esc(p.context)}` : ''}</p>
      <h2 class="case__title" id="case-title">${esc(p.title)}</h2>
      <p class="case__summary">${rich(p.summary)}</p>
    </header>
    <figure class="case__cover"><img src="${esc(p.cover)}" alt="${esc(p.title)} — cover" /></figure>
    ${
      metrics.length
        ? `<ul class="case__metrics">${metrics
            .map((m) => `<li><span class="case__metric">${esc(m.value)}</span><span class="label">${esc(m.label)}</span></li>`)
            .join('')}</ul>`
        : ''
    }
    <div class="case__body">
      <aside class="case__side">
        <dl class="case__meta">${meta.map(([k, v]) => `<div><dt class="label">${k}</dt><dd>${k === 'Made at' && companyUrl ? `<a class="ledger__link" href="${esc(companyUrl)}" target="_blank" rel="noopener">${esc(v)} ${arrowIcon}</a>` : esc(v)}</dd></div>`).join('')}</dl>
        ${list(p.stack).length ? `<p class="label case__stack-title">Built with</p><ul class="tags">${p.stack.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      </aside>
      <div class="case__text">
        ${list(p.description).map((t) => `<p>${rich(t)}</p>`).join('')}
        ${list(p.highlights).length ? `<h3 class="hand case__hl-title">the interesting bits —</h3>${highlightList(p.highlights)}` : ''}
        ${
          links.length
            ? `<div class="case__links">${links
                .map((l) => `<a class="btn btn--small" href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span>${arrowIcon}</a>`)
                .join('')}</div>`
            : ''
        }
      </div>
    </div>
    ${gallery.length ? `<div class="case__gallery">${gallery.map((g) => `<img src="${esc(g)}" alt="" loading="lazy" />`).join('')}</div>` : ''}
    ${
      next
        ? `<a class="case__next" href="#/work/${esc(next.id)}">
            <span class="label">Next project</span>
            <span class="case__next-title">${esc(next.title)} ${arrowIcon}</span>
          </a>`
        : ''
    }
  `;
}
