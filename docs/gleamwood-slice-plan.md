# The Gleamwood WebGL slice

A playable browser slice of Sentinels of Gleamwood, hosted on catsplatstudios.com, with
AI-generated art for the player, three enemies and one biome's tileset.

This is the plan. Nothing is built. The verified findings below are current as of
2026-08-03 and were checked against the project on disk rather than against its docs.

## Why this is the right first WebGL target

It builds anticipation for the game rather than for the studio, it comes from a project
that is current rather than one that needs a multi-year Unity upgrade, and the art it
needs is the same art the Steam page has been waiting on. One art push unlocks the slice,
the store screenshots and the trailer together.

## What is already in place

Checked, not assumed.

| | State |
|---|---|
| Editor | 6000.5.2f1 installed, matching `ProjectVersion.txt` |
| WebGL module | Installed on 6000.5.2f1, alongside Android and Windows |
| Steamworks | Its runtime asmdef lists `includePlatforms` without WebGL, so it never compiles there. `GLEAMWOOD_STEAM` is set only on Standalone, so every Steam call site compiles out. **This is not a blocker.** |
| Settings storage | `ConfigStore` already falls back to `PlayerPrefs` off desktop |
| Animation pipeline | `SpriteClipSet` holds named clips over sliced sheet frames, with a `ClipSetBuilderWindow` to author them. Art goes in as a sheet and comes out as a clip. |
| Tiles | A biome's look is three `TileBase` assets over three PNGs: floor, platform, wall. Reskinning is far smaller than it sounds. |
| Level generation | Already builds levels from a room pool as a pure function of a seed. The slice needs a config, not new code. |

## The one real blocker

**`com.unity.ai.generators` is not installed.** `Packages/manifest.json` has only
`com.unity.ai.assistant` (the chat assistant) and `com.unity.ai.inference` (runtime
inference). The generator package is what spends Unity AI credits on sprites and
textures, and 38 stale `Unity.AI.*.csproj` files at the project root show it was
installed once and removed.

Adding it back is a package-manager operation, but do it first, because everything in the
art phase depends on it and a surprise there stops the whole plan.

## Scope: what the slice is, and what it is not

The instinct will be to ship the game loop. Resist it. Every system the slice includes is
a system that can break in a browser, and the hub, the meta progression and the save
system buy nothing for a two minute demo.

**In:**
- One generated level, one seed, or a small handful of seeds behind a Restart button.
- The player, fully refined: run, jump, dash, wall jump, both weapon slots.
- Three enemies with distinct behaviour, chosen so the combat reads: something that
  closes distance, something ranged, something that takes a moment to commit.
- One tileset and background treatment, so the level looks like a place.
- The HUD, the juggle and execution meters, the bow charge ring.
- A result screen at the end, and a way to go again.

**Out, deliberately:**
- The hub, the Shopkeeper, currency, meta progression.
- Saves. `SaveSystem` writes to `Application.persistentDataPath`, which on WebGL is a
  browser-backed filesystem needing an explicit sync. Cutting saves removes that whole
  class of bug rather than debugging it.
- Bosses, the run web, multiple biomes, the campaign picker, the story panels.
- Steam anything.

Give the player every movement ability from the start. The purchase gating is a great
mechanic across a run and a bad one in a two minute demo.

## The art, which is the actual work

The pipeline wants, per character: one sprite sheet per animation state, sliced into
frames, referenced by a named clip in a `SpriteClipSet`. Look at
`Assets/_Game/Enemies/Data/ClipSets/imp.asset` for the shape.

**The risk worth naming up front: frame-to-frame consistency.** Generating one good
character image is easy. Generating eight frames of a run cycle where the character does
not subtly change proportions, palette or silhouette between frames is the thing
AI image generation is worst at. Plan around it:

- Lock a single reference image per character first and get it right before any animation
  work. Everything downstream inherits from it.
- Prefer fewer frames held longer. The existing clips run at 10 fps and the idle above
  uses ten frames with a ping-pong, so a four to six frame loop is already in keeping.
- Expect to hand-fix. Budget cleanup time per sheet rather than assuming generate-and-ship.
- Silhouette first. At this resolution a character reads by outline, so if two enemies
  have similar silhouettes the combat stops being legible no matter how good the pixels.

Tiles are easier and should come first, because a tileset is where the biome stops being
greybox and it unblocks Steam screenshots at the same time. Three textures plus a
background layer or two changes everything about how the game reads.

## Build and hosting

- **Compression must be gzip, or Brotli with Unity's decompression fallback enabled.**
  GitHub Pages will not set the `Content-Encoding` header for `.br`, and a Brotli build
  without the fallback fails silently in the browser. This is the single most common way
  a Pages-hosted Unity build does not run.
- Strip engine code, IL2CPP, and disable exception support in the shipping build. Expect
  something in the 5 to 15 MB range for a slice this size.
- Write our own WebGL template rather than shipping Unity's. A `<canvas>` inside the
  existing panel styling, an ember loading bar, a fullscreen button, and a real error
  state when WebGL is unavailable.
- **Never autoload.** Poster frame plus a Play button, and only fetch the build when the
  visitor asks for it.
- The game is controller-first. Gamepads work in the browser through the Gamepad API and
  the Input System handles them, but keyboard and mouse bindings have to be verified as a
  first-class path, not an afterthought. Say on the page which is supported.
- Decide Git LFS before the first build is committed, not after. Moving binaries into LFS
  later rewrites history.

## Order of work

1. **Add `com.unity.ai.generators` and confirm credits are reachable.** Everything else
   waits on this.
2. **Tileset first.** Floor, platform, wall, plus one or two background layers for the
   fixed first biome. This is the smallest change with the largest visible effect, and it
   unblocks the Steam screenshots independently of the slice.
3. **Player.** One locked reference, then idle, run, jump, fall, dash, both attack chains.
   The player is on screen every frame, so it earns the most attention.
4. **Three enemies**, one at a time, each with a locked reference before animation.
   Check silhouettes against each other before committing to sheets.
5. **Slice scene and config.** One biome definition, a trimmed room pool, no hub, no
   saves, all abilities granted, a result screen, and a restart.
6. **WebGL build**, compression and size pass, keyboard bindings verified.
7. **The site shell**, a portfolio page and the player embed, per `docs/webgl-plan.md`.
8. **Then revisit the Steam page.** By this point the screenshots exist as a side effect.

Steps 1 and 2 are worth doing even if the slice is later shelved, because they unblock
the store page on their own.

## Decisions still needed

1. **Which three enemies?** The roster has nine definitions. Pick for behavioural contrast
   and silhouette contrast, not for what is furthest along.
2. **One fixed seed or a few?** A fixed seed is easier to tune and screenshot. A handful
   behind a Restart button demonstrates that generation is real, which is one of the
   game's actual selling points.
3. **How long should a run of the slice be?** Two minutes is a demo. Ten is a commitment,
   from the visitor and from us.
4. **Does the build live in this repo or elsewhere?** Still open from `webgl-plan.md`, and
   it decides whether Git LFS gets set up before or never.
