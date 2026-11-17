"""Builds web/index.html: the same app as the Apps Script page, ready for any static host.
Edit web/config.js to set the Apps Script web app URL (ending in /exec). Run: python3 tools/build_web.py"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
def inc(m): return (root / (m.group(1) + '.html')).read_text()
html = (root / 'Index.html').read_text()
for _ in range(4): html = re.sub(r"<\?!=\s*include\('([A-Za-z]+)'\);\s*\?>", inc, html)
assert '<?' not in html, 'unresolved scriptlet'
html = html.replace('<base target="_top">', '<base target="_top">\n  <script src="config.js"></script>', 1)
(root / 'web').mkdir(exist_ok=True)
(root / 'web' / 'index.html').write_text(html)
print('wrote web/index.html', len(html), 'bytes')
