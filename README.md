# Cat Splat Studios

The studio website at [catsplatstudios.com](https://catsplatstudios.com). Plain HTML, CSS
and JavaScript.

**No dependencies. No build step. No `node_modules`.** There is nothing to install and
nothing to compile. The `site/` directory *is* the website, byte for byte, exactly as it
gets served. That is deliberate: a five page site does not need a toolchain, and a repo
with no package manifest has nothing for Dependabot to raise alerts about.

## Layout

```
site/                     everything in here is published, as-is
├── index.html            Home
├── games/index.html      Games
├── services/index.html   Services, including the engine and its roadmap
├── about/index.html      About
├── 404.html              served by GitHub Pages on any unknown path
├── CNAME                 catsplatstudios.com
├── favicon.ico           browsers request this at the root regardless of link tags
├── robots.txt
├── sitemap.xml
├── .nojekyll             stops GitHub running the files through Jekyll
└── assets/
    ├── css/site.css      the entire stylesheet
    ├── js/site.js        progressive enhancement only
    ├── fonts/            self-hosted, OFL licensed, see assets/fonts/LICENSES.md
    └── img/              photos, logos, icons and the social card

tools/check.py                 pre-flight checks, also a deploy gate
tools/resolver-assert.html     exercises the hit resolver, never ships
.github/workflows/deploy.yml   checks, then uploads site/ to GitHub Pages
```

## Working on it

Open `site/index.html` in a browser. Every path is relative, so double clicking a file
works and you get the real thing with styling, fonts and scripts.

The one page that will not work that way is `404.html`, which deliberately uses
root-absolute paths. GitHub Pages serves it for unknown URLs at any depth, so a relative
path there would resolve against whatever directory the visitor happened to type. To see
it, or to check the site exactly as it will be served, run any static server from inside
`site/`:

```bash
python -m http.server 8000 --directory site
```

### Before you push

```bash
python tools/check.py
```

Because nothing compiles, this script is the only thing that catches a broken link or a
nav you updated on four pages out of five. It verifies that the duplicated header and
footer are still identical across pages, that `aria-current` is on the right link in both
navs, that tags nest and each page has exactly one `h1` with no skipped levels, that every
internal link and asset reference resolves, that every `#fragment` points at a real `id`,
that no page loads a subresource from another origin, that only `404.html` uses
root-absolute paths, that the deploy-critical files exist, and that no em dash has crept
back in.

It also re-derives the run web from the adjacency in `site.js` and fails if it stops
producing 31 routes split 12, 13 and 6 over five, six and seven levels. The failure mode
of a hand-maintained figure is silent staleness, and that is the check that catches it.

It runs on every push as a deploy gate, so a failure blocks the deploy. Standard library
only, no dependencies.

## Deploying

Push to `main`. The workflow checks out the repo, runs the checker, and uploads `site/`.
No install, no build.

Two things have to stay true in repository settings: **Source: GitHub Actions**, and the
custom domain set to `catsplatstudios.com`. That setting is the authority for the domain
on an Actions based deploy. `site/CNAME` is kept alongside it as belt and braces, since it
costs nothing and means the domain survives if the deploy method ever changes back to a
branch. Leave it there.

DNS, for reference. The apex `A` records point at GitHub Pages:

```
185.199.108.153   185.199.109.153   185.199.110.153   185.199.111.153
```

## Conventions

**Paths are relative, so the site works off disk.** `assets/css/site.css` from the root,
`../assets/css/site.css` from a subdirectory. The single exception is `404.html`, for the
reason above, and the checker enforces the split in both directions.

**The header and footer are copied into each page.** There is no templating layer, so a
nav change is a five file edit. That is the honest cost of having no build step, and at
five pages it is cheaper than the alternative. Search for `<header class="site-header"` to
find every copy, then run the checker, which fails if they have drifted apart. If the site
ever outgrows this, that is the moment to reconsider, and not before.

**No em dashes.** A house rule, enforced by the checker across the HTML, the CSS and the
JavaScript. Every construction that wants one reads better as a comma, a colon, a full
stop, or a restructured sentence.

**Colours and fonts come from `:root` in `site.css`.** They are lifted from *Sentinels of
Gleamwood*'s in-game UI theme (`Assets/_Game/UI/Theme/GleamwoodTheme.tss` in the game
repo) so the site and the game read as one brand.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#100d14` | Page background |
| `--ember` | `#ff6a2a` | The run, and the build |
| `--ember-hot` | `#ffae3a` | Authored text and config |
| `--juggle` | `#86b4ff` | Tools, and the airborne state |
| `--perfect` | `#7ec88a` | Validators, and anything that passes |
| `--text` / `--text-dim` | `#cfc6dc` / `#8a8397` | Body and secondary text |
| `--rule` | `#2a2533` | Borders and dividers |

