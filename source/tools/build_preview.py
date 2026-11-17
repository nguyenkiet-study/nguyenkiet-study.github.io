import re, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
def inc(m):
    return (root / (m.group(1) + '.html')).read_text()
def build():
    html = (root / 'Index.html').read_text()
    for _ in range(4):
        html = re.sub(r"<\?!=\s*include\('([A-Za-z]+)'\);\s*\?>", inc, html)
    return html
if __name__ == '__main__':
    out = root / 'preview.html'
    out.write_text(build())
    print('wrote', out, len(out.read_text()), 'bytes')
