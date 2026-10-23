# Portfolio — Anandhu Suresh

**Atomic** — the whole page sits over one field of 65,536 particles. They open as a single point, bang into the electron cloud of arsenic (As — my initials, element 33), and then take a new shape for every section you scroll to, each drawn from how that project actually works: India's air-quality graph for Breathe, Opus packets leaving a phone for PhoneInput, an ESC/POS receipt for FloatPro, a black hole for README Templates, retrieval on an embedding sphere for AI Hub, a radial menu for OG Converter, a hash-chained ledger for ClinicFlow, a cited knowledge graph for Easy Learn, database-per-tenant for CareRez. "The maker" is a 3D bust rebuilt from my photo.

Every change of shape is reported as a database transaction in the HUD — scroll forward and it `COMMIT`s, scroll back and it `ROLLBACK`s — and the footer draws a trace of your visit, a span for each section you read, the way I'd trace a request in production. The cursor is a charge that pushes the particles around; a click sends a pulse through them. Orpiment on soot — the yellow sulfide of arsenic — and only night: the particles glow, so there's no day theme.

It also includes a tool that turns the same content into a résumé or biodata, one that rebuilds the 3D portrait, and one that exports the logo files.

**All website content lives in [`data.json`](data.json).** Edit that file, not the code.

## Run it

```bash
npm install
npm run dev              # local dev server; edits to data.json update the page instantly
npm run build            # production build in /dist (a plain static site)
npm run preview          # preview the production build

npm run resume              # designed résumé (photo, two columns)
npm run resume:ats          # ATS-friendly résumé (plain, single column) + .txt
npm run resume:biodata      # designed Indian-style biodata
npm run resume:biodata-ats  # ATS-friendly biodata + .txt
npm run resume:all          # all four

npm run brand               # favicon, mark, avatar and link-preview images (see "The brand")
npm run portrait:3d         # rebuild the 3D bust from tools/portrait/source.png (see "The 3D portrait")
```

Deploy `/dist` anywhere static: Netlify, Vercel, GitHub Pages or any web host. It works from a sub-folder too.

## Branches & deployment

| Branch | Purpose |
| --- | --- |
| `dev` | Default branch. Day-to-day work happens here. |
| `prod` | What's live. **Every push to `prod` builds the site and deploys it to https://dr-at0mic.github.io/** via GitHub Actions (`.github/workflows/deploy.yml`, which lives on `prod`). |

To release:

```bash
git checkout prod
git merge dev
git push            # Actions builds with Vite and publishes to GitHub Pages (about a minute)
git checkout dev
```

You can also re-run a deploy from the repo's **Actions** tab ("Deploy to GitHub Pages" → *Run workflow*, on `prod`).

## Editing `data.json`

| Key | What it controls |
| --- | --- |
| `site` | Page title, SEO description and the preloader switch (the `BEGIN; allocating 65,536 atoms` count). `accent` is the résumé's accent colour; the website's colours are the tokens at the top of `src/style.css` |
| `profile` | Name (huge in the hero and footer), role, headline, location, timezone (the clocks keep this time), email, phone, website, availability status. `portrait` is the photo the résumé uses; the site uses the 3D bust instead |
| `hero` | Eyebrow line, intro sentence, a short italic note, and the hero's `form` (the atom) |
| `sections` | **Every section heading**: label, title, side note and `nav` label (leave `nav` out to keep a section out of the menu). A section can carry a `form` too — see below |
| `marquee` | The line of skills along the foot of the hero |
| `about` | Big statement (it lights up word by word as you read), paragraphs, counting stats (decimals work, e.g. `0.945`), "currently" list |
| `projects` | Your work, in page order. `featured: true` → a full-screen chapter with its own particle `form`; the rest → the **More work** ledger. `gallery` takes image paths or `{ "src", "alt", "wide": true }`. Every project opens a case study at `#/work/<id>` with its metrics, how it works, its links and gallery — and the field takes that project's shape behind it |
| `services` | What you're brought in for |
| `skills` | The toolkit. Wrap an item in `*asterisks*` to mark it as a core strength — it's a bright bead on the armillary and gold in the list |
| `domains` | Industries you know, set in italics under the toolkit |
| `experience` | Jobs. `url` links the company name (site, case studies and résumé). `highlights` appear behind a "What I did" toggle on the site and as bullets on the résumé |
| `highlights` | The achievements row under experience; each `tag` decodes like a readout |
| `education` | Degrees and schooling, each with its score. `level: "school"` entries are left off the résumé but kept on the biodata |
| `languages` | Spoken languages, with a 0–5 `level` drawn as dots |
| `testimonials` | Quotes. Empty right now, so the section is hidden. Add some and it appears |
| `contact`, `socials`, `footer` | The closing block. A social can carry a `note`, shown under the link and on the résumé |
| `resume` | Résumé-only settings: `summary`, `photo`, which `projects` to include (by id, in order) and `maxProjectHighlights`. The website itself has no résumé link |

