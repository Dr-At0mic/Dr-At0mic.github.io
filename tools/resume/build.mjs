#!/usr/bin/env node
// Turns data.json into a résumé (or an Indian-style biodata).
//
//   npm run resume                    → tools/resume/out/resume.{pdf,html,md,json}
//   npm run resume:biodata            → tools/resume/out/biodata.{pdf,html,md}
//
// Options:
//   --template resume|biodata   which document to build (default: resume)
//   --out <dir>                 output folder (default: tools/resume/out)
//   --no-pdf                    skip the PDF (no browser needed)
//   --public                    also copy the résumé PDF to public/resume.pdf (off by default — the site has no résumé link)
//   --data <file>               use a different data file (default: data.json)
//
// The PDF is printed by Chrome or Edge, found automatically (or set CHROME_PATH).
// Personal details for the biodata come from tools/resume/private.json, which is
// git-ignored and never bundled into the website. Copy private.example.json to start.

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resumeHtml, biodataHtml, pickProjects } from './templates.mjs';
import { list, md, plain, skillName, parsePeriod } from './text.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

/* ---------- args ---------- */
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);
const template = opt('template', 'resume');
const outDir = resolve(root, opt('out', 'tools/resume/out'));
const dataFile = resolve(root, opt('data', 'data.json'));
const wantPdf = !flag('no-pdf');
const toPublic = template === 'resume' && flag('public');

if (!['resume', 'biodata'].includes(template)) {
  console.error(`Unknown --template "${template}". Use "resume" or "biodata".`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(dataFile, 'utf8'));
const privFile = join(here, 'private.json');
const priv = existsSync(privFile) ? JSON.parse(readFileSync(privFile, 'utf8')) : {};
if (template === 'biodata' && !existsSync(privFile)) {
  console.warn('! No tools/resume/private.json — personal details will be blank. Copy private.example.json to private.json and fill it in.');
}

mkdirSync(outDir, { recursive: true });
const base = join(outDir, template);
const written = [];
const write = (file, content) => {
  writeFileSync(file, content);
  written.push(file);
};

/* ---------- photo (embedded so the HTML is self-contained) ---------- */
const photoPath = template === 'biodata' ? priv.photo || data.resume?.photo : data.resume?.photo;
const photo = embed(photoPath);

/* ---------- HTML ---------- */
const html = template === 'biodata' ? biodataHtml(data, priv, photo) : resumeHtml(data, photo);
write(`${base}.html`, html);

/* ---------- Markdown (paste into forms, LinkedIn, emails) ---------- */
write(`${base}.md`, toMarkdown(data, template === 'biodata' ? priv : null));

/* ---------- JSON Resume (jsonresume.org) — résumé only ---------- */
if (template === 'resume') write(`${base}.json`, JSON.stringify(toJsonResume(data), null, 2) + '\n');

/* ---------- PDF ---------- */
if (wantPdf) {
  const browser = findBrowser();
  if (!browser) {
    console.warn('! No Chrome/Edge found, so no PDF this time. Open the .html file and use Print → Save as PDF, or set CHROME_PATH.');
  } else {
    await printPdf(html, `${base}.pdf`, browser, data.profile.name);
    written.push(`${base}.pdf`);
    if (toPublic) {
      const pub = join(root, 'public', 'resume.pdf');
      copyFileSync(`${base}.pdf`, pub);
      written.push(pub);
    }
  }
}

console.log(`✓ ${template} built:`);
written.forEach((f) => console.log('  ' + relative(root, f)));

/* =========================================================== */

function embed(file) {
  if (!file) return '';
  const full = resolve(root, file);
  if (!existsSync(full)) {
    console.warn(`! Photo not found: ${file} — building without it.`);
    return '';
  }
  const ext = full.split('.').pop().toLowerCase();
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' }[ext] || 'image/jpeg';
  return `data:${mime};base64,${readFileSync(full).toString('base64')}`;
}

function findBrowser() {
  const env = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    env,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    local && join(local, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/snap/bin/chromium',
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

async function printPdf(html, file, executablePath, name) {
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer-core')).default;
  } catch {
    console.warn('! puppeteer-core is not installed (npm install). Skipping the PDF.');
    return;
  }
  const browser = await puppeteer.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready);
    await page.pdf({
      path: file,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;padding:0 15mm;font:7px 'Segoe UI',Arial,sans-serif;color:#8a8275;display:flex;justify-content:space-between">
        <span>${name.replace(/</g, '&lt;')}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    });
  } finally {
    await browser.close();
  }
}

