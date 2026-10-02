# Cat Splat Studios

The studio website at [catsplatstudios.com](https://catsplatstudios.com). Plain HTML, CSS
and JavaScript.

**No dependencies. No build step. No `node_modules`.** There is nothing to install and
nothing to compile. The `site/` directory *is* the website, byte for byte, exactly as it
gets served. That is deliberate: a seven page site does not need a toolchain, and a repo
with no package manifest has nothing for Dependabot to raise alerts about.

That still holds with the playground on it. The three demos there are hand written
JavaScript: 120 KB of source, 36 KB gzipped, which is less than the team photo on the
about page. That figure is not stated on any page and nothing checks it, so re-measure
before quoting it.

## Layout

```
site/                        everything in here is published, as-is
├── index.html               Home
├── games/index.html         Games
├── games/neon-keys/         NEON KEYS: index.html is the page, play/ is the game build
├── playground/index.html    Playground, the interactive demos
├── services/index.html      Services, including the engine and its roadmap
├── about/index.html         About
├── 404.html                 served by GitHub Pages on any unknown path
├── CNAME                    catsplatstudios.com
├── favicon.ico              browsers request this at the root regardless of link tags
├── robots.txt
├── sitemap.xml
├── .nojekyll                stops GitHub running the files through Jekyll
└── assets/
    ├── css/site.css         the stylesheet every page loads
    ├── css/playground.css   loaded only by /playground/
    ├── js/site.js           progressive enhancement only
    ├── js/game-frame.js     the Play button on a game page, loaded only there
    ├── js/playground/       the demos, loaded only by /playground/
    │   ├── debug-ui.js      a port of our Unity runtime debug UI package
    │   ├── wfc.js           wave function collapse
    │   ├── metroidvania.js  world generation and its progression validator
    │   ├── game.js          level carving, physics, the runner
    │   └── playground.js    glue: toolbars, panels, frame loops
    ├── fonts/               self-hosted, OFL licensed, see assets/fonts/LICENSES.md
    └── img/                 photos, logos, icons and the social card

docs/playground.md             why the playground exists and what it owes upstream
tools/check.py                 pre-flight checks, also a deploy gate
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
nav you updated on five pages out of six. It verifies that the duplicated header and
footer are still identical across pages, that `aria-current` is on the right link in both
navs, that tags nest and each page has exactly one `h1` with no skipped levels, that every
internal link and asset reference resolves, that every `#fragment` points at a real `id`,
that no page loads a subresource from another origin, that only `404.html` uses
root-absolute paths, that the canonical and `og:url` name the page's own served URL, that
the sitemap lists exactly the public pages, that the deploy-critical files exist, and that
no em dash has crept back in.

It also measures the one figure a page states that the repo can prove: a game page's
download size. The number sits in an element marked `data-download-size`, and the checker
adds up the files in the game's folder and fails if the page disagrees. The failure mode of
a hand-maintained number is silent staleness, and measuring it is what turns that into a
loud one. (The older `CLAIMS` list only checked that a number was still present, not that
it was true, and was retired.)

HTML that ships but is not a site page, such as a game build's own `index.html`, is listed
in `EMBEDS` instead of `PAGES`. Embeds skip the header, footer, nav, `h1`, canonical and
sitemap rules, and keep the rest. Any HTML file under `site/` that is in neither list
fails the check, so nothing ships unlooked at.

The em dash sweep and the external-subresource rule cover everything in the `ASSETS` list,
not just `site.css` and `site.js`. Add new stylesheets and scripts there when you add
them, or they ship unchecked.

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
nav change is a seven file edit, and the footer nav makes it twenty individual insertions.
That is the honest cost of having no build step, and at seven pages it is still cheaper than
the alternative. Search for `<header class="site-header"` to find every copy, then run the
checker, which fails if they have drifted apart. If the site ever outgrows this, that is
the moment to reconsider, and not before. Seven is close to the line.

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

**JavaScript is optional, on six of the seven pages.** `site.js` adds the ember field,
scroll reveals, the sticky header, the mobile menu and the section rail. With it blocked,
those six pages still render and every link still works. Keep it that way: nothing that
produces content belongs in `site.js`.

`/playground/` is the exception, and it is scoped so it stays one. Its demos genuinely
cannot exist without scripting, so each one ships a visible fallback paragraph and a
`hidden` stage, and the scripts swap them at startup. Blocked scripts leave three
explanatory paragraphs rather than three empty rectangles, and one demo throwing does not
take the other two down. The prose around them is plain HTML and reads fine on its own.

**Motion respects `prefers-reduced-motion`.** The ember canvas does not start and reveals
resolve immediately. In the playground the solver paints its finished board instead of
animating the collapse, the world map skips the reveal, and the game cuts its particle
counts and screen shake. Test new animation against it.

**One stylesheet, with one exception.** `site.css` loads everywhere. `playground.css` is
loaded only by `/playground/`, because roughly ten kilobytes of rules that exactly one
page uses should not be paid for by the other six. Do not grow that into a habit: a
second page wanting its own sheet is a sign the rules belong in `site.css` instead.

## The playground

`/playground/` carries three interactive demos, all vanilla JS with no dependencies. See
[docs/playground.md](docs/playground.md) for why they exist and what the debug UI port
still owes upstream to the Unity package.

- **Wave function collapse** (`wfc.js`) is the real solver: per-cell bitmasks of possible
  tiles, lowest-entropy collapse, constraint propagation, and backtracking that snapshots
  the wave before each decision. Tilesets are data, so adjacency comes out of socket
  equality and the solver never learns what a tile means.
- **The world generator** (`metroidvania.js`) is two halves that do not trust each other.
  One builds a lock and key world that is solvable by construction; the other re-derives
  that from a cold start and reports what it actually reached. Keep them separate. A
  generator that grades its own homework always passes.
- **Ember Run** (`game.js`) carves a platformer level out of a collapsed wave, flood fills
  the open space, and puts the exit at the furthest point by travel distance. It is the
  tie that makes the solver above a level generator rather than an illustration.

All three are gated on an `IntersectionObserver` and do no work off screen. All three take
a seed and are reproducible from it.

## Game builds

`/games/neon-keys/` hosts NEON KEYS, a Unity 6 WebGL build. `index.html` there is an
ordinary site page about the game. The game itself is in `play/`, exactly as Unity built
it: the build's own `index.html`, `favicon.ico` and `Build/`.

- **Nothing downloads until Play.** `game-frame.js` swaps the start panel for an iframe of
  `play/index.html`. Without scripts, Play is a plain link to that page, which is the same
  game filling the window.
- **Tab leaves the game.** Unity swallows the Tab key, so `game-frame.js` listens inside
  the frame and moves focus to the link after it (Shift+Tab: the section heading).
  Otherwise a keyboard user could never get out. Keep the motion warning above the Play
  button, so it is read and reached first.
- **`Build/` is engine output.** Do not edit or rename its files, and do not add them to
  `ASSETS`. To update the game, replace `play/` with the new build as a whole, run the
  checker, and correct the download size on the page if it says the figure is off. Check
  that the credits quoted on the page still match the ones the new build shows.
- **Check a rebuild in a private window,** or with DevTools' "Disable cache" on. GitHub
  Pages lets browsers reuse files for 10 minutes, and the build's file names never change,
  so a browser that loaded the old game shortly before the push can mix old code with new
  data until that runs out. Unity's "Name Files As Hashes" option would avoid it in future
  builds.
- **`robots.txt` keeps `play/` out of search results,** so searchers land on the page with
  the warning and the credits, not on the bare game.
- **No server settings needed.** The `.unityweb` files are gzip compressed and the build
  has Unity's decompression fallback on, so GitHub Pages serves them as plain files and the
  loader unpacks them in JavaScript. `.gitattributes` marks them binary.
- **It will not start off disk.** Browsers refuse the requests the game makes to load its
  own files from `file://`. To try it before pushing, run the `python -m http.server` line
  above and open `http://localhost:8000/games/neon-keys/`.
- **Every rebuild adds the full build to the git history**, since the files are binary and
  change completely. Fine at this size, but worth knowing before shipping many builds.

## Editing content

It is HTML. Open the page and change the words.

- **Add a nav item.** Edit the `.nav` list, the `.mobile-nav` list and the footer's
  Explore list, in all seven pages, then run the checker. Remember that `404.html` keeps
  root-absolute paths and that its footer is deliberately stripped.
- **Add a page.** Copy an existing one, replace the `<main>`, update the `<title>`, the
  meta description, the canonical and the `og:url`, add it to the nav and to
  `sitemap.xml`, and register it in both `PAGES` and `EXPECTED_CURRENT` in
  `tools/check.py`. Missing the second one is the easy mistake: the page still passes the
  link checks and silently skips its own aria-current check.
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
