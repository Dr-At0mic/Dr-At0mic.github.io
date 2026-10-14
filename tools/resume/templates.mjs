// HTML templates for the printable résumé and the biodata.
// Single column, real text (selectable, ATS-friendly), A4.
import { esc, html, list, skillName } from './text.mjs';

const css = (accent) => `
  @page { size: A4; margin: 15mm 15mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --ink: #17140f; --ink-2: #5d564b; --line: #d9d2c4; --accent: ${accent}; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* ATS-safe text layer: no ligatures or alternate glyphs that lose their Unicode mapping */
  * { font-variant-ligatures: none; font-feature-settings: 'liga' 0, 'clig' 0, 'calt' 0, 'dlig' 0; font-variation-settings: 'WONK' 0; }
  .name, .item__title { font-optical-sizing: none; font-variation-settings: 'opsz' 72, 'WONK' 0; }
  body { font: 9.4pt/1.45 'Instrument Sans', 'Segoe UI', Arial, sans-serif; color: var(--ink); background: #fff; }
  @media screen { body { max-width: 210mm; margin: 24px auto; padding: 15mm; box-shadow: 0 10px 40px rgba(0,0,0,.12); } }
  h1, h2, h3 { font-weight: 400; }
  a { color: inherit; text-decoration: none; }
  strong { font-weight: 600; }
  em { font-style: italic; }
  code { font-family: 'JetBrains Mono', Consolas, monospace; font-size: .86em; }

  .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12mm; padding-bottom: 4mm; border-bottom: 2px solid var(--ink); }
  .name { font-family: 'Fraunces', Georgia, serif; font-weight: 300; font-size: 30pt; line-height: .95; letter-spacing: -.03em; }
  .role { margin-top: 2mm; font-size: 10.5pt; }
  .role span { color: var(--accent); }
  .tagline { margin-top: 1mm; color: var(--ink-2); font-size: 8.6pt; }
  .head { align-items: center; }
  .head__main { flex: 1; }
  .photo { width: 27mm; height: 33.75mm; object-fit: cover; border-radius: 2px; flex: none; }
  .note { font-size: 7.4pt; color: var(--ink-2); }
  .contact { text-align: right; font-size: 8.4pt; line-height: 1.6; color: var(--ink-2); white-space: nowrap; }
  .contact a { color: var(--ink); }

  section { margin-top: 5mm; }
  .label { display: flex; align-items: center; gap: 3mm; margin-bottom: 2.4mm; font: 500 7.4pt/1 'JetBrains Mono', Consolas, monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); }
  .label::after { content: ''; flex: 1; height: 1px; background: var(--line); }
  .summary { font-size: 9.8pt; }

  .skills { display: grid; grid-template-columns: 30mm 1fr; gap: 1.1mm 4mm; }
  .skills dt { font-weight: 600; }
  .skills dd { color: var(--ink-2); }

  .item { padding: 2.2mm 0; }
  .item__top, .item p, ul.bullets li, .stack { break-inside: avoid; }
  h2.label, .item__top { break-after: avoid; }
  .item + .item { border-top: 1px solid var(--line); }
  .item__top { display: flex; justify-content: space-between; align-items: baseline; gap: 6mm; }
  .item__title { font-family: 'Fraunces', Georgia, serif; font-size: 11.6pt; letter-spacing: -.01em; }
  .item__title small { font-family: 'Instrument Sans', Arial, sans-serif; font-size: 9pt; color: var(--ink-2); }
  .item__when { font: 7.6pt/1 'JetBrains Mono', Consolas, monospace; color: var(--ink-2); white-space: nowrap; text-transform: uppercase; letter-spacing: .04em; }
  .item__sub { color: var(--ink-2); font-size: 8.6pt; margin-top: .4mm; }
  .item p { margin-top: 1mm; }
  ul.bullets { margin-top: 1.2mm; padding-left: 4mm; }
  ul.bullets li { margin-top: .7mm; }
  ul.bullets li::marker { color: var(--accent); }
  .stack { margin-top: 1mm; font: 7.6pt/1.5 'JetBrains Mono', Consolas, monospace; color: var(--ink-2); }

  .edu-table, .details { width: 100%; border-collapse: collapse; }
  .edu-table th { text-align: left; font: 500 7pt/1 'JetBrains Mono', Consolas, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-2); padding: 0 2mm 1.6mm 0; border-bottom: 1px solid var(--ink); }
  .edu-table td { padding: 1.8mm 2mm 1.8mm 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  .edu-table td:first-child { font-weight: 600; }
  .edu-table td.score { white-space: nowrap; }
  .details td { padding: 1.5mm 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  .details td:first-child { width: 42mm; color: var(--ink-2); }

  .langs { display: flex; flex-wrap: wrap; gap: 1mm 8mm; }
  .langs span { color: var(--ink-2); }

  .declaration { margin-top: 8mm; break-inside: avoid; }
  .declaration p { margin-bottom: 10mm; }
  .sign { display: flex; justify-content: space-between; gap: 10mm; }
  .sign div { min-width: 50mm; padding-top: 1.5mm; border-top: 1px solid var(--ink); font-size: 8.4pt; color: var(--ink-2); }
`;

