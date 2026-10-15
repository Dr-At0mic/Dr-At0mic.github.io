// ATS-friendly résumé and biodata.
//
// Built for applicant-tracking systems and job portals that parse text:
//   - one column, reading order = visual order
//   - standard section headings (PROFESSIONAL SUMMARY, EXPERIENCE, EDUCATION …)
//   - a standard font (Arial / Liberation Sans), black text, real bullets
//   - no photo, tables, columns, icons, headers/footers or decorative characters
//   - plain ASCII-friendly punctuation, "Present" instead of "Now"
//
// One content model renders to HTML (→ PDF) and plain text, so they never drift.
import { esc, list, plain, skillName } from './text.mjs';
import { pickProjects, biodataFacts, prettyUrl } from './templates.mjs';

// Swap characters some parsers choke on for plain equivalents.
export const norm = (s = '') =>
  plain(s)
    .replace(/→/g, '->')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/×/g, 'x')
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/µ/g, 'u')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/✺/g, '')
    .replace(/\s+—\s+/g, ' - ')
    .replace(/—/g, '-')
    .replace(/·/g, '|')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();

const period = (p = '') => norm(String(p).replace(/\bNow\b/i, 'Present')).replace(/\s*-\s*/, ' – ');
const score = (e) => [e.score && `${e.score}${e.scoreUnit === '%' ? '%' : ` ${e.scoreUnit || ''}`}`, e.result].filter(Boolean).map(norm).join(', ');
const firstPart = (s = '') => norm(String(s).split(/\s+—\s+/)[0]);

/* ---------------------------------------------------------------- model */
// section = { title, paragraphs?: string[], lines?: [label, value][], entries?: Entry[], bullets?: string[] }
// Entry   = { title, subtitle?, text?, bullets?: string[] }

function contactLine(d) {
  const p = d.profile;
  const socials = list(d.socials).filter((s) => !/^mailto:/.test(s.url));
  return [
    p.location && norm(p.location),
    p.phone && norm(p.phone),
    p.email,
    p.website && `Portfolio: ${prettyUrl(p.website)}`,
    ...socials.map((s) => `${s.label}: ${prettyUrl(s.url)}${s.note ? ` (${norm(s.note)})` : ''}`),
  ].filter(Boolean);
}

const skillsSection = (d) =>
  list(d.skills).length && {
    title: 'Technical Skills',
    lines: d.skills.map((g) => [norm(g.area), list(g.items).map((i) => norm(skillName(i))).join(', ')]),
  };

const experienceSection = (d, maxBullets = 10) =>
  list(d.experience).length && {
    title: 'Professional Experience',
    entries: d.experience.map((e) => ({
      title: norm(e.role),
      subtitle: [norm(e.company) + (e.url ? ` (${prettyUrl(e.url)})` : ''), e.location && norm(e.location), period(e.period)].filter(Boolean).join(' | '),
      text: e.description && norm(e.description),
      bullets: list(e.highlights).slice(0, maxBullets).map(norm),
    })),
  };

const projectsSection = (d, maxBullets) => {
  const ps = pickProjects(d);
  return (
    ps.length && {
      title: 'Projects',
      entries: ps.map((p) => {
        const link = list(p.links)[0]?.url || p.link;
        return {
          title: `${norm(p.title)} - ${norm(p.category)}${p.context ? ` (${norm(p.context)})` : ''}`,
          subtitle: [period(p.period || String(p.year || '')), link && prettyUrl(link)].filter(Boolean).join(' | '),
          text: [norm(p.summary), list(p.stack).length && `Technologies: ${p.stack.map(norm).join(', ')}.`].filter(Boolean).join(' '),
          bullets: maxBullets ? list(p.highlights).slice(0, maxBullets).map(norm) : [],
        };
      }),
    }
  );
};

const educationSection = (rows) =>
  rows.length && {
    title: 'Education',
    entries: rows.map((e) => ({
      title: norm(e.degree),
      subtitle: [norm(e.institution), e.board && norm(e.board), period(e.period), score(e)].filter(Boolean).join(' | '),
    })),
  };

const languagesSection = (d) =>
  list(d.languages).length && {
    title: 'Languages',
    paragraphs: [d.languages.map((l) => `${norm(l.name)} (${firstPart(l.note) || 'Working knowledge'})`).join(', ')],
  };

export function atsResumeModel(d) {
  const degrees = list(d.education).filter((e) => e.level !== 'school');
  return {
    name: d.profile.name,
    headline: [d.profile.role, d.profile.headline].filter(Boolean).map(norm).join(' | '),
    contact: contactLine(d),
    sections: [
      { title: 'Professional Summary', paragraphs: [norm(d.resume?.summary || d.about?.statement || '')] },
      skillsSection(d),
      experienceSection(d),
      projectsSection(d, d.resume?.maxProjectHighlights ?? 3),
      educationSection(degrees.length ? degrees : list(d.education)),
      languagesSection(d),
    ].filter(Boolean),
  };
}