**Any section can be removed.** Delete it or leave its list empty and it disappears; the numbering (and the menu) close up automatically.

### Formations

A `form` is `"form": "name"` or `"form": { "name": "…", "caption": "…", …parameters }` on a project, on `hero`, or on any entry in `sections`. The caption becomes that section's figure note (`Fig. 03 — …`). The shapes are drawn by code in [`src/modules/forms.js`](src/modules/forms.js), from real data where there is some:

| Name | What it draws |
| --- | --- |
| `atom` | Arsenic's electron cloud: its p and d orbitals drawn as real \|ψ\|² surfaces, 33 protons and 42 neutrons in the nucleus |
| `portrait` | The 3D bust; `src` points at the image `npm run portrait:3d` writes |
| `gnn-india` | 29 Indian cities at their real coordinates, with messages passing along the edges |
| `phone-wave` | A phone streaming 10 ms Opus frames through a jitter buffer to a desktop |
| `receipt` | An ESC/POS receipt curling out of a printer |
| `black-hole` | An accretion disk with a photon ring, lensed over the shadow |
| `embeddings` | Topics on a unit sphere, a query vector and its five nearest neighbours by cosine |
| `wheel` | Three rings of a radial menu, a dragged file and the cursor |
| `hash-chain` | An append-only ledger of linked blocks |
| `knowledge-graph` | A graph whose highlighted node links back to the passage it came from |
| `db-tenants` | Twelve tenant databases behind a router |
| `stack` | Database → API → web → phone, exploded |
| `armillary` | The toolkit: a ring per `skills` area, a bead per tool, core strengths bright |
| `commit-graph` | A lane per repository, a dot per commit — `lanes` and `commits` are parameters |
| `chess-king` | A Staunton king, lathe-turned |
| `globe`, `dust` | Fallbacks: a project without a `form` gets `globe`; quiet sections rest as `dust` |

The particle count follows the device: 65,536 on a desktop, 32,768 on a machine with 4 GB / 4 cores or less (or a window under 1,100px wide), 16,384 on a phone or touch screen. Without WebGL 2 the page reads as a plain editorial page with a still of the atom; with `prefers-reduced-motion` the shapes still form but change without flying, and nothing drifts or follows the cursor.

### Text formatting

These work in most text fields:

- `*words*` → *Instrument Serif italic in the accent colour*
- `**words**` → **bold**
- `` `code` `` → monospace
- `{word}` → redacted, then revealed with a wipe (hero intro; single words work best)

### Images

Put images in `public/images/` and reference them without a leading slash, e.g. `"src": "images/work/breathe/home.webp"`.

Projects are drawn by their formations, so they need no cover; screenshots go in `gallery` and appear in the case study (PhoneInput and README Templates have them). The résumé and biodata use a tight headshot crop of the photo (`tools/resume/photo.jpg`), made by `python tools/portrait/make_portrait.py photo.jpg --keep-background`. Needs `pip install pillow numpy`; then re-run `npm run resume`.

## The 3D portrait (`tools/portrait/make_portrait3d.py`)

"The maker" isn't the photo drawn in dots — it's a bust rebuilt from it. `npm run portrait:3d` runs two small open models locally with ONNX Runtime: **MODNet** cuts the person out (hair and all) and **Depth Anything V2 Small** recovers the shape of the face and shoulders. The script turns the depth into surface normals, relights the bust like a sculpture — a key light, a fill and a rim — and closes it with an inflated back so it has volume as it turns.

It writes `public/images/portrait-3d.png`, one image holding the whole bust: red is the lit brightness, green the front depth, blue the back depth. The particle field reads it to place every point in 3D. Stage-by-stage previews go to `tools/portrait/out/`.

To use a new photo, replace `tools/portrait/source.png` (or pass a path) and run it again. Needs `pip install onnxruntime pillow numpy`; the models (~125 MB, both Apache-2.0) download once into `tools/portrait/models/`, which is git-ignored. A head-and-shoulders photo facing the camera works best.

## The résumé tool (`tools/resume/`)

`npm run resume` reads `data.json` and writes to `tools/resume/out/`:

