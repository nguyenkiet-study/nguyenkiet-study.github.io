import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        res = {}
        for w in (360, 390, 768):
            ctx = await b.new_context(viewport={'width': w, 'height': 800})
            pg = await ctx.new_page()
            await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(800)
            async def chk(label):
                r = await pg.evaluate("""() => { const d=document.documentElement; const bad=[...document.querySelectorAll('body *')].filter(e=>e.offsetParent && e.getBoundingClientRect().right>innerWidth+1).slice(0,3).map(e=>e.tagName+'.'+e.className); return [d.scrollWidth, innerWidth, bad]; }""")
                res[f'{w}:{label}'] = r
            await chk('auth')
            await pg.click('#tab-register'); await chk('register')
            await pg.fill('#form-login [name=username]','alex') if False else None
            await pg.click('#tab-login')
            await pg.fill('#form-login [name=username]','alex'); await pg.fill('#form-login [name=password]','x')
            await pg.click('#login-btn'); await pg.wait_for_timeout(1500)
            for v in ['dashboard','assessment','practice','progress','profile','settings','speaking','listening','reading','writing','words']:
                await pg.evaluate(f"document.querySelector('[data-go={v}]') ? document.querySelector('[data-go={v}]').click() : null")
                if v in ('speaking','listening','reading','writing'):
                    await pg.evaluate("""(v)=>{ const el=[...document.querySelectorAll('[data-go]')].find(e=>e.dataset.go===v); if(el) el.click(); }""", v)
                await pg.wait_for_timeout(300); await chk(v)
            await ctx.close()
        await b.close()
        for k,v in res.items():
            flag = '  <-- OVERFLOW' if v[0] > v[1] else ''
            print(k, v, flag)
asyncio.run(main())