function toMarkdown(d, privateDetails) {
  const p = d.profile;
  const out = [];
  out.push(`# ${p.name}`, '', `**${p.role}**${p.headline ? ` — ${p.headline}` : ''}`, '');
  const contact = [p.email, p.phone, p.location, p.website, ...list(d.socials).filter((s) => !/^mailto:/.test(s.url)).map((s) => s.url)].filter(Boolean);
  out.push(contact.join(' · '), '');

  if (privateDetails) {
    const rows = [
      ['Date of birth', privateDetails.dateOfBirth],
      ["Father's name", privateDetails.fatherName],
      ["Mother's name", privateDetails.motherName],
      ['Nationality', privateDetails.nationality],
      ['Native place', privateDetails.nativePlace],
      ['Address', privateDetails.address],
    ].filter(([, v]) => v);
    if (rows.length) out.push('## Personal details', '', '| | |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${v} |`), '');
  }

  const summary = d.resume?.summary || d.about?.statement;
  if (summary) out.push('## Profile', '', md(summary), '');

  if (list(d.skills).length) {
    out.push('## Technical skills', '');
    d.skills.forEach((g) => out.push(`- **${g.area}:** ${list(g.items).map(skillName).join(', ')}`));
    out.push('');
  }

  if (list(d.experience).length) {
    out.push('## Experience', '');
    d.experience.forEach((e) => {
      out.push(`### ${e.role} · ${e.company} — ${e.period}`, '');
      if (e.description) out.push(md(e.description), '');
      list(e.highlights).forEach((h) => out.push(`- ${md(h)}`));
      out.push('');
    });
  }

  const projects = pickProjects(d);
  if (projects.length) {
    out.push('## Selected projects', '');
    projects.forEach((pr) => {
      out.push(`### ${pr.title} — ${pr.category}${pr.period ? ` (${pr.period})` : ''}`, '', md(pr.summary), '');
      list(pr.highlights).slice(0, d.resume?.maxProjectHighlights ?? 3).forEach((h) => out.push(`- ${md(h)}`));
      if (list(pr.stack).length) out.push('', `_Stack:_ ${pr.stack.join(', ')}`);
      out.push('');
    });
  }

  const edu = privateDetails ? list(d.education) : list(d.education).filter((e) => e.level !== 'school');
  if (edu.length) {
    out.push('## Education', '', '| Qualification | Institution | Board / University | Year | Result |', '|---|---|---|---|---|');
    edu.forEach((e) => out.push(`| ${e.degree} | ${e.institution} | ${e.board || ''} | ${e.period || ''} | ${[e.score && `${e.score}${e.scoreUnit === '%' ? '%' : ` ${e.scoreUnit || ''}`}`, e.result].filter(Boolean).join(' · ')} |`));
    out.push('');
  }

  if (list(d.languages).length) {
    out.push('## Languages', '');
    d.languages.forEach((l) => out.push(`- **${l.name}** — ${l.note || ''}`));
    out.push('');
  }

  if (privateDetails) {
    out.push('## Declaration', '', privateDetails.declaration || 'I hereby declare that the information furnished above is true to the best of my knowledge and belief.', '', `Place: ${privateDetails.place || '________'}    Date: ${privateDetails.date || '________'}    Signature: ________`, '');
  }
  return out.join('\n');
}

function toJsonResume(d) {
  const p = d.profile;
  const [city, region] = String(p.location || '').split(',').map((s) => s.trim());
  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: p.name,
      label: p.role,
      email: p.email || undefined,
      phone: p.phone || undefined,
      url: p.website || undefined,
      summary: plain(d.resume?.summary || d.about?.statement || ''),
      location: { city, region },
      profiles: list(d.socials)
        .filter((s) => !/^mailto:/.test(s.url))
        .map((s) => ({ network: s.label, url: s.url, username: s.url.split('/').filter(Boolean).pop() })),
    },
    work: list(d.experience).map((e) => {
      const { start, end } = parsePeriod(e.period);
      return {
        name: e.company,
        position: e.role,
        location: e.location || undefined,
        startDate: start,
        endDate: /now|present/i.test(e.period) ? undefined : end,
        summary: plain(e.description || ''),
        highlights: list(e.highlights).map(plain),
      };
    }),
    education: list(d.education).map((e) => {
      const { start, end } = parsePeriod(e.period);
      return {
        institution: e.institution,
        area: e.degree,
        studyType: e.level === 'school' ? 'School' : 'Degree',
        startDate: start,
        endDate: end,
        score: [e.score && `${e.score}${e.scoreUnit === '%' ? '%' : ` ${e.scoreUnit || ''}`}`, e.result].filter(Boolean).join(' · ') || undefined,
      };
    }),
    skills: list(d.skills).map((g) => ({ name: g.area, keywords: list(g.items).map(skillName) })),
    languages: list(d.languages).map((l) => ({ language: l.name, fluency: l.note || undefined })),
    projects: list(d.projects).map((pr) => ({
      name: pr.title,
      description: plain(pr.summary || ''),
      highlights: list(pr.highlights).map(plain),
      keywords: list(pr.stack),
      url: list(pr.links)[0]?.url || pr.link || undefined,
      entity: pr.client || pr.context || undefined,
    })),
  };
}
