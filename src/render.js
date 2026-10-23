// Turns data.json into markup. Every section is optional — if its data is
// missing or empty, it simply isn't drawn and the numbering closes up.

export const esc = (s = '') =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pad = (n) => String(n).padStart(2, '0');
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
const f1 = (n) => +n.toFixed(1);
const chars = (s) =>
  [...s].map((c) => (c === ' ' ? '<span class="char char--space">&nbsp;</span>' : `<span class="char">${esc(c)}</span>`)).join('');

const arrowIcon = `<svg class="i-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8.5 7H17v8.5"/></svg>`;
const plusIcon = `<svg class="i-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

// `code` → monospace, **text** → bold, *text* → accent, {text} → boxed like a detector hit
export const rich = (s = '') =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\{(.+?)\}/g, '<span class="hit">$1</span>');

/* =========================================================
   The brand — element 33
   Anandhu Suresh → As → arsenic, atomic number 33. Its electrons sit in
   shells of 2, 8, 18 and 5 and its nucleus holds 33 protons and 42 neutrons.
   The mark draws exactly that atom.
   ========================================================= */
export const ELEMENT = { z: 33, symbol: 'As', shells: [2, 8, 18, 5], neutrons: 42 };
const SHELL_R = [31, 51, 72, 93];
const SHELL_NAMES = ['K', 'L', 'M', 'N'];

// Sunflower-packed nucleons, with the protons spread evenly through the neutrons.
function nucleons({ spread = 1.72, r = 1.5 } = {}) {
  const protons = ELEMENT.z;
  const total = protons + ELEMENT.neutrons;
  let out = '';
  for (let i = 0; i < total; i++) {
    const d = spread * Math.sqrt(i + 0.5);
    const a = i * 2.39996;
    const isProton = Math.floor(((i + 1) * protons) / total) > Math.floor((i * protons) / total);
    out += `<circle class="${isProton ? 'nu nu--p' : 'nu'}" cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d)}" r="${r}"/>`;
  }
  return out;
}

export const nucleus = (cls = '') => `<svg class="nucleus ${cls}" viewBox="-17 -17 34 34" aria-hidden="true">${nucleons()}</svg>`;

// The full Bohr model. Each shell is its own group so it can orbit at its own pace —
// the viewBox is centred on the nucleus, so every group spins about it.
export function bohr({ cls = '', withNucleus = true, labels = false } = {}) {
  let e = 0;
  const shells = ELEMENT.shells
    .map((n, k) => {
      const R = SHELL_R[k];
      const valence = k === ELEMENT.shells.length - 1;
      const electrons = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + k * 0.7 - Math.PI / 2;
        const [x, y] = [f1(Math.cos(a) * R), f1(Math.sin(a) * R)];
        const halo = valence ? `<circle class="bohr__halo" cx="${x}" cy="${y}" r="8"/>` : '';
        return `${halo}<circle class="bohr__e${valence ? ' is-valence' : ''}" style="--i:${e++}" cx="${x}" cy="${y}" r="${valence ? 3.3 : 2.2}"/>`;
      }).join('');
      return `<g class="bohr__shell bohr__shell--${k + 1}" style="--k:${k}"><circle class="bohr__ring" r="${R}" pathLength="1"/>${electrons}</g>`;
    })
    .join('');
  const tags = labels
    ? ELEMENT.shells
        .map((n, k) => {
          const a = -0.62;
          const R = SHELL_R[k] + 3;
          return `<text class="bohr__label" x="${f1(Math.cos(a) * R)}" y="${f1(Math.sin(a) * R)}">${SHELL_NAMES[k]}${n}</text>`;
        })
        .join('')
    : '';
  return `<svg class="bohr ${cls}" viewBox="-100 -100 200 200" aria-hidden="true">${shells}${tags}${
    withNucleus ? `<g class="bohr__nucleus">${nucleons()}</g>` : ''
  }</svg>`;
}

// The small mark for the nav and favicon: four shells, the five valence electrons, a solid core.
export const mark = `<svg class="mark" viewBox="-106 -106 212 212" aria-hidden="true">${SHELL_R.map(
  (R, k) => `<circle class="mark__ring${k === 3 ? ' mark__ring--n' : ''}" r="${R}"/>`
).join('')}<g class="mark__valence">${Array.from({ length: 5 }, (_, i) => {
  const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
  return `<circle cx="${f1(Math.cos(a) * 93)}" cy="${f1(Math.sin(a) * 93)}" r="12"/>`;
}).join('')}</g><circle class="mark__core" r="17"/></svg>`;

