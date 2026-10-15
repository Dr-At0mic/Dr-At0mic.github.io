// Designed résumé and biodata — the "portfolio look" on paper.
// Dark header card with photo, two-column body, timeline experience, project cards.
// Text stays real and selectable; for strict applicant-tracking systems use the
// ATS variants in ats.mjs instead.
import { esc, html, list, skillName } from './text.mjs';

const prettyUrl = (u = '') => String(u).replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const asterisk = `<svg class="ast" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 5v30M7 12.5l26 15M7 27.5l26-15"/></svg>`;

export function pickProjects(d) {
  const all = list(d.projects);
  const ids = list(d.resume?.projects);
  if (ids.length) return ids.map((id) => all.find((p) => p.id === id)).filter(Boolean);
  return all.filter((p) => p.resume !== false).slice(0, 6);
}

/* ---------------------------------------------------------------- styles */

const css = (accent) => `
  @page { size: A4; margin: 11mm 11mm 13mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #17140f; --ink-2: #5d564b; --ink-3: #8a8275; --paper: #efe9dd; --tint: #f5f1ea;
    --line: #e0d9cc; --accent: ${accent};
  }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* keep the PDF text layer clean for copy/paste and parsers */
  * { font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'clig' 0, 'calt' 0, 'dlig' 0; }
  body { font: 8.9pt/1.48 'Instrument Sans', 'Segoe UI', Arial, sans-serif; color: var(--ink); background: #fff; }
  @media screen { body { width: 210mm; margin: 24px auto; padding: 11mm; box-shadow: 0 12px 50px rgba(0,0,0,.14); } }
  a { color: inherit; text-decoration: none; }
  ul { list-style: none; }
  strong { font-weight: 600; }
  code { font-family: 'JetBrains Mono', Consolas, monospace; font-size: .84em; }
  .serif { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: none; font-variation-settings: 'opsz' 72, 'WONK' 0; font-weight: 400; }
  .ast { width: 1em; height: 1em; display: inline-block; vertical-align: -.12em; }
  .ast path { fill: none; stroke: var(--accent); stroke-width: 5; stroke-linecap: round; }

  /* ---------- header card ---------- */
  .hero { position: relative; display: flex; align-items: center; gap: 7mm; padding: 7mm 7.5mm; border-radius: 3.5mm; background: var(--ink); color: var(--paper); overflow: hidden; }
  .hero::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1.1mm; background: var(--accent); }
  .photo { position: relative; flex: none; width: 29mm; height: 36mm; }
  .photo::before { content: ''; position: absolute; inset: 0; transform: translate(-1.8mm, 1.8mm); border-radius: 2mm; background: var(--accent); }
  .photo img { position: relative; display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 2mm; }
  .id { flex: 1; min-width: 0; position: relative; z-index: 1; }
  .kicker { font: 500 6.8pt/1 'JetBrains Mono', Consolas, monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
  .name { margin-top: 2.2mm; font-size: 27pt; font-weight: 300; line-height: .95; letter-spacing: -.025em; color: #fff; }
  .role { margin-top: 2mm; font-size: 10.5pt; color: var(--paper); }
  .tagline { margin-top: 1.2mm; font-size: 7.8pt; color: #b9b1a3; }
  .contact { position: relative; z-index: 1; display: grid; grid-template-columns: auto auto; gap: 1.1mm 3mm; align-items: baseline; font-size: 7.8pt; white-space: nowrap; }
  .contact dt { font: 500 6.2pt/1 'JetBrains Mono', Consolas, monospace; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-3); text-align: right; }
  .contact dd { color: #fff; }
  .contact dd small { display: block; font-size: 6.6pt; color: #b9b1a3; }

  /* ---------- body ---------- */
  .cols { display: grid; grid-template-columns: 55mm 1fr; gap: 0 7mm; margin-top: 6.5mm; }
  .side { padding-right: 6mm; border-right: 1px solid var(--line); }
  section + section { margin-top: 4.6mm; }
  .h { display: flex; align-items: center; gap: 2mm; margin-bottom: 2.6mm; font: 600 6.9pt/1 'JetBrains Mono', Consolas, monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--ink); break-after: avoid; }
  .h::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  .lead { font-size: 9.6pt; line-height: 1.5; }

  /* sidebar blocks */
  .wins li { display: grid; grid-template-columns: 13mm 1fr; gap: 0 2mm; padding: 1.5mm 0; border-top: 1px dashed var(--line); break-inside: avoid; }
  .wins li:first-child { border-top: 0; padding-top: 0; }
  .wins b { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: none; font-variation-settings: 'opsz' 72; font-weight: 300; font-size: 14pt; line-height: 1; letter-spacing: -.03em; color: var(--accent); }
  .wins span { font-size: 7.9pt; line-height: 1.35; }
  .skills > div { break-inside: avoid; }
  .skills > div + div { margin-top: 2.2mm; }
  .skills dt { font-weight: 600; font-size: 8.2pt; }
  .skills dd { color: var(--ink-2); font-size: 7.9pt; line-height: 1.4; }
  .edu li { break-inside: avoid; }
  .edu li + li { margin-top: 2.8mm; }
  .edu .deg { font-weight: 600; font-size: 8.6pt; }
  .edu .inst { color: var(--ink-2); font-size: 7.8pt; line-height: 1.35; }
  .edu .meta { display: flex; justify-content: space-between; align-items: baseline; margin-top: .6mm; }
  .edu .yr { font: 6.8pt/1 'JetBrains Mono', Consolas, monospace; color: var(--ink-3); }
  .edu .sc { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: none; font-variation-settings: 'opsz' 72; font-size: 11pt; color: var(--ink); }
  .edu .sc small { font: 6.4pt 'JetBrains Mono', Consolas, monospace; color: var(--accent); margin-left: .6mm; }
  .langs li { display: flex; justify-content: space-between; align-items: center; gap: 2mm; padding: .9mm 0; }
  .dots { display: inline-flex; gap: .8mm; }
  .dots i { width: 1.6mm; height: 1.6mm; border-radius: 50%; border: .25mm solid var(--ink-3); }
  .dots i.on { background: var(--accent); border-color: var(--accent); }
  .chips { display: flex; flex-wrap: wrap; gap: 1.1mm; }
  .chips li { padding: .5mm 1.8mm; border: 1px solid var(--line); border-radius: 99px; font: 6.5pt/1.5 'JetBrains Mono', Consolas, monospace; color: var(--ink-2); }

  /* timeline */
  .job { position: relative; padding: 0 0 3.4mm 5mm; border-left: 1px solid var(--line); }
  .job:last-child { padding-bottom: .5mm; }
  .job::before { content: ''; position: absolute; left: -1.25mm; top: 1.2mm; width: 2.5mm; height: 2.5mm; border-radius: 50%; background: #fff; border: .5mm solid var(--accent); }
  .job__top, .proj__top { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; break-after: avoid; break-inside: avoid; }
  .job__role { font-size: 12pt; letter-spacing: -.01em; }
  .when { flex: none; padding: .5mm 1.8mm; border-radius: 99px; background: var(--tint); font: 6.6pt/1.4 'JetBrains Mono', Consolas, monospace; letter-spacing: .04em; text-transform: uppercase; color: var(--ink-2); }
  .job__co { margin-top: .4mm; font-size: 8.4pt; color: var(--ink-2); }
  .job__co a { color: var(--ink); border-bottom: 1px solid var(--accent); }
  .job p.desc { margin-top: 1.4mm; }
  ul.b { margin-top: 1.4mm; padding-left: 3.6mm; list-style: disc; }
  ul.b li { margin-top: .9mm; font-size: 8.5pt; line-height: 1.42; break-inside: avoid; }
  ul.b li::marker { color: var(--accent); }

  /* project cards */
  .proj { padding: 2.4mm 0; border-top: 1px solid var(--line); }
  .proj:first-of-type { border-top: 0; padding-top: 0; }
  .proj__title { font-size: 11pt; }
  .proj__meta { margin-top: .3mm; font-size: 7.6pt; color: var(--ink-3); }
  .proj p { margin-top: 1.2mm; }
  .proj .link { color: var(--accent); }
  .stack { display: flex; flex-wrap: wrap; gap: .9mm; margin-top: 1.6mm; }
  .stack li { padding: .2mm 1.5mm; border-radius: 1mm; background: var(--tint); font: 6.3pt/1.6 'JetBrains Mono', Consolas, monospace; color: var(--ink-2); }

  /* biodata */
  .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 0 6mm; padding: 3mm 4.5mm; border-radius: 3mm; background: var(--tint); }
  .facts div { display: grid; grid-template-columns: 31mm 1fr; gap: 2mm; padding: 1.7mm 0; border-bottom: 1px solid var(--line); }
  .facts dt { font: 500 6.6pt/1.6 'JetBrains Mono', Consolas, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); }
  .facts dd { font-size: 9pt; }
  table.q { width: 100%; border-collapse: collapse; }
  table.q th { text-align: left; padding: 0 2mm 1.6mm 0; border-bottom: 1px solid var(--ink); font: 600 6.4pt/1 'JetBrains Mono', Consolas, monospace; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-2); }
  table.q td { padding: 2.2mm 2mm 2.2mm 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  table.q td.deg { font-weight: 600; }
  table.q td.sc { white-space: nowrap; }
  table.q td.sc b { font-family: 'Fraunces', Georgia, serif; font-optical-sizing: none; font-variation-settings: 'opsz' 72; font-weight: 400; font-size: 11pt; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2.4mm 7mm; }
  .grid2 > div { break-inside: avoid; }
  .grid2.skills > div + div { margin-top: 0; }
  .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; margin-top: 12mm; }
  .sign div { padding-top: 1.6mm; border-top: 1px solid var(--ink); font-size: 8pt; color: var(--ink-2); }
  .declaration { break-inside: avoid; }
`;

