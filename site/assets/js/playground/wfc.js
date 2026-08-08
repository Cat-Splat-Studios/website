/* Wave Function Collapse, the browser port of the solver in
 * UnityWFCTilemap and the hierarchical generator in the WFC project.
 *
 * The solver here is the real one, not an animation of one. It keeps a bitmask
 * of still-possible tiles per cell, collapses the lowest-entropy cell, and
 * propagates the consequences until the wave is stable. When propagation empties
 * a cell it has hit a contradiction, and it backtracks to the last decision and
 * takes a different tile rather than starting over, which is the part most
 * demonstrations skip.
 *
 * Everything is derived from the tileset. A tile declares four edge sockets and
 * a weight, adjacency falls out of socket equality, and the solver never learns
 * what a tile means. Swapping the set at runtime is the proof: the same code
 * generates circuitry and dungeons because neither is written into it.
 *
 * The core is exposed as window.csWFC so tools/wfc-assert.html can check the
 * invariants independently, the same arrangement the hit resolver on the games
 * page uses.
 */
(function (global) {
  "use strict";

  /* ----------------------------------------------------------------------
   * Deterministic randomness. A seed has to reproduce a level exactly or the
   * seed box on the page is decoration.
   * -------------------------------------------------------------------- */

  function hashSeed(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), 1 | t);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ----------------------------------------------------------------------
   * Directions. Index order is north, east, south, west, and `OPP` maps a
   * direction to the one facing back at it, which is what makes an adjacency
   * table symmetric without writing it twice.
   * -------------------------------------------------------------------- */

  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];
  var OPP = [2, 3, 0, 1];

  /* ----------------------------------------------------------------------
   * Tilesets. Data, not code. A tile is four sockets plus a weight plus how to
   * draw it, and the solver reads only the first two.
   * -------------------------------------------------------------------- */

  /* Binary connection sockets: "o" is an opening, "-" is a closed edge. Tile n
   * has an opening in direction d when bit d of n is set, which enumerates all
   * sixteen combinations without listing them. */
  function connectionTiles(weightFor) {
    var tiles = [];
    for (var n = 0; n < 16; n++) {
      var sockets = [];
      var degree = 0;
      for (var d = 0; d < 4; d++) {
        var open = (n >> d) & 1;
        sockets.push(open ? "o" : "-");
        degree += open;
      }
      tiles.push({ id: n, sockets: sockets, degree: degree, weight: weightFor(degree, n) });
    }
    return tiles;
  }

  var TILESETS = {
    circuit: {
      label: "Circuit",
      /* Straights and corners carry the eye, dead ends stop it, so dead ends are
       * rare and junctions are uncommon. These weights are the whole difference
       * between a readable board and visual noise. */
      tiles: connectionTiles(function (degree) {
        return [0.6, 0.35, 3.2, 0.9, 0.5][degree];
      }),
      draw: drawCircuitTile,
    },
    dungeon: {
      label: "Dungeon",
      /* The same sixteen tiles, weighted the other way. Solid rock is common
       * and four-way crossroads are rare, which leaves masses of wall with
       * corridors and alcoves cut through them. Weighting toward junctions
       * instead, which is the obvious first guess, fills the grid edge to edge
       * and reads as a circuit board rather than a dungeon. */
      tiles: connectionTiles(function (degree) {
        return [1.8, 1.1, 2.4, 0.85, 0.25][degree];
      }),
      draw: drawDungeonTile,
    },
    level: {
      label: "Level",
      /* The set the platformer carves from. It is not offered in the demo's
       * tileset switch because it is tuned for traversal rather than for looks:
       * long corridors, few sealed cells, and enough junctions to branch. The
       * dungeon weights above make a handsome picture and a cramped level, and
       * that difference is the reason this is its own entry rather than a
       * second use of one of the others. */
      tiles: connectionTiles(function (degree) {
        return [0.35, 0.45, 3.0, 1.4, 0.6][degree];
      }),
      draw: drawDungeonTile,
    },
  };

  /* Adjacency from sockets. Tile a may sit in direction d from tile b when the
   * socket a presents back at b matches the socket b presents at a. This is the
   * only place the constraint set is defined, and it is four lines. */
  function buildCompatibility(tiles) {
    var n = tiles.length;
    var compat = [];
    for (var d = 0; d < 4; d++) {
      var perTile = new Int32Array(n);
      for (var a = 0; a < n; a++) {
        var mask = 0;
        for (var b = 0; b < n; b++) {
          if (tiles[a].sockets[d] === tiles[b].sockets[OPP[d]]) mask |= 1 << b;
        }
        perTile[a] = mask;
      }
      compat.push(perTile);
    }
    return compat;
  }

  function popcount(v) {
    v = v - ((v >> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
    return (((v + (v >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
  }

  /* ----------------------------------------------------------------------
   * The solver.
   * -------------------------------------------------------------------- */

  function WFC(opts) {
    this.cols = opts.cols;
    this.rows = opts.rows;
    this.tiles = opts.tiles;
    this.compat = buildCompatibility(opts.tiles);
    this.allowBacktrack = opts.allowBacktrack !== false;
    this.maxBacktracks = opts.maxBacktracks == null ? 400 : opts.maxBacktracks;
    this.noise = opts.noise == null ? 0.35 : opts.noise;
    this.rng = mulberry32(hashSeed(String(opts.seed)));

    this.full = this.tiles.length === 32 ? -1 : (1 << this.tiles.length) - 1;
    this.reset();
  }

  WFC.prototype.reset = function () {
    var count = this.cols * this.rows;
    this.wave = new Int32Array(count).fill(this.full);
    this.collapsedCount = 0;
    this.decisions = [];
    this.backtracks = 0;
    this.contradictions = 0;
    this.touched = new Float32Array(count);
    this.status = "running";
    this.failure = null;
  };

  WFC.prototype.index = function (x, y) {
    return y * this.cols + x;
  };

  WFC.prototype.isCollapsed = function (i) {
    var m = this.wave[i];
    return m !== 0 && (m & (m - 1)) === 0;
  };

  WFC.prototype.tileAt = function (i) {
    var m = this.wave[i];
    if (m === 0 || (m & (m - 1)) !== 0) return -1;
    return Math.round(Math.log2(m));
  };

  /* Shannon entropy over the tile weights, with a little noise so equal cells
   * do not always resolve in scan order. Scan order produces a diagonal sweep
   * that looks wrong even when the output is correct. */
  WFC.prototype.entropyAt = function (i) {
    var mask = this.wave[i];
    var sum = 0;
    var sumLog = 0;
    for (var t = 0; t < this.tiles.length; t++) {
      if (!(mask & (1 << t))) continue;
      var w = this.tiles[t].weight;
      sum += w;
      sumLog += w * Math.log(w);
    }
    if (sum <= 0) return Infinity;
    return Math.log(sum) - sumLog / sum + this.rng() * this.noise * 0.001;
  };

  WFC.prototype.lowestEntropyCell = function () {
    var best = -1;
    var bestValue = Infinity;
    for (var i = 0; i < this.wave.length; i++) {
      var mask = this.wave[i];
      if (mask === 0) return -2; /* contradiction already present */
      if ((mask & (mask - 1)) === 0) continue; /* already collapsed */
      var e = this.entropyAt(i);
      if (e < bestValue) {
        bestValue = e;
        best = i;
      }
    }
    return best;
  };

  /* Pick a tile from the cell's remaining options, proportional to weight. */
  WFC.prototype.pickTile = function (mask, exclude) {
    var total = 0;
    var t;
    for (t = 0; t < this.tiles.length; t++) {
      if (mask & (1 << t) && !(exclude & (1 << t))) total += this.tiles[t].weight;
    }
    if (total <= 0) return -1;
    var r = this.rng() * total;
    for (t = 0; t < this.tiles.length; t++) {
      if (!(mask & (1 << t)) || exclude & (1 << t)) continue;
      r -= this.tiles[t].weight;
      if (r <= 0) return t;
    }
    for (t = this.tiles.length - 1; t >= 0; t--) {
      if (mask & (1 << t) && !(exclude & (1 << t))) return t;
    }
    return -1;
  };

  /* Propagate from a set of changed cells until the wave is stable. Returns
   * false on contradiction. This is the hot loop and the reason the wave is a
   * typed array of bitmasks rather than an array of Sets. */
  WFC.prototype.propagate = function (stack) {
    while (stack.length) {
      var i = stack.pop();
      var mask = this.wave[i];
      var x = i % this.cols;
      var y = (i / this.cols) | 0;

      for (var d = 0; d < 4; d++) {
        var nx = x + DX[d];
        var ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= this.cols || ny >= this.rows) continue;
        var ni = ny * this.cols + nx;
        var before = this.wave[ni];
        if (before === 0) return false;

        /* Everything the neighbour could still be, given everything this cell
         * could still be. */
        var allowed = 0;
        for (var t = 0; t < this.tiles.length; t++) {
          if (mask & (1 << t)) allowed |= this.compat[d][t];
        }

        var after = before & allowed;
        if (after === before) continue;
        if (after === 0) {
          this.wave[ni] = 0;
          return false;
        }
        this.wave[ni] = after;
        this.touched[ni] = 1;
        stack.push(ni);
      }
    }
    return true;
  };

  /* One decision: collapse a cell and propagate. Returns "done", "running" or
   * "failed". Backtracking restores the wave snapshot taken before the last
   * decision and forbids the tile that led nowhere, so the search explores a
   * genuinely different branch instead of rerolling the same one. */
  WFC.prototype.step = function () {
    if (this.status !== "running") return this.status;

    var cell = this.lowestEntropyCell();
    if (cell === -1) {
      this.status = "done";
      return this.status;
    }

    if (cell !== -2) {
      var snapshot = this.allowBacktrack ? new Int32Array(this.wave) : null;
      var tile = this.pickTile(this.wave[cell], 0);
      if (tile >= 0) {
        this.wave[cell] = 1 << tile;
        this.touched[cell] = 1;
        this.collapsedCount++;
        if (this.allowBacktrack) {
          this.decisions.push({ cell: cell, snapshot: snapshot, tried: 1 << tile, collapsed: this.collapsedCount - 1 });
        }
        if (this.propagate([cell])) return this.status;
      }
    }

    /* Contradiction. */
    this.contradictions++;
    if (!this.allowBacktrack) {
      this.status = "failed";
      this.failure = "Contradiction with backtracking off. Reseed or loosen the grid.";
      return this.status;
    }
    return this._backtrack();
  };

  WFC.prototype._backtrack = function () {
    while (this.decisions.length) {
      if (this.backtracks >= this.maxBacktracks) {
        this.status = "failed";
        this.failure = "Gave up after " + this.backtracks + " backtracks.";
        return this.status;
      }

      var d = this.decisions[this.decisions.length - 1];
      this.wave.set(d.snapshot);
      this.collapsedCount = d.collapsed;
      this.backtracks++;

      var tile = this.pickTile(this.wave[d.cell], d.tried);
      if (tile < 0) {
        /* Every option at this cell has now failed, so the mistake is older
         * than this decision. Drop it and reconsider the one before. */
        this.decisions.pop();
        continue;
      }

      d.tried |= 1 << tile;
      this.wave[d.cell] = 1 << tile;
      this.touched[d.cell] = 1;
      this.collapsedCount++;
      if (this.propagate([d.cell])) return this.status;
      this.contradictions++;
    }

    this.status = "failed";
    this.failure = "Exhausted the search. This constraint set cannot fill this grid.";
    return this.status;
  };

  WFC.prototype.run = function (limit) {
    var steps = 0;
    var cap = limit == null ? 1e6 : limit;
    while (this.status === "running" && steps++ < cap) this.step();
    /* Solving without animating means there was no wave to watch, so the
     * propagation highlight is cleared rather than left showing every cell as
     * having just changed, which washes the whole board out. */
    this.touched.fill(0);
    return this.status;
  };

  /* ----------------------------------------------------------------------
   * Rendering.
   * -------------------------------------------------------------------- */

  var INK = {
    bg: "#0a080d",
    grid: "#1d1927",
    trace: "#ff6a2a",
    traceHot: "#ffae3a",
    cool: "#86b4ff",
    good: "#7ec88a",
    dim: "#8a8397",
  };

  function drawCircuitTile(ctx, tile, x, y, s) {
    var cx = x + s / 2;
    var cy = y + s / 2;
    var open = tile.sockets.map(function (v) {
      return v === "o";
    });

    if (tile.degree === 0) {
      ctx.fillStyle = "rgba(134,180,255,0.05)";
      ctx.fillRect(x + s * 0.36, y + s * 0.36, s * 0.28, s * 0.28);
      return;
    }

    ctx.strokeStyle = tile.degree >= 3 ? INK.traceHot : INK.trace;
    ctx.lineWidth = Math.max(1.5, s * 0.14);
    ctx.lineCap = "round";
    ctx.beginPath();
    if (open[0]) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, y);
    }
    if (open[1]) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(x + s, cy);
    }
    if (open[2]) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, y + s);
    }
    if (open[3]) {
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, cy);
    }
    ctx.stroke();

    /* A node dot marks junctions and terminals, which is what turns a mesh of
     * lines into something that reads as a board. */
    if (tile.degree !== 2 || open[0] === open[2]) {
      ctx.fillStyle = tile.degree >= 3 ? INK.traceHot : INK.cool;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.6, s * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDungeonTile(ctx, tile, x, y, s) {
    var open = tile.sockets.map(function (v) {
      return v === "o";
    });
    var t = s * 0.3; /* corridor half-width */
    var cx = x + s / 2;
    var cy = y + s / 2;

    if (tile.degree === 0) return;

    ctx.fillStyle = "rgba(255,106,42,0.3)";
    ctx.strokeStyle = "rgba(255,174,58,0.55)";
    ctx.lineWidth = 1;

    /* The floor is the union of a central block and one arm per opening, which
     * keeps corners square and joins seamless across cell borders. */
    ctx.beginPath();
    ctx.rect(cx - t, cy - t, t * 2, t * 2);
    if (open[0]) ctx.rect(cx - t, y, t * 2, s / 2);
    if (open[2]) ctx.rect(cx - t, cy, t * 2, s / 2);
    if (open[3]) ctx.rect(x, cy - t, s / 2, t * 2);
    if (open[1]) ctx.rect(cx, cy - t, s / 2, t * 2);
    ctx.fill();

    if (tile.degree >= 3) {
      ctx.fillStyle = "rgba(126,200,138,0.5)";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.5, s * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render(ctx, solver, set, size, opts) {
    var cols = solver.cols;
    var rows = solver.rows;
    ctx.fillStyle = INK.bg;
    ctx.fillRect(0, 0, cols * size, rows * size);

    var maxOptions = solver.tiles.length;

    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var i = y * cols + x;
        var mask = solver.wave[i];
        var px = x * size;
        var py = y * size;

        if (mask === 0) {
          ctx.fillStyle = "rgba(255,60,60,0.35)";
          ctx.fillRect(px, py, size, size);
          continue;
        }

        var count = popcount(mask);
        if (count === 1) {
          set.draw(ctx, solver.tiles[Math.round(Math.log2(mask))], px, py, size);
        } else if (opts.showEntropy) {
          /* Uncollapsed cells shade by how constrained they already are, so the
           * wave front is visible as a gradient ahead of the collapsed region. */
          var certainty = 1 - (count - 1) / (maxOptions - 1);
          ctx.fillStyle = "rgba(134,180,255," + (0.04 + certainty * 0.2).toFixed(3) + ")";
          ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

          if (size >= 22 && opts.showCounts) {
            ctx.fillStyle = "rgba(207,198,220,0.5)";
            ctx.font = Math.floor(size * 0.36) + "px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(count), px + size / 2, py + size / 2);
          }
        }

        /* The propagation flash: cells whose options changed this step glow and
         * fade, which is the only way to see propagation actually travelling. */
        if (opts.showWave && solver.touched[i] > 0.02) {
          ctx.fillStyle = "rgba(126,200,138," + (solver.touched[i] * 0.22).toFixed(3) + ")";
          ctx.fillRect(px, py, size, size);
        }
      }
    }

    if (opts.showGrid && size >= 10) {
      ctx.strokeStyle = INK.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 0; gx <= cols; gx++) {
        ctx.moveTo(gx * size + 0.5, 0);
        ctx.lineTo(gx * size + 0.5, rows * size);
      }
      for (var gy = 0; gy <= rows; gy++) {
        ctx.moveTo(0, gy * size + 0.5);
        ctx.lineTo(cols * size, gy * size + 0.5);
      }
      ctx.stroke();
    }
  }

  global.csWFC = {
    WFC: WFC,
    TILESETS: TILESETS,
    buildCompatibility: buildCompatibility,
    connectionTiles: connectionTiles,
    popcount: popcount,
    hashSeed: hashSeed,
    mulberry32: mulberry32,
    render: render,
    DX: DX,
    DY: DY,
    OPP: OPP,
  };
})(window);
