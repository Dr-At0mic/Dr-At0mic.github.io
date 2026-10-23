// Builds the Atomic brand files from the site itself.
//
//   npm run brand
//
// Writes:
//   public/favicon.svg        the mark on a soot tile — arsenic's six 4p lobes, seen down the diagonal
//   public/brand/mark.svg     the same mark, no tile, for dark backgrounds
//   public/brand/avatar.png   1024² profile picture: the hero's electron cloud, rendered by the site
//   public/brand/atom.png     1600² the same, larger, for slides or a banner
//   public/og.png             1200×630 link preview (index.html points at it)
//
// The PNGs are taken from the real page: the tool starts Vite, opens the site in Chrome or Edge
// (found automatically, or set CHROME_PATH) with WebGL on, waits for the particles to settle and
// takes the picture — so they need a network connection for the fonts.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(readFileSync(join(root, 'data.json'), 'utf8'));
const out = join(root, 'public/brand');
mkdirSync(out, { recursive: true });

/* ---------- the mark: six teardrop lobes, phases alternating, around a nucleus ---------- */
const GOLD = '#F4B52F';
const BONE = '#ECE7DC';
const SOOT = '#0B0A09';
const lobe = 'M0 -7C8.6 -13 9.6 -31 0 -40C-9.6 -31 -8.6 -13 0 -7Z';
const mark = (tile) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" width="512" height="512">
  <title>${data.profile.name} — mark</title>
  ${tile ? `<rect x="-50" y="-50" width="100" height="100" rx="22" fill="${SOOT}"/>` : ''}
  <g transform="rotate(16) scale(${tile ? 1 : 1.18})">
    ${Array.from({ length: 6 }, (_, i) => `<path d="${lobe}" transform="rotate(${i * 60})" fill="${i % 2 ? GOLD : BONE}" fill-opacity="${i % 2 ? 0.95 : 0.88}"/>`).join('\n    ')}
    <circle r="4.2" fill="${BONE}"/>
  </g>
</svg>
`;
writeFileSync(join(root, 'public/favicon.svg'), mark(true));
writeFileSync(join(out, 'mark.svg'), mark(false));
console.log('✓ public/favicon.svg, public/brand/mark.svg');

/* ---------- PNGs, rendered by the site ---------- */
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

const executablePath = findBrowser();
if (!executablePath) {
  console.warn('! No Chrome/Edge found, so no PNGs this time. Set CHROME_PATH and run again.');
  process.exit(0);
}

// only the field: no text, no HUD, no grain
const bare = 'main, .nav, .hud, .contact, .grain, .markers, .boot { visibility: hidden !important; }';
// the hero without the chrome around it, its name sized for a 630px-tall card
const og = `.nav, .hud, .grain, .markers, .boot, .hero__top, .hero__fig, .hero__foot, .hero__spec, .hero__note { visibility: hidden !important; }
  .hero { min-height: 630px !important; padding-bottom: 44px !important; }
  .hero__name { font-size: 150px !important; }
  .hero__intro { padding-top: 0 !important; }`;

const shots = [
  { file: join(out, 'avatar.png'), w: 1024, h: 1024, css: bare, scale: 1.1 },
  { file: join(out, 'atom.png'), w: 1600, h: 1600, css: bare, scale: 1.1 },
  { file: join(root, 'public/og.png'), w: 1200, h: 630, css: og },
];

const { createServer } = await import('vite');
const server = await createServer({ root, logLevel: 'error', server: { port: 0 } });
await server.listen();
const url = server.resolvedUrls.local[0];

const { default: puppeteer } = await import('puppeteer-core');
const args = ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-unsafe-swiftshader', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])];
const browser = await puppeteer.launch({ executablePath, headless: true, args });
try {
  for (const s of shots) {
    const page = await browser.newPage();
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.addStyleTag({ content: s.css });
    // centre the atom for the square renders
    if (s.scale) await page.evaluate((scale) => Object.assign(document.querySelector('.hero').dataset, { shift: '0', scale: String(scale) }), s.scale);
    if (!(await page.evaluate(() => !document.documentElement.classList.contains('no-webgl')))) throw new Error('WebGL is unavailable in this browser, so the field cannot be rendered.');
    // the boot count, the big bang, and a moment for the shape to settle
    await page.waitForFunction(() => document.documentElement.classList.contains('is-booted'), { timeout: 20000 });
    await new Promise((r) => setTimeout(r, 4200));
    await page.screenshot({ path: s.file, clip: { x: 0, y: 0, width: s.w, height: s.h } });
    await page.close();
    console.log(`✓ ${s.file.slice(root.length + 1).replace(/\\/g, '/')}`);
  }
} finally {
  await browser.close();
  await server.close();
}
