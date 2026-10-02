/* ==========================================================================
   Game frame. Loaded only by pages that host a playable game build, so far
   just /games/neon-keys/.

   A game build is a large download, so nothing loads until the visitor asks
   for it. Without this file the Play button is a plain link to the game's
   own page, which is the same game filling the window, and the page around
   it reads the same. With it, Play swaps the start panel for an iframe of
   that page, in place. Nothing here produces content.
   ========================================================================== */

(() => {
  "use strict";

  document.querySelectorAll("[data-game-frame]").forEach((frame) => {
    const play = frame.querySelector("[data-game-play]");
    if (!play) return;
    const section = frame.closest("section") || document.body;

    play.addEventListener("click", (e) => {
      // A middle click or a modifier click still opens the game's own page in
      // a new tab, the way any link would.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();

      const iframe = document.createElement("iframe");
      iframe.src = play.getAttribute("href");
      iframe.title = play.dataset.gameTitle || play.textContent.trim();
      // autoplay lets the game's music start, which still waits for the
      // player's first key or click. allowfullscreen, rather than "fullscreen"
      // in allow, lets its FULLSCREEN button work in every browser, older
      // Safari included, without Chrome warning that one overrides the other.
      iframe.allow = "autoplay";
      iframe.allowFullscreen = true;

      // Unity swallows Tab anywhere on the game's page, so a keyboard user in
      // the game could never tab out again. The frame is on this site, so
      // listen inside it: Tab moves on to the link after the frame,
      // Shift+Tab back to the section heading. The game uses neither.
      iframe.addEventListener("load", () => {
        try {
          const win = iframe.contentWindow;
          win.addEventListener(
            "keydown",
            (k) => {
              if (k.key !== "Tab" || k.altKey || k.ctrlKey || k.metaKey) return;
              // In fullscreen there is nothing visible to move focus to.
              if (document.fullscreenElement || win.document.fullscreenElement) return;
              const target = k.shiftKey
                ? section.querySelector("h2")
                : section.querySelector("[data-game-next]");
              if (!target) return;
              k.preventDefault();
              k.stopImmediatePropagation();
              if (k.shiftKey) target.tabIndex = -1;
              target.focus();
            },
            true,
          );
        } catch {
          // A frame from another origin cannot be reached. Nothing to add.
        }
      });

      frame.classList.add("is-playing");
      frame.replaceChildren(iframe);
      // The Play button had focus and has just gone. Hand focus to the game,
      // so the keyboard reaches it without a second click where browsers allow,
      // and bring the whole picture into view, since the box just grew to 16:9.
      iframe.focus({ preventScroll: true });
      frame.scrollIntoView({ block: "nearest" });
    });
  });
})();