Those five accents have fixed meanings and there is no sixth. Display type is **Pixelify
Sans**, body is **Space Mono**, numerals are **Pixel Operator Mono**, which are the three
faces the game uses.

**JavaScript is optional.** `site.js` adds the ember field, scroll reveals, the sticky
header, the mobile menu, the section rail, and the three interactive figures. With it
blocked, every page still renders and every link still works. Keep it that way: nothing
that produces content belongs in there.

**Motion respects `prefers-reduced-motion`.** The ember canvas does not start, reveals
resolve immediately, and the hang figure paints its finished state. Test new animation
against it.

## The interactive figures

Three of them, all vanilla JS with no dependencies.

- **The hit resolver** on the games page mirrors the runtime order of
  `EnemyStateMachine.TakeHit`. The branch logic is a pure function exposed as
  `window.csResolveHit`, so `tools/resolver-assert.html` can walk all 48 combinations and
  check them against an independently written restatement of the contract. Open that file
  directly after changing anything in the resolver.
- **The run web** on the home page counts its own routes. The total is not typed into the
  page: the adjacency is transcribed from `GameContent.ini` `[Node:*]` blocks, taking
  `next` plus `bypass`, and the browser walks it. If the web is re-authored in the game,
  update the literal in `site.js` and the checker will tell you whether the published
  figures still hold.
- **The hang** on the home page runs one `requestAnimationFrame` loop against
  `performance.now()`, so the 0.8 second band is really 0.8 seconds. Its phase maths is a
  pure function on `window.csHangAt`.

## Editing content

It is HTML. Open the page and change the words.

- **Add a nav item.** Edit both the `.nav` list and the `.mobile-nav` list, in all five
  pages, then run the checker.
- **Add a page.** Copy an existing one, replace the `<main>`, update the `<title>`, the
  meta description, the canonical and the `og:url`, add it to the nav and to
  `sitemap.xml`, and register it in `PAGES` in `tools/check.py`.
- **Add an image.** Drop it in `site/assets/img/` and reference it relatively. Prefer
  WebP, export **lossy**, and always set `width` and `height` so the layout does not shift
  while loading. The previous version of this site shipped lossless WebP photos that were
  four to seven times larger than their JPEG originals.

The icons and the social card (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`,
`icon-512.png`, `og-card.png`) were generated with Pillow rather than drawn by hand, so
they are quick to regenerate if the brand shifts.

### Known optional improvement

The three fonts ship as TTF, about 165 KB together. Converting them to WOFF2 would roughly
halve that. It needs `fonttools` and `brotli` installed locally, one time, to produce files
that then get committed. The site itself stays dependency-free either way.

## Browser support

Current Chrome, Edge, Firefox and Safari, plus their mobile equivalents. The CSS uses
`color-mix()`, `clamp()` and `aspect-ratio`, all baseline supported since 2023. Nothing
here needs a polyfill.

## History

Through 2026 this was a React 19, Vite, Tailwind 4 and shadcn/ui application: 47 Radix
component wrappers, Framer Motion, Recharts, Embla and a patched router, all to render four
pages of static text. It was rebuilt as flat files in August 2026 to cut the dependency
surface to zero. The old implementation is in the git history if it is ever wanted back.

## License

Site code is MIT. Studio brand assets, logos and game art are copyright Cat Splat Studios
Inc and are not covered by that licence.
