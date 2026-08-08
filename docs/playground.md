# The playground

`/playground/` hosts three interactive demos: a wave function collapse solver, a lock and
key world generator with its progression validator, and a small platformer built on the
first of those. All three are hand written JavaScript with no dependencies, and they are
tuned through a browser port of our own Unity debug UI package.

This replaces `webgl-plan.md` and `gleamwood-slice-plan.md`, both deleted. What follows is
why, so the reasoning is not lost with them.

## Why not the Unity WebGL slice

Both plans were sound and the decision that killed them was not a flaw in either.

**It was blocked behind art.** `gleamwood-slice-plan.md` was honest that the art *was* the
work: install `com.unity.ai.generators`, lock a reference image per character, then fight
frame to frame consistency across every sheet. Nothing shippable existed until all of that
landed, and none of it is on the critical path for anything else the studio needs.

**It contradicted the thing the site is proudest of.** The README opens with no
dependencies, no build step, nothing to install. A 5 to 15 MB payload that is officially
desktop only, needs a loading screen, must never autoload, and wants a decision about Git
LFS before its first commit is the opposite of that. The compression footgun alone, where
Brotli silently fails on GitHub Pages because it will not set `Content-Encoding` for
`.br`, is a class of problem this repo did not previously have.

**We had better material.** The generators are more distinctive than a two minute combat
slice. Plenty of studios can show a playable build. Far fewer can hand you their level
generator and let you drive it.

The three demos together are 120 KB of source and 36 KB gzipped, work on a phone, load
with the page, and are the same algorithms rather than a video of them.

## What is here

| | |
|---|---|
| `site/playground/index.html` | The page |
| `site/assets/css/playground.css` | Its styles, the one deliberate exception to the single stylesheet rule |
| `site/assets/js/playground/wfc.js` | The solver, ported from `UnityWFCTilemap` and `WFC` |
| `site/assets/js/playground/metroidvania.js` | The world generator and its validator, from `MetroidvaniaGenerator` and the room graph work |
| `site/assets/js/playground/game.js` | Level carving, physics, and the runner |
| `site/assets/js/playground/debug-ui.js` | The port of `unity-runtimedebugui` |
| `site/assets/js/playground/playground.js` | Glue only: toolbars, panels, frame loops |

Two properties worth keeping if any of this is edited.

**The generator and the validator do not trust each other.** The world generator builds
something solvable by construction. The validator re-derives that from a cold start,
holding nothing, and reports what it actually reached. A generator that grades its own
homework always passes, and separating them is the only reason the page can make a claim
rather than an assertion.

**Nothing runs off screen.** Each demo's frame loop is gated on an `IntersectionObserver`.
Three canvases animating in a background tab is rude, and on a phone it is expensive.

## The debug UI, and what still owes upstream

`debug-ui.js` ports the control model from
[hisham-CSS/unity-runtimedebugui](https://github.com/hisham-CSS/unity-runtimedebugui):
tabs, sections, `Slider` with whole numbers, `Toggle`, `InfoDisplay`, `Vector`, dynamic
ranges through min and max getters, debounced persistence, and runtime tooltips. It also
ports the `[Tunable]` declarative layer that currently lives only in Gleamwood, as
`Tunable.of` and `addTabsFrom`.

Two things were proved out here that should go back into the C# package, per
`Documentation/DEBUGUI_UPSTREAM.md` in the Gleamwood repo:

1. **A `Button` control type.** The package's `ControlType` has no way to express a one
   shot action. The playground needed one immediately (Reset, Regenerate, Step) and it is
   an enum case plus a factory branch.
2. **The root swallows clicks.** `DebugUI.Start()` never sets `pickingMode` on
   `rootVisualElement`, so the document root intercepts pointer events meant for the
   game's own UI even while the panel is hidden. One line fixes it.

Note the direction, because it is not the obvious one: the vendored copy in Gleamwood is
*behind* the public package by several hundred lines, not ahead. The public repo has since
renamed the control API to a single getter and setter pair and added a `Vector` type and
whole number sliders, all of which this port follows. Adopting the package in Gleamwood
means updating every `DebugControlConfig` initialiser there, which is mechanical but wide,
and is a separate job from the two contributions above.

## The platformer's reachability model

This started out as the honest gap on the page: the world generator proved its claim and
the platformer did not, and the first person to play it got three unfinishable levels in a
row. Connected open space is a statement about tiles, not about the player.

Two halves fixed it, and both are needed.

**Geometry.** A chamber is seven tiles tall and nine wide with the shaft mouth at the top.
A jump rises four tiles and chaining wall jumps needs walls about three apart, so an empty
chamber has no way up at all. Shafts now carry rungs: single tiles alternating between the
shaft's two outer columns. Three details in `carveLevel` are each a bug that was hit:

- Rungs sit on **absolute rows**, not rows within a cell. Cells are eleven tall and the
  spacing is three, so measuring per cell kinks the ladder at every cell boundary, which
  is exactly where two shafts join.
- They are **three rows apart, not two**. At two, every second rung lands directly above
  one in the same column with a single tile of headroom, and the jump off it clips the
  rung overhead. The spacing has to exceed the alternation period.
- The **middle column is never filled**, so a drop straight down is always open and one
  tile in three can never seal a route the solver said existed.

**Verification.** `reachableFrom` walks the level assuming only walking and jumping, with
a tile shaved off both the height and the distance the physics actually allow, and
assuming nothing whatsoever about wall jumping or dashing. Jump arcs are approximated as
an L, straight up then across, which is slightly pessimistic near the apex. If a level is
completable under that model it is completable by someone who has not worked out that the
dash exists. The exit goes at the furthest point the model proved, and a seed that cannot
show most of itself reachable is discarded rather than served.

Measured over 80 seeds: 96 per cent accepted, median coverage 97 per cent of standable
tiles, exit between 12 and 40 moves from the spawn. A separate test drives the real
physics up a synthetic shaft and lands every rung with the crudest possible input, jump
and hold a direction, which is what says the model and the game agree.

Wall jump and dash are now shortcuts rather than the price of admission, which is what
they should have been.

## What is deliberately not here

- **No Unity build, of anything.** If that changes, it belongs somewhere other than this
  repo, and the reasoning in the deleted plans is in the git history.
- **No score keeping, accounts or persistence beyond `localStorage`.** The site has no
  backend and should not grow one for a toy.