// A periodic-table tile. `side` is the column of small numbers down the right edge.
function tile({ z, sym, name, side = [], cls = '', tag = 'div' }) {
  return `<${tag} class="tile ${cls}">
    <span class="tile__z">${esc(z)}</span>
    ${side.length ? `<span class="tile__side">${side.map((s) => `<i>${esc(s)}</i>`).join('')}</span>` : ''}
    <span class="tile__sym">${esc(sym)}</span>
    <span class="tile__name">${esc(name)}</span>
  </${tag}>`;
}

export const selfTile = (name, cls = '') =>
  tile({ z: ELEMENT.z, sym: ELEMENT.symbol, name, side: ELEMENT.shells, cls: `tile--self ${cls}` });

// Projects are elements too. Use `symbol` from data.json, or make one from the title.
export function symbolOf(p) {
  if (p.symbol) return String(p.symbol).slice(0, 3);
  const words = String(p.title || '?').replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s\-_]+/).filter(Boolean);
  const s = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return s[0].toUpperCase() + (s[1] || '').toLowerCase();
}

/* =========================================================
   Plates — a bubble-chamber photograph for every project that has no
   screenshot. Seeded by the project id, so a project always gets the same event.
   ========================================================= */
function seeded(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A charged particle loses energy as it travels, so its path curls tighter and tighter.
function track(rnd, x, y, { W, H, curly }) {
  let a = rnd() * Math.PI * 2;
  let k = (rnd() < 0.5 ? -1 : 1) * (curly ? 0.0016 + rnd() * 0.0045 : 0.00012 + rnd() * 0.0007);
  const grow = curly ? 1.018 + rnd() * 0.03 : 1.002 + rnd() * 0.006;
  const step = 13;
  const steps = curly ? 70 + Math.floor(rnd() * 110) : 160;
  let d = `M${Math.round(x)} ${Math.round(y)}`;
  for (let s = 0; s < steps; s++) {
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    a += k * step;
    k = Math.min(Math.abs(k * grow), 0.16) * Math.sign(k);
    d += `L${Math.round(x)} ${Math.round(y)}`;
    if (x < -40 || y < -40 || x > W + 40 || y > H + 40) break;
  }
  return d;
}

export function plate(p, n) {
  const W = 1600;
  const H = 1000;
  const rnd = seeded(p.id || p.title);
  const vx = W * (0.3 + rnd() * 0.4);
  const vy = H * (0.34 + rnd() * 0.32);
  const count = Math.min(14, Math.max(7, list(p.stack).length + 3));
  const paths = Array.from({ length: count }, (_, i) => {
    const curly = i > 0 && rnd() < 0.62;
    return `<path class="${i === 0 ? 'plate__primary' : curly ? 'plate__curl' : 'plate__track'}" style="--i:${i}" pathLength="1" d="${track(rnd, vx, vy, { W, H, curly: i === 0 ? false : curly })}"/>`;
  }).join('');
  // a few stray electrons knocked loose along the way
  const deltas = Array.from({ length: 4 }, (_, i) =>
    `<path class="plate__delta" style="--i:${count + i}" pathLength="1" d="${track(rnd, W * (0.1 + rnd() * 0.8), H * (0.1 + rnd() * 0.8), { W, H, curly: true })}"/>`
  ).join('');
  const fid = (x, y) => `<path class="plate__fid" d="M${x - 14} ${y}h28M${x} ${y - 14}v28"/>`;
  const fids = [
    [120, 110], [W / 2, 110], [W - 120, 110], [120, H / 2], [W - 120, H / 2], [120, H - 110], [W / 2, H - 110], [W - 120, H - 110],
  ].map(([x, y]) => fid(x, y)).join('');
  const sym = symbolOf(p);

  return `<svg class="plate" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect class="plate__ground" width="${W}" height="${H}"/>
    <text class="plate__sym" x="${W - 90}" y="${H - 120}" text-anchor="end">${esc(sym)}</text>
    ${fids}
    <g class="plate__tracks">${deltas}${paths}</g>
    <circle class="plate__vertex" cx="${Math.round(vx)}" cy="${Math.round(vy)}" r="7"/>
    <text class="plate__meta" x="150" y="80">EVT ${pad(n)} · RUN ${esc(p.year || '')}</text>
    <text class="plate__meta" x="${W - 150}" y="80" text-anchor="end">${esc(sym.toUpperCase())}-${pad(n)}</text>
    <g class="plate__scale"><path d="M150 ${H - 60}h200M150 ${H - 70}v20M350 ${H - 70}v20"/><text x="370" y="${H - 52}">10 cm</text></g>
  </svg>`;
}

// The picture for a project: its screenshot if it has one, otherwise its plate.
function media(p, n, { lazy = true, parallax = false } = {}) {
  return p.cover
    ? `<img src="${esc(p.cover)}" alt="${esc(p.title)} — screenshot"${lazy ? ' loading="lazy"' : ''} decoding="async"${parallax ? ' data-parallax="0.06"' : ''} />`
    : plate(p, n);
}

// Section headings come from data.json → "sections", falling back to these.
const SECTION_DEFAULTS = {
  about: { label: 'About', nav: 'About' },
  work: { label: 'Selected work', nav: 'Work', title: 'Selected *work*', aside: 'Open any project for the full story.' },
  archive: { label: 'Archive', title: 'More *projects*', aside: '' },
  services: { label: 'Services', nav: '', title: 'What I *do*', aside: '' },
  skills: { label: 'Toolkit', nav: 'Skills', title: 'The *toolkit*', aside: '' },
  experience: { label: 'Experience', nav: 'Experience', title: 'Where I’ve *worked*', highlightsTitle: 'a few nice things' },
  education: { label: 'Education', nav: '', title: 'Where I *studied*', languagesTitle: 'languages' },
  play: { label: 'Off the clock', nav: '', title: 'Off the *clock*', aside: '', handlesTitle: 'find me' },
  testimonials: { label: 'Kind words', title: 'In their *words*' },
  contact: { label: 'Contact', nav: 'Contact' },
};

// Hand-written headings in data.json end in " —"; the readout style doesn't need it.
const note = (s = '') => esc(String(s).replace(/\s*[—–-]\s*$/, ''));

/* =========================================================
   Shell
   ========================================================= */
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
    ['archive', archive.length, () => archiveTable(archive, projects, num(), sec('archive'))],
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
    <div class="guides" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
    ${nav(d, links)}
    ${menu(d, links)}
    <main id="main">
      ${hero(d)}
      ${list(d.marquee).length ? spectrum(d.marquee) : ''}
      ${body}
    </main>
    ${contact(d, num(), sec('contact'))}
    <div class="case" id="case" aria-hidden="true">
      <div class="case__backdrop" data-close></div>
      <article class="case__panel" role="dialog" aria-modal="true" aria-labelledby="case-title" tabindex="-1" data-lenis-prevent></article>
    </div>
    <div class="toast" role="status" aria-live="polite"></div>
  `;
}

function loader(d) {
  return `
  <div class="loader" aria-hidden="true">
    <div class="loader__top label"><span>${esc(d.profile.name)}</span><span>Element ${ELEMENT.z} · ${ELEMENT.symbol}</span></div>
    <div class="loader__atom">${bohr({ cls: 'bohr--loader' })}</div>
    <div class="loader__bottom label">
      <span>Filling shells ${ELEMENT.shells.join(' · ')}</span>
      <span class="loader__count"><span data-electrons>00</span> / ${ELEMENT.z} e<sup>−</sup></span>
    </div>
  </div>`;
}

function nav(d, links) {
  const p = d.profile;
  return `
  <header class="nav">
    <a class="nav__brand" href="#top" aria-label="${esc(p.name)} — back to top">
      <span class="nav__mark">${mark}</span>
      <span class="nav__name">${esc(p.name)}</span>
    </a>
    <div class="nav__meta label">
      ${p.availability ? `<span class="status ${p.available ? 'is-open' : ''}"><i></i>${esc(p.availability)}</span>` : ''}
      <span class="nav__clock"><span data-clock>--:--</span> ${esc(p.city || p.location?.split(',')[0] || '')}</span>
    </div>
    <nav class="nav__links" aria-label="Primary">
      ${links.map((l, i) => `<a href="#${l.id}"><span class="nav__num">${pad(i + 1)}</span>${esc(l.label)}</a>`).join('')}
    </nav>
    <button class="theme-toggle" type="button" aria-label="Switch between light and dark"><span></span></button>
    <button class="nav__menu-btn" type="button" aria-expanded="false" aria-controls="menu"><span class="nav__menu-open">Menu</span><span class="nav__menu-close">Close</span></button>
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
      <div class="menu__socials">${list(d.socials).map((s) => `<a class="label" href="${esc(s.url)}" target="_blank" rel="noopener"${s.note ? ` title="${esc(s.note)}"` : ''}>${esc(s.label)}${s.note ? '*' : ''}</a>`).join('')}</div>
    </div>
  </div>`;
}

/* =========================================================
   Sections
   ========================================================= */
function hero(d) {
  const p = d.profile;
  const h = d.hero || {};
  const words = p.name.trim().split(/\s+/);
  const lines = [words[0], words.slice(1).join(' ')].filter(Boolean);
  const firstWork = list(d.projects).find((x) => x.featured) ? '#work' : '#contact';
  const below = list(d.marquee).length ? '#main-start' : d.about ? '#about' : firstWork;

  return `
  <section class="hero" id="top">
    <div class="hero__atom" data-atom data-cursor="Excite" aria-hidden="true">
      <div class="atom__tilt">${bohr({ cls: 'bohr--hero', withNucleus: false, labels: true })}</div>
      <div class="atom__core">${nucleus()}</div>
      <span class="atom__flash" aria-hidden="true"></span>
    </div>

    <div class="hero__body">
      ${h.eyebrow ? `<p class="label hero__eyebrow" data-fade>${esc(h.eyebrow)}</p>` : ''}
      ${h.intro ? `<p class="hero__intro" data-split>${rich(h.intro)}</p>` : ''}
      ${h.note ? `<p class="note hero__note" data-fade>${esc(h.note)}</p>` : ''}
      <div class="hero__actions" data-fade>
        <a class="btn" href="${firstWork}" data-magnetic><span>See the work</span>${arrowIcon}</a>
        <a class="btn btn--ghost" href="#contact"><span>Say hello</span></a>
      </div>
    </div>

    <div class="hero__legend" data-fade>
      ${selfTile(p.name)}
      <p class="label hero__legend-note">Fig. 0 — Bohr model, Z = ${ELEMENT.z}<br />Shells ${ELEMENT.shells.join(' · ')} — poke it</p>
    </div>

    <h1 class="hero__name" aria-label="${esc(p.name)}">
      ${lines
        .map(
          (l, i) =>
            `<span class="hero__line hero__line--${i + 1}" aria-hidden="true"><span class="hero__line-inner">${chars(l.toUpperCase())}</span></span>`
        )
        .join('')}
    </h1>

    <div class="hero__foot label" data-fade>
      <span>Z = ${ELEMENT.z} · ${esc(p.role)}</span>
      <span class="hero__loc">${esc(p.location || '')}</span>
      <a class="hero__scroll" href="${below}">Scroll <i></i></a>
    </div>
  </section>`;
}

// The marquee words, drawn as the emission lines of the element: dark mode shows the
// bright lines on black, light mode the same lines as an absorption spectrum.
function spectrum(items) {
  const rnd = seeded(items.join('|'));
  const lines = items
    .map((t, i) => {
      const x = 4 + ((i + 0.5) / items.length) * 92 + (rnd() - 0.5) * 3.2;
      const nm = Math.round(380 + (x / 100) * 320);
      const hue = Math.round(275 - ((nm - 380) / 320) * 275);
      return `<li class="spectrum__line" style="--x:${x.toFixed(2)}%;--hue:${hue};--i:${i}"><span class="spectrum__text">${esc(t)}</span><span class="spectrum__nm">${nm}</span></li>`;
    })
    .join('');
  const ticks = Array.from({ length: 9 }, (_, i) => `<span style="--x:${4 + (i / 8) * 92}%">${380 + i * 40}</span>`).join('');
  return `
  <section class="spectrum" id="main-start" aria-label="Disciplines" data-reveal>
    <div class="spectrum__head label"><span>Emission spectrum — element ${ELEMENT.z}</span><span>λ / nm</span></div>
    <ul class="spectrum__band">${lines}</ul>
    <div class="spectrum__scale label" aria-hidden="true">${ticks}</div>
  </section>`;
}

function sectionHead(num, s, count = '') {
  return `
  <header class="s-head">
    <div class="s-head__meta label"><span class="s-head__num">${num}</span><span>${esc(s.label)}</span>${count ? `<span class="s-head__count">${count}</span>` : ''}</div>
    <h2 class="s-head__title" data-split>${rich(s.title || s.label)}</h2>
    ${s.aside ? `<p class="s-head__aside" data-fade>${rich(s.aside)}</p>` : ''}
  </header>`;
}

function about(d, num, s) {
  const a = d.about;
  const p = d.profile;
  return `
  <section class="section about" id="about">
    <div class="s-head__meta label about__meta"><span class="s-head__num">${num}</span><span>${esc(s.label)}</span></div>
    <div class="about__grid">
      ${
        p.portrait
          ? `<figure class="figure about__portrait" data-fade>
              <div class="figure__frame"><img src="${esc(p.portrait)}" alt="Portrait of ${esc(p.name)}" loading="lazy" /></div>
              <figcaption class="label"><span>Fig. 1</span>${esc(p.portraitCaption || p.name)}</figcaption>
            </figure>`
          : ''
      }
      <div class="about__text">
        <p class="about__statement" data-scrub>${rich(a.statement)}</p>
        <div class="about__details">
          <div class="about__body" data-fade>${list(a.body).map((t) => `<p>${rich(t)}</p>`).join('')}</div>
          ${
            list(a.currently).length
              ? `<aside class="readout now" data-fade>
                  <p class="note">currently</p>
                  <dl>${a.currently.map((c) => `<div><dt class="label">${esc(c.label)}</dt><dd>${rich(c.value)}</dd></div>`).join('')}</dl>
                </aside>`
              : ''
          }
        </div>
      </div>
    </div>
    ${
      list(a.stats).length
        ? `<ul class="stats">
            ${a.stats
              .map(
                (st, i) => `
              <li class="stat" data-fade>
                <span class="label stat__ch">CH ${pad(i + 1)}</span>
                <span class="stat__num"><span data-count="${esc(st.value)}">0</span><small>${esc(st.suffix || '')}</small></span>
                <span class="stat__label">${esc(st.label)}</span>
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
    ? `<ul class="chips">${p.stack
        .slice(0, max)
        .map((t) => `<li>${esc(t)}</li>`)
        .join('')}${p.stack.length > max ? `<li>+${p.stack.length - max}</li>` : ''}</ul>`
    : '';

function work(featured, all, num, s) {
  return `
  <section class="section work" id="work">
    ${sectionHead(num, s, `${pad(featured.length)} elements`)}
    <div class="work__grid">
      ${featured
        .map((p, i) => {
          const n = all.indexOf(p) + 1;
          const metrics = list(p.metrics).slice(0, 3);
          return `
        <article class="card card--${(i % 4) + 1}${i === featured.length - 1 && featured.length % 2 ? ' card--last' : ''}">
          <a class="card__link" href="#/work/${esc(p.id)}" data-cursor="Open">
            <div class="card__media${p.cover ? ' has-shot' : ''}" data-reveal-media>
              ${media(p, n, { parallax: true })}
              ${tile({ z: pad(n), sym: symbolOf(p), name: p.context || '', cls: 'tile--card' })}
              <span class="card__corners" aria-hidden="true"></span>
            </div>
            <div class="card__meta label"><span>${esc(p.category)}</span><span>${esc(p.year)}</span></div>
            <h3 class="card__title">${esc(p.title)}</h3>
            <p class="card__summary">${rich(p.summary)}</p>
            ${
              metrics.length
                ? `<dl class="card__metrics">${metrics.map((m) => `<div><dt>${esc(m.value)}</dt><dd class="label">${esc(m.label)}</dd></div>`).join('')}</dl>`
                : ''
            }
            ${stackTags(p)}
          </a>
        </article>`;
        })
        .join('')}
    </div>
  </section>`;
}

// The rest of the work, set out like the periodic table — with a key tile first.
function archiveTable(items, all, num, s) {
  return `
  <section class="section archive" id="archive">
    ${sectionHead(num, s, `${pad(items.length)} elements`)}
    <ul class="ptable">
      <li class="ptable__key" aria-hidden="true">
        <div class="ptile ptile--key">
          <span class="ptile__z">No.</span><span class="ptile__year">Year</span>
          <span class="ptile__sym">Sy</span>
          <span class="ptile__title">Project</span>
          <span class="ptile__cat">Discipline</span>
        </div>
      </li>
      ${items
        .map((p) => {
          const n = all.indexOf(p) + 1;
          return `
        <li>
          <a class="ptile" href="#/work/${esc(p.id)}" data-cursor="Open">
            <span class="ptile__z">${pad(n)}</span><span class="ptile__year">${esc(p.year)}</span>
            <span class="ptile__sym">${esc(symbolOf(p))}</span>
            <span class="ptile__title">${esc(p.title)}</span>
            <span class="ptile__cat">${esc(p.category)}</span>
          </a>
        </li>`;
        })
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
          <h3 class="service__title">${esc(sv.title)}</h3>
          <p class="service__desc">${rich(sv.description)}</p>
          <ul class="chips service__tags">${list(sv.deliverables).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
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
              return `<span class="skill${core ? ' is-core' : ''}">${core ? esc(t.replace(/^\*([^*]+)\*/, '$1')) : esc(t)}</span>`;
            })
            .join('')}</p>
        </div>`
        )
        .join('')}
    </div>
    ${
      list(d.domains).length
        ? `<div class="domains" data-fade>
            <p class="note">domains I know</p>
            <ul class="chips chips--loose">${d.domains.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
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
              <p class="ledger__co">${e.url ? `<a class="ext" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.company)} ${arrowIcon}</a>` : esc(e.company)}${e.location ? ` <span>· ${esc(e.location)}</span>` : ''}</p>
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
          ? `<aside class="readout awards" data-fade>
              <p class="note">${note(s.highlightsTitle)}</p>
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
          ? `<aside class="readout langs" data-fade>
              <p class="note">${note(s.languagesTitle)}</p>
              <ul>${langs
                .map((l) => {
                  const lvl = Math.max(0, Math.min(5, Number(l.level) || 0));
                  return `<li>
                    <span class="langs__name">${esc(l.name)}</span>
                    <span class="langs__bars" role="img" aria-label="${lvl} out of 5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>
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
            (g, i) => `
          <li class="game${/now/i.test(g.status || '') ? ' is-live' : ''}" data-fade>
            <span class="label game__slot">Slot ${pad(i + 1)}</span>
            <span class="label game__status"><i></i>${esc(g.status || '')}</span>
            <h3 class="game__title">${
              g.url ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.title)}${arrowIcon}</a>` : esc(g.title)
            }</h3>
            ${g.note ? `<p class="game__note">${rich(g.note)}</p>` : ''}
            ${g.tag ? `<span class="game__tag label">${esc(g.tag)}</span>` : ''}
          </li>`
          )
          .join('')}
      </ol>
      ${
        handles.length
          ? `<aside class="readout handles" data-fade>
              <p class="note">${note(s.handlesTitle)}</p>
              <ul>${handles
                .map(
                  (h) => `<li>
                    <span class="label handles__platform">${esc(h.platform)}</span>
                    ${
                      h.url
                        ? `<a class="handles__id" href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.handle)}${arrowIcon}</a>`
                        : `<button class="handles__id" type="button" data-copy="${esc(h.handle)}" data-copied="Copied — see you in game" data-cursor="Copy">${esc(h.handle)}</button>`
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
  const handle = list(d.socials).find((so) => /github\.com\//i.test(so.url || ''))?.url.split('github.com/')[1]?.replace(/\/.*/, '');
  return `
  <footer class="contact" id="contact">
    <div class="contact__inner">
      <div class="s-head__meta label"><span class="s-head__num">${num}</span><span>${esc(s.label)}</span></div>
      <h2 class="contact__headline" data-split>${rich(c.headline || "Let's make something *together*.")}</h2>

      <div class="contact__grid">
        ${c.text ? `<p class="contact__text" data-fade>${rich(c.text)}</p>` : ''}
        <div class="contact__actions" data-fade>
          <button class="email" type="button" data-copy="${esc(p.email)}" data-cursor="Copy">
            <span class="label email__hint">Click to copy</span>
            <span class="email__text">${esc(p.email).replace('@', '@<wbr>')}</span>
          </button>
          ${p.phone ? `<a class="contact__phone label" href="tel:${esc(p.phone.replace(/\s+/g, ''))}">${esc(p.phone)}</a>` : ''}
          <a class="btn" href="mailto:${esc(p.email)}" data-magnetic><span>${esc(c.cta || 'Say hello')}</span>${arrowIcon}</a>
        </div>
        ${
          list(d.socials).length
            ? `<ul class="socials" data-fade>${d.socials
                .map((so) => `<li><a href="${esc(so.url)}" target="_blank" rel="noopener"><span class="social__label">${esc(so.label)}${so.note ? `<span class="social__note">${esc(so.note)}</span>` : ''}</span>${arrowIcon}</a></li>`)
                .join('')}</ul>`
            : ''
        }
      </div>
    </div>

    <div class="footer__sign" aria-hidden="true">
      <div class="footer__mark">${mark}</div>
      <div class="footer__name"><span class="footer__name-inner">${chars(p.name.toUpperCase())}</span></div>
    </div>

    <div class="footer__bar label">
      <span>© ${year} ${esc(p.name)}${handle ? ` · aka ${esc(handle)}` : ''}</span>
      <span class="footer__colophon">${esc(d.footer?.colophon || '')}</span>
      <span><span data-clock>--:--</span> · ${esc(p.city || p.location?.split(',')[0] || '')}</span>
      <a href="#top">Back to top ↑</a>
    </div>
  </footer>`;
}

/* =========================================================
   Case study (rendered on demand)
   ========================================================= */
export function renderCase(p, index, total, next, companyUrl = '') {
  const meta = [
    ['Made at', p.client || p.context],
    ['When', p.period || p.year],
    ['Role', list(p.role).join(', ')],
  ].filter(([, v]) => v);
  const gallery = list(p.gallery).map((g) => (typeof g === 'string' ? { src: g } : g));
  const links = [...list(p.links), ...(p.link ? [{ label: 'Visit the live site', url: p.link }] : [])];
  const metrics = list(p.metrics);

  return `
    <div class="case__bar">
      <span class="label">Element ${pad(index + 1)} / ${pad(total)}</span>
      <button class="case__close label" type="button" data-close>Close <span aria-hidden="true">✕</span></button>
    </div>
    <header class="case__head">
      ${tile({ z: pad(index + 1), sym: symbolOf(p), name: p.title, side: [p.year].filter(Boolean), cls: 'tile--case' })}
      <div class="case__intro">
        <p class="label case__cat">${esc(p.category)}${p.context ? ` · ${esc(p.context)}` : ''}</p>
        <h2 class="case__title" id="case-title">${esc(p.title)}</h2>
        <p class="case__summary">${rich(p.summary)}</p>
      </div>
    </header>
    ${
      metrics.length
        ? `<ul class="case__metrics">${metrics
            .map((m, i) => `<li><span class="label">CH ${pad(i + 1)}</span><span class="case__metric">${esc(m.value)}</span><span class="case__metric-label">${esc(m.label)}</span></li>`)
            .join('')}</ul>`
        : ''
    }
    <figure class="case__cover${p.cover ? ' has-shot' : ''}">${media(p, index + 1, { lazy: false })}</figure>
    <div class="case__body">
      <aside class="case__side">
        <dl class="case__meta">${meta.map(([k, v]) => `<div><dt class="label">${k}</dt><dd>${k === 'Made at' && companyUrl ? `<a class="ext" href="${esc(companyUrl)}" target="_blank" rel="noopener">${esc(v)} ${arrowIcon}</a>` : esc(v)}</dd></div>`).join('')}</dl>
        ${list(p.stack).length ? `<p class="label case__stack-title">Built with</p><ul class="chips">${p.stack.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      </aside>
      <div class="case__text">
        ${list(p.description).map((t) => `<p>${rich(t)}</p>`).join('')}
        ${list(p.highlights).length ? `<h3 class="note case__hl-title">the interesting bits</h3>${highlightList(p.highlights)}` : ''}
        ${
          links.length
            ? `<div class="case__links">${links
                .map((l, i) => `<a class="btn btn--small${i ? ' btn--ghost' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span>${arrowIcon}</a>`)
                .join('')}</div>`
            : ''
        }
      </div>
    </div>
    ${
      gallery.length
        ? `<div class="case__gallery">${gallery
            .map(
              (g, i) =>
                `<figure class="${g.wide ? 'is-wide' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt || `${p.title} — screenshot ${i + 1}`)}" loading="lazy" decoding="async" />${g.alt ? `<figcaption class="label">Fig. ${i + 1} — ${esc(g.alt)}</figcaption>` : ''}</figure>`
            )
            .join('')}</div>`
        : ''
    }
    ${
      next
        ? `<a class="case__next" href="#/work/${esc(next.id)}">
            <span class="label">Next element</span>
            <span class="case__next-title"><span class="case__next-sym">${esc(symbolOf(next))}</span>${esc(next.title)} ${arrowIcon}</span>
          </a>`
        : ''
    }
  `;
}
