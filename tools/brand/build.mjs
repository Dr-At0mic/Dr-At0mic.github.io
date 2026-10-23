// Builds the Element 33 brand files from the same drawing code the website uses.
//
//   npm run brand
//
// Writes:
//   public/brand/mark.svg          the small mark (shells + five valence electrons), for dark backgrounds
//   public/brand/mark-light.svg    the same, for light backgrounds
//   public/brand/atom.svg          the full Bohr model of arsenic: 33 electrons, 75 nucleons
//   public/brand/avatar.png        1024² profile picture (GitHub, LinkedIn, Discord…)
//   public/brand/element-33.png    1024² periodic tile lockup
//   public/og.png                  1200×630 social preview (index.html points at it)
//
// The PNGs are drawn by Chrome or Edge, found automatically (or set CHROME_PATH), with the
// site's Google Fonts — so they need a network connection.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bohr, mark, nucleus, selfTile, ELEMENT } from '../../src/render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(readFileSync(join(root, 'data.json'), 'utf8'));
const out = join(root, 'public/brand');
mkdirSync(out, { recursive: true });

const C = {
  dark: '#07080B',
  ink: '#E9ECF1',
  ink2: '#9BA2AD',
  ink3: '#626975',
  line2: 'rgba(233,236,241,.22)',
  accent: '#5C8DFF',
  lightBg: '#F0EFEA',
  lightInk: '#0B0C10',
  lightAccent: '#2348E6',
};

/* ---------- SVGs: the site's markup with its CSS classes resolved to fixed colours ---------- */
const svgFile = (inner, css, size = 512) =>
  inner
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `)
    .replace(/ aria-hidden="true"/, '')
    .replace(/>/, `><title>Element ${ELEMENT.z} — ${data.profile.name}</title><style>${css}</style>`);

const markCss = (ink, accent) =>
  `.mark__ring{fill:none;stroke:${ink};stroke-width:7;opacity:.45}.mark__ring--n{opacity:1}.mark__valence,.mark__core{fill:${accent}}`;

writeFileSync(join(out, 'mark.svg'), svgFile(mark, markCss(C.ink, C.accent)));
writeFileSync(join(out, 'mark-light.svg'), svgFile(mark, markCss(C.lightInk, C.lightAccent)));
writeFileSync(
  join(out, 'atom.svg'),
  svgFile(
    bohr({ labels: true }).replace(/ style="--[^"]*"/g, ''),
    `.bohr__ring{fill:none;stroke:${C.line2};stroke-width:.5}.bohr__e{fill:${C.ink}}.bohr__e.is-valence{fill:${C.accent}}` +
      `.bohr__halo{fill:${C.accent};opacity:.22}.bohr__label{font:3.6px ui-monospace,Menlo,Consolas,monospace;fill:${C.ink3}}` +
      `.nu{fill:${C.ink3}}.nu--p{fill:${C.accent}}`,
    1024
  )
);
console.log('✓ public/brand/mark.svg, mark-light.svg, atom.svg');

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

const fonts =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,100..900&family=Archivo:wdth,wght@62..125,100..900&family=Martian+Mono:wdth,wght@75..112.5,100..800&display=block">';

const base = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:${C.dark};color:${C.ink};font-family:Archivo,sans-serif;overflow:hidden;-webkit-font-smoothing:antialiased}
  svg{display:block;overflow:visible}
  .label{font:400 15px/1.4 'Martian Mono',monospace;font-stretch:87.5%;letter-spacing:.03em;text-transform:uppercase;color:${C.ink2}}
  .bohr__ring{fill:none;stroke:${C.line2};stroke-width:1;vector-effect:non-scaling-stroke}
  .bohr__e{fill:${C.ink2}} .bohr__e.is-valence{fill:${C.accent}} .bohr__halo{fill:${C.accent};opacity:.22}
  .bohr__label{font:3.6px 'Martian Mono',monospace;fill:${C.ink3}}
  .nu{fill:${C.ink3}} .nu--p{fill:${C.accent}}
  .tile{display:grid;grid-template-columns:1fr auto;grid-template-rows:auto 1fr auto;aspect-ratio:1;background:${C.accent};color:#050915}
  .tile__z{grid-area:1/1;font-family:'Martian Mono',monospace;font-weight:500;font-stretch:87.5%;line-height:1}
  .tile__side{grid-area:1/2/3/3;display:flex;flex-direction:column;align-items:flex-end;font-family:'Martian Mono',monospace;font-stretch:87.5%;line-height:1;opacity:.72}
  .tile__side i{font-style:normal}
  .tile__sym{grid-area:2/1/3/2;align-self:center;font-family:Anybody;font-weight:700;font-stretch:96%;line-height:.9;letter-spacing:-.03em}
  .tile__name{grid-area:3/1/4/3;font-family:'Martian Mono',monospace;font-stretch:87.5%;text-transform:uppercase;letter-spacing:.02em;opacity:.72;white-space:nowrap}
`;

