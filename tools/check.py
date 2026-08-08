#!/usr/bin/env python3
"""Pre-flight checks for the Cat Splat Studios site.

There is no build step, which means nothing else will catch a nav link that was
updated on three pages out of five, or an href pointing at a file that no longer
exists. This script is that safety net.

    python tools/check.py

Exits non-zero if anything fails. No dependencies, standard library only.
"""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

PAGES = [
    SITE / "index.html",
    SITE / "games" / "index.html",
    SITE / "playground" / "index.html",
    SITE / "services" / "index.html",
    SITE / "about" / "index.html",
    SITE / "404.html",
]

# Scripts and stylesheets the pages load. Kept next to PAGES because the em dash
# rule and the external-subresource rule apply to everything that ships, and the
# playground added five files that would otherwise never be looked at.
ASSETS = [
    SITE / "assets" / "css" / "site.css",
    SITE / "assets" / "css" / "playground.css",
    SITE / "assets" / "js" / "site.js",
    SITE / "assets" / "js" / "playground" / "debug-ui.js",
    SITE / "assets" / "js" / "playground" / "wfc.js",
    SITE / "assets" / "js" / "playground" / "metroidvania.js",
    SITE / "assets" / "js" / "playground" / "game.js",
    SITE / "assets" / "js" / "playground" / "playground.js",
]

problems: list[str] = []


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def fail(msg: str) -> None:
    problems.append(msg)


def block(html: str, tag: str, cls: str) -> str | None:
    """Extract <tag class="cls ..."> ... </tag>, non-greedy on the closing tag."""
    m = re.search(rf'<{tag} class="{cls}[^"]*">(.*?)</{tag}>', html, re.S)
    return m.group(1) if m else None


def normalise(s: str) -> str:
    """Collapse whitespace and drop the bits that are *supposed* to differ.

    Two things legitimately vary per page: which nav item is aria-current, and
    the header call-to-action (every page points at /services, except the
    services page itself, which points at its own contact section). Those are
    checked separately below rather than being allowed to hide real drift.
    """
    s = re.sub(r'\s+aria-current="page"', "", s)
    s = re.sub(r'<a class="btn btn-primary nav-cta".*?</a>', "<!--cta-->", s, flags=re.S)
    # Paths are relative so the site works from file://, which means a depth-1
    # page writes ../assets where the root writes assets. Fold that away, or
    # every page would look like it had drifted.
    s = s.replace('="../', '="').replace('="/', '="')
    s = re.sub(r"\s+", " ", s)
    return s.strip()


# --------------------------------------------------------------------------
# 1. The header and footer are copy-pasted across pages. Catch drift.
# --------------------------------------------------------------------------

sources = {p: p.read_text(encoding="utf-8") for p in PAGES}

for name, tag, cls, skip in [
    ("header", "header", "site-header", set()),
    # 404 deliberately ships a stripped footer, so it is not part of the compare.
    ("footer", "footer", "site-footer", {SITE / "404.html"}),
]:
    seen: dict[str, list[Path]] = {}
    for page, html in sources.items():
        if page in skip:
            continue
        found = block(html, tag, cls)
        if found is None:
            fail(f"{rel(page)}: no <{tag} class=\"{cls}\"> block found")
            continue
        seen.setdefault(normalise(found), []).append(page)

    if len(seen) > 1:
        groups = " | ".join(
            "{" + ", ".join(rel(p) for p in pages) + "}" for pages in seen.values()
        )
        fail(f"{name} markup has drifted between pages: {groups}")

# --------------------------------------------------------------------------
# 2. Exactly one aria-current per nav, pointing at the page you are on.
# --------------------------------------------------------------------------

EXPECTED_CURRENT = {
    SITE / "index.html": "index.html",
    SITE / "games" / "index.html": "../games/index.html",
    SITE / "playground" / "index.html": "../playground/index.html",
    SITE / "services" / "index.html": "../services/index.html",
    SITE / "about" / "index.html": "../about/index.html",
    SITE / "404.html": None,  # not a nav destination
}

for page, html in sources.items():
    want = EXPECTED_CURRENT[page]
    marked = re.findall(r'<a href="([^"]+)"[^>]*aria-current="page"', html)
    if want is None:
        if marked:
            fail(f"{rel(page)}: 404 should not mark any nav item current, got {marked}")
        continue
    # Once in the desktop nav, once in the mobile nav.
    if marked != [want, want]:
        fail(
            f"{rel(page)}: expected aria-current on {want!r} in both navs, got {marked}"
        )

# --------------------------------------------------------------------------
# 1b. Tags actually nest. Hand-edited HTML with no build step means a mistyped
#     closing tag ships silently, and browsers paper over it differently.
# --------------------------------------------------------------------------

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img",
    "input", "link", "meta", "source", "track", "wbr",
}


class NestingCheck(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, int]] = []
        self.errors: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f"line {self.getpos()[0]}: stray </{tag}>")
            return
        top, line = self.stack[-1]
        if top != tag:
            self.errors.append(
                f"line {self.getpos()[0]}: </{tag}> closes <{top}> opened on line {line}"
            )
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i][0] == tag:
                    del self.stack[i:]
                    return
            return
        self.stack.pop()


