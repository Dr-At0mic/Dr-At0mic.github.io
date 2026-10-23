// Turns data.json into markup. Every section is optional — if its data is
// missing or empty, it simply isn't drawn and the numbering closes up.
//
// The design is "Calibre": the portfolio set out as a watchmaker's catalogue. Projects are
// pieces in a collection, each with its own engraved dial; the hero is a working dial that
// tells the time in Thiruvananthapuram.

import { TONES, PATTERN_NAMES } from './modules/guilloche.js';

export const esc = (s = '') =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pad = (n) => String(n).padStart(2, '0');
const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : []);
const f1 = (n) => +n.toFixed(2);
const chars = (s) =>
  [...s].map((c) => (c === ' ' ? '<span class="char char--space">&nbsp;</span>' : `<span class="char">${esc(c)}</span>`)).join('');

export const roman = (n) =>
  [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((s, [v, r]) => {
    while (n >= v) {
      s += r;
      n -= v;
    }
    return s;
  }, '');

const arrowIcon = `<svg class="i-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M14 7l5 5-5 5"/></svg>`;
const plusIcon = `<svg class="i-plus" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

// `code` → monospace, **text** → bold, *text* → italic accent, {text} → engraved underline
export const rich = (s = '') =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\{(.+?)\}/g, '<span class="engraved">$1</span>');

/* =========================================================
   The monogram — A and S cut from Bodoni Moda (outlined, so it needs no font)
   inside a minute track.
   ========================================================= */
const MONO_A = 'M399.6 -486.9V-490.9H974V-486.9ZM855.2 -1530 1384.2 -4H1525.8V0H853.8V-4H1036L650.8 -1196.2L231.7 -4H473.8V0H33.8V-4H226.9L762.9 -1530Z';
const MONO_S = 'M500.2 30Q383.2 30 303.3 -8.3Q223.4 -46.7 173.4 -112.8Q123.4 -178.9 96.9 -262.3Q70.4 -345.6 59.8 -435.6H63.8Q73.3 -350.2 99 -268.3Q124.8 -186.4 173.5 -120.5Q222.2 -54.6 300.5 -15.5Q378.7 23.7 492.6 23.7Q594.8 23.7 673.6 -16Q752.4 -55.8 797.3 -125.8Q842.2 -195.8 842.2 -287.2Q842.2 -374.3 808.8 -433.5Q775.4 -492.7 720.2 -533.8Q664.9 -575 599.2 -608.4Q533.4 -641.9 467.6 -677.2Q401.9 -712.5 346.6 -759.1Q291.4 -805.6 258 -873.1Q224.6 -940.7 224.6 -1039.6Q224.6 -1158.3 273.8 -1247.8Q323 -1337.3 401.2 -1398Q479.4 -1458.7 568.3 -1489.3Q657.2 -1520 736.6 -1520Q864.6 -1520 950.2 -1464.4Q1035.7 -1408.8 1082.1 -1309.7Q1128.5 -1210.6 1139.9 -1079.6H1135.9Q1124.1 -1209.4 1078.4 -1306.9Q1032.7 -1404.4 949.9 -1459.1Q867 -1513.7 744.2 -1513.7Q672 -1513.7 605.3 -1482Q538.6 -1450.2 495.8 -1391.9Q453 -1333.6 453 -1252.8Q453 -1177.2 486.6 -1126Q520.1 -1074.8 575.6 -1036.9Q631 -999 697.4 -965.7Q763.7 -932.3 830 -894.1Q896.4 -856 951.8 -802.8Q1007.3 -749.6 1040.8 -673.1Q1074.4 -596.7 1074.4 -485.6Q1074.4 -380.6 1029.3 -287.3Q984.1 -193.9 904.7 -122.8Q825.3 -51.7 721.4 -10.8Q617.6 30 500.2 30ZM-43.8 20 59.8 -435.6H63.8L71.6 -360Q89 -287.3 113 -227.6Q137 -167.9 172 -121.6L-39.8 20ZM1135.9 -1079.6 1133.3 -1129.1Q1119 -1195.7 1099.3 -1258.7Q1079.6 -1321.7 1030.6 -1388.4L1235 -1520H1239L1139.9 -1079.6Z';

const minuteTrack = (r, long = 6, short = 3) =>
  Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2;
    const L = i % 5 ? short : long;
    const [s, c] = [Math.sin(a), -Math.cos(a)];
    return `<line class="${i % 5 ? 'tk' : 'tk tk--5'}" x1="${f1(s * r)}" y1="${f1(c * r)}" x2="${f1(s * (r - L))}" y2="${f1(c * (r - L))}"/>`;
  }).join('');

export const monogram = (cls = '') => `<svg class="monogram ${cls}" viewBox="-50 -50 100 100" aria-hidden="true">
  <circle class="monogram__rim" r="47.5"/>${minuteTrack(45, 6, 2.6)}
  <g transform="translate(-29.56 27.82) scale(0.03791)"><path class="monogram__a" d="${MONO_A}"/><path class="monogram__s" transform="translate(530 40) scale(0.74)" d="${MONO_S}"/></g>
</svg>`;

/* =========================================================
   Dials
   ========================================================= */
const TONE_NAMES = {
  midnight: 'Midnight blue',
  opaline: 'Silvered opaline',
  salmon: 'Salmon',
  racing: 'Racing green',
  bordeaux: 'Bordeaux',
  slate: 'Slate',
  glacier: 'Glacier blue',
  onyx: 'Onyx',
  tobacco: 'Tobacco',
};
const COLLECTION_TONES = ['salmon', 'midnight', 'racing', 'opaline', 'bordeaux', 'glacier', 'tobacco', 'slate', 'onyx'];
const COLLECTION_PATTERNS = ['barley', 'wave', 'sunburst', 'rosette', 'panier', 'wave', 'barley', 'sunburst', 'rosette'];

// Each piece's dial: `dial: { tone, pattern }` in data.json, or one from the house rotation.
export function finishOf(p, i = 0) {
  const tone = TONES[p.dial?.tone] ? p.dial.tone : COLLECTION_TONES[i % COLLECTION_TONES.length];
  const pattern = PATTERN_NAMES[p.dial?.pattern] ? p.dial.pattern : COLLECTION_PATTERNS[i % COLLECTION_PATTERNS.length];
  return { tone, pattern, label: `${TONE_NAMES[tone]} dial · ${PATTERN_NAMES[pattern]} guilloché` };
}

export function symbolOf(p) {
  if (p.symbol) return String(p.symbol).slice(0, 3);
  const words = String(p.title || '?').replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s\-_]+/).filter(Boolean);
  const s = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return s[0].toUpperCase() + (s[1] || '').toLowerCase();
}

export const refOf = (p, n) => `${symbolOf(p).toUpperCase()}·${pad(n)}`;

// polished baton: a body and a bright facet down its middle
const baton = (h, { double = false, inner = 66, outer = 82 } = {}) => {
  const one = (x) =>
    `<rect class="ix" x="${f1(x - 1.7)}" y="${-outer}" width="3.4" height="${outer - inner}" rx=".6"/><rect class="ix-hi" x="${f1(x - 0.35)}" y="${-outer + 1}" width=".7" height="${outer - inner - 2}"/>`;
  return `<g transform="rotate(${h * 30})">${double ? one(-2.6) + one(2.6) : one(0)}</g>`;
};

// two-tone dauphine hand: one half catches the light, the other doesn't
const hand = (cls, len, w, angle) =>
  `<g class="hand ${cls}" style="transform:rotate(${angle}deg)"><path class="hand__l" d="M0 ${f1(w * 2.6)}L${-w} 0L0 ${-len}Z"/><path class="hand__r" d="M0 ${f1(w * 2.6)}L${w} 0L0 ${-len}Z"/></g>`;

const secondsHand = (angle) =>
  `<g class="hand hand--s" style="transform:rotate(${angle}deg)"><line x1="0" y1="20" x2="0" y2="-88"/><circle cy="13" r="3"/></g><circle class="cap" r="2.6"/><circle class="cap-hi" r="1"/>`;

const fitText = (s, max, width) => Math.min(max, width / Math.max(1, s.length * 0.78));

const chapter = `<circle class="trk" r="94"/><circle class="trk" r="86.5"/>${minuteTrack(93.4, 6.5, 3.2)}`;

// a collection dial: brand under XII, the piece number in the date window, the headline metric on the sub-dial, hands at 10:10
export function pieceDial(p, n, finish, { cls = 'dial--piece', light = -2.3 } = {}) {
  const tone = TONES[finish.tone];
  const m = list(p.metrics)[0];
  const title = String(p.title).toUpperCase();
  const label = m ? String(m.label) : 'Year';
  const value = m ? String(m.value) : String(p.year || '');
  const sub = Array.from({ length: 30 }, (_, i) => i)
    .map((i) => {
      const a = (i / 30) * Math.PI * 2;
      const L = i % 5 ? 1.6 : 3;
      return `<line class="tk" x1="${f1(Math.sin(a) * 19)}" y1="${f1(-Math.cos(a) * 19)}" x2="${f1(Math.sin(a) * (19 - L))}" y2="${f1(-Math.cos(a) * (19 - L))}"/>`;
    })
    .join('');
  return `
  <div class="dial ${cls}" data-dial data-tone="${finish.tone}" data-pattern="${finish.pattern}" data-seed="${esc(p.id)}" data-light="${light}" style="--d-ink:${tone.ink};--d-applied:${tone.applied}">
    <canvas class="dial__face" aria-hidden="true"></canvas>
    <svg class="dial__print" viewBox="-100 -100 200 200" aria-hidden="true">
      ${chapter}
      ${[1, 2, 4, 5, 7, 8, 9, 10, 11].map((h) => baton(h)).join('')}${baton(0, { double: true })}
      <text class="dial__brand" y="-47" font-size="${f1(fitText(title, 8.2, 96))}">${esc(title)}</text>
      <text class="dial__line" y="-38.5">${esc(String(p.category || '').toUpperCase())}</text>
      <g class="dial__date" transform="translate(62 0)"><rect x="-8.5" y="-6" width="17" height="12" rx=".8"/><text y="2.7">${pad(n)}</text></g>
      <g class="sub" transform="translate(0 46)">
        <circle class="sub__face" r="20.5"/>${[5, 8, 11, 14].map((r) => `<circle class="sub__az" r="${r}"/>`).join('')}${sub}
        <text class="sub__v" y="2.6" font-size="${f1(fitText(value, 8.5, 30))}">${esc(value)}</text>
        <text class="sub__l" y="9.8" font-size="${f1(fitText(label, 2.9, 30))}">${esc(label.toUpperCase())}</text>
      </g>
      ${hand('hand--h', 46, 3.7, 305)}${hand('hand--m', 74, 3, 60)}${secondsHand(48)}
    </svg>
    <span class="dial__glass" aria-hidden="true"></span>
  </div>`;
}

// The hero: a working dial. Name under XII, today's date at III, the real moon phase at VI.
export function heroDial(p) {
  const name = p.name.toUpperCase();
  const city = String(p.city || p.location?.split(',')[0] || '').toUpperCase();
  const stars = [[-12, -10], [-6, -14], [3, -12.5], [11, -9], [-14, 6], [13, 7], [-4, 13], [7, 12.5], [0, 15]]
    .map(([x, y]) => `<circle class="moon__star" cx="${x}" cy="${y}" r=".45"/>`)
    .join('');
  return `
  <div class="dial dial--hero" data-dial data-hero data-tone="midnight" data-pattern="wave" data-seed="anandhu" data-light="-2.3" style="--d-ink:${TONES.midnight.ink};--d-applied:${TONES.midnight.applied}">
    <canvas class="dial__face" aria-hidden="true"></canvas>
    <svg class="dial__print" viewBox="-100 -100 200 200" aria-hidden="true">
      <defs><clipPath id="moon-window"><path d="M-17 0A17 17 0 0 1 17 0A8.5 8.5 0 0 0 0 0A8.5 8.5 0 0 0-17 0Z"/></clipPath></defs>
      ${chapter}
      ${[1, 2, 4, 5, 7, 8, 10, 11].map((h) => baton(h)).join('')}
      <text class="dial__num" y="-64">XII</text>
      <text class="dial__num" x="-71" y="4.2">IX</text>
      <text class="dial__brand" y="-43" font-size="${f1(fitText(name, 7.4, 100))}">${esc(name)}</text>
      <text class="dial__line" y="-34.5">${esc(city)}</text>
      <text class="dial__line" y="20">${esc(String(p.role || '').toUpperCase())}</text>
      <text class="dial__line dial__line--faint" y="26.5">UTC +5:30</text>
      <g class="dial__date" transform="translate(64 0)"><rect x="-8.5" y="-6" width="17" height="12" rx=".8"/><text y="2.7" data-date>--</text></g>
      <g class="moon" transform="translate(0 56)">
        <g clip-path="url(#moon-window)">
          <rect class="moon__sky" x="-18" y="-18" width="36" height="18"/>
          <g class="moon__disc" data-moon>${stars}<circle class="moon__body" cx="0" cy="-10.5" r="6.4"/><circle class="moon__body" cx="0" cy="10.5" r="6.4"/></g>
        </g>
        <path class="moon__frame" d="M-17 0A17 17 0 0 1 17 0A8.5 8.5 0 0 0 0 0A8.5 8.5 0 0 0-17 0Z"/>
      </g>
      ${hand('hand--h', 48, 4, 0)}${hand('hand--m', 76, 3.2, 0)}${secondsHand(0)}
    </svg>
    <span class="dial__glass" aria-hidden="true"></span>
  </div>`;
}

// Section headings come from data.json → "sections", falling back to these.
const SECTION_DEFAULTS = {
  about: { label: 'The maker', nav: 'The maker' },
  work: { label: 'The collection', nav: 'Collection', title: 'The *collection*', aside: '' },
  archive: { label: 'References', title: 'Further *references*', aside: '' },
  services: { label: 'Savoir-faire', nav: '', title: 'The *crafts*', aside: '' },
  skills: { label: 'The movement', nav: 'Movement', title: 'The *movement*', aside: '' },
  experience: { label: 'Provenance', nav: 'Provenance', title: 'Where I’ve *worked*', highlightsTitle: 'Distinctions' },
  education: { label: 'Certification', nav: '', title: 'Where I *studied*', languagesTitle: 'Languages' },
  play: { label: 'Off the clock', nav: '', title: 'Off the *clock*', aside: '', handlesTitle: 'Find me' },
  testimonials: { label: 'Kind words', title: 'In their *words*' },
  contact: { label: 'Appointments', nav: 'Contact' },
};

// Hand-written headings in data.json end in " —"; engraved captions don't need it.
const caption = (s = '') => esc(String(s).replace(/\s*[—–-]\s*$/, ''));

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

  // Which sections exist, in page order. Each knows how to draw itself.
  const sections = [
    ['about', d.about, () => about(d, num(), sec('about'))],
    ['work', featured.length, () => collection(featured, projects, num(), sec('work'))],
    ['archive', archive.length, () => references(archive, projects, num(), sec('archive'))],
    ['services', list(d.services).length, () => crafts(d.services, num(), sec('services'))],
    ['skills', list(d.skills).length, () => movement(d, num(), sec('skills'))],
    ['experience', list(d.experience).length, () => provenance(d, num(), sec('experience'))],
    ['education', list(d.education).length || list(d.languages).length, () => certification(d, num(), sec('education'))],
    ['play', list(d.play?.games).length || list(d.play?.handles).length, () => play(d.play, num(), sec('play'))],
    ['testimonials', list(d.testimonials).length, () => testimonials(d.testimonials, num(), sec('testimonials'))],
  ].filter(([, present]) => present);

  // the index lists every chapter, numbered like the hours
  const chapters = [
    ...sections.map(([key]) => ({ id: key === 'testimonials' ? 'kind-words' : key, label: sec(key).label })),
    { id: 'contact', label: sec('contact').label },
  ];

  const body = sections.map(([, , draw]) => draw()).join('');

  return `
    ${d.site?.preloader !== false ? loader(d) : ''}
    ${nav(d)}
    ${index(d, chapters)}
    <main id="main">
      ${hero(d)}
      ${body}
    </main>
    ${contact(d, num(), sec('contact'))}
    <div class="case" id="case" aria-hidden="true">
      <div class="case__backdrop" data-close></div>
      <article class="case__panel" role="dialog" aria-modal="true" aria-labelledby="case-title" tabindex="-1" data-lenis-prevent></article>
    </div>
    <div class="toast caps" role="status" aria-live="polite"></div>
  `;
}

function loader(d) {
  return `
  <div class="loader" aria-hidden="true">
    <div class="loader__mark">${monogram('monogram--loader')}</div>
    <p class="caps loader__line">${esc(d.profile.name)} — winding <span data-wind>00</span></p>
  </div>`;
}

function nav(d) {
  const p = d.profile;
  return `
  <header class="nav">
    <a class="nav__brand" href="#top" aria-label="${esc(p.name)} — back to top">
      ${monogram('monogram--nav')}
      <span class="nav__name">${esc(p.name)}</span>
    </a>
    <p class="nav__meta caps">
      ${p.availability ? `<span class="status ${p.available ? 'is-open' : ''}"><i></i>${esc(p.availability)}</span>` : ''}
      <span class="nav__clock"><span data-clock>--:--</span> in ${esc(p.city || p.location?.split(',')[0] || '')}</span>
    </p>
    <button class="theme-toggle caps" type="button" aria-label="Switch between the day and night dial"><span class="theme-toggle__disc" aria-hidden="true"></span><span class="theme-toggle__label"></span></button>
    <button class="nav__index caps" type="button" aria-expanded="false" aria-controls="index"><span class="nav__index-label">Index</span><span class="nav__dock" aria-hidden="true"></span></button>
  </header>`;
}

function index(d, chapters) {
  const count = chapters.length;
  return `
  <div class="index" id="index" aria-hidden="true">
    <div class="index__ring">
      <ol class="index__hours">
        ${chapters
          .map(
            (c, i) =>
              `<li style="--a:${f1((i / count) * 360)}deg"><a href="#${c.id}"><span class="index__num">${roman(i + 1)}</span><span class="index__label">${esc(c.label)}</span></a></li>`
          )
          .join('')}
      </ol>
      <div class="index__centre">
        ${monogram('monogram--index')}
        <a class="index__mail caps" href="mailto:${esc(d.profile.email)}">${esc(d.profile.email)}</a>
      </div>
    </div>
    <button class="index__close caps" type="button">Close</button>
  </div>`;
}

/* =========================================================
   Sections
   ========================================================= */
function hero(d) {
  const p = d.profile;
  const h = d.hero || {};
  const words = p.name.trim().split(/\s+/);
  const functions = list(d.marquee);
  const spec = [
    ['Calibre', p.role],
    ['Functions', p.headline],
    ['Origin', p.location],
    ['Status', p.available ? p.availability : ''],
  ].filter(([, v]) => v);

  return `
  <section class="hero" id="top">
    <div class="hero__left">
      ${h.eyebrow ? `<p class="caps hero__eyebrow" data-fade>${esc(h.eyebrow)}</p>` : ''}
      <h1 class="hero__name" data-split>${esc(words[0])}<br /><em>${esc(words.slice(1).join(' '))}</em></h1>
      ${h.intro ? `<p class="hero__intro" data-fade>${rich(h.intro)}</p>` : ''}
    </div>

    <div class="hero__slot">${heroDial(p)}</div>

    <div class="hero__right" data-fade>
      <dl class="spec">${spec.map(([k, v]) => `<div><dt class="caps">${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${h.note ? `<p class="hero__note">${esc(h.note)}</p>` : ''}
      <a class="btn" href="#work" data-magnetic><span>View the collection</span>${arrowIcon}</a>
    </div>

    <div class="hero__foot caps" data-fade>
      <span>Scroll</span>
      ${functions.length ? `<p class="hero__functions">${functions.map((f) => `<span>${esc(f)}</span>`).join('<i aria-hidden="true">◆</i>')}</p>` : '<span></span>'}
      <span><span data-clock>--:--</span> IST</span>
    </div>
  </section>`;
}

function sectionHead(num, s, note = '') {
  return `
  <header class="s-head">
    <p class="s-head__num" aria-hidden="true">${roman(num)}</p>
    <p class="caps s-head__label">${esc(s.label)}</p>
    <h2 class="s-head__title" data-split>${rich(s.title || s.label)}</h2>
    ${s.aside ? `<p class="s-head__aside" data-fade>${rich(s.aside)}</p>` : ''}
    ${note ? `<p class="caps s-head__note" data-fade>${note}</p>` : ''}
  </header>`;
}

function about(d, num, s) {
  const a = d.about;
  const p = d.profile;
  return `
  <section class="section about" id="about">
    <div class="about__head">
      <p class="s-head__num" aria-hidden="true">${roman(num)}</p>
      <p class="caps s-head__label">${esc(s.label)}</p>
    </div>
    <div class="about__grid">
      ${
        p.portrait
          ? `<figure class="arch" data-fade>
              <div class="arch__frame"><img src="${esc(p.portrait)}" alt="Portrait of ${esc(p.name)}" loading="lazy" /></div>
              <figcaption class="caps">${esc(p.portraitCaption || p.name)}</figcaption>
            </figure>`
          : ''
      }
      <div class="about__text">
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
        ? `<ul class="figures">
            ${a.stats
              .map(
                (st) => `
              <li class="figure" data-fade>
                <span class="figure__num"><span data-count="${esc(st.value)}">0</span><em>${esc(st.suffix || '')}</em></span>
                <span class="caps figure__label">${esc(st.label)}</span>
              </li>`
              )
              .join('')}
          </ul>`
        : ''
    }
  </section>`;
}

function collection(featured, all, num, s) {
  return `
  <section class="section collection" id="work">
    ${sectionHead(num, s, `${featured.length} pieces`)}
    <div class="collection__grid">
      ${featured
        .map((p, i) => {
          const n = all.indexOf(p) + 1;
          const finish = finishOf(p, i);
          return `
        <article class="piece" data-fade>
          <a class="piece__link" href="#/work/${esc(p.id)}">
            ${pieceDial(p, n, finish)}
            <div class="piece__meta caps"><span>Ref. ${refOf(p, n)}</span><span>${esc(p.year)}</span></div>
            <h3 class="piece__title">${esc(p.title)}</h3>
            <p class="piece__summary">${rich(p.summary)}</p>
            <p class="piece__finish caps">${esc(finish.label)}</p>
            <span class="piece__more caps">Discover the piece ${arrowIcon}</span>
          </a>
        </article>`;
        })
        .join('')}
    </div>
  </section>`;
}

function references(items, all, num, s) {
  return `
  <section class="section references" id="archive">
    ${sectionHead(num, s)}
    <ol class="refs">
      ${items
        .map((p) => {
          const n = all.indexOf(p) + 1;
          return `
        <li data-fade>
          <a class="ref" href="#/work/${esc(p.id)}">
            <span class="ref__no caps">${refOf(p, n)}</span>
            <span class="ref__name">${esc(p.title)}</span>
            <span class="ref__leader" aria-hidden="true"></span>
            <span class="ref__cat">${esc(p.category)}</span>
            <span class="ref__year caps">${esc(p.year)}</span>
          </a>
        </li>`;
        })
        .join('')}
    </ol>
  </section>`;
}

function crafts(items, num, s) {
  return `
  <section class="section crafts" id="services">
    ${sectionHead(num, s)}
    <ol class="crafts__list">
      ${items
        .map(
          (sv, i) => `
        <li class="craft" data-fade>
          <span class="craft__num" aria-hidden="true">${roman(i + 1)}</span>
          <h3 class="craft__title">${esc(sv.title)}</h3>
          <p class="craft__desc">${rich(sv.description)}</p>
          <p class="craft__tags caps">${list(sv.deliverables).map(esc).join('<i aria-hidden="true"> · </i>')}</p>
        </li>`
        )
        .join('')}
    </ol>
  </section>`;
}

// The toolkit as a movement. Core strengths are its jewels — and a calibre states its jewel count.
function movement(d, num, s) {
  const isCore = (t) => /^\*[^*]+\*/.test(t);
  const jewels = d.skills.reduce((n, g) => n + list(g.items).filter(isCore).length, 0);
  return `
  <section class="section movement" id="skills">
    ${sectionHead(num, s, jewels ? `Calibre fitted with ${jewels} jewels` : '')}
    <div class="movement__list">
      ${d.skills
        .map(
          (g) => `
        <div class="component" data-fade>
          <h3 class="component__area caps">${esc(g.area)}</h3>
          <p class="component__items">${list(g.items)
            .map((t) =>
              isCore(t)
                ? `<span class="part is-jewel"><i class="jewel" aria-hidden="true"></i>${esc(t.replace(/^\*([^*]+)\*/, '$1'))}</span>`
                : `<span class="part">${esc(t)}</span>`
            )
            .join('')}</p>
        </div>`
        )
        .join('')}
    </div>
    ${
      list(d.domains).length
        ? `<div class="domains" data-fade>
            <p class="caps domains__title">Domains</p>
            <p class="domains__list">${d.domains.map(esc).join('<i aria-hidden="true"> · </i>')}</p>
          </div>`
        : ''
    }
  </section>`;
}

function highlightList(items = []) {
  return `<ul class="bullets">${items.map((h) => `<li>${rich(h)}</li>`).join('')}</ul>`;
}

function provenance(d, num, s) {
  const hl = list(d.highlights);
  return `
  <section class="section provenance" id="experience">
    ${sectionHead(num, s)}
    <ol class="timeline">
      ${d.experience
        .map(
          (e) => `
        <li class="era" data-fade>
          <p class="era__period">${esc(e.period)}</p>
          <div class="era__main">
            <h3 class="era__role">${esc(e.role)}</h3>
            <p class="era__co caps">${e.url ? `<a class="ext" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.company)}</a>` : esc(e.company)}${e.location ? ` · ${esc(e.location)}` : ''}</p>
            <p class="era__desc">${rich(e.description || '')}</p>
            ${
              list(e.highlights).length
                ? `<details class="more">
                    <summary class="caps"><span class="more__open">What I did (${e.highlights.length})</span><span class="more__close">Show less</span>${plusIcon}</summary>
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
        ? `<div class="distinctions" data-fade>
            <p class="caps distinctions__title">${caption(s.highlightsTitle)}</p>
            <ul>${hl
              .map((h) => `<li><span class="distinctions__tag">${esc(h.tag || h.year || '')}</span><span class="distinctions__t">${esc(h.title)}</span><span class="distinctions__o">${esc(h.detail || h.org || '')}</span></li>`)
              .join('')}</ul>
          </div>`
        : ''
    }
  </section>`;
}

function certification(d, num, s) {
  const langs = list(d.languages);
  return `
  <section class="section certification" id="education">
    ${sectionHead(num, s)}
    <ol class="certs">
      ${list(d.education)
        .map(
          (e) => `
        <li class="cert" data-fade>
          <p class="cert__period caps">${esc(e.period)}</p>
          <div class="cert__main">
            <h3 class="cert__degree">${esc(e.degree)}</h3>
            <p class="cert__inst">${esc(e.institution)}${e.board ? ` · <span>${esc(e.board)}</span>` : ''}</p>
            ${e.detail ? `<p class="cert__detail">${rich(e.detail)}</p>` : ''}
          </div>
          ${
            e.score || e.result
              ? `<div class="cert__seal">
                  ${e.score ? `<span class="cert__score">${esc(e.score)}<small>${esc(e.scoreUnit || '')}</small></span>` : ''}
                  ${e.result ? `<span class="caps">${esc(e.result)}</span>` : ''}
                </div>`
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
                  <span class="langs__jewels" role="img" aria-label="${lvl} out of 5">${Array.from({ length: 5 }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>
                  <span class="langs__note">${esc(l.note || '')}</span>
                </li>`;
              })
              .join('')}</ul>
          </div>`
        : ''
    }
  </section>`;
}

function play(p, num, s) {
  const games = list(p.games);
  const handles = list(p.handles);
  return `
  <section class="section play" id="play">
    ${sectionHead(num, s)}
    <div class="play__grid">
      <ol class="games">
        ${games
          .map(
            (g) => `
          <li class="game${/now/i.test(g.status || '') ? ' is-live' : ''}" data-fade>
            <p class="game__status caps"><i></i>${esc(g.status || '')}</p>
            <h3 class="game__title">${g.url ? `<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.title)}</a>` : esc(g.title)}</h3>
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
                        ? `<a class="handles__id" href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.handle)}</a>`
                        : `<button class="handles__id" type="button" data-copy="${esc(h.handle)}" data-copied="Copied — see you in game">${esc(h.handle)}</button>`
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
            <figcaption><span class="quote__name">${esc(q.name)}</span><span class="caps">${esc(q.role)}</span></figcaption>
          </figure>`
          )
          .join('')}
      </div>
      ${
        items.length > 1
          ? `<div class="quotes__nav">
              <button class="quotes__btn" data-dir="-1" type="button" aria-label="Previous testimonial">${arrowIcon}</button>
              <span class="caps"><span class="quotes__current">01</span> / ${pad(items.length)}</span>
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
      <p class="s-head__num" aria-hidden="true">${roman(num)}</p>
      <p class="caps s-head__label">${esc(s.label)}</p>
      <h2 class="contact__headline" data-split>${rich(c.headline || "Let's make something *together*.")}</h2>
      ${c.text ? `<p class="contact__text" data-fade>${rich(c.text)}</p>` : ''}
      <div class="contact__actions" data-fade>
        <button class="email" type="button" data-copy="${esc(p.email)}">
          <span class="email__text">${esc(p.email).replace('@', '@<wbr>')}</span>
          <span class="caps email__hint">Click to copy</span>
        </button>
        ${p.phone ? `<a class="contact__phone caps" href="tel:${esc(p.phone.replace(/\s+/g, ''))}">${esc(p.phone)}</a>` : ''}
        <a class="btn" href="mailto:${esc(p.email)}" data-magnetic><span>${esc(c.cta || 'Say hello')}</span>${arrowIcon}</a>
      </div>
      ${
        list(d.socials).length
          ? `<ul class="socials caps" data-fade>${d.socials
              .map((so) => `<li><a href="${esc(so.url)}" target="_blank" rel="noopener"${so.note ? ` title="${esc(so.note)}"` : ''}>${esc(so.label)}</a>${so.note ? `<span class="socials__note">${esc(so.note)}</span>` : ''}</li>`)
              .join('')}</ul>`
          : ''
      }
    </div>

    <div class="footer__sign" aria-hidden="true">
      ${monogram('monogram--footer')}
      <div class="footer__name"><span class="footer__name-inner">${chars(p.name)}</span></div>
    </div>

    <div class="footer__bar caps">
      <span>© ${year} ${esc(p.name)}</span>
      <span class="footer__colophon">${esc(d.footer?.colophon || '')}</span>
      <span>It is <span data-clock>--:--</span> in ${esc(p.city || p.location?.split(',')[0] || '')}</span>
      <a href="#top">Back to top</a>
    </div>
  </footer>`;
}

/* =========================================================
   Case study — a piece's reference page (rendered on demand)
   ========================================================= */
export function renderCase(p, index, total, next, companyUrl = '', featuredIndex = 0) {
  const n = index + 1;
  const finish = finishOf(p, featuredIndex);
  const gallery = list(p.gallery).map((g) => (typeof g === 'string' ? { src: g } : g));
  const links = [...list(p.links), ...(p.link ? [{ label: 'Visit the live site', url: p.link }] : [])];
  const spec = [
    ['Made at', p.client || p.context, companyUrl],
    ['Year', p.period || p.year],
    ['Role', list(p.role).join(', ')],
    ...list(p.metrics).map((m) => [m.label, m.value]),
    ['Calibre', list(p.stack).join(' · ')],
    ['Finish', finish.label],
  ].filter(([, v]) => v);

  return `
    <div class="case__bar caps">
      <span>Ref. ${refOf(p, n)} — ${pad(n)} of ${pad(total)}</span>
      <button class="case__close caps" type="button" data-close>Close</button>
    </div>
    <div class="case__grid">
      <div class="case__stage">
        ${pieceDial(p, n, finish, { cls: 'dial--case' })}
        <p class="caps case__finish">${esc(finish.label)}</p>
      </div>
      <div class="case__info">
        <p class="caps case__cat">${esc(p.category)}${p.context ? ` · ${esc(p.context)}` : ''}</p>
        <h2 class="case__title" id="case-title">${esc(p.title)}</h2>
        <p class="case__summary">${rich(p.summary)}</p>
        <dl class="case__spec">${spec
          .map(
            ([k, v, url]) =>
              `<div><dt class="caps">${esc(k)}</dt><dd>${url ? `<a class="ext" href="${esc(url)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v)}</dd></div>`
          )
          .join('')}</dl>
        <div class="case__text">
          ${list(p.description).map((t) => `<p>${rich(t)}</p>`).join('')}
          ${list(p.highlights).length ? `<h3 class="caps case__hl-title">Functions</h3>${highlightList(p.highlights)}` : ''}
        </div>
        ${
          links.length
            ? `<div class="case__links">${links
                .map((l, i) => `<a class="btn${i ? ' btn--quiet' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.label)}</span>${arrowIcon}</a>`)
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
                `<figure class="${g.wide ? 'is-wide' : ''}"><img src="${esc(g.src)}" alt="${esc(g.alt || `${p.title} — screenshot ${i + 1}`)}" loading="lazy" decoding="async" />${g.alt ? `<figcaption class="caps">${roman(i + 1)} — ${esc(g.alt)}</figcaption>` : ''}</figure>`
            )
            .join('')}</div>`
        : ''
    }
    ${
      next
        ? `<a class="case__next" href="#/work/${esc(next.id)}">
            <span class="caps">Next piece</span>
            <span class="case__next-title">${esc(next.title)}</span>
          </a>`
        : ''
    }
  `;
}
