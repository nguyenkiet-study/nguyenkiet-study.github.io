"""Browser test: the waiting card shows inside the page (under the loading block) with a Kel, then goes away."""
import asyncio, json, pathlib, urllib.request
_src = (pathlib.Path(__file__).resolve().parent / 'learning_e2e.py').read_text()
exec(_src[:_src.index('async def main')])
OUT = pathlib.Path('/tmp/cv'); OUT.mkdir(exist_ok=True)
def call(fn, payload=None):
    r = urllib.request.Request('http://localhost:8766', data=json.dumps({'fn': fn, 'payload': payload or {}}).encode(), method='POST')
    return json.loads(urllib.request.urlopen(r).read())
oks = []
def check(name, cond, extra=''):
    oks.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else ' -> ' + str(extra)[:300]))
async def main():
    errs = []
    call('register', {'name': 'Wait Tester', 'username': 'waitm', 'password': '1'})
    tok = call('login', {'username': 'waitm', 'password': '1'})['data']['token']
    call('saveOnboarding', {'token': tok, 'overall': 'A2', 'skills': {'speaking': 'A2', 'listening': 'A2', 'reading': 'A2', 'writing': 'A2'}, 'goals': ['workplace']})
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-web-security'])
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        pg.on('pageerror', lambda e: errs.append(str(e))); await pg.add_init_script(INJECT)
        await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(800)
        await pg.fill('#form-login [name=username]', 'waitm'); await pg.fill('#form-login [name=password]', '1'); await pg.click('#login-btn'); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.querySelectorAll('.qw.on [data-action=\"qw-later\"]').forEach(b=>b.click())")
        # slow down the community feed
        await pg.evaluate("""(()=>{const f=window.fetch;window.fetch=function(u,o){const slow=o&&o.body&&String(o.body).indexOf('"cmFeed"')>-1;const p=f.apply(window,arguments);return slow?new Promise(r=>setTimeout(()=>r(p),3500)):p}})()""")
        await pg.click('#bottom-nav [data-go="community"]')
        await pg.wait_for_timeout(1800)
        print('DBG', await pg.evaluate("(()=>{const c=document.querySelector('#wait-card');return c?((c.closest('.view')||{}).id+' '+c.className):'none '+(Kelvin.state.view)})()"))
        check('waiting card appears inside the Community page', await pg.evaluate("!!document.querySelector('#view-community #wait-card.on')"))
        check('it is not a popup', await pg.evaluate("getComputedStyle(document.querySelector('#wait-card')).position!=='fixed'"))
        check('it has a Kel picture', await pg.evaluate("!!document.querySelector('#wait-card .wt-kelimg[src*=\"kel-\"]')"))
        await pg.screenshot(path=str(OUT / 'wait_inline.png'))
        await pg.wait_for_timeout(3000)
        check('it goes away when the feed arrives (page loads do not wait)', await pg.evaluate("!document.querySelector('#wait-card.on')"))
        check('the card starts with an invitation, not a Loading line', await pg.evaluate("1") == 1)
        # a slow lesson start with a question card: it waits for Continue
        await pg.evaluate("window.__noWaitHold=false")
        await pg.evaluate("""(()=>{const f=window.fetch;window.fetch=function(u,o){const slow=o&&o.body&&String(o.body).indexOf('"drillStart"')>-1;const p=f.apply(window,arguments);return slow?new Promise(r=>setTimeout(()=>r(p),1500)):p}})()""")
        await pg.evaluate("Kelvin.go('dashboard')"); await pg.wait_for_timeout(1200)
        # force the question kind for this test
        await pg.evaluate("Kelvin.wait._force='quiz'")
        await pg.click('#dash-mix [data-action="dr-start"]'); await pg.wait_for_timeout(300)
        check('the card opens at once (no delay)', await pg.evaluate("!!document.querySelector('#wait-card.on')"))
        head = await pg.evaluate("(document.querySelector('#wait-card .wt-head')||{}).textContent||''")
        check('the first line invites, e.g. While Kelvin gets things ready', 'While Kelvin' in head, head)
        await pg.wait_for_timeout(2500)
        check('when ready, a question card waits for Continue', await pg.evaluate("!!document.querySelector('#wait-card.ready .wt-go') && !(Kelvin.drill.state())"))
        await pg.screenshot(path=str(OUT / 'wait_ready.png'))
        await pg.click('#wait-card .wt-go'); await pg.wait_for_timeout(800)
        check('Continue opens the practice', await pg.evaluate("!!Kelvin.drill.state() && Kelvin.state.view==='drill'"))
        await b.close()
    check('no page errors', not errs, errs[:5])
    print('ALL PASSED' if all(oks) else str(oks.count(False)) + ' FAILED')
try:
    asyncio.run(main())
finally:
    srv.kill()