for page, html in sources.items():
    parser = NestingCheck()
    parser.feed(html)
    for err in parser.errors:
        fail(f"{rel(page)}: {err}")
    for tag, line in parser.stack:
        fail(f"{rel(page)}: <{tag}> opened on line {line} is never closed")

# --------------------------------------------------------------------------
# 1c. Exactly one h1 per page, and no skipped heading levels.
# --------------------------------------------------------------------------

for page, html in sources.items():
    levels = [int(m) for m in re.findall(r"<h([1-6])\b", html)]
    if levels.count(1) != 1:
        fail(f"{rel(page)}: expected exactly one <h1>, found {levels.count(1)}")
    for prev, nxt in zip(levels, levels[1:]):
        if nxt > prev + 1:
            fail(f"{rel(page)}: heading level jumps from h{prev} to h{nxt}")

# --------------------------------------------------------------------------
# 2b. The header CTA: /services everywhere, #contact on the services page.
# --------------------------------------------------------------------------

for page, html in sources.items():
    m = re.search(r'<a class="btn btn-primary nav-cta" href="([^"]+)"', html)
    if not m:
        fail(f"{rel(page)}: header call-to-action button is missing")
        continue
    if page.parent.name == "services":
        want = "#contact"
    elif page.name == "404.html":
        want = "/services/index.html"  # 404 stays root-absolute; see resolve()
    else:
        want = ("../" if page.parent != SITE else "") + "services/index.html"
    if m.group(1) != want:
        fail(f"{rel(page)}: header CTA points at {m.group(1)!r}, expected {want!r}")

# --------------------------------------------------------------------------
# 3. Every internal link resolves to a file that exists.
# --------------------------------------------------------------------------


def resolve(href: str, page: Path) -> Path | None:
    """Root-absolute hrefs resolve against site/, relative ones against the page.

    404.html keeps root-absolute paths on purpose: GitHub Pages serves it for
    unknown URLs at any depth, so a relative path there would resolve against
    whatever directory the visitor happened to type.
    """
    path = href.split("#", 1)[0].split("?", 1)[0]
    if not path:
        return None
    target = SITE / path.lstrip("/") if path.startswith("/") else page.parent / path
    if target.is_dir() or path.endswith("/"):
        target = target / "index.html"
    elif target.suffix == "":
        target = target / "index.html"
    return target


for page, html in sources.items():
    for href in re.findall(r'(?:href|src)="([^"]+)"', html):
        if href.startswith(("http://", "https://", "mailto:", "#", "data:")):
            continue
        target = resolve(href, page)
        if target and not target.exists():
            fail(f"{rel(page)}: {href} -> missing {rel(target)}")

    # Fragment links must point at an id that exists on the target page.
    for href in re.findall(r'href="([^"]*#[^"]+)"', html):
        if href.startswith(("http", "mailto:")):
            continue
        path, frag = href.split("#", 1)
        target = resolve(path, page) if path else page
        if target is None or not target.exists():
            continue
        if f'id="{frag}"' not in target.read_text(encoding="utf-8"):
            fail(f"{rel(page)}: {href} -> no id=\"{frag}\" in {rel(target)}")

# --------------------------------------------------------------------------
# 3b. Directory URLs need the trailing slash. GitHub Pages 301s /games to
#     /games/, so a missing slash costs a redirect on every click and makes the
#     canonical disagree with the URL that actually gets served.
# --------------------------------------------------------------------------

for page, html in sources.items():
    for href in re.findall(r'href="(/[^"]*)"', html):
        path = href.split("#", 1)[0]
        if not path or path == "/" or "." in path.rsplit("/", 1)[-1]:
            continue
        if not path.endswith("/"):
            fail(f"{rel(page)}: {href} should end in a slash ({path}/)")

# 3f. Only 404.html may use root-absolute paths, because only it is served
#     from URLs it does not control. Everywhere else must stay relative so the
#     site also works when opened straight off disk.
for page, html in sources.items():
    if page.name == "404.html":
        continue
    for href in re.findall(r'(?:href|src)="(/[^/][^"]*)"', html):
        fail(f'{rel(page)}: "{href}" is root-absolute and breaks file:// opening')

# --------------------------------------------------------------------------
# 3c. Canonical and og:url must name the page's own served URL.
# --------------------------------------------------------------------------

BASE = "https://catsplatstudios.com"
for page, html in sources.items():
    if page.name == "404.html":
        continue
    want = BASE + "/" + (
        "" if page.parent == SITE else page.parent.name + "/"
    )
    for prop, pattern in [
        ("canonical", r'<link rel="canonical" href="([^"]+)"'),
        ("og:url", r'<meta property="og:url" content="([^"]+)"'),
    ]:
        m = re.search(pattern, html)
        if not m:
            fail(f"{rel(page)}: missing {prop}")
        elif m.group(1) != want:
            fail(f"{rel(page)}: {prop} is {m.group(1)!r}, expected {want!r}")

