# Hosting playable WebGL builds on catsplatstudios.com

A plan, not an implementation. Nothing here is built yet and no Unity work should start
until the open questions at the bottom are answered.

## Why this is worth doing

The site currently asks people to take our word for it. A playable build in the browser
is the only thing on a studio site that proves anything without the reader deciding to
trust us first, and it is the natural home for the portfolio section that replaces the
mechanical write-ups we just removed.

It also fits the architecture. A Unity WebGL build is a folder of static files. It drops
into `site/play/<game>/` and gets served by the same GitHub Pages deploy with no server,
no build step and no new dependency in the repo.

## What it costs

The honest numbers, because they decide whether this is worth it.

| Concern | Reality |
|---|---|
| Build size | A small 2D Unity WebGL build lands around 5 to 15 MB compressed, once stripping and Brotli are on. That is 6 to 17 times the entire current site. |
| Repo size | GitHub soft-limits repos at 1 GB and hard-limits single files at 100 MB. One or two small games is fine. A habit of committing every build is not. |
| Load time | First load pulls the whole payload before anything is playable. Budget a loading screen and expect several seconds on a normal connection. |
| Mobile | Unity WebGL is officially desktop-only. It often works on modern phones and it often does not. Plan to detect and show a message rather than to support it. |
| Compression | Brotli gives the smallest payload but needs a `Content-Encoding` header GitHub Pages will not set for `.br` files. **Use gzip, or use Brotli with Unity's decompression fallback enabled.** This is the single most common way a Pages-hosted WebGL build fails to run. |

## Which game

**Rocket Recover** is the obvious candidate: it already shipped once on mobile, it is
small, and it is the only title we have that is finished rather than in progress.

The catch is that the source lives at `Cat-Splat-Studios/Project_ShipJump` and is not
cloned locally. It has not been touched in years, so it will be on a Unity version far
enough back that opening it means an upgrade, and a mobile game means touch input that
has to become keyboard and mouse. Treat reviving it as a real project with an unknown
floor until someone opens the editor, not as an afternoon.

The cheaper first move is a **Gleamwood slice**: one room, one enemy, the movement and
the combat. It builds from a project that is already current, it needs no upgrade, and it
demonstrates the systems the services page talks about. Its problem is that the art is
placeholder, which is the same wall the Steam page hit.

Neither is free. Pick one before any Unity work starts.

## How it would slot in

```
site/
├── play/
│   ├── index.html          the portfolio and arcade page
│   └── rocket-recover/
│       ├── index.html      our own shell, not Unity's default template
│       └── Build/          the Unity output, committed as-is
└── assets/js/player.js     loader, aspect handling, fullscreen, error states
```

Points worth deciding early rather than discovering:

- **Write our own shell.** Unity's default WebGL template carries its own CSS and layout
  and will not match the site. Ours is a `<canvas>` in the existing panel styling, with
  the ember loading bar, a fullscreen button and a real error state.
- **Never autoload.** The page shows a poster frame and a Play button, and only fetches
  the build when someone asks for it. Otherwise every visitor to the portfolio page pays
  the full download whether or not they wanted to play.
- **Keep it out of the checker's link rules.** `tools/check.py` walks every asset
  reference. Unity's `Build/` folder is generated, so exclude it explicitly rather than
  letting it produce noise on every run.
- **Decide on Git LFS before the first commit, not after.** Moving a binary into LFS
  later rewrites history. If builds are going to be committed repeatedly, set LFS up
  first for `site/play/**/Build/*`.

## Open questions

1. **Which game first**, Rocket Recover revived or a Gleamwood slice? This decides
   whether the first step is a Unity upgrade or a build config.
2. **Is committing multi-megabyte builds into this repo acceptable**, or should the
   builds live somewhere else and be embedded? Keeping them here is simpler and keeps
   the zero-dependency deploy. It also permanently grows a repo whose whole appeal right
   now is that it is small.
3. **Does the portfolio page replace anything**, or is it a fifth page? It changes the
   nav, and the nav is duplicated across five files.
4. **Is Rocket Recover's source in a state anyone has opened recently?** Nobody should
   commit to a revival before that is checked.

## What this is not

Not a rewrite of the site's architecture. The site stays hand-written, dependency-free
and build-free. A Unity build is a static asset that happens to be large, and everything
above is about handling it responsibly rather than about changing how the site works.
