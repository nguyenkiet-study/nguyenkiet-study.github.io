"""Browser test: Daily mix on Home and a skill drill, every exercise kind answered. Screenshots in /tmp/cv/."""
import asyncio, json, pathlib, urllib.request, re
_src = (pathlib.Path(__file__).resolve().parent / 'learning_e2e.py').read_text()
exec(_src[:_src.index('async def main')])
OUT = pathlib.Path('/tmp/cv'); OUT.mkdir(exist_ok=True)
def call(fn, payload=None):
    r = urllib.request.Request('http://localhost:8766', data=json.dumps({'fn': fn, 'payload': payload or {}}).encode(), method='POST')
    return json.loads(urllib.request.urlopen(r).read())
oks = []
def check(name, cond, extra=''):
    oks.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else ' -> ' + str(extra)[:300]))
FAKE_SR = """window.webkitSpeechRecognition=function(){const r=this;r.start=function(){setTimeout(()=>{const s=window.__say||'';r.onresult&&r.onresult({resultIndex:0,results:[Object.assign([{transcript:s}],{isFinal:true})]});r.onend&&r.onend()},300)};r.stop=function(){r.onend&&r.onend()};r.addEventListener=function(){}};"""
async def answer(pg, name, shots):
    seen = set()
    for step in range(30):
        s = await pg.evaluate("""(()=>{const d=Kelvin.drill.state();if(!d)return null;if(d.done)return {done:true};const s=d.steps[d.i];
          return {t:s.t,answers:s.answers||null,en:s.en||'',w:s.w||'',opts:s.opts?s.opts.map(o=>o.ok):null,tiles:s.tiles?s.tiles.map(x=>[x.id,x.w,!!x.extra]):null,state:s.state||null}})()""")
        if not s or s.get('done'): return seen
        seen.add(s['t'])
        if s['t'] not in shots:
            shots[s['t']] = 1; await pg.screenshot(path=str(OUT / ('%s_dr_%s.png' % (name, s['t']))))
        t = s['t']
        if t in ('tiles', 'listen'):
            ids = [x[0] for x in sorted([x for x in s['tiles'] if not x[2]], key=lambda x: x[0])]
            for i in ids: await pg.click('.gx-bank .gx-t[data-id="%d"]' % i); await pg.wait_for_timeout(40)
            await pg.click('[data-action="dr-tilecheck"]')
        elif t in ('gap', 'meaning'):
            await pg.click('.gx-opt >> nth=%d' % s['opts'].index(True)); await pg.click('[data-action="dr-pickcheck"]')
        elif t == 'write':
            await pg.fill('#dr-input', s['answers'][0]); await pg.click('[data-action="dr-write"]')
        elif t == 'spell':
            await pg.fill('#dr-input', s['w']); await pg.click('[data-action="dr-spell"]')
        elif t == 'repeat':
            await pg.evaluate("window.__say=%s" % json.dumps(s['en']))
            await pg.click('[data-action="dr-mic"]'); await pg.wait_for_timeout(700)
            if 'repeat_done' not in shots: shots['repeat_done'] = 1; await pg.screenshot(path=str(OUT / ('%s_dr_repeat_done.png' % name)))
        await pg.wait_for_timeout(250)
        ok = await pg.evaluate("(()=>{const d=Kelvin.drill.state();const s=d.steps[d.i];return s.ok===true})()")
        check('%s | %s answered right is marked correct' % (name, t), ok)
        await pg.click('.sheet [data-action="dr-next"]'); await pg.wait_for_timeout(250)
    return seen
async def main():
    errs = []
    call('register', {'name': 'Mix Tester', 'username': 'mixm', 'password': '1'})
    tok = call('login', {'username': 'mixm', 'password': '1'})['data']['token']
    call('saveOnboarding', {'token': tok, 'overall': 'A2', 'skills': {'speaking': 'A2', 'listening': 'A2', 'reading': 'A2', 'writing': 'A2'}, 'goals': ['workplace']})
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-web-security'])
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)).new_page()
        pg.on('pageerror', lambda e: errs.append(str(e))); await pg.add_init_script(INJECT); await pg.add_init_script(FAKE_SR)
        await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(800)
        await pg.fill('#form-login [name=username]', 'mixm'); await pg.fill('#form-login [name=password]', '1'); await pg.click('#login-btn'); await pg.wait_for_timeout(2500)
        await pg.evaluate("document.querySelectorAll('.qw.on [data-action=\"qw-later\"]').forEach(b=>b.click())")
        check('Home shows the Daily mix card', await pg.evaluate("!!document.querySelector('#dash-mix [data-action=dr-start][data-mode=mix]')"))
        await pg.screenshot(path=str(OUT / 'm_home_mix.png'))
        await pg.click('#dash-mix [data-action="dr-start"]'); await pg.wait_for_timeout(2000)
        shots = {}
        seen = await answer(pg, 'm', shots)
        check('Daily mix used many kinds', len(seen) >= 5, seen)
        await pg.wait_for_timeout(1200)
        res = await pg.inner_text('#drill-root')
        check('result screen with the score, saved', re.search(r'(\d+) / \1', res) is not None and 'saved' in res, res[:200])
        await pg.screenshot(path=str(OUT / 'm_dr_done.png'))
        # skill pages offer their drill
        for sk, mode in [('listening', 'listen'), ('speaking', 'speak'), ('writing', 'translate'), ('reading', 'gap')]:
            await pg.evaluate("Kelvin.go('%s')" % sk); await pg.wait_for_timeout(900)
            check('%s page offers %s' % (sk, mode), await pg.evaluate("!!document.querySelector('#practice-card [data-action=dr-start][data-mode=%s]')" % mode))
        await pg.evaluate("Kelvin.go('grammar')"); await pg.wait_for_timeout(1500)
        check('Grammar page offers gap and translate practice', await pg.evaluate("!!document.querySelector('#grammar-root [data-mode=gap]') && !!document.querySelector('#grammar-root [data-mode=translate]')"))
        # speaking drill: a sentence said badly is shown word by word
        await pg.evaluate("Kelvin.go('speaking')"); await pg.wait_for_timeout(900)
        await pg.click('#practice-card [data-action="dr-start"]'); await pg.wait_for_timeout(2000)
        await pg.evaluate("window.__say='hello banana'"); await pg.click('[data-action="dr-mic"]'); await pg.wait_for_timeout(800)
        check('speaking: missed words are marked', await pg.evaluate("document.querySelectorAll('.dr-miss').length>0"))
        await pg.screenshot(path=str(OUT / 'm_dr_repeat_miss.png'))
        await pg.click('[data-action="dr-nospeak"]'); await pg.wait_for_timeout(500)
        check("can't speak now ends the speaking set", await pg.evaluate("Kelvin.drill.state().done===true"))
        await b.close()
    check('no page errors', not errs, errs[:5])
    print('ALL PASSED' if all(oks) else str(oks.count(False)) + ' FAILED')
try:
    asyncio.run(main())
finally:
    srv.kill()
