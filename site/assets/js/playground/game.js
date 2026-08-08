/* Ember Run: a small action platformer whose level is whatever the solver on
 * this page just produced.
 *
 * The point of it is the tie: the wave function collapse demo above is not an
 * illustration next to the game, it is the level generator. Change the seed,
 * change the constraint weights, and this is the world you land in. The blocks
 * are carved out of a collapsed grid, connectivity is checked by flood fill,
 * and the exit is placed at the furthest point actually reachable from the
 * spawn rather than at a corner and hoped for.
 *
 * The movement is Gleamwood's vocabulary in miniature: run, jump, dash, wall
 * jump, and a blade that launches. Grounded hits put an enemy in the air and
 * airborne hits keep it there, which is the one mechanic the games page
 * describes and the one worth being able to feel rather than read.
 *
 * Every constant below is registered as a tunable, so the debug panel beside
 * the game is the same panel that tunes the player in the real project.
 */
(function (global) {
  "use strict";

  var TILE = 16;

  /* Solid tile ids. 0 is air. */
  var AIR = 0;
  var WALL = 1;

  /* ----------------------------------------------------------------------
   * Level construction from a collapsed wave.
   * -------------------------------------------------------------------- */

  /* Each collapsed cell becomes a chamber with a passage carved toward every
   * open socket. Because the map starts fully solid and is only ever carved
   * into, every chamber keeps a floor under it without any second pass. */
  function carveLevel(solver, cellW, cellH, rng) {
    var cols = solver.cols * cellW;
    var rows = solver.rows * cellH;
    var map = new Uint8Array(cols * rows).fill(WALL);
    var random = rng || function () {
      return 0.5;
    };

    function carve(x0, y0, x1, y1) {
      for (var y = Math.max(0, y0); y <= Math.min(rows - 1, y1); y++) {
        for (var x = Math.max(0, x0); x <= Math.min(cols - 1, x1); x++) {
          map[y * cols + x] = AIR;
        }
      }
    }

    function fill(x0, y0, x1, y1) {
      for (var y = Math.max(0, y0); y <= Math.min(rows - 1, y1); y++) {
        for (var x = Math.max(0, x0); x <= Math.min(cols - 1, x1); x++) {
          map[y * cols + x] = WALL;
        }
      }
    }

    for (var cy = 0; cy < solver.rows; cy++) {
      for (var cx = 0; cx < solver.cols; cx++) {
        var tileIndex = solver.tileAt(cy * solver.cols + cx);
        if (tileIndex < 0) continue;
        var tile = solver.tiles[tileIndex];
        if (tile.degree === 0) continue;

        var ox = cx * cellW;
        var oy = cy * cellH;
        var midX = ox + (cellW >> 1);
        var midY = oy + (cellH >> 1);

        /* The chamber. Two tiles of margin keep a floor and a ceiling. */
        carve(ox + 2, oy + 2, ox + cellW - 3, oy + cellH - 3);

        /* Passages. Horizontal ones are three tiles tall so you can run
         * through; vertical ones are three wide so a wall jump has two faces
         * to work with. */
        if (tile.sockets[0] === "o") carve(midX - 1, oy, midX + 1, midY);
        if (tile.sockets[2] === "o") carve(midX - 1, midY, midX + 1, oy + cellH - 1);
        if (tile.sockets[3] === "o") carve(ox, midY - 1, midX, midY + 1);
        if (tile.sockets[1] === "o") carve(midX, midY - 1, ox + cellW - 1, midY + 1);

      }
    }

    /* The climb.
     *
     * A chamber is seven tiles tall and nine wide and the shaft mouth is at the
     * top of it. Nothing in the player's kit crosses that unaided: a jump rises
     * about four tiles, and chaining wall jumps needs walls roughly three tiles
     * apart where the chamber walls are nine. Left bare, every vertical exit is
     * a wall, which is how a generated level ends up unfinishable.
     *
     * So shafts get rungs: single tiles alternating between the shaft's two
     * outer columns. Three points about the spacing, each of which was a bug
     * first.
     *
     * Rungs sit on absolute rows rather than rows within a cell, because a cell
     * is eleven tall and the spacing is three. Measuring from each cell's own
     * origin puts a kink in the ladder at every cell boundary, exactly where
     * two shafts join and the climb matters most.
     *
     * They are three rows apart, not two. At two, every second rung lands
     * directly above one in the same column and leaves a single tile of
     * headroom, so the jump off it clips the rung overhead. That is the head
     * bonk, and it is why spacing has to exceed the alternation period.
     *
     * The middle column is never filled, so a drop straight down is always
     * open, and one tile out of three can never seal a route the solver said
     * existed.
     */
    for (var sx = 0; sx < solver.cols; sx++) {
      var left = sx * cellW + (cellW >> 1) - 1;
      var mid = left + 1;
      var right = left + 2;

      for (var ry = 1; ry < rows - 1; ry++) {
        if (ry % 3 !== 0) continue;
        var row = ry * cols;
        /* Only inside a shaft: all three columns open, and open above and below
         * so a rung is never pinned against a floor or a ceiling. */
        if (map[row + left] !== AIR || map[row + mid] !== AIR || map[row + right] !== AIR) continue;
        if (map[row - cols + mid] !== AIR || map[row + cols + mid] !== AIR) continue;
        map[row + ((ry / 3) % 2 === 0 ? left : right)] = WALL;
      }
    }
    void random;

    /* A sealed border, so nothing can leave the world. */
    for (var x = 0; x < cols; x++) {
      map[x] = WALL;
      map[(rows - 1) * cols + x] = WALL;
    }
    for (var y = 0; y < rows; y++) {
      map[y * cols] = WALL;
      map[y * cols + cols - 1] = WALL;
    }

    return { map: map, cols: cols, rows: rows };
  }

  /* Flood fill the open space and keep only the largest region. A collapsed
   * wave can contain a closed loop with no way in, and dropping the player into
   * one of those is the difference between a level and a trap. */
  function largestRegion(level) {
    var seen = new Int32Array(level.cols * level.rows).fill(-1);
    var best = null;
    var id = 0;

    for (var start = 0; start < level.map.length; start++) {
      if (level.map[start] !== AIR || seen[start] !== -1) continue;
      var stack = [start];
      var members = [];
      seen[start] = id;
      while (stack.length) {
        var i = stack.pop();
        members.push(i);
        var x = i % level.cols;
        var y = (i / level.cols) | 0;
        var around = [
          x > 0 ? i - 1 : -1,
          x < level.cols - 1 ? i + 1 : -1,
          y > 0 ? i - level.cols : -1,
          y < level.rows - 1 ? i + level.cols : -1,
        ];
        for (var k = 0; k < 4; k++) {
          var n = around[k];
          if (n < 0 || seen[n] !== -1 || level.map[n] !== AIR) continue;
          seen[n] = id;
          stack.push(n);
        }
      }
      if (!best || members.length > best.length) best = members;
      id++;
    }
    return best || [];
  }

  /* Walkable means open with something solid underneath, which is where a
   * spawn, an exit or a patrolling enemy can actually stand. */
  function standables(level, region) {
    var set = new Set(region);
    var out = [];
    region.forEach(function (i) {
      var below = i + level.cols;
      if (below < level.map.length && level.map[below] === WALL && !set.has(below)) out.push(i);
    });
    return out;
  }

  /* ----------------------------------------------------------------------
   * Can the player actually get there?
   *
   * The world generator elsewhere on this page proves its claim, and until now
   * this one did not: it checked that open space was connected, which is a
   * statement about the tiles and not about the player. Space can be perfectly
   * connected and still have a ledge nobody can reach.
   *
   * So this is a reachability model, and it is deliberately pessimistic. It
   * assumes the player can walk, and can jump with a tile of margin shaved off
   * both the height and the distance the physics actually allow. It assumes
   * nothing at all about wall jumping or dashing. If a level is completable
   * under this model it is completable by someone who has not worked out that
   * the dash exists, which is the standard worth holding a generated level to.
   *
   * Jump arcs are approximated as an L: straight up, then across at that
   * height. A real arc bulges outside that near the apex, so the model rejects
   * a few jumps that would land. Erring that way is the point.
   * -------------------------------------------------------------------- */

  function movementLimits(t) {
    var rise = (t.jumpVelocity * t.jumpVelocity) / (2 * t.gravity);
    var airtime = (2 * t.jumpVelocity) / t.gravity;
    return {
      up: Math.max(1, Math.floor(rise / TILE) - 1),
      across: Math.max(2, Math.floor((t.runSpeed * airtime) / TILE) - 1),
    };
  }

  /* Somewhere the player can be at rest: floor underfoot, and a clear tile
   * overhead so a 13 pixel body straddling two rows still fits. */
  function isStandable(level, x, y) {
    if (x < 0 || y < 1 || x >= level.cols || y >= level.rows - 1) return false;
    var i = y * level.cols + x;
    return level.map[i] === AIR && level.map[i - level.cols] === AIR && level.map[i + level.cols] === WALL;
  }

  function isClear(level, x, y) {
    if (x < 0 || y < 1 || x >= level.cols || y >= level.rows) return false;
    var i = y * level.cols + x;
    return level.map[i] === AIR && level.map[i - level.cols] === AIR;
  }

  /* Straight down from a spot in the air to whatever catches you. */
  function dropFrom(level, x, y) {
    for (var ty = y; ty < level.rows - 1; ty++) {
      if (isStandable(level, x, ty)) return ty * level.cols + x;
      if (level.map[ty * level.cols + x] === WALL) return -1;
    }
    return -1;
  }

  /* Returns a map of standable tile to how many moves it takes to get there.
   * Distance has to come from this graph and not from grid adjacency: standable
   * tiles are sparse, and two ledges a single jump apart can be nowhere near
   * each other on the grid. */
  function reachableFrom(level, startIndex, limits) {
    var dist = new Map([[startIndex, 0]]);
    var queue = [startIndex];
    var head = 0;

    while (head < queue.length) {
      var i = queue[head++];
      /* Named depth, not step. The lane loops below count in `step`, and `var`
       * is function scoped, so sharing the name silently overwrote the search
       * depth with a lane offset and capped every distance at limits.across. */
      var depth = dist.get(i) + 1;
      var x = i % level.cols;
      var y = (i / level.cols) | 0;

      var push = function (j) {
        if (j >= 0 && !dist.has(j)) {
          dist.set(j, depth);
          queue.push(j);
        }
      };

      /* dy 0 is a run off the edge, everything above it is a jump. Rising is
       * checked first and bails as soon as the ceiling stops it. */
      for (var dy = 0; dy <= limits.up; dy++) {
        if (dy > 0 && !isClear(level, x, y - dy)) break;
        var laneY = y - dy;

        for (var dir = -1; dir <= 1; dir += 2) {
          for (var step = 1; step <= limits.across; step++) {
            var lx = x + dir * step;
            if (!isClear(level, lx, laneY)) break;
            if (isStandable(level, lx, laneY)) push(laneY * level.cols + lx);
            else push(dropFrom(level, lx, laneY));
          }
        }

        /* Landing back on the column you left, having jumped straight up onto
         * something directly overhead. */
        if (dy > 0 && isStandable(level, x, laneY)) push(laneY * level.cols + x);
      }
    }
    return dist;
  }

  function buildWorld(seed, opts) {
    var W = global.csWFC;
    var set = W.TILESETS.level;
    var solver = new W.WFC({
      cols: opts.cols,
      rows: opts.rows,
      tiles: set.tiles,
      seed: "level:" + seed,
      allowBacktrack: true,
      maxBacktracks: 900,
    });
    solver.run();
    if (solver.status !== "done") return null;

    var level = carveLevel(solver, opts.cellW, opts.cellH, W.mulberry32(W.hashSeed("shelves:" + seed)));
    var region = largestRegion(level);
    if (region.length < 200) return null;

    var floor = standables(level, region);
    if (floor.length < 12) return null;

    /* Pick the spawn for the size of the world it opens up, not for its
     * position. A few candidates spread across the level get their reachable
     * set measured and the most generous one wins, which stops the player
     * being dropped into a pocket that happens to sit furthest left. */
    var limits = movementLimits(opts.tuning || defaultTuning());
    floor.sort(function (a, b) {
      return (a % level.cols) - (b % level.cols);
    });

    var best = null;
    for (var c = 0; c < 6; c++) {
      var candidate = floor[Math.min(floor.length - 1, Math.round((c / 6) * (floor.length - 1)))];
      var reached = reachableFrom(level, candidate, limits);
      if (!best || reached.size > best.dist.size) best = { index: candidate, dist: reached };
      if (best.dist.size > floor.length * 0.9) break;
    }
    if (!best) return null;

    var spawnIndex = best.index;
    var dist = best.dist;

    /* A level worth playing has to prove most of itself reachable, not just a
     * corner. Below this it is a pocket with scenery around it. */
    if (dist.size < floor.length * 0.55 || dist.size < 60) return null;

    var settled = Array.from(dist.keys());
    var exitIndex = spawnIndex;
    settled.forEach(function (i) {
      if (dist.get(i) > dist.get(exitIndex)) exitIndex = i;
    });
    if (dist.get(exitIndex) < 12) return null;

    var rng = W.mulberry32(W.hashSeed("props:" + seed));
    var spread = settled
      .filter(function (i) {
        return dist.get(i) > 6 && i !== exitIndex;
      })
      .sort(function (a, b) {
        return dist.get(a) - dist.get(b);
      });

    var enemies = [];
    var embers = [];
    for (var s = 0; s < spread.length; s++) {
      var idx = spread[s];
      if (idx === exitIndex) continue;
      var roll = rng();
      if (roll < opts.enemyDensity && enemies.length < opts.maxEnemies) {
        enemies.push(makeEnemy((idx % level.cols) * TILE + TILE / 2, ((idx / level.cols) | 0) * TILE + TILE));
      } else if (roll < opts.enemyDensity + 0.12 && embers.length < 40) {
        embers.push({
          x: (idx % level.cols) * TILE + TILE / 2,
          y: ((idx / level.cols) | 0) * TILE + TILE / 2,
          taken: false,
          phase: rng() * Math.PI * 2,
        });
      }
    }

    return {
      solver: solver,
      level: level,
      spawn: { x: (spawnIndex % level.cols) * TILE + TILE / 2, y: ((spawnIndex / level.cols) | 0) * TILE + TILE },
      exit: { x: (exitIndex % level.cols) * TILE + TILE / 2, y: ((exitIndex / level.cols) | 0) * TILE + TILE },
      enemies: enemies,
      embers: embers,
      reachable: region.length,
      /* What the model proved, so the panel can show it and a regression shows
       * up as a number rather than as a stuck player. */
      standable: floor.length,
      proven: dist.size,
      exitDistance: dist.get(exitIndex),
      limits: limits,
    };
  }

  function makeEnemy(x, y) {
    return {
      x: x,
      y: y,
      w: 11,
      h: 12,
      vx: 26,
      vy: 0,
      dir: 1,
      hp: 2,
      state: "patrol", /* patrol | hurt | launched | dead */
      timer: 0,
      flash: 0,
    };
  }

  /* ----------------------------------------------------------------------
   * Tunables. These are the values the debug panel drives, and they are the
   * reason the panel exists: a designer changes a number and the feel changes
   * on the next frame, with no rebuild anywhere in the loop.
   * -------------------------------------------------------------------- */

  function defaultTuning() {
    return {
      runSpeed: 132,
      acceleration: 1150,
      friction: 1500,
      airControl: 0.62,

      gravity: 1400,
      maxFall: 520,
      /* Rises 68 pixels, a shade over four tiles. The chimney rungs in
       * carveLevel are three rows apart, so every climb keeps a tile in hand
       * and the reachability model can shave one off and still prove the route.
       * Gravity is high to match: the same height on a weaker pull is the same
       * jump in slow motion, and this game is not floaty. */
      jumpVelocity: 436,
      jumpCutoff: 0.42,
      coyoteTime: 0.09,
      jumpBuffer: 0.11,

      dashSpeed: 330,
      dashTime: 0.14,
      dashCooldown: 0.32,

      wallSlideSpeed: 72,
      wallJumpX: 205,
      wallJumpY: 370,

      attackRange: 22,
      attackTime: 0.18,
      launchPower: 235,
      hitstop: 0.06,

      screenShake: 1,
      showHitboxes: false,
    };
  }

  /* ----------------------------------------------------------------------
   * Physics helpers
   * -------------------------------------------------------------------- */

  function solidAt(world, px, py) {
    var x = Math.floor(px / TILE);
    var y = Math.floor(py / TILE);
    if (x < 0 || y < 0 || x >= world.level.cols || y >= world.level.rows) return true;
    return world.level.map[y * world.level.cols + x] === WALL;
  }

  /* Sample the leading edge at intervals no larger than a tile, so a body can
   * never step over a one tile pillar no matter how fast it is moving. */
  function boxHits(world, x, y, w, h) {
    var x0 = x - w / 2;
    var x1 = x + w / 2 - 0.01;
    var y0 = y - h;
    var y1 = y - 0.01;
    for (var sx = x0; ; sx += TILE) {
      if (sx > x1) sx = x1;
      for (var sy = y0; ; sy += TILE) {
        if (sy > y1) sy = y1;
        if (solidAt(world, sx, sy)) return true;
        if (sy >= y1) break;
      }
      if (sx >= x1) break;
    }
    return false;
  }

  function moveBody(world, body, dx, dy) {
    var hitX = false;
    var hitY = false;
    var steps = Math.ceil((Math.abs(dx) + Math.abs(dy)) / (TILE * 0.4)) || 1;
    var stepX = dx / steps;
    var stepY = dy / steps;

    for (var s = 0; s < steps; s++) {
      if (stepX !== 0) {
        if (boxHits(world, body.x + stepX, body.y, body.w, body.h)) {
          hitX = true;
          stepX = 0;
        } else {
          body.x += stepX;
        }
      }
      if (stepY !== 0) {
        if (boxHits(world, body.x, body.y + stepY, body.w, body.h)) {
          hitY = true;
          stepY = 0;
        } else {
          body.y += stepY;
        }
      }
      if (hitX && hitY) break;
    }
    return { x: hitX, y: hitY };
  }

  /* ----------------------------------------------------------------------
   * Input. Keyboard and gamepad, with one rule that matters more than the rest:
   * nothing is swallowed until the canvas has focus. A platformer that eats the
   * space bar while someone is trying to scroll past it is a broken page.
   * -------------------------------------------------------------------- */

  var KEYS = {
    left: ["ArrowLeft", "KeyA"],
    right: ["ArrowRight", "KeyD"],
    up: ["ArrowUp", "KeyW"],
    down: ["ArrowDown", "KeyS"],
    jump: ["Space", "KeyZ", "KeyK"],
    dash: ["ShiftLeft", "ShiftRight", "KeyC", "KeyL"],
    attack: ["KeyX", "KeyJ", "Enter"],
  };

  function Input(target) {
    var self = this;
    this.down = {};
    this.pressed = {};
    this.focused = false;
    this.target = target;

    target.addEventListener("focus", function () {
      self.focused = true;
    });
    target.addEventListener("blur", function () {
      self.focused = false;
      self.down = {};
    });

    this._onKey = function (e, isDown) {
      if (!self.focused) return;
      var action = null;
      Object.keys(KEYS).forEach(function (a) {
        if (KEYS[a].indexOf(e.code) !== -1) action = a;
      });
      if (!action) return;
      e.preventDefault();
      if (isDown && !self.down[action]) self.pressed[action] = true;
      self.down[action] = isDown;
    };

    this._kd = function (e) {
      self._onKey(e, true);
    };
    this._ku = function (e) {
      self._onKey(e, false);
    };
    global.addEventListener("keydown", this._kd);
    global.addEventListener("keyup", this._ku);
  }

  Input.prototype.poll = function () {
    /* Gamepads are polled rather than evented, and Gleamwood is controller
     * first, so this is a first-class path and not a courtesy. */
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < pads.length; i++) {
      var p = pads[i];
      if (!p) continue;
      var ax = p.axes[0] || 0;
      var set = {
        left: ax < -0.35 || (p.buttons[14] && p.buttons[14].pressed),
        right: ax > 0.35 || (p.buttons[15] && p.buttons[15].pressed),
        jump: p.buttons[0] && p.buttons[0].pressed,
        attack: p.buttons[2] && p.buttons[2].pressed,
        dash: (p.buttons[1] && p.buttons[1].pressed) || (p.buttons[7] && p.buttons[7].value > 0.4),
      };
      var self = this;
      Object.keys(set).forEach(function (a) {
        if (set[a] && !self.down[a]) self.pressed[a] = true;
        if (set[a]) self.down[a] = true;
        else if (!self._keyHeld(a)) self.down[a] = false;
      });
      break;
    }
  };

  Input.prototype._keyHeld = function () {
    return false;
  };

  Input.prototype.consume = function (action) {
    if (this.pressed[action]) {
      this.pressed[action] = false;
      return true;
    }
    return false;
  };

  Input.prototype.endFrame = function () {
    this.pressed = {};
  };

  Input.prototype.destroy = function () {
    global.removeEventListener("keydown", this._kd);
    global.removeEventListener("keyup", this._ku);
  };

  /* ----------------------------------------------------------------------
   * The runner: player state machine, enemies, camera, particles, drawing.
   * -------------------------------------------------------------------- */

  var VIEW_W = 460;
  var VIEW_H = 258;

  function Runner(canvas, tuning) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.t = tuning || defaultTuning();
    this.input = new Input(canvas);
    this.particles = [];
    this.cam = { x: 0, y: 0, shake: 0 };
    this.state = "idle";
    this.hitstop = 0;
    this.reduceMotion = global.matchMedia
      ? global.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
  }

  Runner.prototype.load = function (seed, opts) {
    var world = null;
    var attempt = 0;
    /* A constraint set can legitimately produce a level too small to play. Try
     * a few adjacent seeds rather than showing an empty box. */
    while (!world && attempt < 6) {
      world = buildWorld(seed + (attempt ? ":" + attempt : ""), opts);
      attempt++;
    }
    if (!world) return false;

    this.world = world;
    this.seed = seed;
    this.player = {
      x: world.spawn.x,
      y: world.spawn.y,
      w: 9,
      h: 13,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      coyote: 0,
      buffer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 1,
      dashReady: true,
      wallDir: 0,
      attackTimer: 0,
      hitThisSwing: null,
      hp: 4,
      invuln: 0,
      airborneHits: 0,
    };
    this.enemies = world.enemies.map(function (e) {
      return Object.assign({}, e);
    });
    this.embers = world.embers.map(function (e) {
      return Object.assign({}, e);
    });
    this.collected = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboTimer = 0;
    this.elapsed = 0;
    this.state = "playing";
    this.particles.length = 0;
    this.cam.x = this.player.x;
    this.cam.y = this.player.y;
    return true;
  };

  Runner.prototype.update = function (dt) {
    if (this.state !== "playing") return;
    this.input.poll();

    if (this.hitstop > 0) {
      /* Hitstop freezes the world but not the clock, so a landed hit reads as
       * weight rather than as a dropped frame. */
      this.hitstop -= dt;
      this.input.endFrame();
      return;
    }

    this.elapsed += dt;
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.updateCamera(dt);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    var p = this.player;
    var ex = this.world.exit;
    if (Math.abs(p.x - ex.x) < 14 && Math.abs(p.y - ex.y) < 18) {
      this.state = "won";
    }
    if (p.hp <= 0) this.state = "lost";

    this.input.endFrame();
  };

  Runner.prototype.updatePlayer = function (dt) {
    var p = this.player;
    var t = this.t;
    var inp = this.input;

    var moveX = (inp.down.right ? 1 : 0) - (inp.down.left ? 1 : 0);
    if (moveX !== 0 && p.dashTimer <= 0) p.facing = moveX;

    if (p.invuln > 0) p.invuln -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (p.attackTimer > 0) p.attackTimer -= dt;
    if (p.coyote > 0) p.coyote -= dt;
    if (p.buffer > 0) p.buffer -= dt;

    if (inp.consume("jump")) p.buffer = t.jumpBuffer;

    /* Dash overrides everything else while it lasts, which is what makes it
     * feel like a commitment instead of a speed boost. */
    if (inp.consume("dash") && p.dashCooldown <= 0 && p.dashReady) {
      p.dashTimer = t.dashTime;
      p.dashCooldown = t.dashCooldown;
      p.dashReady = false;
      p.dashDirX = moveX !== 0 ? moveX : p.facing;
      p.vy = 0;
      this.puff(p.x, p.y - p.h / 2, 10, "#ffae3a");
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vx = p.dashDirX * t.dashSpeed;
      p.vy = 0;
      if (Math.random() < 0.7) {
        this.particles.push({
          x: p.x,
          y: p.y - p.h / 2,
          vx: -p.dashDirX * 20,
          vy: (Math.random() - 0.5) * 20,
          life: 0.22,
          max: 0.22,
          colour: "#ff6a2a",
          size: 2.5,
        });
      }
    } else {
      /* Ground acceleration and friction, scaled down in the air so a jump
       * commits to its arc without feeling locked. */
      var control = p.grounded ? 1 : t.airControl;
      if (moveX !== 0) {
        p.vx += moveX * t.acceleration * control * dt;
        var cap = t.runSpeed;
        if (p.vx > cap) p.vx = Math.max(cap, p.vx - t.friction * dt);
        if (p.vx < -cap) p.vx = Math.min(-cap, p.vx + t.friction * dt);
      } else {
        var drop = t.friction * control * dt;
        if (Math.abs(p.vx) <= drop) p.vx = 0;
        else p.vx -= Math.sign(p.vx) * drop;
      }

      p.vy += t.gravity * dt;

      /* Wall slide: only while pressing into a wall and falling. */
      if (!p.grounded && p.wallDir !== 0 && moveX === p.wallDir && p.vy > 0) {
        p.vy = Math.min(p.vy, t.wallSlideSpeed);
        if (Math.random() < 0.25) {
          this.particles.push({
            x: p.x + p.wallDir * 5,
            y: p.y - Math.random() * p.h,
            vx: 0,
            vy: -18,
            life: 0.3,
            max: 0.3,
            colour: "#86b4ff",
            size: 1.6,
          });
        }
      }

      if (p.vy > t.maxFall) p.vy = t.maxFall;
    }

    /* Jump, wall jump, and the variable height cutoff. */
    if (p.buffer > 0) {
      if (p.grounded || p.coyote > 0) {
        p.vy = -t.jumpVelocity;
        p.grounded = false;
        p.coyote = 0;
        p.buffer = 0;
        this.puff(p.x, p.y, 5, "#cfc6dc");
      } else if (p.wallDir !== 0) {
        p.vy = -t.wallJumpY;
        p.vx = -p.wallDir * t.wallJumpX;
        p.facing = -p.wallDir;
        p.buffer = 0;
        p.dashReady = true;
        this.puff(p.x + p.wallDir * 5, p.y - p.h / 2, 7, "#86b4ff");
      }
    }
    if (!inp.down.jump && p.vy < 0 && p.dashTimer <= 0) p.vy *= 1 - t.jumpCutoff * (dt * 60) * 0.1;

    if (inp.consume("attack") && p.attackTimer <= 0) {
      p.attackTimer = t.attackTime;
      p.hitThisSwing = new Set();
    }

    /* Integrate and resolve. */
    var hit = moveBody(this.world, p, p.vx * dt, p.vy * dt);
    if (hit.x) {
      p.vx = 0;
      if (p.dashTimer > 0) p.dashTimer = 0;
    }
    if (hit.y) {
      if (p.vy > 0) {
        if (!p.grounded) this.puff(p.x, p.y, 4, "#8a8397");
        p.grounded = true;
        p.coyote = t.coyoteTime;
        p.dashReady = true;
        p.airborneHits = 0;
      }
      p.vy = 0;
    }

    /* Ground and wall probes, run after the move so they describe where the
     * body actually ended up. */
    var wasGrounded = p.grounded;
    p.grounded = boxHits(this.world, p.x, p.y + 1, p.w, p.h);
    if (p.grounded) {
      p.coyote = t.coyoteTime;
      p.dashReady = true;
    } else if (wasGrounded) {
      p.coyote = Math.max(p.coyote, t.coyoteTime);
    }

    p.wallDir = 0;
    if (!p.grounded) {
      if (boxHits(this.world, p.x - 2, p.y, p.w, p.h)) p.wallDir = -1;
      else if (boxHits(this.world, p.x + 2, p.y, p.w, p.h)) p.wallDir = 1;
    }

    if (p.attackTimer > 0) this.resolveAttack();
  };

  /* The blade. A grounded enemy gets launched, an airborne one gets kept up,
   * and every hit inside one airborne string counts toward the combo. This is
   * the one Gleamwood mechanic small enough to fit here honestly. */
  Runner.prototype.resolveAttack = function () {
    var p = this.player;
    var t = this.t;
    var hx = p.x + p.facing * (t.attackRange / 2);
    var hy = p.y - p.h / 2;
    var hw = t.attackRange;
    var hh = 20;

    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (e.state === "dead" || p.hitThisSwing.has(i)) continue;
      if (Math.abs(e.x - hx) > (hw + e.w) / 2) continue;
      if (Math.abs(e.y - e.h / 2 - hy) > (hh + e.h) / 2) continue;

      p.hitThisSwing.add(i);
      e.hp--;
      e.flash = 0.12;
      this.hitstop = t.hitstop;
      this.cam.shake = this.reduceMotion ? 0 : 3.5 * t.screenShake;

      var wasAirborne = e.state === "launched";
      if (e.hp <= 0) {
        e.state = "dead";
        this.puff(e.x, e.y - e.h / 2, 14, "#ff6a2a");
      } else {
        e.state = "launched";
        e.timer = 0.5;
        e.vx = p.facing * 60;
        /* A grounded target goes up. One already up is held there, which is
         * what keeps a string alive without making it free. */
        e.vy = wasAirborne ? -t.launchPower * 0.45 : -t.launchPower;
        this.puff(e.x, e.y - e.h / 2, 7, "#ffae3a");
      }

      if (!p.grounded || wasAirborne) {
        this.combo++;
        this.comboTimer = 1.1;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
      }
    }
  };

  Runner.prototype.updateEnemies = function (dt) {
    var self = this;
    var p = this.player;

    this.enemies.forEach(function (e) {
      if (e.state === "dead") return;
      if (e.flash > 0) e.flash -= dt;

      if (e.state === "launched") {
        e.timer -= dt;
        e.vy += self.t.gravity * 0.85 * dt;
        e.vx *= 1 - 1.6 * dt;
        var hit = moveBody(self.world, e, e.vx * dt, e.vy * dt);
        if (hit.y && e.vy > 0) {
          e.vy = 0;
          e.state = "patrol";
          self.puff(e.x, e.y, 4, "#8a8397");
        }
        if (hit.x) e.vx = 0;
        return;
      }

      /* Patrol: walk, turn at a wall, and turn at a ledge rather than walking
       * off it, which is the difference between a patrol and a lemming. */
      e.vy += self.t.gravity * dt;
      var res = moveBody(self.world, e, e.dir * e.vx * dt, e.vy * dt);
      if (res.y) e.vy = 0;
      if (res.x) e.dir *= -1;

      var aheadX = e.x + e.dir * (e.w / 2 + 2);
      if (!solidAt(self.world, aheadX, e.y + 3)) e.dir *= -1;

      /* Contact damage. */
      if (
        p.invuln <= 0 &&
        p.dashTimer <= 0 &&
        Math.abs(p.x - e.x) < (p.w + e.w) / 2 &&
        Math.abs(p.y - p.h / 2 - (e.y - e.h / 2)) < (p.h + e.h) / 2
      ) {
        p.hp--;
        p.invuln = 1.1;
        p.vx = Math.sign(p.x - e.x || 1) * 150;
        p.vy = -160;
        self.combo = 0;
        self.hitstop = 0.05;
        self.cam.shake = self.reduceMotion ? 0 : 6 * self.t.screenShake;
        self.puff(p.x, p.y - p.h / 2, 10, "#ff3c3c");
      }
    });
  };

  Runner.prototype.updatePickups = function (dt) {
    var p = this.player;
    var self = this;
    this.embers.forEach(function (m) {
      if (m.taken) return;
      m.phase += dt * 3;
      if (Math.abs(p.x - m.x) < 12 && Math.abs(p.y - p.h / 2 - m.y) < 14) {
        m.taken = true;
        self.collected++;
        self.puff(m.x, m.y, 6, "#ffae3a");
      }
    });
  };

  Runner.prototype.puff = function (x, y, n, colour) {
    if (this.reduceMotion) n = Math.min(n, 3);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 30 + Math.random() * 70;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life: 0.3 + Math.random() * 0.3,
        max: 0.6,
        colour: colour,
        size: 1 + Math.random() * 2,
      });
    }
  };

  Runner.prototype.updateParticles = function (dt) {
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 240 * dt;
      q.vx *= 1 - 2 * dt;
    }
  };

  Runner.prototype.updateCamera = function (dt) {
    var p = this.player;
    /* Look ahead of the run direction, so the space you are moving into is the
     * space you can see. */
    var targetX = p.x + p.vx * 0.22;
    var targetY = p.y - p.h / 2;
    var k = 1 - Math.pow(0.0016, dt);
    this.cam.x += (targetX - this.cam.x) * k;
    this.cam.y += (targetY - this.cam.y) * k;

    var maxX = this.world.level.cols * TILE - VIEW_W / 2;
    var maxY = this.world.level.rows * TILE - VIEW_H / 2;
    this.cam.x = Math.max(VIEW_W / 2, Math.min(maxX, this.cam.x));
    this.cam.y = Math.max(VIEW_H / 2, Math.min(maxY, this.cam.y));
    if (this.cam.shake > 0) this.cam.shake = Math.max(0, this.cam.shake - dt * 22);
  };

  /* ----------------------------------------------------------------------
   * Drawing
   * -------------------------------------------------------------------- */

  Runner.prototype.draw = function () {
    var ctx = this.ctx;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    var cssW = this.canvas.clientWidth || VIEW_W;
    var scale = (cssW / VIEW_W) * dpr;

    if (this.canvas.width !== Math.round(VIEW_W * scale)) {
      this.canvas.width = Math.round(VIEW_W * scale);
      this.canvas.height = Math.round(VIEW_H * scale);
    }

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0a080d";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (!this.world) return;

    var shakeX = this.cam.shake ? (Math.random() - 0.5) * this.cam.shake : 0;
    var shakeY = this.cam.shake ? (Math.random() - 0.5) * this.cam.shake : 0;
    var ox = Math.round(VIEW_W / 2 - this.cam.x + shakeX);
    var oy = Math.round(VIEW_H / 2 - this.cam.y + shakeY);

    ctx.save();
    ctx.translate(ox, oy);

    this.drawTiles(ctx, ox, oy);
    this.drawExit(ctx);
    this.drawEmbers(ctx);
    this.drawEnemies(ctx);
    this.drawPlayer(ctx);

    this.particles.forEach(function (q) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.colour;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
    this.drawHud(ctx);
  };

  Runner.prototype.drawTiles = function (ctx, ox, oy) {
    var lvl = this.world.level;
    var x0 = Math.max(0, Math.floor(-ox / TILE) - 1);
    var y0 = Math.max(0, Math.floor(-oy / TILE) - 1);
    var x1 = Math.min(lvl.cols - 1, x0 + Math.ceil(VIEW_W / TILE) + 2);
    var y1 = Math.min(lvl.rows - 1, y0 + Math.ceil(VIEW_H / TILE) + 2);

    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        if (lvl.map[y * lvl.cols + x] !== WALL) continue;
        var px = x * TILE;
        var py = y * TILE;
        var openAbove = y > 0 && lvl.map[(y - 1) * lvl.cols + x] === AIR;

        ctx.fillStyle = "#171320";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#100d14";
        ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);

        /* Only the lit edge of a surface you can land on gets the ember, which
         * is what makes the walkable geometry readable at a glance. */
        if (openAbove) {
          ctx.fillStyle = "#ff6a2a";
          ctx.fillRect(px, py, TILE, 2);
          ctx.fillStyle = "rgba(255,106,42,0.14)";
          ctx.fillRect(px, py + 2, TILE, 3);
        }
      }
    }
  };

  Runner.prototype.drawExit = function (ctx) {
    var e = this.world.exit;
    var pulse = 0.6 + Math.sin(this.elapsed * 3) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#7ec88a";
    ctx.fillRect(e.x - 6, e.y - 22, 12, 22);
    ctx.globalAlpha = 0.25 * pulse;
    ctx.fillRect(e.x - 11, e.y - 27, 22, 27);
    ctx.globalAlpha = 1;
  };

  Runner.prototype.drawEmbers = function (ctx) {
    var self = this;
    this.embers.forEach(function (m) {
      if (m.taken) return;
      var bob = Math.sin(m.phase) * 2;
      ctx.fillStyle = "#ffae3a";
      ctx.fillRect(m.x - 2, m.y - 2 + bob, 4, 4);
      ctx.globalAlpha = 0.3;
      ctx.fillRect(m.x - 4, m.y - 4 + bob, 8, 8);
      ctx.globalAlpha = 1;
      void self;
    });
  };

  Runner.prototype.drawEnemies = function (ctx) {
    this.enemies.forEach(function (e) {
      if (e.state === "dead") return;
      var x = Math.round(e.x - e.w / 2);
      var y = Math.round(e.y - e.h);
      ctx.fillStyle = e.flash > 0 ? "#ffffff" : e.state === "launched" ? "#86b4ff" : "#cf5a2a";
      ctx.fillRect(x, y, e.w, e.h);
      ctx.fillStyle = "#0a080d";
      ctx.fillRect(x + (e.dir > 0 ? e.w - 4 : 2), y + 3, 2, 2);
    });
  };

  Runner.prototype.drawPlayer = function (ctx) {
    var p = this.player;
    if (p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0) return;

    var x = Math.round(p.x - p.w / 2);
    var y = Math.round(p.y - p.h);

    ctx.fillStyle = p.dashTimer > 0 ? "#ffae3a" : "#cfc6dc";
    ctx.fillRect(x, y, p.w, p.h);
    ctx.fillStyle = "#100d14";
    ctx.fillRect(x + (p.facing > 0 ? p.w - 3 : 1), y + 3, 2, 2);

    if (p.attackTimer > 0) {
      var reach = this.t.attackRange;
      var phase = 1 - p.attackTimer / this.t.attackTime;
      ctx.globalAlpha = 0.85 * (1 - phase);
      ctx.fillStyle = "#ffae3a";
      ctx.fillRect(p.facing > 0 ? p.x : p.x - reach, p.y - p.h - 3, reach, p.h + 6);
      ctx.globalAlpha = 1;
    }

    if (this.t.showHitboxes) {
      ctx.strokeStyle = "#7ec88a";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, p.w - 1, p.h - 1);
    }
  };

  Runner.prototype.drawHud = function (ctx) {
    var p = this.player;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = i < p.hp ? "#ff6a2a" : "rgba(255,106,42,0.2)";
      ctx.fillRect(8 + i * 10, 8, 7, 7);
    }

    ctx.fillStyle = "#ffae3a";
    ctx.fillText(this.collected + " / " + this.embers.length, 8, 22);

    ctx.textAlign = "right";
    ctx.fillStyle = "#8a8397";
    ctx.fillText(this.elapsed.toFixed(1) + "s", VIEW_W - 8, 8);

    if (this.combo > 1) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#86b4ff";
      ctx.font = "bold 16px ui-monospace, monospace";
      ctx.fillText(this.combo + " hit air string", VIEW_W / 2, 26);
    }

    if (this.state !== "playing") {
      ctx.fillStyle = "rgba(10,8,13,0.82)";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.textAlign = "center";
      ctx.fillStyle = this.state === "won" ? "#7ec88a" : "#ff6a2a";
      ctx.font = "bold 20px ui-monospace, monospace";
      ctx.fillText(this.state === "won" ? "Exit reached" : "Out of health", VIEW_W / 2, VIEW_H / 2 - 26);
      ctx.fillStyle = "#cfc6dc";
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText(
        this.elapsed.toFixed(1) + "s, " + this.collected + " embers, best air string " + this.bestCombo,
        VIEW_W / 2,
        VIEW_H / 2 + 4
      );
      ctx.fillStyle = "#8a8397";
      ctx.fillText("Press Restart for a new seed", VIEW_W / 2, VIEW_H / 2 + 22);
    } else if (!this.input.focused) {
      ctx.fillStyle = "rgba(10,8,13,0.7)";
      ctx.fillRect(0, VIEW_H / 2 - 16, VIEW_W, 32);
      ctx.textAlign = "center";
      ctx.fillStyle = "#cfc6dc";
      ctx.font = "11px ui-monospace, monospace";
      ctx.fillText("Click to play. Arrows or WASD, Z jump, X attack, Shift dash.", VIEW_W / 2, VIEW_H / 2 - 5);
    }
  };

  Runner.prototype.destroy = function () {
    this.input.destroy();
  };

  global.csGame = {
    TILE: TILE,
    AIR: AIR,
    WALL: WALL,
    VIEW_W: VIEW_W,
    VIEW_H: VIEW_H,
    Runner: Runner,
    Input: Input,
    buildWorld: buildWorld,
    carveLevel: carveLevel,
    largestRegion: largestRegion,
    standables: standables,
    movementLimits: movementLimits,
    reachableFrom: reachableFrom,
    isStandable: isStandable,
    defaultTuning: defaultTuning,
    solidAt: solidAt,
    boxHits: boxHits,
    moveBody: moveBody,
    makeEnemy: makeEnemy,
  };
})(window);
