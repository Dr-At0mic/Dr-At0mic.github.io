# Portfolio — Anandhu Suresh

An editorial, hand-made-feeling portfolio. Warm paper, film grain, big variable serif type, hand-drawn doodles and risograph-style artwork. It also includes a tool that turns the same content into a résumé or biodata.

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
| `site` | Page title, SEO description, **accent colour**, default theme, preloader and custom-cursor switches |
| `profile` | Name (huge in the hero and footer), role, headline, location, timezone (live clock), email, phone, website, portrait, availability badge |
| `hero` | Eyebrow line, intro sentence, handwritten note, spinning badge text |
| `sections` | **Every section heading**: label, title, side note and nav label. Remove `nav` to keep a section out of the menu |
| `marquee` | Words on the two crossed tapes |
| `about` | Big statement, paragraphs, counting stats (decimals work, e.g. `0.945`), "currently" list |
| `projects` | Your work. `featured: true` → big **Selected work** grid; the rest → **More projects** list. Each one opens a case study with `metrics`, `highlights`, `stack`, `role` and `links` |
| `services` | The "What I do" list |
| `skills` | Toolkit rows. Wrap an item in `*asterisks*` to mark it as a core strength (shown in italic accent) |
| `domains` | Industries you know, shown as tags under the toolkit |
| `experience` | Jobs. `url` links the company name (site, case studies and résumé). `highlights` appear behind a "What I did" toggle on the site and as bullets on the résumé |
| `highlights` | The "a few things I'm proud of" list beside experience |
| `education` | Degrees and schooling, with a big score. `level: "school"` entries are left off the résumé but kept on the biodata |
| `languages` | Spoken languages, with a 0–5 `level` drawn as dots |
| `testimonials` | Quotes. Empty right now, so the section is hidden. Add some and it appears |
| `contact`, `socials`, `footer` | The closing block. A social can carry a `note` (e.g. LinkedIn's "not up to date"), shown under the link and on the résumé |
| `resume` | Résumé-only settings: `summary`, `photo`, which `projects` to include (by id, in order) and `maxProjectHighlights`. The website itself has no résumé link |

**Any section can be removed.** Delete it or leave its list empty and it disappears; the `(01)`, `(02)` numbering closes up automatically.

### Text formatting

These work in most text fields:

- `*words*` → *italic serif in the accent colour*
- `**words**` → **bold**
- `` `code` `` → monospace
- `{word}` → circled with a hand-drawn pen stroke (hero intro; single words work best)

### Images

Put images in `public/images/` and reference them without a leading slash, e.g. `"cover": "images/work/breathe.png"`.

The project covers are illustrated placeholders; real app screenshots will make the site even stronger. The portrait (`public/images/portrait.jpg`) is your photo with a light warm film grade; the résumé and biodata use a tight headshot crop of it (`tools/resume/photo.jpg`). To update from a new photo: `python tools/portrait/make_portrait.py photo.jpg --keep-background` (or without the flag for the riso cut-out treatment, which needs a plain background). Needs `pip install pillow numpy`; then re-run `npm run resume`.

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
| **Designed** | `resume`, `resume:biodata` | Dark header card with your photo, two-column layout, timeline, project cards — matches the website | Emailing someone directly, interviews, printing, portfolio links |
| **ATS-friendly** | `resume:ats`, `resume:biodata-ats` | One column, Arial, standard headings (PROFESSIONAL SUMMARY, EXPERIENCE…), plain bullets — no photo, tables, icons, colour or headers/footers | Uploading to job portals (Naukri, LinkedIn, Workday, Greenhouse…) that parse your résumé automatically |

The ATS versions also write a `.txt` (`resume-ats.txt`, `biodata-ats.txt`) to paste into portal text boxes. Symbols that confuse parsers (→, ×, ², µ, ✺) are swapped for plain equivalents automatically.

Options: `--template resume|resume-ats|biodata|biodata-ats|all`, `--no-pdf`, `--public` (also copy the PDF to `public/resume.pdf`; off by default), `--out <dir>`, `--data <file>`.

## Under the hood

- [Vite](https://vite.dev) + plain JavaScript, no framework; [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- Fonts: Fraunces (variable, whose weight and softness axes drive the hover effect on your name), Instrument Sans, JetBrains Mono, Caveat
- Responsive from 320px phones to wide desktops, tested at 320 / 360 / 390 / 414 / 768 / 1024 / 1440px
- Respects `prefers-reduced-motion`; keyboard and screen-reader friendly; case studies are linkable (`#/work/<id>`) and close with Esc or the back button

```
data.json              ← your content
public/images/         ← your images
src/render.js          ← turns data.json into markup
src/style.css          ← all styling
src/modules/           ← interactions (cursor, marquee, reveals, case study, …)
tools/resume/          ← résumé / biodata generator
```
