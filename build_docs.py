#!/usr/bin/env python3
"""Render the Pursae docs (served by wpgo-site on :8091) into static pages under ./docs
using the landing page's header, footer and styles.  Re-run to refresh:
    python3 build_docs.py [http://localhost:8091]
"""
import json, os, re, shutil, sys, urllib.request

SRC = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8091").rstrip("/")
ROOT = os.path.dirname(os.path.abspath(__file__))
SITE_ASSETS = os.path.join(ROOT, "..", "..", "WordpressGO", "wpgo-public-site", "web", "assets", "js", "docs.js")

def get(path):
    with urllib.request.urlopen(SRC + path) as r:
        return r.read().decode("utf-8")

index = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
header = re.search(r"<header class=\"site-header\">.*?</header>", index, re.S).group(0)
footer = re.search(r"<footer class=\"site-footer\">.*?</footer>", index, re.S).group(0)
fix_anchor = lambda h: re.sub(r'href="#', 'href="/#', h)
header, footer = fix_anchor(header), fix_anchor(footer)
header, footer = header.replace('href="docs/', 'href="/docs/'), footer.replace('href="docs/', 'href="/docs/')
header = header.replace('<a class="brand" href="/#"', '<a class="brand" href="/"')
footer = footer.replace('<a class="brand" href="/#"', '<a class="brand" href="/"')

search = json.loads(get("/docs/search.json"))
urls = ["/docs/"] + [d["url"] for d in search]
# section index pages that have no markdown of their own are not in search.json
for sec in re.findall(r'href="(/docs/[a-z-]+/)"', get("/docs/")):
    if sec not in urls:
        urls.append(sec)

def rewrite(html):
    html = re.sub(r'\s*<a class="edit-link".*?</a>', "", html, flags=re.S)   # stale GitHub edit link
    # root-relative links outside /docs/ belong to the other site
    html = re.sub(r'href="/(?!docs/|#)([^"]*)"', lambda m: f'href="{SRC}/{m.group(1)}"', html)
    html = html.replace("WordPress Go", "Pursae")   # product was renamed; visible text only
    return html

page = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/docs/docs.css">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%233858e9'/%3E%3Cpath d='M11 23V9h6a4.5 4.5 0 0 1 0 9h-6' fill='none' stroke='white' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
</head>
<body class="docs-page">
{header}
<main id="main">
{body}
</main>
{footer}
<script src="/script.js"></script>
<script src="/docs/docs.js" defer></script>
</body>
</html>
"""

shutil.rmtree(os.path.join(ROOT, "docs", "_old"), ignore_errors=True)
for u in urls:
    html = get(u)
    body = re.search(r'(<div class="container docs-layout.*?)\s*</main>', html, re.S).group(1)
    title = re.sub(r"\s*(—\s*)?Documentation.*$", "", re.search(r"<title>(.*?)</title>", html, re.S).group(1)).strip() or "Dokümantasyon"
    desc = re.search(r'<meta name="description" content="([^"]*)"', html).group(1).replace("WordPress Go", "Pursae")
    out = os.path.join(ROOT, u.lstrip("/"), "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    rel = "../" * len([x for x in u.split("/") if x])   # site root relative to this page (works under any base path)
    html_out = (page.format(title=(title.replace("WordPress Go", "Pursae") + " — Dokümantasyon · Pursae") if u != "/docs/" else "Dokümantasyon · Pursae", desc=desc, header=header, footer=footer, body=rewrite(body)))
    html_out = re.sub(r'(href|src|data-search-index)="/(?!/)', lambda m: f'{m.group(1)}="{rel}', html_out).replace("</head>", f'<script>window.SITE_ROOT="{rel}"</script>\n</head>', 1)
    open(out, "w", encoding="utf-8").write(html_out)

js = open(SITE_ASSETS, encoding="utf-8").read()
js = js.replace("'<a href=\"' + escapeHTML(d.url)", "'<a href=\"' + escapeHTML((window.SITE_ROOT || '/') + d.url.replace(/^\\//, ''))")
open(os.path.join(ROOT, "docs", "docs.js"), "w", encoding="utf-8").write(js)
open(os.path.join(ROOT, "docs", "search.json"), "w", encoding="utf-8").write(get("/docs/search.json").replace("WordPress Go", "Pursae"))
print(f"{len(urls)} pages written to docs/")