const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500;600&display=swap" />`;

const page = (title, accent, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>${fonts}<style>${css(accent)}</style></head>
<body>${body}</body></html>
`;

/* ---------------------------------------------------------------- pieces */

function hero(d, photo, kicker) {
  const p = d.profile;
  const socials = list(d.socials).filter((s) => !/^mailto:/.test(s.url));
  const rows = [
    ['Email', p.email && `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`],
    ['Portfolio', p.website && `<a href="${esc(p.website)}">${esc(prettyUrl(p.website))}</a>`],
    ['Phone', p.phone && esc(p.phone)],
    ['Based', p.location && esc(p.location.split(',').slice(0, 2).join(','))],
    ...socials.map((s) => [s.label, `<a href="${esc(s.url)}">${esc(prettyUrl(s.url))}</a>${s.note ? `<small>${esc(s.note)}</small>` : ''}`]),
  ].filter(([, v]) => v);
  return `
  <header class="hero">
    ${photo ? `<div class="photo"><img src="${photo}" alt="" /></div>` : ''}
    <div class="id">
      <p class="kicker">${asterisk} ${esc(kicker)}</p>
      <h1 class="name serif">${esc(p.name)}</h1>
      <p class="role">${esc(p.role || '')}</p>
      ${p.headline ? `<p class="tagline">${esc(p.headline)}</p>` : ''}
    </div>
    <dl class="contact">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
  </header>`;
}

const sec = (title, inner) => (inner ? `<section><h2 class="h">${esc(title)}</h2>${inner}</section>` : '');

const winsBlock = (d) =>
  list(d.highlights).length
    ? `<ul class="wins">${d.highlights.slice(0, 5).map((h) => `<li><b>${esc(h.tag)}</b><span>${esc(h.title)}</span></li>`).join('')}</ul>`
    : '';

const skillsBlock = (d, extra = '') =>
  list(d.skills).length
    ? `<dl class="skills ${extra}">${d.skills.map((g) => `<div><dt>${esc(g.area)}</dt><dd>${list(g.items).map((i) => esc(skillName(i))).join(', ')}</dd></div>`).join('')}</dl>`
    : '';

const eduBlock = (rows) =>
  rows.length
    ? `<ul class="edu">${rows
        .map(
          (e) => `<li>
          <p class="deg">${esc(e.degree)}</p>
          <p class="inst">${esc(e.institution)}${e.board ? ` · ${esc(e.board)}` : ''}</p>
          <p class="meta"><span class="yr">${esc(e.period || '')}</span>${e.score ? `<span class="sc">${esc(e.score)}<small>${esc(e.scoreUnit || '')}</small></span>` : ''}</p>
        </li>`
        )
        .join('')}</ul>`
    : '';

const langsBlock = (d) =>
  list(d.languages).length
    ? `<ul class="langs">${d.languages
        .map((l) => {
          const n = Math.max(0, Math.min(5, Number(l.level) || 0));
          return `<li><span>${esc(l.name)}</span><span class="dots">${'<i class="on"></i>'.repeat(n)}${'<i></i>'.repeat(5 - n)}</span></li>`;
        })
        .join('')}</ul>`
    : '';

const chips = (items) => (items.length ? `<ul class="chips">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '');

