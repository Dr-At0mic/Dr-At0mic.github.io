// Builds the Calibre brand files from the same code the website draws with.
//
//   npm run brand
//
// Writes:
//   public/brand/monogram.svg        the AS monogram in its minute track, for dark backgrounds
//   public/brand/monogram-light.svg  the same, for light backgrounds
//   public/brand/avatar.png          1024² profile picture: the monogram on midnight
//   public/brand/dial.png            1024² the hero dial at 10:10, engraved and lit
//   public/og.png                    1200×630 link preview (index.html points at it)
//
// The PNGs are drawn by Chrome or Edge (found automatically, or set CHROME_PATH) with the
// site's own stylesheet, guilloché engine and Google Fonts — so they need a network connection.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { monogram, heroDial } from '../../src/render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(readFileSync(join(root, 'data.json'), 'utf8'));
const out = join(root, 'public/brand');
mkdirSync(out, { recursive: true });

/* ---------- SVGs: the monogram with its CSS resolved to fixed colours ---------- */
const svgFile = (inner, { gold, ink, cut }) =>
  inner
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" ')
    .replace(' aria-hidden="true"', '')
    .replace(
      />/,
      `><title>${data.profile.name} — monogram</title><style>.monogram__rim{fill:none;stroke:${gold};stroke-width:.6;opacity:.55}.tk{stroke:${gold};stroke-width:.55;opacity:.75}.tk--5{stroke-width:1.2;opacity:1}.monogram__a{fill:${gold}}.monogram__s{fill:${ink};stroke:${cut};stroke-width:36;paint-order:stroke}</style>`
    );

writeFileSync(join(out, 'monogram.svg'), svgFile(monogram(), { gold: '#E2B497', ink: '#EFE8DC', cut: '#06080E' }));
writeFileSync(join(out, 'monogram-light.svg'), svgFile(monogram(), { gold: '#2747A0', ink: '#10131A', cut: '#EFEEEA' }));
console.log('✓ public/brand/monogram.svg, monogram-light.svg');

/* ---------- PNGs ---------- */
function findBrowser() {
  const local = process.env.LOCALAPPDATA || '';
  return [
    process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    local && join(local, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ]
    .filter(Boolean)
    .find((p) => existsSync(p));
}

const css = readFileSync(join(root, 'src/style.css'), 'utf8');
// the engine runs in the page as a plain module script
const engine = readFileSync(join(root, 'src/modules/guilloche.js'), 'utf8').replace(/^export /gm, '');
const fonts =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Hanken+Grotesk:wght@300..600&display=block">';

// every dial on the page: engraved, lit from the upper left, hands at ten past ten
const setup = `
  ${engine}
  document.querySelectorAll('[data-dial]').forEach((el) => {
    mountDial(el, { maxPx: 2000 });
    const set = (sel, deg) => el.querySelector(sel) && (el.querySelector(sel).style.transform = 'rotate(' + deg + 'deg)');
    set('.hand--h', 305); set('.hand--m', 60); set('.hand--s', 48);
    const date = el.querySelector('[data-date]'); if (date) date.textContent = '10';
  });
  document.documentElement.classList.add('is-ready');
  window.__ready = true;`;

const stage = `body{margin:0;overflow:hidden;background:#06080e} .dial--hero{position:relative;inset:auto;opacity:1}`;
const p = data.profile;
const pages = [
  {
    file: join(out, 'avatar.png'),
    w: 1024,
    h: 1024,
    html: `<style>${stage} .wrap{width:1024px;height:1024px;display:grid;place-items:center;background:radial-gradient(closest-side,#141c33,#06080e)} .monogram{font-size:780px}</style>
      <div class="wrap">${monogram()}</div>`,
  },
  {
    file: join(out, 'dial.png'),
    w: 1024,
    h: 1024,
    html: `<style>${stage} .wrap{width:1024px;height:1024px;display:grid;place-items:center;background:radial-gradient(closest-side,#16203a,#06080e)} .dial{width:820px}</style>
      <div class="wrap">${heroDial(p)}</div>`,
  },
  {
    file: join(root, 'public/og.png'),
    w: 1200,
    h: 630,
    html: `<style>${stage}
      .og{position:relative;width:1200px;height:630px;padding:64px 70px;display:grid;grid-template-columns:1fr 470px;align-items:center;gap:40px;background:radial-gradient(60% 90% at 78% 50%,#141c33,#06080e 70%)}
      .og .dial{width:470px}
      .og h1{font-family:var(--serif);font-weight:400;font-size:92px;line-height:.95;letter-spacing:-.03em;color:#efe8dc;margin-top:26px}
      .og h1 em{display:inline-block;padding-left:.55em}
      .og p{max-width:440px;margin-top:30px;font-family:var(--sans);font-weight:300;font-size:21px;line-height:1.55;color:#aba598}
      .og .caps{color:#aba598;font-size:12px}
      .og p.caps{max-width:none}
      .og .foot{position:absolute;left:70px;bottom:40px;color:#75716a}
    </style>
    <div class="og">
      <div>
        <p class="caps" style="margin:0">${p.role} — ${String(p.location).split(',')[0]}</p>
        <h1>${p.name.split(' ')[0]}<br /><em>${p.name.split(' ').slice(1).join(' ')}</em></h1>
        <p>Multi-tenant SaaS, secure APIs, Flutter &amp; React apps and practical AI — from the database all the way to the phone.</p>
      </div>
      ${heroDial(p)}
      <span class="caps foot">${p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
    </div>`,
  },
];

const executablePath = findBrowser();
if (!executablePath) {
  console.warn('! No Chrome/Edge found, so no PNGs this time. Set CHROME_PATH and run again.');
  process.exit(0);
}
const { default: puppeteer } = await import('puppeteer-core');
const browser = await puppeteer.launch({ executablePath, headless: true });
try {
  for (const pg of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: pg.w, height: pg.h, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><html data-theme="dark"><head><meta charset="utf-8">${fonts}<style>${css}</style></head><body>${pg.html}<script type="module">${setup}</script></body></html>`,
      { waitUntil: 'networkidle0' }
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => window.__ready === true);
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: pg.file, clip: { x: 0, y: 0, width: pg.w, height: pg.h } });
    await page.close();
    console.log(`✓ ${pg.file.slice(root.length + 1).replace(/\\/g, '/')}`);
  }
} finally {
  await browser.close();
}