const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap" />`;

const page = (title, accent, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>${fonts}<style>${css(accent)}</style></head>
<body>${body}</body></html>
`;

const prettyUrl = (u = '') => String(u).replace(/^mailto:/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

function header(d, photo) {
  const p = d.profile;
  const links = list(d.socials).filter((s) => !/^mailto:/.test(s.url));
  const lines = [
    p.email && `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`,
    p.phone && `<a href="tel:${esc(p.phone.replace(/\s+/g, ''))}">${esc(p.phone)}</a>`,
    p.location && esc(p.location),
    p.website && `<a href="${esc(p.website)}">${esc(prettyUrl(p.website))}</a>`,
    ...links.map((s) => `<a href="${esc(s.url)}">${esc(prettyUrl(s.url))}</a>${s.note ? `<br /><span class="note">(${esc(s.note)})</span>` : ''}`),
  ].filter(Boolean);
  const [first, ...rest] = (p.role || '').split(' ');
  return `
  <header class="head">
    ${photo ? `<img class="photo" src="${photo}" alt="" />` : ""}
    <div class="head__main">
      <h1 class="name">${esc(p.name)}</h1>
      <p class="role">${esc(first)} <span>${esc(rest.join(' '))}</span></p>
      ${p.headline ? `<p class="tagline">${esc(p.headline)}</p>` : ''}
    </div>
    <div class="contact">${lines.join('<br />')}</div>
  </header>`;
}

const sectionBlock = (label, inner) => (inner ? `<section><h2 class="label">${esc(label)}</h2>${inner}</section>` : '');

function skillsBlock(d) {
  const groups = list(d.skills);
  if (!groups.length) return '';
  return `<dl class="skills">${groups
    .map((g) => `<dt>${esc(g.area)}</dt><dd>${list(g.items).map((i) => esc(skillName(i))).join(', ')}</dd>`)
    .join('')}</dl>`;
}

function experienceBlock(d, { maxBullets = 8 } = {}) {
  return list(d.experience)
    .map(
      (e) => `
    <div class="item">
      <div class="item__top">
        <h3 class="item__title">${esc(e.role)} <small>· ${e.url ? `<a href="${esc(e.url)}">${esc(e.company)}</a> (${esc(prettyUrl(e.url))})` : esc(e.company)}${e.location ? `, ${esc(e.location)}` : ''}</small></h3>
        <span class="item__when">${esc(e.period)}</span>
      </div>
      ${e.description ? `<p>${html(e.description)}</p>` : ''}
      ${list(e.highlights).length ? `<ul class="bullets">${e.highlights.slice(0, maxBullets).map((h) => `<li>${html(h)}</li>`).join('')}</ul>` : ''}
    </div>`
    )
    .join('');
}

export function pickProjects(d) {
  const all = list(d.projects);
  const ids = list(d.resume?.projects);
  if (ids.length) return ids.map((id) => all.find((p) => p.id === id)).filter(Boolean);
  return all.filter((p) => p.resume !== false).slice(0, 6);
}

function projectsBlock(d) {
  const max = d.resume?.maxProjectHighlights ?? 3;
  return pickProjects(d)
    .map((p) => {
      const link = list(p.links)[0]?.url || p.link;
      return `
    <div class="item">
      <div class="item__top">
        <h3 class="item__title">${esc(p.title)} <small>· ${esc(p.category)}${p.context ? ` · ${esc(p.context)}` : ''}</small></h3>
        <span class="item__when">${esc(p.period || p.year)}</span>
      </div>
      <p>${html(p.summary)}${link ? ` <span class="item__sub">(${esc(prettyUrl(link))})</span>` : ''}</p>
      ${max && list(p.highlights).length ? `<ul class="bullets">${p.highlights.slice(0, max).map((h) => `<li>${html(h)}</li>`).join('')}</ul>` : ''}
      ${list(p.stack).length ? `<p class="stack">${p.stack.map(esc).join(' · ')}</p>` : ''}
    </div>`;
    })
    .join('');
}

function educationTable(rows) {
  if (!rows.length) return '';
  return `<table class="edu-table">
    <thead><tr><th>Qualification</th><th>Institution</th><th>Board / University</th><th>Year</th><th>Result</th></tr></thead>
    <tbody>${rows
      .map(
        (e) => `<tr>
        <td>${esc(e.degree)}</td>
        <td>${esc(e.institution)}</td>
        <td>${esc(e.board || '')}</td>
        <td>${esc(e.period || '')}</td>
        <td class="score">${esc([e.score && `${e.score}${e.scoreUnit === '%' ? '%' : ` ${e.scoreUnit || ''}`}`, e.result].filter(Boolean).join(' · '))}</td>
      </tr>`
      )
      .join('')}</tbody>
  </table>`;
}

function languagesBlock(d) {
  const ls = list(d.languages);
  return ls.length ? `<p class="langs">${ls.map((l) => `<strong>${esc(l.name)}</strong> <span>${esc(l.note || '')}</span>`).join('')}</p>` : '';
}

/* ---------- résumé ---------- */

export function resumeHtml(d, photo = '') {
  const accent = d.site?.accent || '#E8461E';
  const degrees = list(d.education).filter((e) => e.level !== 'school');
  const body = `
    ${header(d, photo)}
    ${sectionBlock('Profile', d.resume?.summary || d.about?.statement ? `<p class="summary">${html(d.resume?.summary || d.about.statement)}</p>` : '')}
    ${sectionBlock('Technical skills', skillsBlock(d))}
    ${sectionBlock('Experience', experienceBlock(d))}
    ${sectionBlock('Selected projects', projectsBlock(d))}
    ${sectionBlock('Education', educationTable(degrees.length ? degrees : list(d.education)))}
    ${sectionBlock('Languages', languagesBlock(d))}
  `;
  return page(`${d.profile.name} — Résumé`, accent, body);
}

/* ---------- biodata ---------- */

export function biodataHtml(d, priv = {}, photo = '') {
  const accent = d.site?.accent || '#E8461E';
  const p = d.profile;
  const details = [
    ['Full name', priv.fullName || p.name],
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

  const body = `
    ${header(d, photo)}
    ${sectionBlock('Personal details', `<table class="details"><tbody>${details.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`)}
    ${sectionBlock('Career objective', `<p class="summary">${html(priv.objective || d.resume?.summary || d.about?.statement || '')}</p>`)}
    ${sectionBlock('Educational qualifications', educationTable(list(d.education)))}
    ${sectionBlock('Experience', experienceBlock(d, { maxBullets: 6 }))}
    ${sectionBlock('Technical skills', skillsBlock(d))}
    ${sectionBlock('Projects', projectsBlock({ ...d, resume: { ...d.resume, maxProjectHighlights: 0 } }))}
    ${sectionBlock('Languages', languagesBlock(d))}
    <div class="declaration">
      <h2 class="label">Declaration</h2>
      <p>${esc(priv.declaration || 'I hereby declare that the information furnished above is true to the best of my knowledge and belief.')}</p>
      <div class="sign">
        <div>Place: ${esc(priv.place || '')}</div>
        <div>Date: ${esc(priv.date || '')}</div>
        <div>Signature${priv.fullName || p.name ? ` (${esc(priv.fullName || p.name)})` : ''}</div>
      </div>
    </div>
  `;
  return page(`${p.name} — Biodata`, accent, body);
}
