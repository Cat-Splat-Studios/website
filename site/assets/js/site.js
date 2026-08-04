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
