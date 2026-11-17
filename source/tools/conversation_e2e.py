"""Browser test: Listening conversation, the waiting card and the sign-in page (phone and PC). Screenshots in /tmp/cv/."""
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
SEED_A2 = {'What are Tom and his dad mainly talking about?': 0, 'What time does the match start?': 1, 'How will Tom get to the match?': 2,
           'You need to tidy your room first.': 1, 'I can do it in the morning.': 0, "Tom will come home by bus.": 0, "Tom's dad will go to the match too.": 2}

def user(name, un, lvl='A2'):
    call('register', {'name': name, 'username': un, 'password': '1'})
    tok = call('login', {'username': un, 'password': '1'})['data']['token']
    call('saveOnboarding', {'token': tok, 'overall': lvl, 'skills': {'speaking': lvl, 'listening': lvl, 'reading': lvl, 'writing': lvl}, 'goals': ['workplace']})
    return tok

async def main():
    errs = []
    # keep only the two hand-written lessons, so the test knows the answers
    call('__eval', {'code': "Db.filter(CONFIG.SHEETS.QUESTION_BANK,function(r){return r.Subtype==='conversation'&&r.Stem!=='Saturday plans'}).forEach(function(r){Db.update(CONFIG.SHEETS.QUESTION_BANK,r._row,{Status:'off'})});1"})
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-web-security'])
        for name, vp, sc, touch in [('m', {'width': 390, 'height': 844}, 2, True), ('pc', {'width': 1440, 'height': 900}, 1, False)]:
            un = 'conv' + name; user('Anh Kiet', un)
            ctx = await b.new_context(viewport=vp, device_scale_factor=sc, has_touch=touch, is_mobile=touch)
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); await pg.add_init_script(INJECT)
            await pg.goto('file:///home/claude/prism/preview.html'); await pg.wait_for_timeout(800)
            check(name + ' | sign-in pictures load', await pg.evaluate("Array.from(document.querySelectorAll('.auth-why img')).every(i=>i.complete&&i.naturalWidth>0)") if touch else True)
            if touch: await pg.screenshot(path=str(OUT / 'm_signin.png'))
            await pg.fill('#form-login [name=username]', un); await pg.fill('#form-login [name=password]', '1'); await pg.click('#login-btn'); await pg.wait_for_timeout(2500)
            await pg.evaluate("document.querySelectorAll('.qw.on [data-action=\"qw-later\"]').forEach(b=>b.click())")
            await pg.evaluate("Kelvin.go('listening')"); await pg.wait_for_timeout(1200)
            check(name + ' | Listening page offers Conversation', await pg.evaluate("!!document.querySelector('.cv-entry [data-action=cv-start]')"))
            await pg.screenshot(path=str(OUT / (name + '_listening.png')), full_page=True)
            await pg.click('#cv-start'); await pg.wait_for_timeout(2500)
            intro = await pg.inner_text('#practice-card')
            check(name + ' | cover: title, names', 'Saturday plans' in intro and 'Tom' in intro and 'Dad' in intro, intro[:200])
            check(name + ' | cover: a Kelvin mascot for each person and one for the topic', await pg.evaluate("document.querySelectorAll('.cv-tile img[src*=\"kel-\"]').length===3"))
            await pg.screenshot(path=str(OUT / (name + '_intro.png')))
            await pg.click('[data-action="cv-begin"]'); await pg.wait_for_timeout(1500)
            check(name + ' | the scene comes first and is read aloud', 'kitchen' in await pg.inner_text('.cv-story') and await pg.evaluate("window.__played") >= 1)
            shots = 0; shots_k = set()
            for step in range(60):
                st = await pg.evaluate("""(()=>{const c=Kelvin.conv.state();if(!c||c.phase!=='story')return null;const it=c.items[c.shown];const e=it.e||{};
                  return {k:it.k,w:it.w||'',type:e.type,q:e.q||e.quote||'',i:e.i,items:e.items||null,answered:it.k==='qg'?!!c.loc[it.i]:!!(e.i!==undefined&&c.res[e.i]),lines:document.querySelectorAll('.cv-row').length}})()""")
                if not st: break
                if st['k'] in ('q', 'gap', 'qg') and not st['answered']:
                    if st['k'] == 'qg':
                        if 'qg' not in shots_k: shots_k.add('qg'); await pg.screenshot(path=str(OUT / (name + '_qg.png')))
                        await pg.click('.cv-it.new .cv-chips .gx-t:text-is("%s")' % st['w']); await pg.click('[data-action="cv-check"]')
                    elif st['k'] == 'gap':
                        await pg.screenshot(path=str(OUT / (name + '_gap.png')))
                        await pg.click('.cv-chips .gx-t:text-is("Call")'); await pg.click('[data-action="cv-check"]')
                    elif st['type'] in ('mcq', 'tf', 'who'):
                        k = SEED_A2.get(st['q'], 0)
                        await pg.click('.cv-it.new .gx-opt >> nth=%d' % k)
                    else:
                        for it in sorted(st['items'], key=lambda x: x['k']): await pg.click('.cv-it.new .cv-ev[data-k="%d"]' % it['k']); await pg.wait_for_timeout(100)
                        await pg.click('[data-action="cv-check"]')
                    await pg.wait_for_timeout(900)
                    if shots < 2: await pg.screenshot(path=str(OUT / ('%s_story%d.png' % (name, shots)))); shots += 1
                await pg.click('[data-action="cv-more"]'); await pg.wait_for_timeout(250)
            check(name + ' | lines were read one by one', await pg.evaluate("window.__played") >= 8, await pg.evaluate("window.__played"))
            res = await pg.inner_text('#practice-card')
            await pg.click('.cv-script .cv-w[data-w="match"]'); await pg.wait_for_timeout(1500)
            gl = await pg.evaluate("(document.querySelector('#cv-gloss.on')||{}).innerText||''")
            check(name + ' | tap a word: its Vietnamese meaning shows', 'match' in gl and ('nghĩa' in gl or len(gl) > 10), gl)
            await pg.screenshot(path=str(OUT / (name + '_gloss.png')))
            await pg.click('[data-action="cv-gl-close"]'); await pg.wait_for_timeout(300)
            import re as _re; mm=_re.search(r'(\d+) / (\d+)', res); check(name + ' | result: all right (more questions now) and the transcript', mm and mm.group(1)==mm.group(2) and int(mm.group(2))>=11 and 'Tom' in res and 'Call me when you get on the bus' in res, res[:300])
            await pg.click('[data-action="cv-vi"]'); await pg.wait_for_timeout(300)
            check(name + ' | Vietnamese shows on request', 'Bố ơi' in await pg.inner_text('.cv-script'))
            await pg.screenshot(path=str(OUT / (name + '_done.png')), full_page=True)
            # the waiting card: each kind
            for kind in range(4):
                await pg.evaluate("Kelvin.wait.show(['Writing a new conversation','Checking the questions'])"); await pg.wait_for_timeout(400)
                await pg.screenshot(path=str(OUT / ('%s_wait%d.png' % (name, kind))))
            await pg.evaluate("Kelvin.wait.hide()")
            # quiz in the waiting card answers at once
            for _ in range(8):
                await pg.evaluate("Kelvin.wait.show(['Checking'])"); await pg.wait_for_timeout(200)
                if await pg.evaluate("!!document.querySelector('#wait-card .wt-opts')"): break
            await pg.click('#wait-card .wt-opts button >> nth=0'); await pg.wait_for_timeout(200)
            check(name + ' | waiting quiz shows right or wrong at once', await pg.evaluate("!document.querySelector('#wait-card .wt-why').hidden"))
            await pg.evaluate("Kelvin.wait.hide()")
            # a slow call opens the card by itself and closes it when done
            await pg.evaluate("""(()=>{const orig=window.fetch;window.fetch=function(u,o){return new Promise(r=>setTimeout(()=>r(orig.call(window,u,o)),2500))}})()""")
            await pg.evaluate("Kelvin.Api.call('grammarJudge',{}).catch(()=>{});0"); await pg.wait_for_timeout(1800)
            check(name + ' | a slow AI call opens the waiting card', await pg.evaluate("!!document.querySelector('#wait-card.on')"))
            await pg.wait_for_timeout(2500)
            check(name + ' | the card closes when the answer arrives', await pg.evaluate("!document.querySelector('#wait-card.on')"))
            await ctx.close()
        await b.close()
    check('no page errors', not errs, errs[:5])
    print('ALL PASSED' if all(oks) else str(oks.count(False)) + ' FAILED')

try:
    asyncio.run(main())
finally:
    srv.kill()