export function atsBiodataModel(d, priv = {}) {
  return {
    name: d.profile.name,
    headline: norm(d.profile.role || ''),
    contact: contactLine(d),
    sections: [
      { title: 'Personal Details', lines: biodataFacts(d, priv).map(([k, v]) => [norm(k), norm(v)]) },
      { title: 'Career Objective', paragraphs: [norm(priv.objective || d.resume?.summary || d.about?.statement || '')] },
      educationSection(list(d.education)),
      experienceSection(d, 6),
      skillsSection(d),
      projectsSection(d, 0),
      languagesSection(d),
      {
        title: 'Declaration',
        paragraphs: [
          norm(priv.declaration || 'I hereby declare that the information furnished above is true to the best of my knowledge and belief.'),
          `Place: ${norm(priv.place || '')}`,
          `Date: ${norm(priv.date || '')}`,
          `Signature: ${norm(priv.fullName || d.profile.name)}`,
        ],
      },
    ].filter(Boolean),
  };
}

/* ---------------------------------------------------------------- HTML */

const css = `
  @page { size: A4; margin: 16mm 17mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 10.5pt/1.4 Arial, 'Liberation Sans', Helvetica, sans-serif; color: #000; background: #fff; }
  @media screen { body { max-width: 210mm; margin: 24px auto; padding: 16mm 17mm; box-shadow: 0 8px 30px rgba(0,0,0,.12); } }
  h1 { font-size: 20pt; font-weight: bold; letter-spacing: .5pt; }
  .headline { margin-top: 2pt; font-size: 11pt; }
  .contact { margin-top: 4pt; font-size: 9.5pt; }
  h2 { margin: 13pt 0 5pt; padding-bottom: 2pt; border-bottom: 1px solid #000; font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: .5pt; break-after: avoid; }
  h3 { font-size: 10.5pt; font-weight: bold; break-after: avoid; }
  .entry { margin-top: 7pt; }
  .entry:first-of-type { margin-top: 0; }
  .sub { font-size: 10pt; break-after: avoid; }
  p + p { margin-top: 3pt; }
  .entry p { margin-top: 2pt; }
  ul { margin: 3pt 0 0 15pt; }
  li { margin-top: 2pt; break-inside: avoid; }
  .line b { font-weight: bold; }
  a { color: #000; text-decoration: none; }
`;

export function atsHtml(model, title) {
  const section = (s) => `
  <h2>${esc(s.title)}</h2>
  ${list(s.paragraphs).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('')}
  ${list(s.lines).map(([k, v]) => `<p class="line"><b>${esc(k)}:</b> ${esc(v)}</p>`).join('')}
  ${list(s.entries)
    .map(
      (e) => `<div class="entry">
      <h3>${esc(e.title)}</h3>
      ${e.subtitle ? `<p class="sub">${esc(e.subtitle)}</p>` : ''}
      ${e.text ? `<p>${esc(e.text)}</p>` : ''}
      ${list(e.bullets).length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    </div>`
    )
    .join('')}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title><style>${css}</style></head>
<body>
  <h1>${esc(model.name)}</h1>
  ${model.headline ? `<p class="headline">${esc(model.headline)}</p>` : ''}
  <p class="contact">${model.contact.map(esc).join(' | ')}</p>
  ${model.sections.map(section).join('')}
</body></html>
`;
}

/* ---------------------------------------------------------------- plain text */

const wrap = (text, width = 92, indent = '') => {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width - indent.length) {
      lines.push(line.trim());
      line = w;
    } else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.map((l, i) => (i === 0 ? l : indent + l)).join('\n');
};

export function atsText(model) {
  const out = [model.name.toUpperCase()];
  if (model.headline) out.push(model.headline);
  out.push(wrap(model.contact.join(' | ')), '');
  for (const s of model.sections) {
    out.push(s.title.toUpperCase(), '-'.repeat(s.title.length));
    list(s.paragraphs).filter(Boolean).forEach((t) => out.push(wrap(t)));
    list(s.lines).forEach(([k, v]) => out.push(wrap(`${k}: ${v}`, 92, '  ')));
    list(s.entries).forEach((e, i) => {
      if (i) out.push('');
      out.push(e.title);
      if (e.subtitle) out.push(wrap(e.subtitle));
      if (e.text) out.push(wrap(e.text));
      list(e.bullets).forEach((b) => out.push('- ' + wrap(b, 92, '  ')));
    });
    out.push('');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