const tileSize = (px) => `
  .tile{width:${px}px;padding:${px * 0.065}px ${px * 0.07}px ${px * 0.06}px}
  .tile__z{font-size:${px * 0.076}px} .tile__side{font-size:${px * 0.058}px;gap:${px * 0.016}px}
  .tile__sym{font-size:${px * 0.37}px} .tile__name{font-size:${px * 0.056}px}`;

const pages = [
  {
    file: join(out, 'avatar.png'),
    w: 1024,
    h: 1024,
    html: `<style>${base}
      .stage{position:relative;width:1024px;height:1024px;display:grid;place-items:center}
      .stage .bohr{width:880px;height:880px}
      .stage .bohr__e{r:2.4} .stage .bohr__e.is-valence{r:3.6} .stage .bohr__halo{r:9}
    </style><div class="stage">${bohr({ labels: false })}</div>`,
  },
  {
    file: join(out, 'element-33.png'),
    w: 1024,
    h: 1024,
    html: `<style>${base}${tileSize(1024)}</style>${selfTile(data.profile.name)}`,
  },
  {
    file: join(root, 'public/og.png'),
    w: 1200,
    h: 630,
    html: `<style>${base}${tileSize(150)}
      .og{position:relative;width:1200px;height:630px;padding:56px 64px 48px;display:flex;flex-direction:column;overflow:hidden}
      .atom{position:absolute;right:-170px;top:20px;width:820px;height:820px;perspective:1500px}
      .tilt{position:absolute;inset:0;transform:rotateX(63deg) rotateZ(-14deg)}
      .tilt .bohr{width:100%;height:100%} .tilt .bohr__e{r:1.1} .tilt .bohr__e.is-valence{r:2} .tilt .bohr__halo{r:5.5}
      .core{position:absolute;left:50%;top:50%;width:9.5%;translate:-50% -50%}
      .top{display:flex;justify-content:space-between;align-items:flex-start;position:relative}
      .lead{max-width:560px;margin-top:22px;font-size:31px;line-height:1.15;letter-spacing:-.025em;font-stretch:96%}
      .lead em{font-style:normal;color:${C.accent}}
      .name{margin-top:auto;font-family:Anybody;font-weight:260;font-stretch:118%;font-size:104px;line-height:.86;letter-spacing:-.01em;position:relative}
      .foot{display:flex;justify-content:space-between;margin-top:26px;padding-top:16px;border-top:1px solid ${C.line2};position:relative}
    </style>
    <div class="og">
      <div class="atom"><div class="tilt">${bohr({ withNucleus: false, labels: true })}</div><div class="core">${nucleus()}</div></div>
      <div class="top"><p class="label">${data.profile.role} — ${data.profile.location.split(',')[0]}</p>${selfTile(data.profile.name)}</div>
      <p class="lead">Multi-tenant <em>SaaS</em>, secure APIs, Flutter &amp; React apps and practical AI — from the database to the phone.</p>
      <h1 class="name">ANANDHU<br>SURESH</h1>
      <div class="foot label"><span>Element ${ELEMENT.z} · As · ${ELEMENT.shells.join(' · ')}</span><span>${data.profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span></div>
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
  for (const p of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: p.w, height: p.h, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${fonts}</head><body>${p.html}</body></html>`, {
      waitUntil: 'networkidle0',
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: p.file, clip: { x: 0, y: 0, width: p.w, height: p.h } });
    await page.close();
    console.log(`✓ ${p.file.slice(root.length + 1).replace(/\\/g, '/')}`);
  }
} finally {
  await browser.close();
}