# --------------------------------------------------------------------------
# 3d. Sitemap lists exactly the canonical URLs of the public pages.
# --------------------------------------------------------------------------

sitemap = (SITE / "sitemap.xml").read_text(encoding="utf-8")
listed = set(re.findall(r"<loc>([^<]+)</loc>", sitemap))
expected = {
    BASE + "/" + ("" if p.parent == SITE else p.parent.name + "/")
    for p in PAGES
    if p.name != "404.html"
}
for missing in sorted(expected - listed):
    fail(f"site/sitemap.xml: missing {missing}")
for extra in sorted(listed - expected):
    fail(f"site/sitemap.xml: unexpected {extra}")

# --------------------------------------------------------------------------
# 3e. No em dashes. A house rule: they make copy read as machine-written, and
#     every construction that wants one reads better as a comma, a colon, a
#     full stop, or a restructured sentence. Covers the literal character and
#     the HTML entity, in markup and in comments alike.
# --------------------------------------------------------------------------

for page, html in sources.items():
    for pattern, label in [("—", "em dash"), ("&mdash;", "&mdash; entity")]:
        start = 0
        while (idx := html.find(pattern, start)) != -1:
            line = html.count("\n", 0, idx) + 1
            excerpt = " ".join(html[max(0, idx - 45) : idx + 45].split())
            fail(f'{rel(page)}:{line}: {label} in "…{excerpt}…"')
            start = idx + 1

for path in ASSETS:
    if not path.exists():
        fail(f"{rel(path)}: listed in ASSETS but missing from the repo")
        continue
    text = path.read_text(encoding="utf-8")
    start = 0
    while (idx := text.find("—", start)) != -1:
        fail(f"{rel(path)}:{text.count(chr(10), 0, idx) + 1}: em dash")
        start = idx + 1

# --------------------------------------------------------------------------
# 3h. Figures the pages state as fact. If the game changes, these fail loudly
#     rather than the site quietly going stale.
# --------------------------------------------------------------------------

CLAIMS = [
    ("657", "play-mode tests"),
    ("408", "C# files"),
    ("21", "versioned Steam builds"),
    ("742", "GoogleTest cases"),
    ("11", "render passes"),
    ("7", "engine backends"),
    ("36 KB", "gzipped playground payload"),
]
all_html = "\n".join(sources.values())
for value, what in CLAIMS:
    if value not in all_html:
        fail(f"the figure {value} ({what}) has vanished from the site; check it is still true")

# --------------------------------------------------------------------------
# 4. Assets referenced from CSS exist.
# --------------------------------------------------------------------------

STYLESHEETS = [p for p in ASSETS if p.suffix == ".css" and p.exists()]

for css_path in STYLESHEETS:
    css = css_path.read_text(encoding="utf-8")
    for url in re.findall(r'url\("([^"]+)"\)', css):
        if url.startswith(("http", "data:")):
            continue
        # url() resolves against the stylesheet's own directory.
        target = (
            SITE / url.lstrip("/") if url.startswith("/") else css_path.parent / url
        ).resolve()
        if not target.exists():
            fail(f"{rel(css_path)}: url({url}) -> missing {rel(target)}")

# --------------------------------------------------------------------------
# 5. The zero-dependency promise: nothing may be *loaded* from another origin.
#    Outbound links the user clicks are fine; subresources are not.
# --------------------------------------------------------------------------

for page, html in sources.items():
    for m in re.finditer(r'<(script|link|img|iframe)\b[^>]*>', html, re.I):
        tag = m.group(0)
        res = re.search(r'(?:src|href)="(https?://[^"]+)"', tag)
        if res and not (m.group(1).lower() == "link" and 'rel="canonical"' in tag):
            fail(f"{rel(page)}: external subresource {res.group(1)}")

for css_path in STYLESHEETS:
    for url in re.findall(r"url\((https?://[^)]+)\)", css_path.read_text(encoding="utf-8")):
        fail(f"{rel(css_path)}: external subresource {url}")

# --------------------------------------------------------------------------
# 6. Deploy-critical files must be inside the published directory.
# --------------------------------------------------------------------------

for required in ["CNAME", ".nojekyll", "404.html", "robots.txt", "sitemap.xml"]:
    if not (SITE / required).exists():
        fail(f"missing site/{required}, required for the GitHub Pages deploy")

# Browsers request /favicon.ico by convention no matter what <link> tags say.
# Without a file there, every one of those requests serves the whole 404 page.
if not (SITE / "favicon.ico").exists():
    fail("missing site/favicon.ico, so root-path requests fall through to 404.html")

cname = (SITE / "CNAME").read_text(encoding="utf-8").strip() if (SITE / "CNAME").exists() else ""
if cname != "catsplatstudios.com":
    fail(f"site/CNAME should contain catsplatstudios.com, contains {cname!r}")

# --------------------------------------------------------------------------

if problems:
    print(f"FAILED: {len(problems)} problem(s):\n", file=sys.stderr)
    for p in problems:
        print(f"  - {p}", file=sys.stderr)
    sys.exit(1)

print(f"OK: {len(PAGES)} pages checked, no problems found.")
