"""Builds the Kelvin logo and icons from the vector mark below (traced from the brand image: arrow, K leg with the lightning cut, ring).
Colours: navy and blue, with the cyan ring. Everything is vector, so it stays sharp at any size.
Writes into web/: favicon.svg, favicon.ico, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png, manifest.webmanifest,
and puts two symbols in Icons.html: #logo (the mark, for light backgrounds) and #logo-dark (the rounded navy tile).
Needs playwright + Pillow. Run: python3 tools/build_icons.py"""
import asyncio, io, json, pathlib, re
from PIL import Image
from playwright.async_api import async_playwright
root = pathlib.Path(__file__).resolve().parent.parent; web = root / 'web'
NAVY, BLUE, BLUE_L, CYAN = '#10234F', '#2864E8', '#4C8BF5', '#00BFEA'
ARROW = '77.7,64.3 126,132.2 59.5,241.8 147.8,178.3 121.7,181.2 178.3,112.3'
LEG = '240.2,113.2 199,113.2 152.5,165.5 172.3,166.7 142.5,200.7 168.3,229 228.8,229 186.7,175.8'
VB = '42 34 216 216'                      # the square around the mark
def mark(arrow, leg_a, leg_b, dot, gid):
    return ('<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + leg_a + '"/><stop offset="1" stop-color="' + leg_b + '"/></linearGradient></defs>'
            '<polygon points="' + ARROW + '" fill="' + arrow + '"/><polygon points="' + LEG + '" fill="url(#' + gid + ')"/>'
            '<circle cx="196.7" cy="67.4" r="25.8" fill="' + CYAN + '"/><circle cx="196.7" cy="67.4" r="9.4" fill="' + dot + '"/>')
LIGHT = mark(NAVY, BLUE_L, BLUE, NAVY, 'lg-a')                # on white
ON_DARK = mark('#FFFFFF', '#7FAEFF', '#3D7BF0', NAVY, 'lg-b')   # on the navy tile
def tile(full=False, gid='lg-t'):
    bg = ('<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1D469F"/><stop offset=".55" stop-color="' + NAVY + '"/><stop offset="1" stop-color="#0A1836"/></linearGradient></defs>'
          '<rect width="100" height="100"' + ('' if full else ' rx="22.5"') + ' fill="url(#' + gid + ')"/>')
    return bg + '<svg x="15" y="15" width="70" height="70" viewBox="' + VB + '">' + ON_DARK + '</svg>'
def svg(inner, vb='0 0 100 100'): return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '">' + inner + '</svg>'
(web / 'favicon.svg').write_text(svg(tile()))
async def png(s, n, page):
    await page.set_viewport_size({'width': n, 'height': n})
    await page.set_content('<body style="margin:0;background:transparent">' + s.replace('<svg ', '<svg width="%d" height="%d" ' % (n, n), 1) + '</body>')
    return await page.screenshot(omit_background=True)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox']); pg = await b.new_page()
        full = svg(tile(full=True))                      # full-bleed square: phones cut their own corners
        for name, n in (('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)): (web / name).write_bytes(await png(full, n, pg))
        (web / 'favicon-32.png').write_bytes(await png(svg(tile()), 32, pg))
        ims = [Image.open(io.BytesIO(await png(svg(tile()), n, pg))).convert('RGBA') for n in (16, 32, 48)]
        ims[2].save(web / 'favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)], append_images=ims[:2])
        pathlib.Path('/home/claude/logo_work/new').mkdir(parents=True, exist_ok=True)
        pathlib.Path('/home/claude/logo_work/new/v_tile.png').write_bytes(await png(svg(tile()), 512, pg))
        pathlib.Path('/home/claude/logo_work/new/v_mark.png').write_bytes(await png('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VB + '" style="background:#fff">' + LIGHT + '</svg>', 512, pg))
        await b.close()
asyncio.run(main())
icons = root / 'Icons.html'; s = icons.read_text()
s = re.sub(r'\s*<symbol id="logo-dark"[^>]*>.*?</symbol>', '', s, flags=re.S)
new = '<symbol id="logo" viewBox="' + VB + '">' + LIGHT + '</symbol>\n    <symbol id="logo-dark" viewBox="0 0 100 100">' + tile(gid='lg-t2').replace('lg-b', 'lg-b2') + '</symbol>'
s2, n = re.subn(r'<symbol id="logo"[^>]*>.*?</symbol>', lambda _: new, s, count=1, flags=re.S); assert n == 1; icons.write_text(s2)
(web / 'manifest.webmanifest').write_text(json.dumps({
    'name': 'Kelvin: English, skill by skill', 'short_name': 'Kelvin', 'start_url': './', 'display': 'standalone',
    'background_color': '#ffffff', 'theme_color': NAVY,
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'}]}, indent=2))
print('icons written to', web)