function experienceBlock(d, maxBullets = 8) {
  const jobs = list(d.experience);
  if (!jobs.length) return '';
  return `<div class="tl">${jobs
    .map(
      (e) => `
    <article class="job">
      <div class="job__top"><h3 class="job__role serif">${esc(e.role)}</h3><span class="when">${esc(e.period)}</span></div>
      <p class="job__co">${e.url ? `<a href="${esc(e.url)}">${esc(e.company)}</a> · ${esc(prettyUrl(e.url))}` : esc(e.company)}${e.location ? ` · ${esc(e.location)}` : ''}</p>
      ${e.description ? `<p class="desc">${html(e.description)}</p>` : ''}
      ${list(e.highlights).length && maxBullets ? `<ul class="b">${e.highlights.slice(0, maxBullets).map((h) => `<li>${html(h)}</li>`).join('')}</ul>` : ''}
    </article>`
    )
    .join('')}</div>`;
}

function projectsBlock(d, maxBullets) {
  return pickProjects(d)
    .map((p) => {
      const link = list(p.links)[0]?.url || p.link;
      return `
    <article class="proj">
      <div class="proj__top"><h3 class="proj__title serif">${esc(p.title)}</h3><span class="when">${esc(p.period || p.year)}</span></div>
      <p class="proj__meta">${esc(p.category)}${p.context ? ` · ${esc(p.context)}` : ''}${link ? ` · <a class="link" href="${esc(link)}">${esc(prettyUrl(link))}</a>` : ''}</p>
      <p>${html(p.summary)}</p>
      ${maxBullets && list(p.highlights).length ? `<ul class="b">${p.highlights.slice(0, maxBullets).map((h) => `<li>${html(h)}</li>`).join('')}</ul>` : ''}
      ${list(p.stack).length ? `<ul class="stack">${p.stack.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    </article>`;
    })
    .join('');
}

/* ---------------------------------------------------------------- résumé */

export function resumeHtml(d, photo = '') {
  const accent = d.site?.accent || '#E8461E';
  const degrees = list(d.education).filter((e) => e.level !== 'school');
  const maxProj = Math.min(1, d.resume?.maxProjectHighlights ?? 1); // keeps the designed résumé to two pages
  const body = `
    ${hero(d, photo, 'Résumé')}
    <div class="cols">
      <aside class="side">
        ${sec('Highlights', winsBlock(d))}
        ${sec('Skills', skillsBlock(d))}
        ${sec('Education', eduBlock(degrees.length ? degrees : list(d.education)))}
        ${sec('Languages', langsBlock(d))}
        ${sec('Domains', chips(list(d.domains)))}
      </aside>
      <main>
        ${sec('Profile', d.resume?.summary || d.about?.statement ? `<p class="lead">${html(d.resume?.summary || d.about.statement)}</p>` : '')}
        ${sec('Experience', experienceBlock(d))}
        ${sec('Selected projects', projectsBlock(d, maxProj))}
      </main>
    </div>`;
  return page(`${d.profile.name} — Résumé`, accent, body);
}

/* ---------------------------------------------------------------- biodata */

export function biodataFacts(d, priv = {}) {
  return [
    ['Full name', priv.fullName || d.profile.name],
    ['Date of birth', priv.dateOfBirth],
    ["Father's name", priv.fatherName],
    ["Mother's name", priv.motherName],
    ['Nationality', priv.nationality],
    ['Native place', priv.nativePlace],
    ['Address', priv.address],
    ['Marital status', priv.maritalStatus],
    ['Current organisation', priv.currentOrganisation || list(d.experience)[0]?.company],
    ['Languages known', list(d.languages).map((l) => l.name).join(', ')],
    ...Object.entries(priv.extra || {}),
  ].filter(([, v]) => v);
}

export function biodataHtml(d, priv = {}, photo = '') {
  const accent = d.site?.accent || '#E8461E';
  const p = d.profile;
  const body = `
    ${hero(d, photo, 'Bio-data')}
    <div style="margin-top:6.5mm">
      ${sec('Personal details', `<dl class="facts">${biodataFacts(d, priv).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`)}
      ${sec('Career objective', `<p class="lead">${html(priv.objective || d.resume?.summary || d.about?.statement || '')}</p>`)}
      ${sec(
        'Educational qualifications',
        `<table class="q"><thead><tr><th>Qualification</th><th>Institution</th><th>Board / University</th><th>Year</th><th>Result</th></tr></thead><tbody>${list(d.education)
          .map(
            (e) => `<tr><td class="deg">${esc(e.degree)}</td><td>${esc(e.institution)}</td><td>${esc(e.board || '')}</td><td>${esc(e.period || '')}</td>
            <td class="sc">${e.score ? `<b>${esc(e.score)}${e.scoreUnit === '%' ? '%' : ''}</b>&nbsp; ` : ''}${esc([e.scoreUnit && e.scoreUnit !== '%' ? e.scoreUnit : '', e.result].filter(Boolean).join(' · '))}</td></tr>`
          )
          .join('')}</tbody></table>`
      )}
      ${sec('Experience', experienceBlock(d, 4))}
      ${sec('Technical skills', skillsBlock(d, 'grid2'))}
      ${sec('Projects', projectsBlock(d, 0))}
      ${sec('Languages', `<div class="grid2">${list(d.languages).map((l) => `<div><strong>${esc(l.name)}</strong> &nbsp;<span style="color:var(--ink-2)">${esc(l.note || '')}</span></div>`).join('')}</div>`)}
      <section class="declaration">
        <h2 class="h">Declaration</h2>
        <p>${esc(priv.declaration || 'I hereby declare that the information furnished above is true to the best of my knowledge and belief.')}</p>
        <div class="sign">
          <div>Place: ${esc(priv.place || '')}</div>
          <div>Date: ${esc(priv.date || '')}</div>
          <div>Signature (${esc(priv.fullName || p.name)})</div>
        </div>
      </section>
    </div>`;
  return page(`${p.name} — Bio-data`, accent, body);
}

export { prettyUrl };
