/* ==========================================================================
   Cat Splat Studios site behaviour
   No framework, no build step, no dependencies.

   Everything here is progressive enhancement: the page is fully readable and
   navigable with this file blocked. Nothing below is required for content.
   ========================================================================== */

(() => {
  "use strict";

  // The inline head script dropped `no-js` and armed a timer that puts it back
  // if this file never runs. The flag that disarms that timer is set at the
  // very END of this function. If anything below throws, the failsafe should
  // still fire and make the content visible.

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------------
     Header: solid background once the page scrolls off the top
     ---------------------------------------------------------------------- */

  const header = document.querySelector(".site-header");

  if (header) {
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
    document.body.prepend(sentinel);

    new IntersectionObserver(
      ([entry]) => header.classList.toggle("is-stuck", !entry.isIntersecting),
      { rootMargin: "0px" }
    ).observe(sentinel);
  }

  /* ------------------------------------------------------------------------
     Mobile menu
     ---------------------------------------------------------------------- */

  const toggle = document.querySelector(".menu-toggle");
  const mobileNav = document.querySelector(".mobile-nav");

  if (toggle && mobileNav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      mobileNav.dataset.open = String(open);
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Close on navigation or Escape so the panel never strands the user.
    mobileNav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Scroll reveal
     ---------------------------------------------------------------------- */

  const revealables = document.querySelectorAll(".reveal");

  if (revealables.length) {
    if (reduceMotion) {
      revealables.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
      );

      revealables.forEach((el) => io.observe(el));
    }
  }

  /* ------------------------------------------------------------------------
     The hang

     One rAF loop against performance.now(), so the 0.8 second band really is
     0.8 seconds on screen rather than an eased approximation. Visibility
     plumbing mirrors the ember field below.
     ---------------------------------------------------------------------- */

  // Authored values. HITS is a drawing choice and the caption says so.
  const HANG = {
    HITS: [0, 0.35, 0.7],
    LAUNCH: 0.7,
    HITSTOP: 0.1,
    HANG_LEN: 0.8,
    FALL_LEN: 0.4,
    TAIL: 1.2,
  };
  HANG.HANG_FROM = HANG.LAUNCH + HANG.HITSTOP;
  HANG.HANG_TO = HANG.HANG_FROM + HANG.HANG_LEN;
  HANG.FALL_TO = HANG.HANG_TO + HANG.FALL_LEN;
  HANG.CYCLE = HANG.FALL_TO + HANG.TAIL;

  // Pure, so the timeline can be asserted without a running animation frame.
  function hangAt(t) {
    const landed = HANG.HITS.filter((h) => t >= h).length;
    const pts = Math.min(60, landed * 20);

    let phase = "grounded";
    let label = "Grounded. Hits are adding juggle points.";

    if (t >= HANG.LAUNCH && t < HANG.HANG_FROM) {
      phase = "hitstop";
      label = "Meter at 60. Hitstop, then the launch.";
    } else if (t >= HANG.HANG_FROM && t < HANG.HANG_TO) {
      phase = "hang";
      label =
        "Airborne, hanging at the apex. " + (t - HANG.HANG_FROM).toFixed(2) + "s of 0.80s.";
    } else if (t >= HANG.HANG_TO && t < HANG.FALL_TO) {
      phase = "fall";
      label = "Falling. The air combo window has closed.";
    } else if (t >= HANG.FALL_TO) {
      phase = "done";
      label = "Executed.";
    }

    return {
      pts,
      phase,
      label,
      fill: (pts / 60) * 100 + "%",
      // Once the hang has been entered the band stays drawn, so the settled
      // end state still shows the window the enemy passed through. That is
      // also what the reduced-motion and no-JS renderings need to show.
      band: t >= HANG.HANG_FROM ? "1" : "0",
    };
  }

  window.csHangAt = hangAt;
  window.csHangConst = HANG;

  const hangfig = document.querySelector(".hangfig");

  if (hangfig) {
    const fill = hangfig.querySelector(".hang-fill");
    const band = hangfig.querySelector(".hang-band");
    const state = hangfig.querySelector(".hang-state");
    const replay = hangfig.querySelector(".hang-replay");

    const paint = (s) => {
      fill.style.width = s.fill;
      band.style.opacity = s.band;
      hangfig.dataset.phase = s.phase;
      state.textContent = s.label;
    };

    const endState = () => paint(hangAt(HANG.FALL_TO));

    let raf = 0;
    let t0 = 0;
    let running = false;
    let onScreen = false;

    const frame = (now) => {
      const t = (now - t0) / 1000;
      if (t >= HANG.CYCLE) {
        t0 = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      paint(hangAt(t));
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        onScreen ? start() : stop();
      },
      { threshold: 0.25 }
    ).observe(hangfig);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden || !onScreen) stop();
      else start();
    });

    // Pressing the button is an explicit request for the motion, so it runs
    // one cycle even when the reduced-motion preference is set.
    replay.addEventListener("click", () => {
      stop();
      running = true;
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    });

    if (reduceMotion) endState();
  }

  /* ------------------------------------------------------------------------
     Run web

     The route total is not typed into the page. The adjacency below is
     transcribed from GameContent.ini, [Node:*] blocks, taking `next` plus
     `bypass` because a bypass door is a real way out of a biome. The browser
     walks it and counts. If the web is re-authored in the game, this literal
     has to be re-derived, and tools/check.py asserts the totals it produces.
     ---------------------------------------------------------------------- */

  const WEB = {
    start: ["t2-a", "t2-b", "t2-c"],
    "t2-a": ["t3-a", "t3-b"],
    "t2-b": ["t3-b", "t3-c", "t3-a"],
    "t2-c": ["t3-c", "t3-a"],
    "t3-a": ["t3-b", "t4-a", "t4-b"],
    "t3-b": ["t3-c", "t4-a", "t4-b"],
    "t3-c": ["t4-b"],
    "t4-a": ["t4-b", "finale"],
    "t4-b": ["finale"],
    finale: [],
  };

  const webfig = document.querySelector(".webfig");

  if (webfig && webfig.querySelector(".web-node")) {
    const routes = [];
    (function walk(node, path) {
      const here = path.concat(node);
      if (node === "finale") {
        routes.push(here);
        return;
      }
      WEB[node].forEach((next) => walk(next, here));
    })("start", []);

    const countEl = webfig.querySelector(".web-count");
    if (countEl) {
      countEl.textContent =
        routes.length + " routes, walked in your browser from the shipped adjacency.";
    }

    const edgeId = (a, b) => "e-" + a + "--" + b;
    const clearLit = () => {
      webfig.querySelectorAll(".is-lit").forEach((el) => el.classList.remove("is-lit"));
    };

    const light = (paths) => {
      clearLit();
      paths.forEach((path) => {
        path.forEach((n, i) => {
          const node = webfig.querySelector(`[data-node="${n}"]`);
          if (node) node.classList.add("is-lit");
          if (i > 0) {
            const edge = webfig.querySelector("#" + CSS.escape(edgeId(path[i - 1], n)));
            if (edge) edge.classList.add("is-lit");
          }
        });
      });
    };

    webfig.querySelectorAll(".web-node").forEach((g) => {
      const name = g.dataset.node;
      const show = () => light(routes.filter((r) => r.includes(name)));
      g.addEventListener("mouseenter", show);
      g.addEventListener("focus", show);
      g.addEventListener("mouseleave", clearLit);
      g.addEventListener("blur", clearLit);
    });

    const traceBtn = webfig.querySelector(".web-trace");
    if (traceBtn && countEl) {
      let i = -1;
      traceBtn.addEventListener("click", () => {
        i = (i + 1) % routes.length;
        const route = routes[i];
        light([route]);
        countEl.textContent =
          "Route " + (i + 1) + " of " + routes.length + ", " + route.length + " levels long.";
      });
    }
  }

  /* ------------------------------------------------------------------------
     Hit resolver

     Mirrors the runtime order of EnemyStateMachine.TakeHit. The pure function
     is exposed so tools/resolver-assert.html can walk all 48 combinations
     without a browser DOM in the loop.
     ---------------------------------------------------------------------- */

  function resolveHit({ state, meterFull, ready, armor, lethal }) {
    const grounded = state === "grounded";
    const alreadyJuggled = state === "juggled";

    // Step 09, the anti-infinite rule: an air hit on an already juggled enemy
    // wipes its juggle points, so step 10 sees an empty meter.
    const resetByAirHit = !grounded && alreadyJuggled;
    const fullAtTen = meterFull && !resetByAirHit;

    let outcome;
    let last;
    if (ready) {
      outcome = "Executed";
      last = 7;
    } else if (lethal) {
      outcome = "Dead";
      last = 8;
    } else if (fullAtTen) {
      outcome = "Launched";
      last = 10;
    } else if (armor) {
      outcome = "Armor absorbs it. No flinch.";
      last = 11;
    } else {
      outcome = "Hitstun";
      last = 11;
    }

    const steps = {};
    for (let i = 1; i <= 6; i++) steps[i] = "is-run";
    steps[3] = grounded ? "is-run" : "is-half";
    steps[7] = ready ? "is-run" : "is-skip";
    steps[8] = ready ? "is-off" : lethal ? "is-run" : "is-skip";
    steps[9] = ready || lethal ? "is-off" : resetByAirHit ? "is-run" : "is-skip";
    steps[10] = ready || lethal ? "is-off" : fullAtTen ? "is-run" : "is-skip";
    steps[11] = ready || lethal || fullAtTen ? "is-off" : "is-run";

    return { outcome, last, steps };
  }

  window.csResolveHit = resolveHit;

  const resolver = document.querySelector(".resolver");

  if (resolver) {
    const stepEls = resolver.querySelectorAll(".steps li");
    const outcomeEl = resolver.querySelector(".outcome-val");
    const VERDICT = {
      "is-run": "applied",
      "is-half": "applied, with no juggle points",
      "is-skip": "skipped",
      "is-off": "not reached",
    };

    const readControls = () => ({
      state: resolver.querySelector('input[name="state"]:checked').value,
      meterFull: resolver.querySelector('[data-k="meterFull"]').checked,
      ready: resolver.querySelector('[data-k="ready"]').checked,
      armor: resolver.querySelector('[data-k="armor"]').checked,
      lethal: resolver.querySelector('[data-k="lethal"]').checked,
    });

    const render = () => {
      const { outcome, steps } = resolveHit(readControls());
      stepEls.forEach((li) => {
        const n = Number(li.dataset.step);
        const cls = steps[n];
        li.classList.remove("is-run", "is-half", "is-skip", "is-off");
        li.classList.add(cls);
        const verdict = li.querySelector("[data-verdict]");
        if (verdict) verdict.textContent = VERDICT[cls];
      });
      outcomeEl.textContent = outcome;
    };

    resolver.addEventListener("change", render);

    resolver.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = JSON.parse(btn.dataset.preset);
        resolver.querySelector(`input[name="state"][value="${preset.state}"]`).checked = true;
        ["meterFull", "ready", "armor", "lethal"].forEach((k) => {
          resolver.querySelector(`[data-k="${k}"]`).checked = Boolean(preset[k]);
        });
        render();
        outcomeEl.closest(".outcome").scrollIntoView({ block: "nearest" });
      });
    });

    resolver.classList.add("is-live");
    render();
  }

  /* ------------------------------------------------------------------------
     Section rail

     Lights the ordinal for whichever numbered section currently owns the
     middle of the viewport. The rail is display:none below 86rem, so on a
     phone this observer simply never has anything to light.
     ---------------------------------------------------------------------- */

  const railLinks = document.querySelectorAll(".railnav a");

  if (railLinks.length) {
    const byId = new Map();
    railLinks.forEach((a) => byId.set(a.getAttribute("href").slice(1), a));

    const targets = [...byId.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (targets.length) {
      const seen = new Map();

      const railObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => seen.set(e.target.id, e.intersectionRatio));

          // Highest visible proportion wins, so a short section sandwiched
          // between two tall ones still takes the rail when it is centred.
          let best = null;
          let bestRatio = 0;
          seen.forEach((ratio, id) => {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = id;
            }
          });

          railLinks.forEach((a) =>
            a.classList.toggle("is-current", bestRatio > 0 && a.getAttribute("href") === "#" + best)
          );
        },
        { threshold: [0, 0.15, 0.35, 0.6, 0.9], rootMargin: "-20% 0px -20% 0px" }
      );

      targets.forEach((t) => railObserver.observe(t));
    }
  }

  /* ------------------------------------------------------------------------
     Ember field

     A direct port of the feeling of the game's ambient UIEmbers: sparks lift
     off the bottom edge, drift, flicker, and burn out. Cheap enough to run on
     a phone: a few dozen 2px rects, no images, no per-frame allocation.
     ---------------------------------------------------------------------- */

  const fields = document.querySelectorAll(".embers");

  if (fields.length && !reduceMotion) {
    const PALETTE = ["#ff6a2a", "#ffae3a", "#ff8a3a", "#cf5a2a"];

    fields.forEach((field) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      field.appendChild(canvas);

      let width = 0;
      let height = 0;
      let dpr = 1;
      let embers = [];
      let raf = 0;
      let running = false;

      // Density scales with area so a tall hero isn't sparser than a short one,
      // but stays capped so huge displays don't melt.
      const targetCount = () => Math.min(70, Math.round((width * height) / 16000));

      const spawn = (seeded) => ({
        x: Math.random() * width,
        // `seeded` fills the field on first paint instead of starting empty.
        y: seeded ? Math.random() * height : height + Math.random() * 40,
        size: 1 + Math.random() * 2.2,
        speed: 0.15 + Math.random() * 0.5,
        drift: (Math.random() - 0.5) * 0.35,
        wobble: Math.random() * Math.PI * 2,
        wobbleRate: 0.008 + Math.random() * 0.02,
        life: Math.random(),
        decay: 0.0012 + Math.random() * 0.0035,
        color: PALETTE[(Math.random() * PALETTE.length) | 0],
      });

      const resize = () => {
        const rect = field.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;

        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const want = targetCount();
        if (embers.length > want) {
          embers.length = want;
        } else {
          while (embers.length < want) embers.push(spawn(true));
        }
      };

      const frame = () => {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < embers.length; i++) {
          const e = embers[i];

          e.y -= e.speed;
          e.wobble += e.wobbleRate;
          e.x += e.drift + Math.sin(e.wobble) * 0.32;
          e.life -= e.decay;

          if (e.life <= 0 || e.y < -12) {
            embers[i] = spawn(false);
            continue;
          }

          // Fade in at the start of life, out at the end.
          const alpha = e.life > 0.75 ? (1 - e.life) * 4 : e.life / 0.75;

          ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.85;
          ctx.fillStyle = e.color;
          ctx.fillRect(e.x, e.y, e.size, e.size);
        }

        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(frame);
      };

      const start = () => {
        if (running) return;
        running = true;
        raf = requestAnimationFrame(frame);
      };

      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      // Only burn CPU while the field is actually on screen.
      let onScreen = false;

      new IntersectionObserver(
        ([entry]) => {
          onScreen = entry.isIntersecting;
          onScreen ? start() : stop();
        },
        { threshold: 0 }
      ).observe(field);

      // Returning to the tab must not wake fields that are scrolled out of
      // view. Without the onScreen check, every canvas on the page restarts.
      document.addEventListener("visibilitychange", () => {
        if (document.hidden || !onScreen) stop();
        else start();
      });

      if (typeof ResizeObserver === "function") {
        new ResizeObserver(resize).observe(field);
      } else {
        window.addEventListener("resize", resize);
      }

      resize();
    });
  }

  /* ------------------------------------------------------------------------
     Footer year
     ---------------------------------------------------------------------- */

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------------
     Everything above ran without throwing, so the reveal observer is live and
     the no-js failsafe can stand down.

     All three lines matter. Setting the flag alone is not enough: if this file
     took longer than the failsafe's 2.5s to arrive, say a cold cache on a
     slow connection, then the timer has already re-added `no-js`, and that class hides
     the menu button while pinning the mobile nav permanently open. So cancel
     the timer AND undo it if it already fired.
     ---------------------------------------------------------------------- */

  window.__csReady = true;
  clearTimeout(window.__csFailsafe);
  document.documentElement.classList.remove("no-js");
})();