| File | Use it for |
| --- | --- |
| `resume.pdf` | The designed résumé: A4, two pages, with your photo. Real selectable text |
| `resume.html` | Opening in a browser to tweak or print |
| `resume.md` | Pasting into job portals, LinkedIn or emails |
| `resume.json` | The [JSON Resume](https://jsonresume.org) standard, importable by many résumé builders and themes |

`npm run resume:biodata` builds `biodata.pdf/.html/.md`, the Indian-style biodata. It adds personal details, all education including Class 10/12, and a declaration with place, date and signature lines. It uses the natural-colour photo at `tools/resume/photo.jpg` (set via `photo` in `private.json`).

**Private details** (date of birth, parents' names, address) live in `tools/resume/private.json`. That file is **git-ignored and never bundled into the website**: anything in `data.json` is public once the site is deployed, so personal details deliberately don't go there. `private.example.json` shows every available field.

The PDF is printed by Chrome or Edge, which the tool finds automatically. If it can't, set `CHROME_PATH`, or open the `.html` file and use *Print → Save as PDF*.

### Designed vs ATS-friendly

| Version | Commands | Looks like | Use it when |
| --- | --- | --- | --- |
| **Designed** | `resume`, `resume:biodata` | Dark header card with your photo, two-column layout, timeline, project cards — in the `site.accent` colour | Emailing someone directly, interviews, printing, portfolio links |
| **ATS-friendly** | `resume:ats`, `resume:biodata-ats` | One column, Arial, standard headings (PROFESSIONAL SUMMARY, EXPERIENCE…), plain bullets — no photo, tables, icons, colour or headers/footers | Uploading to job portals (Naukri, LinkedIn, Workday, Greenhouse…) that parse your résumé automatically |

The ATS versions also write a `.txt` (`resume-ats.txt`, `biodata-ats.txt`) to paste into portal text boxes. Symbols that confuse parsers (→, ×, ², µ, ✺) are swapped for plain equivalents automatically.

Options: `--template resume|resume-ats|biodata|biodata-ats|all`, `--no-pdf`, `--public` (also copy the PDF to `public/resume.pdf`; off by default), `--out <dir>`, `--data <file>`.

## The brand (`tools/brand/`)

The mark is the atom seen down its diagonal: arsenic's six 4p lobes, phases alternating bone and orpiment, round the nucleus. `npm run brand` writes:

| File | What it is |
| --- | --- |
| `public/favicon.svg` | The mark on a soot tile |
| `public/brand/mark.svg` | The mark alone, for dark backgrounds |
| `public/brand/avatar.png` | 1024² profile picture (GitHub, LinkedIn, Discord…): the hero's electron cloud |
| `public/brand/atom.png` | 1600² the same, for slides or a banner — and the still the site shows without WebGL |
| `public/og.png` | 1200×630 link preview, referenced from `index.html` |

The PNGs are photographs of the real site: the tool starts Vite, opens the page in Chrome or Edge with WebGL on, waits for the particles to settle and takes the picture. It needs a network connection for the fonts.

## How the field works

One draw call. Every formation is built once on the CPU ([`forms.js`](src/modules/forms.js)) as a list of points — position, size, brightness, accent, a phase for pulses that run along paths, and a spin — and uploaded as one layer of two float texture arrays. The vertex shader ([`field.js`](src/modules/field.js)) reads each particle's place in two layers by `gl_VertexID` and mixes between them, so morphing costs nothing on the CPU: the page only says which two layers and how far between. In flight, particles swirl through 3D simplex noise; at rest they shimmer, more when you scroll fast. The cursor pushes and swirls them in screen space, a click sends a ring outwards, and points away from the focal plane grow and fade like bokeh.

[`director.js`](src/modules/director.js) maps scroll to formations: each element with `data-form` is an anchor whose shape holds while it fills the screen and morphs into the next in between, posed beside its text. It also writes the HUD's transactions, pins the formations' labels to their 3D points, and drives the case-study and menu previews. The formations are built in idle time after the first frame, and three.js loads as its own chunk alongside the fonts.

## Under the hood

- [Vite](https://vite.dev) + plain JavaScript, no framework; [three.js](https://threejs.org) for the field, [GSAP](https://gsap.com) for type (SplitText, ScrambleText), [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- Fonts: Archivo (variable width — the name stretches into place, and the footer name widens towards the cursor), Instrument Serif and Martian Mono; the clock carries the city's name in Malayalam
- Optional sound, synthesised with the Web Audio API — a drone, a breath on `BEGIN` and a tick on `COMMIT`; off until you turn it on
- Responsive from 320px phones to wide desktops; on phones the menu holds the sound switch
- Respects `prefers-reduced-motion`; keyboard and screen-reader friendly (skip link, real headings, the field is `aria-hidden`); case studies are linkable (`#/work/<id>`) and close with Esc or the back button

```
data.json              ← your content
public/images/         ← your images, and the 3D bust (npm run portrait:3d)
public/brand/          ← logo files (npm run brand)
src/render.js          ← turns data.json into markup
src/style.css          ← all styling; colour tokens at the top
src/modules/forms.js   ← every formation
src/modules/field.js   ← the particle engine and its shaders
src/modules/director.js← scroll → formation, HUD, markers
src/modules/           ← reveals, case study, visit trace, sound, …
tools/resume/          ← résumé / biodata generator
tools/portrait/        ← the 3D portrait builder
tools/brand/           ← logo and link-preview exporter
```
