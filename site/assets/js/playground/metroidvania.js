/* The metroidvania world generator, ported from MetroidvaniaGenerator and the
 * room graph work in UnityWFCTilemap (RoomGraph, PathValidator,
 * ProgressionValidator).
 *
 * Two halves that deliberately do not trust each other.
 *
 * The generator builds a world that is solvable by construction. It lays rooms
 * out on a grid, orders them by distance from the spawn, cuts that order into
 * regions, and gates the way into region k behind the ability that sits in
 * region k minus one. Solvability then follows by induction rather than by
 * hope.
 *
 * The validator is written as though the generator were a stranger. It starts
 * at the spawn with no abilities, walks only the doors it can actually open,
 * picks up whatever it finds, and repeats until it stops making progress. It
 * reports what it reached, in what order, and what it could not reach.
 *
 * Keeping those two apart is the entire point. A generator that also grades
 * itself will always pass. This one can fail, and when the two disagree the
 * page says so instead of drawing a world nobody can finish.
 */
(function (global) {
  "use strict";

  var rnd = global.csWFC; /* hashSeed and mulberry32 already live there. */

  /* Gleamwood's own movement vocabulary, so the generated world gates on the
   * abilities the game actually has. */
  var ABILITIES = [
    { id: "dash", name: "Dash", glyph: "»", colour: "#ff6a2a" },
    { id: "doubleJump", name: "Double Jump", glyph: "↑", colour: "#ffae3a" },
    { id: "wallJump", name: "Wall Jump", glyph: "↖", colour: "#86b4ff" },
    { id: "bow", name: "Bow", glyph: "●", colour: "#7ec88a" },
  ];

  var DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];

  /* ----------------------------------------------------------------------
   * Generation
   * -------------------------------------------------------------------- */

  function generate(opts) {
    var roomCount = Math.max(8, opts.rooms || 34);
    var abilityCount = Math.min(ABILITIES.length, Math.max(1, opts.abilities || 4));
    var loopChance = opts.loops == null ? 0.18 : opts.loops;
    var random = rnd.mulberry32(rnd.hashSeed(String(opts.seed)));

    /* 1. Lay rooms out by growing from the spawn into free neighbouring cells.
     *    Growing from a random existing room rather than always the newest one
     *    is what stops the map becoming a single snake. */
    var span = Math.ceil(Math.sqrt(roomCount)) + 4;
    var cells = {};
    var rooms = [];

    function key(x, y) {
      return x + "," + y;
    }

    function addRoom(x, y) {
      var room = { id: rooms.length, x: x, y: y, edges: [], region: 0, kind: "normal", ability: null };
      cells[key(x, y)] = room;
      rooms.push(room);
      return room;
    }

    addRoom(0, 0);
    var guard = 0;
    while (rooms.length < roomCount && guard++ < roomCount * 200) {
      var from = rooms[(random() * rooms.length) | 0];
      var d = DIRS[(random() * 4) | 0];
      var nx = from.x + d[0];
      var ny = from.y + d[1];
      if (Math.abs(nx) > span || Math.abs(ny) > span) continue;
      if (cells[key(nx, ny)]) continue;
      addRoom(nx, ny);
    }

    /* 2. Doors between orthogonally adjacent rooms. Every adjacency is a
     *    candidate, and a spanning tree decides which ones are structural. */
    var candidates = [];
    rooms.forEach(function (room) {
      DIRS.forEach(function (d, di) {
        if (di > 1) return; /* only east and south, so each pair is seen once */
        var other = cells[key(room.x + d[0], room.y + d[1])];
        if (other) candidates.push({ a: room, b: other });
      });
    });

    /* Spanning tree from the spawn, over a shuffled candidate list, gives a
     * connected world whose shape is not a function of iteration order. */
    shuffle(candidates, random);
    var parent = rooms.map(function (_, i) {
      return i;
    });
    function find(i) {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    }

    var edges = [];
    candidates.forEach(function (c) {
      var ra = find(c.a.id);
      var rb = find(c.b.id);
      if (ra !== rb) {
        parent[ra] = rb;
        edges.push({ a: c.a, b: c.b, gate: null, tree: true });
      } else if (random() < loopChance) {
        /* Loops are what make a metroidvania map feel like a place rather than
         * a tree, so a few non-structural doors are kept on purpose. */
        edges.push({ a: c.a, b: c.b, gate: null, tree: false });
      }
    });

    edges.forEach(function (e) {
      e.a.edges.push(e);
      e.b.edges.push(e);
    });

    /* 3. Order rooms by distance from the spawn. Any prefix of a breadth-first
     *    order is connected, which is exactly the property the region split
     *    needs and the reason the split is done on this order and not on
     *    position. */
    var spawn = rooms[0];
    spawn.kind = "spawn";
    var order = [];
    var seen = new Set([spawn.id]);
    var queue = [spawn];
    while (queue.length) {
      var room = queue.shift();
      order.push(room);
      room.edges.forEach(function (e) {
        var next = e.a === room ? e.b : e.a;
        if (!seen.has(next.id)) {
          seen.add(next.id);
          queue.push(next);
        }
      });
    }

    /* 4. Cut the order into abilityCount + 1 regions and gate every door that
     *    crosses into a deeper one. Entering region j needs ability j minus 1,
     *    which is placed back in region j minus 1. */
    var regionCount = abilityCount + 1;
    var per = Math.floor(order.length / regionCount);
    order.forEach(function (room, i) {
      room.region = Math.min(regionCount - 1, Math.floor(i / Math.max(1, per)));
    });

    edges.forEach(function (e) {
      var lo = Math.min(e.a.region, e.b.region);
      var hi = Math.max(e.a.region, e.b.region);
      if (hi > lo) e.gate = ABILITIES[hi - 1].id;
    });

    /* 5. Put each ability in its own region, preferring a dead end, because a
     *    reward at the end of a branch reads as a reward. */
    var placements = [];
    for (var r = 0; r < abilityCount; r++) {
      var pool = rooms.filter(function (room) {
        return room.region === r && room.kind === "normal";
      });
      if (!pool.length) {
        pool = rooms.filter(function (room) {
          return room.region <= r && room.kind === "normal";
        });
      }
      if (!pool.length) continue;
      var deadEnds = pool.filter(function (room) {
        return room.edges.length === 1;
      });
      var chosen = (deadEnds.length ? deadEnds : pool)[(random() * (deadEnds.length ? deadEnds.length : pool.length)) | 0];
      chosen.kind = "ability";
      chosen.ability = ABILITIES[r].id;
      placements.push(chosen);
    }

    /* 6. The boss goes as deep as the world goes. */
    var deepest = order[order.length - 1];
    for (var i = order.length - 1; i >= 0; i--) {
      if (order[i].kind === "normal") {
        deepest = order[i];
        break;
      }
    }
    deepest.kind = "boss";

    return {
      seed: String(opts.seed),
      rooms: rooms,
      edges: edges,
      spawn: spawn,
      boss: deepest,
      abilities: ABILITIES.slice(0, abilityCount),
      regionCount: regionCount,
    };
  }

  function shuffle(arr, random) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = (random() * (i + 1)) | 0;
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  /* ----------------------------------------------------------------------
   * Validation. Deliberately ignorant of how the world was built: it knows
   * about rooms, doors, gates and pickups, and nothing about regions.
   * -------------------------------------------------------------------- */

  function validate(world) {
    var held = new Set();
    var reached = new Set([world.spawn.id]);
    var waves = [];
    var guard = 0;

    while (guard++ < world.abilities.length + 3) {
      /* Flood as far as the current abilities allow. */
      var frontier = [world.spawn];
      var seen = new Set([world.spawn.id]);
      while (frontier.length) {
        var room = frontier.pop();
        for (var i = 0; i < room.edges.length; i++) {
          var e = room.edges[i];
          if (e.gate && !held.has(e.gate)) continue;
          var next = e.a === room ? e.b : e.a;
          if (seen.has(next.id)) continue;
          seen.add(next.id);
          frontier.push(next);
        }
      }

      /* Collect anything standing in the newly reachable area. */
      var gained = [];
      seen.forEach(function (id) {
        var room = world.rooms[id];
        if (room.ability && !held.has(room.ability)) gained.push(room.ability);
      });

      waves.push({
        abilities: Array.from(held),
        reached: seen,
        gained: gained,
      });
      reached = seen;

      if (!gained.length) break;
      gained.forEach(function (a) {
        held.add(a);
      });
    }

    var unreachable = world.rooms.filter(function (room) {
      return !reached.has(room.id);
    });

    var missing = world.abilities.filter(function (a) {
      return !held.has(a.id);
    });

    return {
      waves: waves,
      reachedCount: reached.size,
      reached: reached,
      unreachable: unreachable,
      abilitiesFound: Array.from(held),
      missingAbilities: missing,
      bossReachable: reached.has(world.boss.id),
      complete: unreachable.length === 0,
      /* The world is beatable when the boss can be reached. It is fully
       * explorable when nothing at all is stranded. Those are different claims
       * and the page states both. */
      solvable: reached.has(world.boss.id) && missing.length === 0,
    };
  }

  /* ----------------------------------------------------------------------
   * Rendering
   * -------------------------------------------------------------------- */

  var REGION_INK = ["#ff6a2a", "#ffae3a", "#86b4ff", "#7ec88a", "#cf5a2a"];

  function bounds(world) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    world.rooms.forEach(function (r) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x);
      maxY = Math.max(maxY, r.y);
    });
    return { minX: minX, minY: minY, cols: maxX - minX + 1, rows: maxY - minY + 1 };
  }

  function render(ctx, world, result, opts) {
    var b = opts.bounds;
    var cell = opts.cell;
    var pad = cell * 0.16;
    var w = b.cols * cell;
    var h = b.rows * cell;

    ctx.fillStyle = "#0a080d";
    ctx.fillRect(0, 0, w, h);

    function px(room) {
      return (room.x - b.minX) * cell;
    }
    function py(room) {
      return (room.y - b.minY) * cell;
    }
    function cxOf(room) {
      return px(room) + cell / 2;
    }
    function cyOf(room) {
      return py(room) + cell / 2;
    }

    var visible = opts.revealed || null;

    /* Doors first, so rooms sit on top of them. */
    world.edges.forEach(function (e) {
      var lit = !visible || (visible.has(e.a.id) && visible.has(e.b.id));
      var ax = cxOf(e.a);
      var ay = cyOf(e.a);
      var bx = cxOf(e.b);
      var by = cyOf(e.b);

      /* Doors carry the readability of the whole map. Too faint and the rooms
       * read as unconnected boxes floating in the dark, which is the opposite
       * of the thing being demonstrated. */
      ctx.strokeStyle = lit ? "rgba(207,198,220,0.62)" : "rgba(138,131,151,0.28)";
      ctx.lineWidth = e.tree ? 3 : 1.5;
      if (!e.tree) ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.setLineDash([]);

      if (e.gate) {
        var ability = abilityById(e.gate);
        var mx = (ax + bx) / 2;
        var my = (ay + by) / 2;
        /* A gate is open when the abilities held at this point in the replay
         * include its key. Using the validator's final set instead would draw
         * every gate open from the first frame, which quietly undoes the whole
         * reason for animating the solve. */
        var open = opts.held ? opts.held.has(e.gate) : true;

        /* A gate is drawn across the doorway, so a locked route reads as a
         * barrier rather than as a label floating near a line. */
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(Math.atan2(by - ay, bx - ax) + Math.PI / 2);
        ctx.fillStyle = open ? "rgba(126,200,138,0.45)" : ability.colour;
        ctx.globalAlpha = lit || open ? 1 : 0.5;
        ctx.fillRect(-cell * 0.19, -2.5, cell * 0.38, 5);
        ctx.restore();

        if (opts.showGateLabels && cell >= 26) {
          ctx.fillStyle = open ? "rgba(126,200,138,0.9)" : ability.colour;
          ctx.font = "bold " + Math.floor(cell * 0.3) + "px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.globalAlpha = lit || open ? 1 : 0.4;
          ctx.fillText(ability.glyph, mx, my - cell * 0.22);
          ctx.globalAlpha = 1;
        }
      }
    });

    world.rooms.forEach(function (room) {
      var lit = !visible || visible.has(room.id);
      var x = px(room) + pad;
      var y = py(room) + pad;
      var s = cell - pad * 2;

      var ink = opts.colourByRegion ? REGION_INK[room.region % REGION_INK.length] : "#8a8397";
      ctx.globalAlpha = lit ? 1 : 0.34;

      ctx.fillStyle = "rgba(23,19,32,0.95)";
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = ink;
      ctx.lineWidth = room.kind === "normal" ? 1 : 2;
      ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);

      if (room.kind === "spawn") {
        ctx.fillStyle = "#cfc6dc";
        ctx.font = "bold " + Math.floor(s * 0.5) + "px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("S", x + s / 2, y + s / 2);
      } else if (room.kind === "boss") {
        ctx.fillStyle = "#ff6a2a";
        ctx.beginPath();
        ctx.moveTo(x + s / 2, y + s * 0.2);
        ctx.lineTo(x + s * 0.82, y + s * 0.8);
        ctx.lineTo(x + s * 0.18, y + s * 0.8);
        ctx.closePath();
        ctx.fill();
      } else if (room.kind === "ability") {
        var a = abilityById(room.ability);
        ctx.fillStyle = a.colour;
        ctx.beginPath();
        ctx.arc(x + s / 2, y + s / 2, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0a080d";
        ctx.font = "bold " + Math.floor(s * 0.44) + "px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(a.glyph, x + s / 2, y + s / 2);
      }

      ctx.globalAlpha = 1;
    });

    /* Anything the validator could not reach gets called out in red. On a world
     * built by the construction above this should never appear, which is
     * exactly why it is worth drawing. */
    if (result && result.unreachable.length) {
      result.unreachable.forEach(function (room) {
        ctx.strokeStyle = "#ff3c3c";
        ctx.lineWidth = 2;
        ctx.strokeRect(px(room) + pad - 2, py(room) + pad - 2, cell - pad * 2 + 4, cell - pad * 2 + 4);
      });
    }
  }

  function abilityById(id) {
    for (var i = 0; i < ABILITIES.length; i++) {
      if (ABILITIES[i].id === id) return ABILITIES[i];
    }
    return ABILITIES[0];
  }

  global.csMetroid = {
    ABILITIES: ABILITIES,
    generate: generate,
    validate: validate,
    render: render,
    bounds: bounds,
    abilityById: abilityById,
    REGION_INK: REGION_INK,
  };
})(window);
