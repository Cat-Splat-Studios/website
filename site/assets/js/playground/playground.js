/* Wiring for the playground demos.
 *
 * The three demos on this page are separate programs. This file is only the
 * glue: it builds each one's toolbar, hands its tunables to a debug panel, and
 * runs its frame loop. Anything that decides what a demo does lives in the
 * demo's own file, not here.
 *
 * Two rules the rest of the site already follows and this keeps to. Nothing
 * runs off screen, because three canvases animating in a background tab is
 * rude. And nothing here produces content the page needs: with JavaScript
 * blocked, every demo shows its fallback text and the page still reads.
 */
(function (global) {
  "use strict";

  var D = global.CSDebugUI;
  var reduceMotion = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function button(label, title, onClick) {
    var b = el("button", "demo-btn", label);
    b.type = "button";
    if (title) b.title = title;
    b.addEventListener("click", onClick);
    return b;
  }

  /* A demo only steps while it is on screen. */
  function whenVisible(node, onChange) {
    if (!global.IntersectionObserver) {
      onChange(true);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        onChange(entries[0].isIntersecting);
      },
      { rootMargin: "120px" }
    );
    io.observe(node);
  }

  function loop(node, step) {
    var running = false;
    var last = 0;
    function frame(now) {
      if (!running) return;
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      step(dt);
      requestAnimationFrame(frame);
    }
    whenVisible(node, function (visible) {
      if (visible === running) return;
      running = visible;
      last = 0;
      if (visible) requestAnimationFrame(frame);
    });
  }

  function seedRow(state, onChange, placeholder) {
    var wrap = el("div", "demo-seed");
    var label = el("label", "demo-seed-label", "Seed");
    var input = el("input");
    input.type = "text";
    input.className = "demo-seed-input";
    input.value = state.seed;
    input.spellcheck = false;
    input.setAttribute("aria-label", placeholder || "Generator seed");
    input.addEventListener("change", function () {
      state.seed = input.value || "0";
      onChange();
    });
    label.setAttribute("for", (input.id = "seed-" + Math.random().toString(36).slice(2, 8)));
    wrap.appendChild(label);
    wrap.appendChild(input);
    wrap.appendChild(
      button("Randomise", "Pick a new seed", function () {
        input.value = state.seed = Math.random().toString(36).slice(2, 9);
        onChange();
      })
    );
    return wrap;
  }

  function segmented(options, current, onPick) {
    var wrap = el("div", "demo-seg");
    wrap.setAttribute("role", "group");
    var buttons = {};
    Object.keys(options).forEach(function (key) {
      var b = el("button", "demo-seg-btn", options[key]);
      b.type = "button";
      b.setAttribute("aria-pressed", key === current ? "true" : "false");
      b.addEventListener("click", function () {
        Object.keys(buttons).forEach(function (k) {
          buttons[k].setAttribute("aria-pressed", k === key ? "true" : "false");
        });
        onPick(key);
      });
      buttons[key] = b;
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* Size a canvas to the column it sits in, at whole pixels per cell and at the
   * display's real density. Getting this wrong is the difference between a
   * crisp grid and a blurry one: a canvas stretched by CSS from 340 to 818
   * pixels is resampled by the browser, and no amount of pixelated rendering
   * makes the glyphs legible again. */
  function fitCanvas(canvas, cols, rows, minCell, maxCell) {
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    canvas.style.width = "100%";
    var avail = canvas.getBoundingClientRect().width || 900;
    var cell = Math.max(minCell, Math.min(maxCell, Math.floor(avail / cols)));

    var cssW = cols * cell;
    var cssH = rows * cell;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    /* Setting width or height resets the context, so the density transform has
     * to be reapplied here and not once at setup. */
    canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    return cell;
  }

  /* Relayout is debounced: a drag of the window edge fires resize continuously
   * and rebuilding a solver on every one of those is wasteful. */
  function onResize(fn) {
    var timer = null;
    global.addEventListener("resize", function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, 150);
    });
  }

  function stage(root) {
    var host = root.querySelector(".demo-stage");
    var fallback = root.querySelector(".demo-fallback");
    if (fallback) fallback.hidden = true;
    host.hidden = false;
    return host;
  }

  /* ======================================================================
   * Demo 1: wave function collapse
   * ==================================================================== */

  function initWFC(root) {
    var W = global.csWFC;
    var host = stage(root);

    var state = {
      cols: 34,
      rows: 20,
      speed: 10,
      backtracking: true,
      maxBacktracks: 600,
      noise: 0.35,
      showEntropy: true,
      showCounts: false,
      showWave: true,
      showGrid: true,
      tileset: "circuit",
      seed: "gleamwood",
      playing: !reduceMotion,
    };

    var canvas = el("canvas", "demo-canvas");
    var toolbar = el("div", "demo-bar");
    var panelHost = el("div", "demo-panel");
    host.appendChild(toolbar);
    host.appendChild(canvas);
    host.appendChild(panelHost);

    var ctx = canvas.getContext("2d");
    var solver = null;
    var cellSize = 24;

    function build() {
      var set = W.TILESETS[state.tileset];
      solver = new W.WFC({
        cols: state.cols,
        rows: state.rows,
        tiles: set.tiles,
        seed: state.seed,
        allowBacktrack: state.backtracking,
        maxBacktracks: state.maxBacktracks,
        noise: state.noise,
      });
      cellSize = fitCanvas(canvas, state.cols, state.rows, 6, 34);
      if (reduceMotion) solver.run();
      draw();
    }

    function draw() {
      W.render(ctx, solver, W.TILESETS[state.tileset], cellSize, state);
    }

    var playBtn;
    function setPlaying(on) {
      state.playing = on;
      playBtn.textContent = on ? "Pause" : "Play";
      playBtn.setAttribute("aria-pressed", on ? "true" : "false");
    }

    toolbar.appendChild(seedRow(state, build, "Wave function collapse seed"));
    playBtn = button("Pause", "Run or hold the solver", function () {
      setPlaying(!state.playing);
    });
    toolbar.appendChild(playBtn);
    toolbar.appendChild(
      button("Step", "Collapse exactly one cell", function () {
        setPlaying(false);
        solver.step();
        draw();
      })
    );
    toolbar.appendChild(
      button("Solve", "Run to completion without animating", function () {
        solver.run();
        draw();
      })
    );
    toolbar.appendChild(
      button("Reset", "Rebuild the wave from the current seed", function () {
        build();
        setPlaying(!reduceMotion);
      })
    );
    toolbar.appendChild(
      segmented({ circuit: "Circuit", dungeon: "Dungeon" }, state.tileset, function (key) {
        state.tileset = key;
        build();
      })
    );

    build();
    setPlaying(state.playing);

    /* Refit rather than rebuild, so resizing the window does not throw away a
     * wave that is halfway through collapsing. */
    onResize(function () {
      cellSize = fitCanvas(canvas, state.cols, state.rows, 6, 34);
      draw();
    });

    /* The panel. Explicit tab configs here rather than the declarative path,
     * because this demo wants dynamic ranges and live readouts, which is the
     * half of the package that config objects express better. */
    var ui = new D.DebugUI({
      mount: panelHost,
      title: "Solver",
      storageKey: "cs.playground.wfc",
    });

    ui.addTab({
      name: "solver",
      displayName: "Solver",
      controls: [
        {
          name: "status",
          displayName: "Status",
          type: D.ControlType.InfoDisplay,
          sectionName: "Live",
          getter: function () {
            if (solver.status === "failed") return "failed";
            return solver.status === "done" ? "complete" : "collapsing";
          },
        },
        {
          name: "collapsed",
          displayName: "Cells collapsed",
          type: D.ControlType.InfoDisplay,
          sectionName: "Live",
          getter: function () {
            return solver.collapsedCount + " / " + solver.cols * solver.rows;
          },
        },
        {
          name: "contradictions",
          displayName: "Contradictions",
          type: D.ControlType.InfoDisplay,
          sectionName: "Live",
          tooltip: "Times propagation emptied a cell and the solver had to reconsider.",
          getter: function () {
            return solver.contradictions;
          },
        },
        {
          name: "backtracks",
          displayName: "Backtracks",
          type: D.ControlType.InfoDisplay,
          sectionName: "Live",
          getter: function () {
            return solver.backtracks;
          },
        },
        {
          name: "speed",
          displayName: "Collapses per frame",
          type: D.ControlType.Slider,
          sectionName: "Pace",
          minValue: 1,
          maxValue: 120,
          wholeNumbers: true,
          saveValue: true,
          defaultValue: 10,
          getter: function () {
            return state.speed;
          },
          setter: function (v) {
            state.speed = v;
          },
        },
        {
          name: "backtracking",
          displayName: "Backtracking",
          type: D.ControlType.Toggle,
          sectionName: "Search",
          tooltip: "With this off, one contradiction ends the run instead of being recovered from.",
          saveValue: true,
          defaultValue: true,
          getter: function () {
            return state.backtracking;
          },
          setter: function (v) {
            state.backtracking = v;
            build();
          },
        },
        {
          name: "maxBacktracks",
          displayName: "Backtrack budget",
          type: D.ControlType.Slider,
          sectionName: "Search",
          minValue: 0,
          maxValue: 2000,
          wholeNumbers: true,
          saveValue: true,
          defaultValue: 600,
          getter: function () {
            return state.maxBacktracks;
          },
          setter: function (v) {
            state.maxBacktracks = v;
            if (solver) solver.maxBacktracks = v;
          },
        },
        {
          name: "noise",
          displayName: "Entropy noise",
          type: D.ControlType.Slider,
          sectionName: "Search",
          tooltip: "Breaks ties between equally constrained cells. At zero the wave resolves in scan order.",
          minValue: 0,
          maxValue: 1,
          saveValue: true,
          defaultValue: 0.35,
          getter: function () {
            return state.noise;
          },
          setter: function (v) {
            state.noise = v;
            if (solver) solver.noise = v;
          },
        },
      ],
    });

    ui.addTab({
      name: "grid",
      displayName: "Grid",
      controls: [
        {
          name: "cols",
          displayName: "Columns",
          type: D.ControlType.Slider,
          minValue: 8,
          maxValue: 64,
          wholeNumbers: true,
          saveValue: true,
          defaultValue: 34,
          getter: function () {
            return state.cols;
          },
          setter: function (v) {
            state.cols = v;
            build();
          },
        },
        {
          name: "rows",
          displayName: "Rows",
          type: D.ControlType.Slider,
          minValue: 6,
          /* Dynamic ceiling: a very wide grid at full height is a lot of cells
           * on a phone, so the row cap falls as the column count climbs. This
           * is what minGetter and maxGetter are for. */
          maxGetter: function () {
            return Math.max(8, Math.round(1400 / state.cols));
          },
          wholeNumbers: true,
          saveValue: true,
          defaultValue: 20,
          getter: function () {
            return state.rows;
          },
          setter: function (v) {
            state.rows = v;
            build();
          },
        },
      ],
    });

    ui.addTab({
      name: "view",
      displayName: "View",
      controls: [
        toggle("showEntropy", "Shade by entropy", "Uncollapsed cells shade toward blue as their options run out."),
        toggle("showCounts", "Show option counts", "Prints how many tiles each cell can still be. Needs a large cell size."),
        toggle("showWave", "Flash propagation", "Lights every cell whose options changed this step."),
        toggle("showGrid", "Grid lines", null),
      ],
    });

    function toggle(key, label, tip) {
      return {
        name: key,
        displayName: label,
        tooltip: tip,
        type: D.ControlType.Toggle,
        saveValue: true,
        defaultValue: state[key],
        getter: function () {
          return state[key];
        },
        setter: function (v) {
          state[key] = v;
          draw();
        },
      };
    }

    ui.onReset = build;

    loop(root, function () {
      if (state.playing && solver.status === "running") {
        for (var i = 0; i < state.speed && solver.status === "running"; i++) solver.step();
      }
      /* Decay the propagation flash so the wave front trails rather than
       * strobing. */
      for (var j = 0; j < solver.touched.length; j++) {
        if (solver.touched[j] > 0.01) solver.touched[j] *= 0.86;
      }
      draw();
      ui.refresh();
    });

    return { state: state, get solver() { return solver; } };
  }

  /* ======================================================================
   * Demo 2: the metroidvania world generator
   * ==================================================================== */

  function initMetroid(root) {
    var M = global.csMetroid;
    var host = stage(root);

    var state = {
      rooms: 40,
      abilities: 4,
      loops: 0.18,
      seed: "sentinels",
      colourByRegion: true,
      showGateLabels: true,
      animateSolve: !reduceMotion,
      solveSpeed: 1.1,
    };

    var canvas = el("canvas", "demo-canvas");
    var toolbar = el("div", "demo-bar");
    var report = el("div", "demo-report");
    var panelHost = el("div", "demo-panel");
    host.appendChild(toolbar);
    host.appendChild(canvas);
    host.appendChild(report);
    host.appendChild(panelHost);

    var ctx = canvas.getContext("2d");
    var world = null;
    var result = null;
    var bounds = null;
    var cell = 26;
    var waveIndex = 0;
    var waveTimer = 0;

    function build() {
      world = M.generate({
        rooms: state.rooms,
        abilities: state.abilities,
        loops: state.loops,
        seed: state.seed,
      });
      result = M.validate(world);
      bounds = M.bounds(world);
      cell = fitCanvas(canvas, bounds.cols, bounds.rows, 12, 56);
      waveIndex = state.animateSolve ? 0 : result.waves.length - 1;
      waveTimer = 0;
      writeReport();
      draw();
    }

    function draw() {
      var wave = result.waves[Math.min(waveIndex, result.waves.length - 1)];
      M.render(ctx, world, result, {
        bounds: bounds,
        cell: cell,
        colourByRegion: state.colourByRegion,
        showGateLabels: state.showGateLabels,
        revealed: state.animateSolve ? wave.reached : null,
        held: state.animateSolve ? new Set(wave.abilities) : new Set(result.abilitiesFound),
      });
    }

    /* The verdict, in words, from the validator rather than from the
     * generator. */
    function writeReport() {
      report.innerHTML = "";

      var verdict = el("p", "demo-verdict");
      var ok = result.solvable && result.complete;
      verdict.classList.add(ok ? "is-pass" : "is-fail");
      verdict.textContent = ok
        ? "Validator: beatable, and every room reachable."
        : result.solvable
          ? "Validator: beatable, but " + result.unreachable.length + " room(s) stranded."
          : "Validator: not beatable. The generator produced a world it cannot finish.";
      report.appendChild(verdict);

      var list = el("ol", "demo-steps");
      result.waves.forEach(function (wave, i) {
        /* Every wave that yielded something, plus the last one. The final wave
         * gains nothing by definition, and dropping it would hide the only line
         * that says how much of the world is open at the end. */
        var isLast = i === result.waves.length - 1;
        if (!wave.gained.length && i > 0 && !isLast) return;
        var li = el("li");
        var held = wave.abilities.length
          ? wave.abilities
              .map(function (id) {
                return M.abilityById(id).name;
              })
              .join(", ")
          : "nothing";
        var reachedText = wave.reached.size + " rooms with " + held;
        li.appendChild(el("span", "demo-step-reach", reachedText));
        if (wave.gained.length) {
          wave.gained.forEach(function (id) {
            var a = M.abilityById(id);
            var chip = el("span", "demo-chip", a.glyph + " " + a.name);
            chip.style.setProperty("--chip", a.colour);
            li.appendChild(chip);
          });
        }
        list.appendChild(li);
      });
      report.appendChild(list);
    }

    toolbar.appendChild(seedRow(state, build, "World generator seed"));
    toolbar.appendChild(
      button("Regenerate", "Build a new world from a new seed", function () {
        state.seed = Math.random().toString(36).slice(2, 9);
        var input = toolbar.querySelector(".demo-seed-input");
        if (input) input.value = state.seed;
        build();
      })
    );
    toolbar.appendChild(
      button("Replay solve", "Walk the validator through the world again", function () {
        state.animateSolve = true;
        waveIndex = 0;
        waveTimer = 0;
      })
    );
    toolbar.appendChild(
      button("Show all", "Drop the fog and show the finished map", function () {
        state.animateSolve = false;
        draw();
      })
    );

    build();

    onResize(function () {
      cell = fitCanvas(canvas, bounds.cols, bounds.rows, 12, 56);
      draw();
    });

    var ui = new D.DebugUI({
      mount: panelHost,
      title: "World",
      storageKey: "cs.playground.world",
    });

    ui.addTabsFrom(
      D.Tunable.of(state, {
        rooms: { tab: "World", section: "Shape", min: 12, max: 90, whole: true, label: "Rooms", onChanged: build },
        abilities: {
          tab: "World",
          section: "Shape",
          min: 1,
          max: 4,
          whole: true,
          label: "Ability gates",
          tooltip: "Each gate adds a region. Region k is locked behind the ability found in region k minus one.",
          onChanged: build,
        },
        loops: {
          tab: "World",
          section: "Shape",
          min: 0,
          max: 0.6,
          step: 0.02,
          label: "Loop chance",
          tooltip: "Chance a non-structural adjacency becomes a door. Zero gives a pure tree.",
          onChanged: build,
        },
        colourByRegion: { tab: "View", label: "Colour by region", onChanged: draw },
        showGateLabels: { tab: "View", label: "Gate glyphs", onChanged: draw },
        solveSpeed: { tab: "View", section: "Playback", min: 0.2, max: 4, label: "Solve speed" },
      })
    );

    ui.addTab({
      name: "verify",
      displayName: "Verify",
      controls: [
        info("Rooms", function () {
          return world.rooms.length;
        }),
        info("Doors", function () {
          return world.edges.length;
        }),
        info("Gated doors", function () {
          return world.edges.filter(function (e) {
            return e.gate;
          }).length;
        }),
        info("Rooms reachable", function () {
          return result.reachedCount + " / " + world.rooms.length;
        }),
        info("Abilities found", function () {
          return result.abilitiesFound.length + " / " + world.abilities.length;
        }),
        info("Boss reachable", function () {
          return result.bossReachable ? "yes" : "no";
        }),
      ],
    });

    function info(label, getter) {
      return {
        name: label.toLowerCase().replace(/\s+/g, "-"),
        displayName: label,
        type: D.ControlType.InfoDisplay,
        getter: getter,
      };
    }

    ui.onReset = build;

    loop(root, function (dt) {
      if (state.animateSolve && waveIndex < result.waves.length - 1) {
        waveTimer += dt * state.solveSpeed;
        if (waveTimer > 1) {
          waveTimer = 0;
          waveIndex++;
          draw();
        }
      }
      ui.refresh();
    });

    return { state: state };
  }

  /* ======================================================================
   * Demo 3: the game
   * ==================================================================== */

  function initGame(root) {
    var G = global.csGame;
    var host = stage(root);

    var canvas = el("canvas", "demo-canvas demo-canvas-game");
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Ember Run, a small platformer. Click to focus, then use the arrow keys.");
    var toolbar = el("div", "demo-bar");
    var panelHost = el("div", "demo-panel");
    host.appendChild(toolbar);
    host.appendChild(canvas);
    host.appendChild(panelHost);

    var tuning = G.defaultTuning();
    var runner = new G.Runner(canvas, tuning);
    var state = { seed: "ember", cols: 6, rows: 4 };

    function levelOpts() {
      return {
        cols: state.cols,
        rows: state.rows,
        cellW: 13,
        cellH: 11,
        enemyDensity: 0.055,
        maxEnemies: 14,
        /* The live tuning, so the reachability proof is made against the jump
         * the player currently has rather than against the default one. Wind
         * the jump down in the panel and the next level is built to suit. */
        tuning: tuning,
      };
    }

    /* Levels that cannot prove themselves reachable are thrown away, so loading
     * is a search rather than a single shot. It gives up eventually, because a
     * page that hangs is worse than one that says it could not. */
    function load() {
      for (var attempt = 0; attempt < 12; attempt++) {
        if (runner.load(state.seed, levelOpts())) {
          runner.draw();
          return true;
        }
        state.seed = state.seed + "x";
      }
      return false;
    }

    toolbar.appendChild(seedRow(state, load, "Level seed"));
    toolbar.appendChild(
      button("Restart", "New level from a new seed", function () {
        state.seed = Math.random().toString(36).slice(2, 9);
        var input = toolbar.querySelector(".demo-seed-input");
        if (input) input.value = state.seed;
        load();
        canvas.focus();
      })
    );
    toolbar.appendChild(
      button("Retry seed", "Same level, from the start", function () {
        load();
        canvas.focus();
      })
    );

    if (!load()) throw new Error("no level passed the reachability check");

    /* The declarative path, which is the half worth upstreaming: these are
     * fields on a plain object, and the panel is built by reflecting over the
     * schema rather than by anyone writing a control. */
    var ui = new D.DebugUI({
      mount: panelHost,
      title: "Player",
      storageKey: "cs.playground.game",
    });

    ui.addTabsFrom(
      D.Tunable.of(tuning, {
        runSpeed: { tab: "Move", section: "Ground", min: 40, max: 260 },
        acceleration: { tab: "Move", section: "Ground", min: 200, max: 3000 },
        friction: { tab: "Move", section: "Ground", min: 200, max: 4000 },
        airControl: { tab: "Move", section: "Air", min: 0, max: 1, label: "Air control" },
        gravity: { tab: "Move", section: "Air", min: 300, max: 2600 },
        maxFall: { tab: "Move", section: "Air", min: 100, max: 900, label: "Terminal velocity" },

        jumpVelocity: { tab: "Jump", min: 120, max: 560 },
        jumpCutoff: { tab: "Jump", min: 0, max: 1, label: "Release cutoff", tooltip: "How much upward speed is cut when the jump button is let go." },
        coyoteTime: { tab: "Jump", min: 0, max: 0.3, step: 0.005, label: "Coyote time" },
        jumpBuffer: { tab: "Jump", min: 0, max: 0.3, step: 0.005, label: "Input buffer" },
        wallSlideSpeed: { tab: "Jump", section: "Wall", min: 0, max: 300 },
        wallJumpX: { tab: "Jump", section: "Wall", min: 0, max: 420, label: "Wall jump push" },
        wallJumpY: { tab: "Jump", section: "Wall", min: 0, max: 520, label: "Wall jump lift" },

        dashSpeed: { tab: "Combat", section: "Dash", min: 100, max: 700 },
        dashTime: { tab: "Combat", section: "Dash", min: 0.04, max: 0.5, step: 0.01 },
        dashCooldown: { tab: "Combat", section: "Dash", min: 0, max: 1.5, step: 0.01 },
        attackRange: { tab: "Combat", section: "Blade", min: 8, max: 48 },
        attackTime: { tab: "Combat", section: "Blade", min: 0.05, max: 0.6, step: 0.01 },
        launchPower: {
          tab: "Combat",
          section: "Blade",
          min: 0,
          max: 500,
          tooltip: "Upward impulse on a grounded target. This is the launch the whole air game hangs off.",
        },
        hitstop: { tab: "Combat", section: "Blade", min: 0, max: 0.3, step: 0.005 },

        screenShake: { tab: "Feel", min: 0, max: 2, label: "Screen shake" },
        showHitboxes: { tab: "Feel", label: "Show hitboxes" },
      })
    );

    ui.addTab({
      name: "run",
      displayName: "Run",
      controls: [
        {
          name: "state",
          displayName: "State",
          type: D.ControlType.InfoDisplay,
          getter: function () {
            return runner.world ? runner.state : "no level";
          },
        },
        {
          name: "combo",
          displayName: "Best air string",
          type: D.ControlType.InfoDisplay,
          getter: function () {
            return runner.bestCombo == null ? "" : runner.bestCombo;
          },
        },
        {
          name: "enemies",
          displayName: "Enemies left",
          type: D.ControlType.InfoDisplay,
          /* Every readout here tolerates a runner with no level loaded. A getter
           * that throws takes the whole demo down through the guard in start(),
           * and a panel is not worth losing a game over. */
          getter: function () {
            if (!runner.enemies) return "";
            return runner.enemies.filter(function (e) {
              return e.state !== "dead";
            }).length;
          },
        },
        {
          name: "proven",
          displayName: "Proven reachable",
          type: D.ControlType.InfoDisplay,
          tooltip:
            "Standable tiles the reachability model proved you can get to, using walking and jumping only. It assumes no wall jump and no dash.",
          getter: function () {
            if (!runner.world) return "0";
            return runner.world.proven + " / " + runner.world.standable;
          },
        },
        {
          name: "exitdist",
          displayName: "Exit is",
          type: D.ControlType.InfoDisplay,
          tooltip: "How many moves the exit sits from the spawn, along the proven route.",
          getter: function () {
            return runner.world ? runner.world.exitDistance + " moves away" : "";
          },
        },
      ],
    });

    ui.onReset = function () {
      var fresh = G.defaultTuning();
      Object.keys(fresh).forEach(function (k) {
        tuning[k] = fresh[k];
      });
      ui.refreshAll();
    };

    /* Fixed timestep. Platformer feel depends on the step being constant, so
     * the accumulator runs the simulation at a steady rate and the renderer
     * takes whatever frames it gets. */
    var acc = 0;
    var STEP = 1 / 120;
    loop(root, function (dt) {
      acc += dt;
      var guard = 0;
      while (acc >= STEP && guard++ < 8) {
        runner.update(STEP);
        acc -= STEP;
      }
      runner.draw();
      ui.refresh();
    });

    return { runner: runner };
  }

  /* ====================================================================== */

  var DEMOS = { wfc: initWFC, world: initMetroid, game: initGame };

  function start() {
    var nodes = document.querySelectorAll("[data-demo]");
    Array.prototype.forEach.call(nodes, function (node) {
      var kind = node.getAttribute("data-demo");
      var init = DEMOS[kind];
      if (!init) return;
      try {
        init(node);
      } catch (err) {
        /* One demo failing must not take the other two with it, and the page
         * should say so rather than showing a dead rectangle. */
        var stageNode = node.querySelector(".demo-stage");
        if (stageNode) stageNode.hidden = true;
        var fb = node.querySelector(".demo-fallback");
        if (fb) {
          fb.hidden = false;
          fb.textContent = "This demo did not start in your browser. The rest of the page is unaffected.";
        }
        if (global.console && console.error) console.error("playground demo failed:", kind, err);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})(window);
