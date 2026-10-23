# Portfolio — Anandhu Suresh

**Calibre** — the portfolio set out as a watchmaker's catalogue. The hero is a working watch dial that keeps the real time in Thiruvananthapuram, with today's date and the actual phase of the moon; as you scroll it shrinks into the nav and opens an index of chapters set round a dial. Every project is a piece in **the collection**, with its own guilloché dial — engraved by code, lit by your cursor — and its headline metric on the sub-dial. The toolkit is **the movement**, and the core strengths are its jewels. Night is a midnight case-room lit in rose gold; day is a silvered-opaline dial with blued-steel hands.

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

npm run brand               # monogram, avatar, dial and link-preview images (see "The brand")
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
| `site` | Page title, SEO description, default theme (`dark` = night dial, `light` = day dial) and the preloader switch. `accent` is the résumé's accent colour; the website's colours are the tokens at the top of `src/style.css` |
| `profile` | Name (engraved on the hero dial, big in the hero and footer), role, headline, location, timezone (the dial and the clocks keep this time), email, phone, website, portrait (in an arched frame, with `portraitCaption`), availability status |
| `hero` | Eyebrow line, intro sentence, a short italic note under the spec sheet |
| `sections` | **Every chapter heading**: label (also its name in the index), title and side note |
| `marquee` | The "functions" line along the foot of the hero |
| `about` | Big statement, paragraphs, counting stats (decimals work, e.g. `0.945`), "currently" list |
| `projects` | Your work, in page order. `featured: true` → a piece in **the collection** with its own dial; the rest → the **references** ledger. `symbol` makes its reference number (`BR·01`); the first of `metrics` goes on the sub-dial. `dial: { "tone": "salmon", "pattern": "barley" }` chooses a finish (tones: midnight, opaline, salmon, racing, bordeaux, slate, glacier, onyx, tobacco; patterns: wave, barley, sunburst, rosette, panier, azurage) — leave it out for the house rotation. `gallery` takes image paths or `{ "src", "alt", "wide": true }`. Each piece opens a reference page with its dial, a specification table and the full story |
| `services` | The crafts (savoir-faire) |
| `skills` | The movement. Wrap an item in `*asterisks*` to set it with a ruby jewel as a core strength — the jewel count is printed under the heading |
| `domains` | Industries you know, set in italics under the movement |
| `experience` | Jobs. `url` links the company name (site, case studies and résumé). `highlights` appear behind a "What I did" toggle on the site and as bullets on the résumé |
| `highlights` | The distinctions row under experience |
| `education` | Degrees and schooling, each with its score in a seal. `level: "school"` entries are left off the résumé but kept on the biodata |
| `languages` | Spoken languages, with a 0–5 `level` drawn as jewels |
| `testimonials` | Quotes. Empty right now, so the section is hidden. Add some and it appears |
| `contact`, `socials`, `footer` | The closing block. A social can carry a `note` (e.g. LinkedIn's "not up to date"), shown under the link and on the résumé |
| `resume` | Résumé-only settings: `summary`, `photo`, which `projects` to include (by id, in order) and `maxProjectHighlights`. The website itself has no résumé link |

**Any section can be removed.** Delete it or leave its list empty and it disappears; the roman numerals (and the index) close up automatically.

### Text formatting

These work in most text fields:

- `*words*` → *Bodoni italic in the accent colour*
- `**words**` → **bold**
- `` `code` `` → monospace
- `{word}` → engraved: italic with a fine underline (hero intro; single words work best)

### Images

Put images in `public/images/` and reference them without a leading slash, e.g. `"src": "images/work/breathe/home.webp"`.

Projects are shown by their dials, so they need no cover; screenshots go in `gallery` and appear on the reference page (PhoneInput and README Templates have them). The portrait (`public/images/portrait.jpg`) is your photo with a light warm film grade; the résumé and biodata use a tight headshot crop of it (`tools/resume/photo.jpg`). To update from a new photo: `python tools/portrait/make_portrait.py photo.jpg --keep-background` (or without the flag for the riso cut-out treatment, which needs a plain background). Needs `pip install pillow numpy`; then re-run `npm run resume`.

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

The mark is an **AS monogram** — a roman A with an italic S cut through it, from Bodoni Moda, outlined into paths so it needs no font — set inside a watch's minute track. `npm run brand` draws everything with the site's own code:

| File | What it is |
| --- | --- |
| `public/brand/monogram.svg`, `monogram-light.svg` | The monogram for dark / light backgrounds |
| `public/brand/avatar.png` | 1024² profile picture (GitHub, LinkedIn, Discord…) |
| `public/brand/dial.png` | 1024² the hero dial at ten past ten — for slides, prints, a profile banner |
| `public/og.png` | 1200×630 link preview, referenced from `index.html` |

`public/favicon.svg` is the monogram on a midnight tile. The PNGs are rendered by Chrome or Edge with the site's Google Fonts, so they need a network connection.

## How the dials work

`src/modules/guilloche.js` is a small rose engine. Each pattern (waves, barleycorn, sunburst, rosette, basket weave, snailing) is generated as fine polylines in a unit circle. Engraved metal shimmers because a groove only throws light back when it runs across the light, so every line segment is sorted by direction into 36 paths once; painting strokes each path with a brightness set by the angle between its direction and the light. Moving the light re-strokes 36 paths, not thousands of segments, so the hero dial follows the cursor at full frame rate. `src/modules/dial.js` runs the hero's movement — the seconds hand moves in eighths of a second, like a 28,800 vph calibre — and docks it into the nav.

## Under the hood

- [Vite](https://vite.dev) + plain JavaScript, no framework; [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- Fonts: Bodoni Moda (variable — the footer name's hairlines thicken as the cursor passes) and Hanken Grotesk
- Responsive from 320px phones to wide desktops; the index becomes a list on phones
- Respects `prefers-reduced-motion` (no loader, no docking or sweeping — the watch simply ticks); keyboard and screen-reader friendly; reference pages are linkable (`#/work/<id>`) and close with Esc or the back button

```
data.json              ← your content
public/images/         ← your images
public/brand/          ← logo files (npm run brand)
src/render.js          ← turns data.json into markup, including every dial
src/style.css          ← all styling; colour tokens for night and day at the top
src/modules/           ← guilloché engine, hero movement, reveals, case study, …
tools/resume/          ← résumé / biodata generator
tools/brand/           ← logo and link-preview exporter
```
