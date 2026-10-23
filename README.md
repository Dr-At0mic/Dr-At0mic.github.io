# Portfolio — Anandhu Suresh

**Element 33.** Anandhu Suresh → **As** → arsenic, atomic number 33, electron shells 2 · 8 · 18 · 5. The whole site is built on that one idea: the logo is a Bohr model of the atom (33 electrons, 33 protons and 42 neutrons, all drawn), every project is an element in its own periodic table, projects without screenshots get a generated bubble-chamber "plate", and the skills strip is the element's emission spectrum. Dark mode is the detector screen; light mode is the same page printed as a lab report.

It also includes a tool that turns the same content into a résumé or biodata, and one that exports the logo files.

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

npm run brand               # logo files + social preview image (see "The brand" below)
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
| `site` | Page title, SEO description, default theme (`dark` or `light`), preloader and custom-cursor switches. `accent` is the résumé's accent colour; the website's colours are the tokens at the top of `src/style.css` |
| `profile` | Name (huge in the hero and footer), role, headline, location, timezone (live clock), email, phone, website, portrait (shown as "Fig. 1" in About, with `portraitCaption`), availability status |
| `hero` | Eyebrow line, intro sentence, a short annotation under it |
| `sections` | **Every section heading**: label, title, side note and nav label. Remove `nav` to keep a section out of the menu |
| `marquee` | Words drawn as the lines of the emission spectrum under the hero |
| `about` | Big statement, paragraphs, counting stats (decimals work, e.g. `0.945`), "currently" list |
| `projects` | Your work, in page order. `featured: true` → big **Selected work** grid; the rest → the **More projects** periodic table. `symbol` is the element symbol on its tile (made from the title if left out). `cover` is a screenshot — leave it out and the project gets a generated plate instead. `gallery` takes image paths or `{ "src", "alt", "wide": true }` and shows under the case study. Each one opens a case study with `metrics`, `highlights`, `stack`, `role` and `links` |
| `services` | The "What I do" list |
| `skills` | Toolkit rows. Wrap an item in `*asterisks*` to mark it as a core strength (shown bold, with a small accent square) |
| `domains` | Industries you know, shown as tags under the toolkit |
| `experience` | Jobs. `url` links the company name (site, case studies and résumé). `highlights` appear behind a "What I did" toggle on the site and as bullets on the résumé |
| `highlights` | The "a few things I'm proud of" list beside experience |
| `education` | Degrees and schooling, with a big score. `level: "school"` entries are left off the résumé but kept on the biodata |
| `languages` | Spoken languages, with a 0–5 `level` drawn as signal bars |
| `testimonials` | Quotes. Empty right now, so the section is hidden. Add some and it appears |
| `contact`, `socials`, `footer` | The closing block. A social can carry a `note` (e.g. LinkedIn's "not up to date"), shown under the link and on the résumé |
| `resume` | Résumé-only settings: `summary`, `photo`, which `projects` to include (by id, in order) and `maxProjectHighlights`. The website itself has no résumé link |

**Any section can be removed.** Delete it or leave its list empty and it disappears; the `01`, `02` numbering closes up automatically.

### Text formatting

These work in most text fields:

- `*words*` → accent colour (in big headings: heavy and condensed — the atom's "excited state")
- `**words**` → **bold**
- `` `code` `` → monospace
- `{word}` → boxed in detector corner brackets (hero intro; single words work best)

### Images

Put images in `public/images/` and reference them without a leading slash, e.g. `"cover": "images/work/breathe/cover.webp"`.

PhoneInput and README Templates use real screenshots (`public/images/work/<id>/`). Every other project draws a bubble-chamber plate, seeded by its `id` so it never changes — add a `cover` screenshot whenever you have one. The portrait (`public/images/portrait.jpg`) is your photo with a light warm film grade; the résumé and biodata use a tight headshot crop of it (`tools/resume/photo.jpg`). To update from a new photo: `python tools/portrait/make_portrait.py photo.jpg --keep-background` (or without the flag for the riso cut-out treatment, which needs a plain background). Needs `pip install pillow numpy`; then re-run `npm run resume`.

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
| **Designed** | `resume`, `resume:biodata` | Dark header card with your photo, two-column layout, timeline, project cards — in the site's accent colour | Emailing someone directly, interviews, printing, portfolio links |
| **ATS-friendly** | `resume:ats`, `resume:biodata-ats` | One column, Arial, standard headings (PROFESSIONAL SUMMARY, EXPERIENCE…), plain bullets — no photo, tables, icons, colour or headers/footers | Uploading to job portals (Naukri, LinkedIn, Workday, Greenhouse…) that parse your résumé automatically |

The ATS versions also write a `.txt` (`resume-ats.txt`, `biodata-ats.txt`) to paste into portal text boxes. Symbols that confuse parsers (→, ×, ², µ, ✺) are swapped for plain equivalents automatically.

Options: `--template resume|resume-ats|biodata|biodata-ats|all`, `--no-pdf`, `--public` (also copy the PDF to `public/resume.pdf`; off by default), `--out <dir>`, `--data <file>`.

## The brand (`tools/brand/`)

The logo is drawn by the same code as the site (`bohr()`, `mark` and `selfTile()` in `src/render.js`), so the two can't drift apart. `npm run brand` writes:

| File | What it is |
| --- | --- |
| `public/brand/mark.svg`, `mark-light.svg` | The small mark — four shells, the five valence electrons, a solid core — for dark / light backgrounds |
| `public/brand/atom.svg` | The full Bohr model of arsenic: 33 electrons in shells of 2, 8, 18 and 5, and a nucleus of 33 protons and 42 neutrons |
| `public/brand/avatar.png` | 1024² profile picture for GitHub, LinkedIn, Discord… |
| `public/brand/element-33.png` | 1024² periodic tile: 33 · As · Anandhu Suresh · 2 8 18 5 |
| `public/og.png` | 1200×630 link preview, referenced from `index.html` |

`public/favicon.svg` is the mark on a dark tile, hand-tuned to stay readable at 16px. The PNGs are rendered by Chrome or Edge with the site's Google Fonts, so they need a network connection.

## Under the hood

- [Vite](https://vite.dev) + plain JavaScript, no framework; [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- Fonts: Anybody (variable width and weight — letters near the cursor go from thin-and-wide to heavy-and-condensed), Archivo, Martian Mono
- Responsive from 320px phones to wide desktops
- Respects `prefers-reduced-motion` (no loader, no orbits, everything in its final state); keyboard and screen-reader friendly; case studies are linkable (`#/work/<id>`) and close with Esc or the back button
- The hero atom tilts toward the pointer and pauses when it's off screen; click it to excite it

```
data.json              ← your content
public/images/         ← your images
public/brand/          ← logo files (npm run brand)
src/render.js          ← turns data.json into markup, and draws the atom, tiles and plates
src/style.css          ← all styling; colour tokens for both themes at the top
src/modules/           ← interactions (atom, cursor, reveals, case study, …)
tools/resume/          ← résumé / biodata generator
tools/brand/           ← logo and social-image exporter
```
